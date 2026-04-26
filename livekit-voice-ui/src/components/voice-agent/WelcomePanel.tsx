import { T } from "@/src/utils/theme";
import { SparkIcon } from "./icons";

export function WelcomePanel() {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "clamp(44px, 8vh, 86px) 24px",
        animation: "fadeSlideIn .5s ease",
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: `radial-gradient(circle at 40% 40%, #FAF0D4, ${T.agentSand})`,
          border: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
        }}
      >
        <SparkIcon />
      </div>
      <div style={{ fontSize: "clamp(18px, 1.6vw, 22px)", fontWeight: 600, marginBottom: 8 }}>
        AI product demo agent
      </div>
      <div
        style={{
          fontSize: "clamp(13px, 1vw, 15px)",
          color: T.textSecondary,
          lineHeight: 1.5,
          marginBottom: 16,
        }}
      >
        Describe your product, answer two prospect-style questions, and Hailey will create a
        personalized 60-second walkthrough script.
      </div>
    </div>
  );
}
