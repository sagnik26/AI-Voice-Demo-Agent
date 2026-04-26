# Hailey Demo Voice Agent

This repository contains a full-stack LiveKit voice agent demo. The app lets a user join a live voice call with Hailey, an AI product demo agent. Hailey introduces herself, collects a short product description, asks two qualifying questions, and can show a personalized 60-second walkthrough script in the UI.

## Demo video

[demo video](./livekit-voice-ui/assets/Demo.mov)

## Features

- **Clean chat-style voice UI**: live transcript bubbles for both the user and Hailey.
- **Voice activity visualization**: indicates when the user vs the agent is speaking, with a waveform driven by realtime audio levels.
- **Barge-in support**: the user can interrupt Hailey while she is speaking for more natural turn-taking.
- **Tuned turn handling**: endpointing + interruption settings are tuned for snappy demo UX (fewer awkward pauses / late cutoffs).
- **Walkthrough payloads**: after two qualifying questions + confirmation, the agent publishes a personalized walkthrough over the LiveKit data channel and the UI renders it.
- **Resilient demo UX**: clear system messages for token/connection errors, autoplay blocks, and microphone permission failures.

## Project Structure

```text
.
├── docker-compose.yml
├── livekit-voice-agent/      # Python LiveKit worker / voice agent
└── livekit-voice-ui/         # Next.js UI and token API route
```

The UI uses the Next.js App Router. Route files live in `livekit-voice-ui/app`, while reusable UI code lives in `livekit-voice-ui/src`.

```text
livekit-voice-ui/
├── app/
│   ├── api/livekit/token/route.ts
│   ├── demo/page.tsx
│   ├── layout.tsx
│   └── page.tsx
└── src/
    ├── components/
    ├── modules/
    ├── types/
    └── utils/
```

## Requirements

- Docker and Docker Compose
- LiveKit Cloud project credentials
- OpenAI API key

For local non-Docker development, you also need:

- Node.js
- Python 3.12+
- `uv`

## Environment Variables

Create environment files from the examples:

```bash
cp livekit-voice-ui/.env.example livekit-voice-ui/.env
cp livekit-voice-agent/.env.example livekit-voice-agent/.env
```

`livekit-voice-ui/.env`:

```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
```

`livekit-voice-agent/.env`:

```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
OPENAI_API_KEY=sk-your_openai_api_key
```

The UI uses LiveKit credentials to mint room tokens. The Python agent uses LiveKit credentials to register the worker and `OPENAI_API_KEY` for LLM, STT, and TTS.

## Run With Docker

From the repository root:

```bash
docker compose up --build
```

Open:

```text
http://localhost:3000
```

To use a different host port for the UI:

```bash
VOICE_UI_PORT=3001 docker compose up --build
```

## Local Development

Run the Python agent:

```bash
cd livekit-voice-agent
uv sync
uv run agentTwo.py download-files
uv run agentTwo.py start
```

Run the Next.js UI:

```bash
cd livekit-voice-ui
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## How The Demo Works

1. The landing page at `/` renders the join screen.
2. Clicking `Join demo call` requests a LiveKit token from `/api/livekit/token`.
3. The token route creates a room token and dispatches the `my-agent` LiveKit agent.
4. The browser connects to the LiveKit room and waits for Hailey to join.
5. After connection, the UI redirects to `/demo`.
6. Hailey introduces herself, asks product qualification questions, and can publish walkthrough JSON over the LiveKit data channel.
7. The UI receives the walkthrough payload and renders a full-width animated walkthrough presentation.

## Useful Commands

Type-check the UI:

```bash
cd livekit-voice-ui
npx tsc --noEmit
```

Build the UI:

```bash
cd livekit-voice-ui
npm run build
```

Check Python syntax:

```bash
python3 -m py_compile livekit-voice-agent/agentTwo.py
```

View Docker logs:

```bash
docker compose logs -f voice-agent
docker compose logs -f voice-ui
```

## Improvement Scope (Next Steps)

- **Latency / responsiveness**
  - Reduce time-to-first-token (TTFT) and time-to-first-audio by optimizing model choices, chunking, and streaming.
  - Add proactive “thinking / listening” UI states that reflect realtime pipeline stages (capturing → transcribing → reasoning → speaking).

- **Observability & measurement**
  - Track key metrics end-to-end (TTFT, transcription latency, synthesis latency, end-to-end roundtrip, disconnect rate).
  - Add structured logging and request/session IDs for debugging and demo reliability.

- **Agent behavior & safety**
  - Improve dialog strategy (questioning, confirmations, summarization) and handle edge cases (silence, off-topic, low-confidence STT).
  - Add guardrails: prompt injection resistance, PII handling, and content policy handling.

## Notes

- The agent name is `my-agent`; the UI token route dispatches this agent into each new demo room.
- The UI creates a fresh dynamic room name for each demo call.
- The stop button in the call UI opens a confirmation modal before disconnecting and returning to the home page.
- The walkthrough presentation includes a close button so the user can return to the chat interface without ending the call.
