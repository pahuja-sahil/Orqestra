import asyncio
import io
import httpx
from groq import Groq
from app.core.config import settings
from app.core.logger import logger
from app.agents.rag_agent import run_agent
from app.agents.orqestra_agent import run_orqestra_agent

groq_client = Groq(api_key=settings.GROQ_API_KEY)

# Shared httpx client for connection pooling (Issue #32)
_httpx_client = httpx.AsyncClient(timeout=30)


async def transcribe_audio(audio_bytes: bytes, mime_type: str = "audio/webm") -> str:
    """
    Send audio bytes to Groq Whisper for transcription.
    Returns the transcript text.
    """
    try:
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = "audio.webm"

        transcription = await asyncio.to_thread(
            groq_client.audio.transcriptions.create,
            file=("audio.webm", audio_file, mime_type),
            model="whisper-large-v3-turbo",
            language="en",
            response_format="text",
        )

        logger.info("transcription_complete", length=len(transcription))
        return transcription.strip()

    except Exception as e:
        logger.error("transcription_failed", error=str(e))
        raise


async def synthesize_speech(text: str) -> bytes:
    """
    Send text to Deepgram Aura and get back audio bytes.
    Falls back to None if Deepgram fails.
    """
    try:
        response = await _httpx_client.post(
            f"https://api.deepgram.com/v1/speak?model={settings.DEEPGRAM_VOICE_MODEL}",
            headers={
                "Authorization": f"Token {settings.DEEPGRAM_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "text": text
            }
        )

        if response.status_code == 200:
            logger.info("tts_complete", chars=len(text))
            return response.content
        else:
            logger.warning("tts_unavailable", status=response.status_code, response_text=response.text)
            return None

    except Exception as e:
        logger.error("tts_error", error=str(e))
        return None


async def process_command(
    text: str,
    source: str = "voice",
    repo_url: str = "",
    user_id: str = "",
    db=None,
    conversation_history: list | None = None,
) -> dict:
    if not text:
        return {"response": "I didn't catch that. Could you try again?", "api_name": ""}
    try:
        result = await run_orqestra_agent(
            text,
            source=source,
            repo_url=repo_url,
            user_id=user_id,
            db=db,
            conversation_history=conversation_history or [],
        )
        return result
    except Exception as e:
        error_str = str(e)
        logger.error("agent_failed", error=error_str)
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
            return {"response": "ORQESTRA is thinking hard right now — rate limit reached. Please retry in a moment.", "api_name": ""}
        return {"response": "I encountered an issue processing your request. Please try again.", "api_name": ""}