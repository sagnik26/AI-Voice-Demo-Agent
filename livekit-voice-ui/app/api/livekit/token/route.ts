import {
  AccessToken,
  RoomAgentDispatch,
  RoomConfiguration,
} from "livekit-server-sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const livekitUrl = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!livekitUrl || !apiKey || !apiSecret) {
    return NextResponse.json(
      {
        error:
          "Missing LIVEKIT_URL, LIVEKIT_API_KEY, or LIVEKIT_API_SECRET in the Next.js environment.",
      },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const roomName =
    searchParams.get("room") ||
    `demo-room-${Math.random().toString(36).slice(2, 8)}`;
  const identity =
    searchParams.get("identity") ||
    `web-user-${Math.random().toString(36).slice(2, 8)}`;

  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    name: identity,
    ttl: "30m",
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  token.roomConfig = new RoomConfiguration({
    agents: [
      new RoomAgentDispatch({
        agentName: "my-agent",
      }),
    ],
  });

  return NextResponse.json({
    url: livekitUrl,
    token: await token.toJwt(),
    roomName,
    identity,
  });
}
