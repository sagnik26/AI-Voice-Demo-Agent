import type { Room } from "livekit-client";

export type UiState = "idle" | "connecting" | "listening" | "responding" | "error";

export type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  final?: boolean;
  latencyMs?: number;
};

export type TokenResponse = {
  url: string;
  token: string;
  roomName: string;
  identity: string;
  error?: string;
};

export type WalkthroughStep = {
  title: string;
  spoken: string;
  visual?: string;
};

export type WalkthroughScript = {
  type: "walkthrough_script";
  title: string;
  persona?: string;
  goal: string;
  script?: string;
  steps: WalkthroughStep[];
};

export type WaveformProps = {
  isActive: boolean;
  intensity?: number;
  color?: "blue" | "green";
  barCount?: number;
};

export type LatencyBadgeProps = {
  latencyMs?: number;
  state: UiState;
};

export type MessageBubbleProps = {
  message: Message;
  index: number;
};

export type WalkthroughCardProps = {
  walkthrough: WalkthroughScript;
  onClose: () => void;
};

export type ProgressBarProps = {
  isActive: boolean;
  userSpeaking: boolean;
};

export type VoiceControlsProps = {
  state: UiState;
  isActive: boolean;
  userSpeaking: boolean;
  agentSpeaking: boolean;
  voiceLevel: number;
  onToggleCall: () => void;
};

export type VoiceAgentUIProps = {
  autoConnect?: boolean;
};

export type DemoRoomHandoff = {
  room: Room;
  roomName: string;
  identity: string;
};
