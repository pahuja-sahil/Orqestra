from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Request, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.logger import logger
from app.services.converse_service import transcribe_audio, synthesize_speech, process_command
from app.services.auth_service import verify_token
import json
import base64

router = APIRouter()


@router.post("/transcribe")
async def transcribe(request: Request):
    """
    REST endpoint for transcription.
    Receives audio file, returns transcript.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.replace("Bearer ", "")
    if not verify_token(token):
        raise HTTPException(status_code=401, detail="Invalid token")

    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="No audio data")

    transcript = await transcribe_audio(body)
    return {"transcript": transcript}


@router.post("/synthesize")
async def synthesize(request: Request):
    """
    REST endpoint for TTS.
    Receives text, returns audio bytes.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.replace("Bearer ", "")
    if not verify_token(token):
        raise HTTPException(status_code=401, detail="Invalid token")

    body = await request.json()
    text = body.get("text", "")
    if not text:
        raise HTTPException(status_code=400, detail="No text provided")

    audio_bytes = await synthesize_speech(text)
    if not audio_bytes:
        raise HTTPException(status_code=500, detail="TTS failed")

    return Response(
        content=audio_bytes,
        media_type="audio/mpeg"
    )


@router.websocket("/ws")
async def voice_websocket(websocket: WebSocket):
    """
    WebSocket for real-time voice streaming.
    
    Protocol:
      Client sends: { type: "auth", token: "..." }
      Client sends: { type: "audio_chunk", data: "<base64>" }
      Client sends: { type: "end_stream" }
      Server sends: { type: "transcript", text: "..." }
      Server sends: { type: "response", text: "..." }
      Server sends: { type: "audio", data: "<base64>" }
      Server sends: { type: "error", message: "..." }
    """
    await websocket.accept()
    logger.info("websocket_connected")

    audio_chunks = []
    authenticated = False

    try:
        while True:
            message = await websocket.receive_text()
            data = json.loads(message)
            msg_type = data.get("type")

            if msg_type == "auth":
                token = data.get("token", "")
                payload = verify_token(token)
                if not payload:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "Invalid token"
                    }))
                    await websocket.close()
                    return
                authenticated = True
                await websocket.send_text(json.dumps({
                    "type": "auth_ok"
                }))
                logger.info("websocket_authenticated", user=payload.get("sub"))

            elif msg_type == "audio_chunk":
                if not authenticated:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "Not authenticated"
                    }))
                    continue

                chunk_b64 = data.get("data", "")
                if chunk_b64:
                    chunk_bytes = base64.b64decode(chunk_b64)
                    audio_chunks.append(chunk_bytes)

                    await websocket.send_text(json.dumps({
                        "type": "chunk_received",
                        "total_chunks": len(audio_chunks)
                    }))

            elif msg_type == "end_stream":
                if not authenticated:
                    continue
                if not audio_chunks:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "No audio received"
                    }))
                    continue

                await websocket.send_text(json.dumps({
                    "type": "processing",
                    "stage": "transcribing"
                }))

                full_audio = b"".join(audio_chunks)
                audio_chunks = []

                try:
                    transcript = await transcribe_audio(full_audio)
                    await websocket.send_text(json.dumps({
                        "type": "transcript",
                        "text": transcript
                    }))

                    await websocket.send_text(json.dumps({
                        "type": "processing",
                        "stage": "thinking"
                    }))

                    response_text = await process_command(transcript, source="voice")
                    await websocket.send_text(json.dumps({
                        "type": "response",
                        "text": response_text
                    }))

                    await websocket.send_text(json.dumps({
                        "type": "processing",
                        "stage": "synthesizing"
                    }))

                    audio_bytes = await synthesize_speech(response_text)
                    if audio_bytes:
                        audio_b64 = base64.b64encode(audio_bytes).decode()
                        await websocket.send_text(json.dumps({
                            "type": "audio",
                            "data": audio_b64
                        }))

                    await websocket.send_text(json.dumps({
                        "type": "complete"
                    }))

                except Exception as e:
                    logger.error("voice_processing_error", error=str(e))
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "Processing failed. Please try again."
                    }))

    except WebSocketDisconnect:
        logger.info("websocket_disconnected")
    except Exception as e:
        logger.error("websocket_error", error=str(e))

@router.post("/process")
async def process_text(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.replace("Bearer ", "")
    if not verify_token(token):
        raise HTTPException(status_code=401, detail="Invalid token")
    body = await request.json()
    text = body.get("text", "")
    if not text:
        raise HTTPException(status_code=400, detail="No text provided")
    response = await process_command(text, source="text")
    return {"response": response}