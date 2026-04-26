import json
import logging
import time

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentSession,
    AgentServer,
    AgentStateChangedEvent,
    MetricsCollectedEvent,
    JobContext,
    RoomInputOptions,
    cli,
    function_tool,
    metrics,
)
from livekit.plugins import noise_cancellation, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel
from livekit.agents import inference, llm, stt, tts

logger = logging.getLogger(__name__)

load_dotenv(".env")


class Assistant(Agent):
    def __init__(self, room: rtc.Room) -> None:
        self.room = room
        super().__init__(
            instructions=(
                "You are Hailey, an upbeat AI demo agent. Your job is to take a short product "
                "description from the user, ask exactly two qualifying questions as if the user is "
                "a simulated prospect, and then create a personalized 60-second product walkthrough "
                "script based on their answers. Keep spoken replies under 3 sentences. Do not call "
                "the show_walkthrough_script tool until you have: 1) a product description, 2) an "
                "answer to qualifying question one, and 3) an answer to qualifying question two. "
                "Ask the two qualifying questions one at a time. After the second answer, call "
                "show_walkthrough_script with a polished 60-second script and three supporting beats."
            ),
        )

    @function_tool
    async def show_walkthrough_script(
        self,
        title: str,
        persona: str,
        goal: str,
        step_1_title: str,
        step_1_spoken: str,
        step_2_title: str,
        step_2_spoken: str,
        step_3_title: str,
        step_3_spoken: str,
        sixty_second_script: str,
    ) -> str:
        """Show a personalized 60-second walkthrough script in the user's demo UI.

        Args:
            title: Short title for the personalized demo.
            persona: The user's role, company type, or audience.
            goal: The main outcome the user wants from the demo.
            step_1_title: Title of the first walkthrough step.
            step_1_spoken: What Hailey should explain for the first step.
            step_2_title: Title of the second walkthrough step.
            step_2_spoken: What Hailey should explain for the second step.
            step_3_title: Title of the third walkthrough step.
            step_3_spoken: What Hailey should explain for the third step.
            sixty_second_script: A polished script that can be spoken in roughly 60 seconds.
        """
        script = {
            "type": "walkthrough_script",
            "title": title,
            "persona": persona,
            "goal": goal,
            "script": sixty_second_script,
            "steps": [
                {"title": step_1_title, "spoken": step_1_spoken},
                {"title": step_2_title, "spoken": step_2_spoken},
                {"title": step_3_title, "spoken": step_3_spoken},
            ],
        }

        self.room.local_participant.publish_data(
            json.dumps(script),
            reliable=True,
            topic="walkthrough",
        )

        return "The personalized walkthrough script is now visible in the UI."


server = AgentServer()


@server.rtc_session(agent_name="my-agent")
async def entrypoint(ctx: JobContext):
    session = AgentSession(
        llm=llm.FallbackAdapter(
            [
                inference.LLM("openai/gpt-4.1-mini"),
                inference.LLM("google/gemini-2.5-flash"),
            ]
        ),
        stt=stt.FallbackAdapter(
            [
                inference.STT("deepgram/nova-3"),
                inference.STT("assemblyai/universal-streaming"),
            ]
        ),
        tts=tts.FallbackAdapter(
            [
                inference.TTS("cartesia/sonic-3:9626c31c-bec5-4cca-baa8-f8ba9e84c8bc"),
                inference.TTS("inworld/inworld-tts-1"),
            ]
        ),
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel(),
        preemptive_generation=True,
    )

    usage_collector = metrics.UsageCollector()
    last_eou_metrics: metrics.EOUMetrics | None = None

    @session.on("metrics_collected")
    def _on_metrics_collected(ev: MetricsCollectedEvent):
        nonlocal last_eou_metrics
        if ev.metrics.type == "eou_metrics":
            last_eou_metrics = ev.metrics

        metrics.log_metrics(ev.metrics)
        usage_collector.collect(ev.metrics)

    async def log_usage():
        summary = usage_collector.get_summary()
        logger.info("Usage summary: %s", summary)

    ctx.add_shutdown_callback(log_usage)

    @session.on("agent_state_changed")
    def _on_agent_state_changed(ev: AgentStateChangedEvent):
        if (
            ev.new_state == "speaking"
            and last_eou_metrics
            and session.current_speech
            and last_eou_metrics.speech_id == session.current_speech.id
        ):
            elapsed = time.time() - last_eou_metrics.timestamp
            logger.info(f"Time to first audio: {elapsed:.3f} seconds")

    await session.start(
        agent=Assistant(ctx.room),
        room=ctx.room,
        room_input_options=RoomInputOptions(
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )

    await ctx.connect()

    session.generate_reply(
        instructions=(
            "Introduce yourself as Hailey, the AI demo agent. Explain that you can turn a short "
            "product description into a personalized 60-second walkthrough script. Ask the user "
            "to describe the product in one or two sentences."
        )
    )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    cli.run_app(server)
