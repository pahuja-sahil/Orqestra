import io
import httpx
from groq import Groq
from app.core.config import settings
from app.core.logger import logger
from app.agents.rag_agent import run_agent

groq_client = Groq(api_key=settings.GROQ_API_KEY)


async def transcribe_audio(audio_bytes: bytes, mime_type: str = "audio/webm") -> str:
    """
    Send audio bytes to Groq Whisper for transcription.
    Returns the transcript text.
    """
    try:
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = "audio.webm"

        transcription = groq_client.audio.transcriptions.create(
            file=("audio.webm", audio_file, mime_type),
            model="whisper-large-v3-turbo",
            language="en",
            response_format="text"
        )

        logger.info("transcription_complete", length=len(transcription))
        return transcription.strip()

    except Exception as e:
        logger.error("transcription_failed", error=str(e))
        raise


async def synthesize_speech(text: str) -> bytes:
    """
    Send text to ElevenLabs and get back audio bytes.
    Falls back to None if ElevenLabs fails.
    """
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{settings.ELEVENLABS_VOICE_ID}",
                headers={
                    "xi-api-key": settings.ELEVENLABS_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "text": text,
                    "model_id": "eleven_turbo_v2",
                    "voice_settings": {
                        "stability": 0.6,
                        "similarity_boost": 0.75,
                        "style": 0.3,
                        "use_speaker_boost": True
                    }
                }
            )

            if response.status_code == 200:
                logger.info("tts_complete", chars=len(text))
                return response.content
            else:
                logger.warning("tts_unavailable", status=response.status_code)
                return None

    except Exception as e:
        logger.error("tts_error", error=str(e))
        return None


async def process_command(text: str, source: str = "voice") -> str:
    """
    Main entry point for processing user commands.
    Routes through the RAG agent for intelligent responses.
    """
    if not text:
        return "I didn't catch that. Could you try again?"

    try:
        response = await run_agent(text, source=source)
        return response
    except Exception as e:
        logger.error("agent_failed", error=str(e))
        return "I encountered an issue processing your request. Please try again."