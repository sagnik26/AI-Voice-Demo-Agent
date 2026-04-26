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
    TurnHandlingOptions,
    cli,
    function_tool,
    metrics,
)
from livekit.plugins import noise_cancellation, openai, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel
from livekit.agents import llm, stt, tts

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
                "answer to qualifying question one, 3) an answer to qualifying question two, and 4) "
                "the user's confirmation that they want to see the demo. Ask the two qualifying "
                "questions one at a time. As soon as the second qualifying answer is received, ask "
                "one short confirmation question: 'Would you like me to show the personalized demo "
                "walkthrough now?' Do not call show_walkthrough_script until the user agrees. If the "
                "user agrees, immediately call show_walkthrough_script before saying anything else. "
                "If the user declines, do not show the walkthrough and ask what they would like to "
                "adjust. The tool call must include a polished 60-second script and exactly three "
                "supporting beats."
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
        """Show a personalized 60-second walkthrough script in the user's demo UI after confirmation.

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

        await self.room.local_participant.publish_data(
            json.dumps(script).encode("utf-8"),
            reliable=True,
            topic="walkthrough",
        )

        return "The personalized walkthrough script is now visible in the UI."


server = AgentServer()


@server.rtc_session(agent_name="my-agent")
async def entrypoint(ctx: JobContext):
    vad = silero.VAD.load()

    session = AgentSession(
        llm=llm.FallbackAdapter(
            [
                openai.LLM(model="gpt-4o-mini"),
                openai.LLM(model="gpt-4.1-mini"),
            ]
        ),
        stt=stt.FallbackAdapter(
            [
                openai.STT(model="gpt-4o-mini-transcribe"),
                openai.STT(model="gpt-4o-transcribe"),
            ],
            vad=vad,
        ),
        tts=tts.FallbackAdapter(
            [
                openai.TTS(model="gpt-4o-mini-tts", voice="nova"),
                openai.TTS(model="tts-1", voice="shimmer"),
            ]
        ),
        vad=vad,
        turn_handling=TurnHandlingOptions(
            endpointing={"min_delay": 0.35, "max_delay": 2.5},
            interruption={
                "enabled": True,
                "min_duration": 0.25,
                "false_interruption_timeout": 1.2,
                "resume_false_interruption": True,
            },
            preemptive_generation={"enabled": True},
            turn_detection=MultilingualModel(),
        ),
        aec_warmup_duration=0.8,
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
        record=False,
        room_input_options=RoomInputOptions(
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )

    await ctx.connect()

    session.say(
        "Hi, I'm Hailey, your AI demo agent. I can turn a short product description "
        "into a personalized 60-second walkthrough script. Tell me about your product "
        "in one or two sentences.",
        allow_interruptions=True,
    )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    cli.run_app(server)
