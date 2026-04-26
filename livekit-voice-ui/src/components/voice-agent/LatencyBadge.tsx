import type { LatencyBadgeProps } from "@/src/types";
import { T } from "@/src/utils/theme";

export function LatencyBadge({ latencyMs, state }: LatencyBadgeProps) {
  const isIdle = state === "idle";
  const isConnecting = state === "connecting";
  const value = latencyMs ?? 0;
  const color = isIdle ? T.textMuted : value < 300 ? T.green : value < 500 ? T.amber : T.red;
  const bg = isIdle
    ? "transparent"
    : value < 300
      ? T.greenGlow
      : value < 500
        ? T.amberGlow
        : T.redGlow;
  const label = isIdle ? "—" : isConnecting ? "..." : latencyMs ? `${latencyMs}ms` : "live";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: 20,
        background: bg,
        fontFamily: T.fontMono,
        fontSize: 11,
        color,
        letterSpacing: ".02em",
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          boxShadow: !isIdle ? `0 0 6px ${color}` : "none",
        }}
      />
      {label}
    </div>
  );
}
