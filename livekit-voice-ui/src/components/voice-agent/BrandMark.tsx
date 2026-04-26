import { T } from "@/src/utils/theme";
import { SparkIcon } from "./icons";

export function BrandMark() {
  return (
    <div
      style={{
        position: "absolute",
        left: 18,
        top: 14,
        zIndex: 3,
        display: "flex",
        alignItems: "center",
        gap: 6,
        color: T.textMuted,
        fontSize: 10,
      }}
    >
      <span>powered by</span>
      <SparkIcon />
      <b style={{ fontWeight: 500, color: T.textSecondary }}>handhold</b>
    </div>
  );
}
