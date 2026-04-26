"use client";

import {
  Room,
  RoomEvent,
  Track,
  type Participant,
  type RemoteTrack,
  type RemoteTrackPublication,
  type TranscriptionSegment,
} from "livekit-client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Message,
  TokenResponse,
  UiState,
  VoiceAgentUIProps,
  WalkthroughScript,
  WalkthroughStep,
} from "@/src/types";
import {
  BrandMark,
  MessageBubble,
  ProgressBar,
  T,
  VoiceControls,
  WalkthroughCard,
  WelcomePanel,
} from "@/src/components/voice-agent";
import { takePendingDemoRoom } from "@/src/utils/demoRoomHandoff";

const RELATED_WALKTHROUGH_TERMS = new Set([
  "adjust",
  "change",
  "demo",
  "first",
  "goal",
  "improve",
  "longer",
  "modify",
  "personalized",
  "prospect",
  "rewrite",
  "script",
  "second",
  "shorter",
  "step",
  "third",
  "this",
  "update",
  "walkthrough",
]);

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "from",
  "have",
  "into",
  "just",
  "like",
  "make",
  "more",
  "that",
  "their",
  "them",
  "then",
  "there",
  "they",
  "this",
  "what",
  "when",
  "with",
  "would",
  "your",
]);

const USER_TURN_MERGE_WINDOW_MS = 3500;

function getMeaningfulTerms(text: string) {
  const matches = text.toLowerCase().match(/[a-z0-9]+/g) || [];
  return matches.filter((term) => term.length > 3 && !STOP_WORDS.has(term));
}

function isWalkthroughRelatedText(
  text: string,
  walkthrough: WalkthroughScript,
) {
  const userTerms = getMeaningfulTerms(text);

  if (userTerms.length <= 2) {
    return true;
  }

  if (userTerms.some((term) => RELATED_WALKTHROUGH_TERMS.has(term))) {
    return true;
  }

  const walkthroughTerms = new Set(
    getMeaningfulTerms(
      [
        walkthrough.title,
        walkthrough.persona,
        walkthrough.goal,
        walkthrough.script,
        ...walkthrough.steps.flatMap((step) => [step.title, step.spoken]),
      ]
        .filter(Boolean)
        .join(" "),
    ),
  );

  return userTerms.some((term) => walkthroughTerms.has(term));
}

