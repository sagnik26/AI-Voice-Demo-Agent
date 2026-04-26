import JoinDemoCall from "@/src/modules/JoinDemoCall";
import { T } from "@/src/utils/theme";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background:
          "linear-gradient(115deg, rgba(246,242,227,.92), rgba(255,255,255,.96) 42%, rgba(226,234,229,.9))",
        color: T.text,
        fontFamily: T.font,
      }}
    >
      <section
        style={{
          width: "min(100%, 620px)",
          borderRadius: 28,
          border: `1px solid ${T.borderLight}`,
          background: "rgba(255,255,255,.9)",
          boxShadow: "0 26px 70px rgba(26,26,26,.16)",
          padding: "clamp(32px, 7vw, 64px)",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: T.accent,
            fontFamily: T.fontMono,
            fontSize: 12,
            letterSpacing: ".08em",
            marginBottom: 14,
            textTransform: "uppercase",
          }}
        >
          AI product demo agent
        </p>
        <h1
          style={{
            fontSize: "clamp(34px, 6vw, 64px)",
            lineHeight: 0.95,
            letterSpacing: "-.055em",
            fontWeight: 500,
            marginBottom: 18,
          }}
        >
          Meet Hailey for a live demo call
        </h1>
        <p
          style={{
            color: T.textSecondary,
            fontSize: 16,
            lineHeight: 1.7,
            margin: "0 auto 30px",
            maxWidth: 460,
          }}
        >
          Join a voice-led product demo. Hailey will introduce herself, ask two prospect-style
          questions, and create a personalized 60-second walkthrough script.
        </p>
        <JoinDemoCall />
      </section>
    </main>
  );
}
