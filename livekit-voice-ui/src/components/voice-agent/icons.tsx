import { T } from "@/src/utils/theme";

export function SparkIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke={T.textSecondary}
      strokeLinecap="round"
      strokeWidth="2.5"
    >
      <line x1="5" x2="9" y1="12" y2="12" />
      <line x1="15" x2="19" y1="12" y2="12" />
      <line x1="12" x2="12" y1="5" y2="9" />
      <line x1="12" x2="12" y1="15" y2="19" />
    </svg>
  );
}

export function MicIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="3" width="6" height="11" rx="3" fill={T.accent} />
      <path d="M5 11a7 7 0 0 0 14 0" stroke={T.accent} strokeLinecap="round" strokeWidth="2" />
      <line x1="12" x2="12" y1="18" y2="22" stroke={T.accent} strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

export function StopIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill={T.red}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}
