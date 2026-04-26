"use client";

import { Room, RoomEvent, Track, type RemoteTrack } from "livekit-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TokenResponse } from "@/src/types";
import { setPendingDemoRoom } from "@/src/utils/demoRoomHandoff";
import { T } from "@/src/utils/theme";

const AGENT_JOIN_TIMEOUT_MS = 12000;

function waitForAgentJoin(room: Room) {
  if (room.remoteParticipants.size > 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    let timeoutId: number | undefined;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      room.off(RoomEvent.ParticipantConnected, finish);
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.Disconnected, handleDisconnected);
    };

    const finish = () => {
      if (settled) return;

      settled = true;
      cleanup();
      resolve();
    };

    const fail = (message: string) => {
      if (settled) return;

      settled = true;
      cleanup();
      reject(new Error(message));
    };

    const handleTrackSubscribed = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Audio) {
        finish();
      }
    };

    const handleDisconnected = () => {
      fail("The demo room disconnected before Hailey could join. Please try again.");
    };

    timeoutId = window.setTimeout(() => {
      fail("Hailey did not join the demo room in time. Please try again.");
    }, AGENT_JOIN_TIMEOUT_MS);
    room.on(RoomEvent.ParticipantConnected, finish);
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.Disconnected, handleDisconnected);
  });
}

export default function JoinDemoCall() {
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinDemoCall = async () => {
    if (isJoining) return;

    setIsJoining(true);
    setError(null);
    let room: Room | null = null;

    try {
      const response = await fetch("/api/livekit/token");
      const data = (await response.json()) as TokenResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error || "Unable to fetch a LiveKit token.");
      }

      room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      await room.connect(data.url, data.token);
      await room.localParticipant.setMicrophoneEnabled(false);
      await waitForAgentJoin(room);

      setPendingDemoRoom({
        room,
        roomName: data.roomName,
        identity: data.identity,
      });

      router.push("/demo");
    } catch (err) {
      room?.disconnect();
      setError(err instanceof Error ? err.message : "Unable to join the demo call.");
      setIsJoining(false);
    }
  };

  return (
    <>
      <button
        disabled={isJoining}
        onClick={joinDemoCall}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 48,
          padding: "0 24px",
          border: "none",
          borderRadius: 999,
          background: T.chatUser,
          color: "#fff",
          cursor: isJoining ? "wait" : "pointer",
          fontSize: 15,
          fontWeight: 600,
          opacity: isJoining ? 0.76 : 1,
          boxShadow: "0 16px 34px rgba(26,26,26,.18)",
        }}
        type="button"
      >
        {isJoining ? "Joining..." : "Join demo call"}
      </button>
      {error && (
        <p
          style={{
            color: T.red,
            fontSize: 13,
            lineHeight: 1.5,
            marginTop: 16,
          }}
        >
          {error}
        </p>
      )}
    </>
  );
}
