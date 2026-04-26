import type { DemoRoomHandoff } from "@/src/types";

let pendingDemoRoom: DemoRoomHandoff | null = null;

export function setPendingDemoRoom(handoff: DemoRoomHandoff) {
  pendingDemoRoom = handoff;
}

export function takePendingDemoRoom() {
  const handoff = pendingDemoRoom;
  pendingDemoRoom = null;
  return handoff;
}
