import type { ProgressBarProps } from "@/src/types";
import { T } from "@/src/utils/theme";

export function ProgressBar({ isActive, userSpeaking }: ProgressBarProps) {
  return (
    <div
      style={{
        position: "absolute",
        left: "16%",
        right: "15%",
        bottom: 92,
        height: 3,
        background: T.chatUser,
        borderRadius: 999,
      }}
    >
      <div
        style={{
          width: isActive ? "68%" : "18%",
          height: "100%",
          borderRadius: 999,
          background: userSpeaking ? T.green : T.accent,
          transition: "width .8s ease, background .35s",
        }}
      />
    </div>
  );
}
