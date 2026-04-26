import type { MessageBubbleProps } from "@/src/types";
import { T } from "@/src/utils/theme";
import { SparkIcon } from "./icons";
import { LatencyBadge } from "./LatencyBadge";

export function MessageBubble({ message, index }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div
        style={{
          textAlign: "center",
          color: T.textMuted,
          fontSize: 12,
          marginBottom: 16,
          animation: `fadeSlideIn .35s ease ${index * 0.04}s both`,
        }}
      >
        {message.text}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 18,
        animation: `fadeSlideIn .35s ease ${index * 0.04}s both`,
        maxWidth: "100%",
        marginLeft: isUser ? "auto" : 0,
        marginRight: isUser ? 0 : "auto",
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            flexShrink: 0,
            background: `radial-gradient(circle at 40% 40%, #FAF0D4, ${T.agentSand})`,
            marginRight: 12,
            marginTop: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SparkIcon />
        </div>
      )}
      <div
        style={{
          maxWidth: "min(78%, 760px)",
          padding: "14px 20px",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: isUser ? T.chatUser : T.chatAgent,
          border: isUser ? "none" : `1px solid ${T.border}`,
          color: isUser ? "#fff" : T.text,
          fontSize: 15,
          lineHeight: 1.6,
          letterSpacing: ".01em",
          opacity: message.final === false ? 0.7 : 1,
        }}
      >
        {message.text}
        {message.final === false && (
          <span
            style={{
              display: "inline-block",
              width: 2,
              height: "1em",
              background: isUser ? "#fff" : T.accent,
              marginLeft: 4,
              verticalAlign: "text-bottom",
              animation: "cursorBlink .8s ease-in-out infinite",
            }}
          />
        )}
        {message.latencyMs && !isUser && (
          <div style={{ marginTop: 10, opacity: 0.65 }}>
            <LatencyBadge latencyMs={message.latencyMs} state="responding" />
          </div>
        )}
      </div>
    </div>
  );
}
