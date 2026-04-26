import type { VoiceControlsProps } from "@/src/types";
import { T } from "@/src/utils/theme";
import { MicIcon, StopIcon } from "./icons";
import { Waveform } from "./Waveform";

export function VoiceControls({
  state,
  isActive,
  userSpeaking,
  agentSpeaking,
  voiceLevel,
  onToggleCall,
}: VoiceControlsProps) {
  return (
    <section
      style={{
        minHeight: 96,
        padding: "18px clamp(18px, 3vw, 34px) 14px",
        display: "grid",
        gridTemplateColumns: "160px 1fr 160px",
        alignItems: "end",
        gap: 18,
      }}
    >
      <div />

      <div
        style={{
          minWidth: 0,
          textAlign: "center",
          alignSelf: "center",
          padding: "0 clamp(12px, 5vw, 80px)",
        }}
      >
        <div style={{ height: 28, margin: "0 auto", maxWidth: 320 }}>
          <Waveform
            isActive={userSpeaking || agentSpeaking || state === "connecting"}
            intensity={voiceLevel || 0.35}
            color={userSpeaking ? "green" : "blue"}
            barCount={48}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginTop: 6,
          }}
        >
          <div style={{ position: "relative" }}>
            {userSpeaking && (
              <>
                <div
                  style={{
                    position: "absolute",
                    inset: -8,
                    borderRadius: "50%",
                    border: `1.5px solid ${T.green}`,
                    animation: "pulseRing 1.5s ease-out infinite",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: -15,
                    borderRadius: "50%",
                    border: `1px solid ${T.green}`,
                    animation: "pulseRing 1.5s ease-out .28s infinite",
                  }}
                />
              </>
            )}
            <button
              onClick={onToggleCall}
              disabled={state === "connecting"}
              aria-label={isActive ? "End call" : "Start voice demo"}
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                border: `1px solid ${isActive ? T.green : T.border}`,
                background: isActive ? T.greenGlow : T.bg,
                cursor: state === "connecting" ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                zIndex: 1,
                boxShadow: isActive ? `0 0 20px ${T.greenGlow}` : "none",
              }}
            >
              {isActive ? <StopIcon /> : <MicIcon />}
            </button>
          </div>
        </div>
        {(state === "idle" || state === "listening") && (
          <div
            style={{
              fontSize: 12,
              color: state === "listening" ? T.green : T.textSecondary,
              fontWeight: 500,
              marginTop: 10,
              animation: state === "listening" ? "subtlePulse 1.5s ease infinite" : "none",
            }}
          >
            {state === "listening" ? "Listening..." : "Tap to speak"}
          </div>
        )}
      </div>

      <div />
    </section>
  );
}