export default function VoiceAgentUI({ autoConnect = false }: VoiceAgentUIProps) {
  const router = useRouter();
  const [state, setState] = useState<UiState>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [roomName, setRoomName] = useState("voice-demo");
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [showEndCallConfirm, setShowEndCallConfirm] = useState(false);
  const [walkthrough, setWalkthrough] = useState<WalkthroughScript | null>(
    null,
  );
  const [activeWalkthroughStep, setActiveWalkthroughStep] = useState(0);
  const roomRef = useRef<Room | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const decoderRef = useRef(new TextDecoder());
  const waitingForIntroRef = useRef(false);
  const introStartedRef = useRef(false);
  const agentWasSpeakingRef = useRef(false);
  const agentSilenceTimerRef = useRef<number | null>(null);
  const messageIdRef = useRef(0);
  const autoConnectStartedRef = useRef(false);
  const lastUserTranscriptAtRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const userAnalyserRef = useRef<AnalyserNode | null>(null);
  const agentAnalyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const isActive = state !== "idle" && state !== "error";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const stopMeters = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    userAnalyserRef.current = null;
    agentAnalyserRef.current = null;
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => undefined);
      audioCtxRef.current = null;
    }
    setVoiceLevel(0);
  }, []);

  const startMeters = useCallback(() => {
    const room = roomRef.current;
    const audioEl = audioRef.current;
    if (!room || !audioEl) return;

    stopMeters();

    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;

    const userAnalyser = audioCtx.createAnalyser();
    userAnalyser.fftSize = 1024;
    userAnalyser.smoothingTimeConstant = 0.8;
    userAnalyserRef.current = userAnalyser;

    const agentAnalyser = audioCtx.createAnalyser();
    agentAnalyser.fftSize = 1024;
    agentAnalyser.smoothingTimeConstant = 0.8;
    agentAnalyserRef.current = agentAnalyser;

    // Agent audio: meter the HTMLAudioElement that LiveKit attaches remote audio to.
    try {
      const agentSource = audioCtx.createMediaElementSource(audioEl);
      agentSource.connect(agentAnalyser);
      agentAnalyser.connect(audioCtx.destination);
    } catch {
      // Some browsers disallow creating multiple MediaElementSources for one element.
    }

    // User mic: meter the currently published local microphone track if present.
    try {
      const pubs: any[] = Array.from(
        (room.localParticipant as any).trackPublications?.values?.() ?? [],
      );

      const micPub = pubs.find(
        (pub) =>
          pub?.track?.mediaStreamTrack &&
          (pub?.source === undefined || pub?.source === Track.Source.Microphone),
      );

      const msTrack = micPub?.track?.mediaStreamTrack as MediaStreamTrack | undefined;
      if (msTrack) {
        const stream = new MediaStream([msTrack]);
        const userSource = audioCtx.createMediaStreamSource(stream);
        userSource.connect(userAnalyser);
      }
    } catch {
      // If we can't access the mic track, agent metering still works.
    }

    const calcLevel = (analyser: AnalyserNode | null) => {
      if (!analyser) return 0;
      const buffer = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(buffer);
      let sumSquares = 0;
      for (let i = 0; i < buffer.length; i += 1) {
        const v = (buffer[i] - 128) / 128;
        sumSquares += v * v;
      }
      const rms = Math.sqrt(sumSquares / buffer.length);
      return Math.max(0, Math.min(1, rms * 5));
    };

    const tick = () => {
      const u = calcLevel(userAnalyserRef.current);
      const a = calcLevel(agentAnalyserRef.current);
      const level = userSpeaking ? u : agentSpeaking ? a : 0;
      setVoiceLevel(level);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [agentSpeaking, stopMeters, userSpeaking]);

  useEffect(() => {
    return () => {
      if (agentSilenceTimerRef.current !== null) {
        window.clearTimeout(agentSilenceTimerRef.current);
        agentSilenceTimerRef.current = null;
      }
      stopMeters();
      roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, []);

  const clearAgentSilenceTimer = useCallback(() => {
    if (agentSilenceTimerRef.current !== null) {
      window.clearTimeout(agentSilenceTimerRef.current);
      agentSilenceTimerRef.current = null;
    }
  }, []);

  const addSystemMessage = useCallback((text: string) => {
    messageIdRef.current += 1;
    setMessages((prev) => [
      ...prev,
      {
        id: `system-${Date.now()}-${messageIdRef.current}`,
        role: "system",
        text,
        final: true,
      },
    ]);
  }, []);

  const clearWalkthroughPresentation = useCallback(() => {
    setWalkthrough(null);
    setActiveWalkthroughStep(0);
  }, []);

  const upsertTranscript = useCallback(
    (segments: TranscriptionSegment[], participant?: Participant) => {
      if (segments.length === 0) return;

      const isUser = !participant || participant.isLocal;
      const role: Message["role"] = isUser ? "user" : "assistant";
      const hasFinalUserText =
        isUser &&
        segments.some(
          (segment) => segment.final && segment.text.trim().length > 0,
        );
      const userText = segments.map((segment) => segment.text).join(" ");
      const now = Date.now();

      if (
        walkthrough &&
        hasFinalUserText &&
        !isWalkthroughRelatedText(userText, walkthrough)
      ) {
        clearWalkthroughPresentation();
      }

      setMessages((prev) => {
        const next = [...prev];

        for (const segment of segments) {
          if (!segment.text.trim()) continue;

          const id = `${role}-${segment.id}`;
          const existing = next.findIndex((message) => message.id === id);
          const message: Message = {
            id,
            role,
            text: segment.text,
            final: segment.final,
          };

          if (existing >= 0) {
            next[existing] = { ...next[existing], ...message };
          } else if (
            isUser &&
            segment.final &&
            next.at(-1)?.role === "user" &&
            now - lastUserTranscriptAtRef.current < USER_TURN_MERGE_WINDOW_MS
          ) {
            const lastIndex = next.length - 1;
            const previousText = next[lastIndex].text.trim();
            const nextText = message.text.trim();
            next[lastIndex] = {
              ...next[lastIndex],
              text: previousText.toLowerCase().includes(nextText.toLowerCase())
                ? previousText
                : `${previousText} ${nextText}`.trim(),
              final: message.final,
            };
          } else {
            next.push(message);
          }

          if (isUser) {
            lastUserTranscriptAtRef.current = now;
          }
        }

        return next;
      });
    },
    [clearWalkthroughPresentation, walkthrough],
  );

  const handleDataMessage = useCallback(
    (payload: Uint8Array, participant?: Participant) => {
      const text = decoderRef.current.decode(payload);
      try {
        const data = JSON.parse(text) as {
          type?: string;
          text?: string;
          latencyMs?: number;
          role?: "user" | "assistant" | "system";
          title?: string;
          persona?: string;
          goal?: string;
          script?: string;
          steps?: WalkthroughStep[];
        };

        if (data.type === "latency" && typeof data.latencyMs === "number") {
          return;
        }

        if (
          data.type === "walkthrough_script" &&
          typeof data.title === "string" &&
          typeof data.goal === "string" &&
          Array.isArray(data.steps)
        ) {
          setWalkthrough({
            type: "walkthrough_script",
            title: data.title,
            persona: data.persona,
            goal: data.goal,
            script: data.script,
            steps: data.steps.slice(0, 5),
          });
          setActiveWalkthroughStep(0);
          return;
        }

        if (data.text) {
          const role =
            data.role || (participant?.isLocal ? "user" : "assistant");
          messageIdRef.current += 1;
          setMessages((prev) => [
            ...prev,
            {
              id: `data-${Date.now()}-${messageIdRef.current}`,
              role,
              text: data.text || "",
              final: true,
              latencyMs: data.latencyMs,
            },
          ]);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `data-${Date.now()}-${prev.length}-${Math.random().toString(36).slice(2)}`,
            role: participant?.isLocal ? "user" : "assistant",
            text,
            final: true,
          },
        ]);
      }
    },
    [],
  );

  const attachAudioTrack = useCallback(
    (track: RemoteTrack) => {
      if (track.kind !== Track.Kind.Audio || !audioRef.current) return;
      track.attach(audioRef.current);
      void audioRef.current.play().catch(() => {
        addSystemMessage("Tap the page once if the browser blocks autoplay.");
      });
    },
    [addSystemMessage],
  );

  const attachExistingAudioTracks = useCallback(
    (room: Room) => {
      room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((publication) => {
          const track = publication.track;
          if (track?.kind === Track.Kind.Audio) {
            attachAudioTrack(track);
          }
        });
      });
    },
    [attachAudioTrack],
  );

  const bindRoomEvents = useCallback(
    (room: Room) => {
      room
        .on(
          RoomEvent.TrackSubscribed,
          (
            track: RemoteTrack,
            _publication: RemoteTrackPublication,
            participant: Participant,
          ) => {
            if (track.kind === Track.Kind.Audio) {
              attachAudioTrack(track);
              addSystemMessage(`${participant.identity} joined with audio.`);
              startMeters();
            }
          },
        )
        .on(RoomEvent.TranscriptionReceived, (segments, participant) => {
          upsertTranscript(segments, participant);
        })
        .on(RoomEvent.DataReceived, (payload, participant) => {
          handleDataMessage(payload, participant);
        })
        .on(RoomEvent.ParticipantDisconnected, (participant) => {
          if (participant.isLocal) return;

          setAgentSpeaking(false);
          clearAgentSilenceTimer();
          waitingForIntroRef.current = false;
          introStartedRef.current = false;
          agentWasSpeakingRef.current = false;
          setState("error");
          addSystemMessage(
            "Hailey disconnected from this demo room. Please leave and join the demo again.",
          );
        })
        .on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          const localSpeaking = speakers.some(
            (participant) => participant.isLocal,
          );
          const remoteSpeaking = speakers.some(
            (participant) => !participant.isLocal,
          );
          setUserSpeaking(localSpeaking);
          setAgentSpeaking(remoteSpeaking);

          if (remoteSpeaking) {
            clearAgentSilenceTimer();
            agentWasSpeakingRef.current = true;
            if (waitingForIntroRef.current) {
              introStartedRef.current = true;
            }
            setState("responding");
            return;
          }

          if (waitingForIntroRef.current) {
            if (introStartedRef.current) {
              if (agentSilenceTimerRef.current === null) {
                agentSilenceTimerRef.current = window.setTimeout(() => {
                  waitingForIntroRef.current = false;
                  introStartedRef.current = false;
                  agentWasSpeakingRef.current = false;
                  agentSilenceTimerRef.current = null;
                  void room.localParticipant
                    .setMicrophoneEnabled(true)
                    .then(() => startMeters())
                    .catch((err) => {
                      const raw =
                        err instanceof Error ? err.message : "Unable to enable microphone.";
                      addSystemMessage(
                        raw.includes("NotAllowedError") || raw.toLowerCase().includes("permission")
                          ? "Microphone access was blocked. Please allow microphone permission and re-join the demo."
                          : `Microphone error: ${raw}`,
                      );
                      setState("error");
                    });
                  setState("listening");
                }, 650);
              }
              setState("responding");
              return;
            }
          }

          if (agentWasSpeakingRef.current) {
            if (agentSilenceTimerRef.current === null) {
              agentSilenceTimerRef.current = window.setTimeout(() => {
                agentWasSpeakingRef.current = false;
                agentSilenceTimerRef.current = null;
                setState("listening");
              }, 650);
            }
            setState("responding");
            return;
          }

          setState("listening");
        })
        .on(RoomEvent.Disconnected, () => {
          setUserSpeaking(false);
          setAgentSpeaking(false);
          clearAgentSilenceTimer();
          waitingForIntroRef.current = false;
          introStartedRef.current = false;
          agentWasSpeakingRef.current = false;
          setState("idle");
          stopMeters();
          roomRef.current = null;
        });
    },
    [
      addSystemMessage,
      attachAudioTrack,
      clearAgentSilenceTimer,
      handleDataMessage,
      startMeters,
      stopMeters,
      upsertTranscript,
    ],
  );

  const connect = useCallback(async () => {
    if (roomRef.current) return;

    setState("connecting");

    try {
      const response = await fetch(
        `/api/livekit/token?room=${encodeURIComponent(roomName || "voice-demo")}`,
      );
      const data = (await response.json()) as TokenResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error || "Unable to fetch a LiveKit token.");
      }

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      roomRef.current = room;
      setRoomName(data.roomName);
      setWalkthrough(null);
      setActiveWalkthroughStep(0);
      bindRoomEvents(room);

      await room.connect(data.url, data.token);
      await room.localParticipant.setMicrophoneEnabled(false);
      waitingForIntroRef.current = true;
      introStartedRef.current = false;
      setState("connecting");
      addSystemMessage(
        `Connected to ${data.roomName}. Hailey will introduce herself first.`,
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown connection error.";
      addSystemMessage(message);
      setState("error");
      clearAgentSilenceTimer();
      waitingForIntroRef.current = false;
      introStartedRef.current = false;
      agentWasSpeakingRef.current = false;
      roomRef.current?.disconnect();
      roomRef.current = null;
    }
  }, [
    addSystemMessage,
    bindRoomEvents,
    roomName,
  ]);

  const disconnect = useCallback(() => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    setState("idle");
    setUserSpeaking(false);
    setAgentSpeaking(false);
    setShowEndCallConfirm(false);
    clearAgentSilenceTimer();
    waitingForIntroRef.current = false;
    introStartedRef.current = false;
    agentWasSpeakingRef.current = false;
    setWalkthrough(null);
    setActiveWalkthroughStep(0);
    stopMeters();
  }, [clearAgentSilenceTimer, stopMeters]);

  const toggleCall = useCallback(() => {
    if (roomRef.current) {
      setShowEndCallConfirm(true);
      return;
    }
    void connect();
  }, [connect]);

  const confirmEndCall = useCallback(() => {
    disconnect();
    router.push("/");
  }, [disconnect, router]);

  useEffect(() => {
    const handoff = takePendingDemoRoom();
    if (!handoff || roomRef.current) return;

    roomRef.current = handoff.room;
    autoConnectStartedRef.current = true;
    bindRoomEvents(handoff.room);
    attachExistingAudioTracks(handoff.room);
    setRoomName(handoff.roomName);
    setWalkthrough(null);
    setActiveWalkthroughStep(0);
    waitingForIntroRef.current = true;
    introStartedRef.current = false;
    setState("connecting");
    addSystemMessage(
      `Connected to ${handoff.roomName}. Hailey will introduce herself first.`,
    );
  }, [addSystemMessage, attachExistingAudioTracks, bindRoomEvents]);

  useEffect(() => {
    if (!autoConnect || autoConnectStartedRef.current || roomRef.current) return;

    autoConnectStartedRef.current = true;
    void connect();
  }, [autoConnect, connect]);

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background:
          "linear-gradient(115deg, rgba(246,242,227,.92), rgba(255,255,255,.96) 42%, rgba(226,234,229,.9))",
        fontFamily: T.font,
        color: T.text,
        overflow: "hidden",
        padding: 14,
      }}
    >
      <audio ref={audioRef} autoPlay />

      <div
        style={{
          height: "100%",
          borderRadius: 18,
          background: "rgba(255,255,255,.94)",
          boxShadow: "0 26px 70px rgba(26,26,26,.18)",
          overflow: "hidden",
          position: "relative",
          display: "grid",
          gridTemplateRows: "1fr auto",
        }}
      >
        <BrandMark />

        <main
          style={{
            minHeight: 0,
            overflowY: "auto",
            padding: walkthrough
              ? "clamp(54px, 8vh, 82px) clamp(24px, 5vw, 72px) 32px"
              : "clamp(54px, 9vh, 96px) 15% 32px 16%",
          }}
        >
          {walkthrough && (
            <WalkthroughCard
              onClose={clearWalkthroughPresentation}
              walkthrough={walkthrough}
            />
          )}

          {!walkthrough && messages.length === 0 && state === "idle" && (
            <WelcomePanel />
          )}

          {!walkthrough && messages.length > 0 && (
            <section
              style={{
                maxWidth: "100%",
                margin: "0 auto",
                paddingBottom: 80,
              }}
            >
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  index={index}
                  message={message}
                />
              ))}
              <div ref={messagesEndRef} />
            </section>
          )}
        </main>

        <ProgressBar isActive={isActive} userSpeaking={userSpeaking} />
        <VoiceControls
          agentSpeaking={agentSpeaking}
          isActive={isActive}
          onToggleCall={toggleCall}
          state={state}
          userSpeaking={userSpeaking}
          voiceLevel={voiceLevel}
        />

        {showEndCallConfirm && (
          <div
            aria-modal="true"
            role="dialog"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              background: "rgba(26,26,26,.28)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                width: "min(420px, 100%)",
                borderRadius: 24,
                border: `1px solid ${T.borderLight}`,
                background: "rgba(255,255,255,.96)",
                boxShadow: "0 28px 70px rgba(26,26,26,.22)",
                padding: 24,
                animation: "fadeSlideIn .24s ease both",
              }}
            >
              <h2
                style={{
                  fontSize: 24,
                  lineHeight: 1.1,
                  letterSpacing: "-.035em",
                  fontWeight: 500,
                  marginBottom: 10,
                }}
              >
                End this demo call?
              </h2>
              <p
                style={{
                  color: T.textSecondary,
                  fontSize: 14,
                  lineHeight: 1.65,
                  marginBottom: 22,
                }}
              >
                This will disconnect you from Hailey and return you to the home page.
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                }}
              >
                <button
                  onClick={() => setShowEndCallConfirm(false)}
                  style={{
                    minHeight: 42,
                    padding: "0 16px",
                    borderRadius: 999,
                    border: `1px solid ${T.border}`,
                    background: T.bg,
                    color: T.textSecondary,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                  type="button"
                >
                  Stay
                </button>
                <button
                  onClick={confirmEndCall}
                  style={{
                    minHeight: 42,
                    padding: "0 18px",
                    borderRadius: 999,
                    border: "none",
                    background: T.text,
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 600,
                    boxShadow: "0 12px 28px rgba(26,26,26,.16)",
                  }}
                  type="button"
                >
                  End call
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
