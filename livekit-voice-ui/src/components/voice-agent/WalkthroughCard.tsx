import type { WalkthroughCardProps } from "@/src/types";
import { T } from "@/src/utils/theme";

export function WalkthroughCard({ walkthrough, onClose }: WalkthroughCardProps) {
  return (
    <section
      style={{
        width: "100%",
        margin: "0 auto",
        minHeight: "calc(100vh - 190px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        animation: "fadeSlideIn .45s ease both",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 14,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "5px 9px",
            borderRadius: 8,
            background: T.surface,
            border: `1px solid ${T.border}`,
            color: T.textSecondary,
            fontSize: 12,
          }}
        >
          Personalized walkthrough
        </span>
        <button
          aria-label="Close walkthrough"
          onClick={onClose}
          style={{
            flex: "0 0 auto",
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: `1px solid ${T.border}`,
            background: "rgba(255,255,255,.92)",
            color: T.textSecondary,
            cursor: "pointer",
            fontSize: 22,
            lineHeight: 1,
            boxShadow: "0 12px 28px rgba(26,26,26,.10)",
            transition: "all .2s ease",
          }}
          type="button"
        >
          ×
        </button>
      </div>

      <div
        style={{
          maxWidth: 980,
          marginBottom: "clamp(22px, 4vw, 42px)",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(36px, 6vw, 76px)",
            lineHeight: 0.92,
            letterSpacing: "-.06em",
            fontWeight: 500,
            marginBottom: 18,
          }}
        >
          {walkthrough.title}
        </h1>
        <p
          style={{
            color: T.textSecondary,
            fontSize: "clamp(15px, 1.45vw, 20px)",
            lineHeight: 1.65,
            maxWidth: 820,
          }}
        >
          {walkthrough.goal}
        </p>
        {walkthrough.persona && (
          <div
            style={{
              display: "inline-flex",
              borderRadius: 999,
              padding: "7px 12px",
              background: T.accentSoft,
              color: T.accent,
              fontSize: 12,
              fontFamily: T.fontMono,
              marginTop: 18,
            }}
          >
            for {walkthrough.persona}
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "clamp(14px, 2vw, 22px)",
          marginBottom: walkthrough.script ? 22 : 0,
        }}
      >
        {walkthrough.steps.map((step, index) => (
          <article
            key={`${step.title}-${index}`}
            style={{
              minHeight: 240,
              borderRadius: 28,
              border: `1px solid ${T.borderLight}`,
              background:
                index === 0
                  ? `linear-gradient(145deg, ${T.accentSoft}, rgba(255,255,255,.92))`
                  : "rgba(255,255,255,.86)",
              boxShadow: "0 18px 45px rgba(26,26,26,.10)",
              padding: "clamp(18px, 2.6vw, 30px)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              animation: `fadeSlideIn .55s ease ${0.18 + index * 0.28}s both`,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: index === 0 ? T.accent : T.surface,
                color: index === 0 ? "#fff" : T.textMuted,
                fontSize: 13,
                fontFamily: T.fontMono,
                marginBottom: 28,
              }}
            >
              {index + 1}
            </div>
            <div>
              <h2
                style={{
                  fontSize: "clamp(21px, 2vw, 30px)",
                  lineHeight: 1.05,
                  letterSpacing: "-.035em",
                  fontWeight: 500,
                  marginBottom: 14,
                }}
              >
                {step.title}
              </h2>
              <p style={{ color: T.textSecondary, fontSize: 14, lineHeight: 1.65 }}>
                {step.spoken}
              </p>
            </div>
          </article>
        ))}
      </div>

      {walkthrough.script && (
        <div
          style={{
            borderRadius: 24,
            border: `1px solid ${T.borderLight}`,
            background: "rgba(255,255,255,.84)",
            padding: "clamp(18px, 2.5vw, 28px)",
            boxShadow: "0 14px 32px rgba(26,26,26,.08)",
            animation: `fadeSlideIn .55s ease ${0.18 + walkthrough.steps.length * 0.28}s both`,
          }}
        >
          <div
            style={{
              color: T.textMuted,
              fontFamily: T.fontMono,
              fontSize: 11,
              marginBottom: 10,
              textTransform: "uppercase",
              letterSpacing: ".06em",
            }}
          >
            60-second script
          </div>
          <p style={{ color: T.textSecondary, fontSize: 15, lineHeight: 1.75 }}>
            {walkthrough.script}
          </p>
        </div>
      )}
    </section>
  );
}
