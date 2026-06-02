import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Request, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.logger import logger
from app.services.vector_service import ingest_document
from app.services.converse_service import transcribe_audio, synthesize_speech, process_command
from app.services.auth_service import verify_token
import base64
import re

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
      Client sends: { type: "auth", token: "..." }  — must be first message within 10s
      Client sends: { type: "audio_chunk", seq: 0, mimeType: "...", data: "<base64>" }
      Client sends: { type: "end_stream" }
      Server sends: { type: "transcript", text: "..." }
      Server sends: { type: "response", text: "..." }
      Server sends: { type: "audio", data: "<base64>" }
      Server sends: { type: "error", message: "..." }
    """
    await websocket.accept()
    logger.info("websocket_connected")

    chunks = []  # list of (seq, mime_type, bytes)
    mime_type = "audio/webm"
    authenticated = False
    MAX_CHUNKS = 120

    try:
        # Issue #22: Auth timeout — first auth message must arrive within 10s
        first_message = await asyncio.wait_for(
            websocket.receive_text(), timeout=10
        )
        data = json.loads(first_message)

        if data.get("type") == "auth":
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
        else:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": "First message must be auth"
            }))
            await websocket.close()
            return

        while True:
            message = await websocket.receive_text()
            data = json.loads(message)
            msg_type = data.get("type")

            if msg_type == "auth":
                continue

            if msg_type == "audio_chunk":
                if not authenticated:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "Not authenticated"
                    }))
                    continue

                if len(chunks) >= MAX_CHUNKS:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "Recording too long — please send a shorter message and try again"
                    }))
                    chunks = []
                    continue

                chunk_b64 = data.get("data", "")
                seq = data.get("seq", len(chunks))
                incoming_mime = data.get("mimeType", "")
                if incoming_mime:
                    mime_type = incoming_mime

                if chunk_b64:
                    chunk_bytes = base64.b64decode(chunk_b64)
                    chunks.append((seq, mime_type, chunk_bytes))

                    await websocket.send_text(json.dumps({
                        "type": "chunk_received",
                        "total_chunks": len(chunks)
                    }))

            if msg_type == "end_stream":
                if not authenticated:
                    continue
                if not chunks:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "No audio received"
                    }))
                    continue

                await websocket.send_text(json.dumps({
                    "type": "processing",
                    "stage": "transcribing"
                }))

                chunks.sort(key=lambda c: c[0])
                full_audio = b"".join(c[2] for c in chunks)
                stream_mime = chunks[0][1] if chunks else mime_type
                chunks = []

                try:
                    transcript = await transcribe_audio(full_audio, mime_type=stream_mime)
                    await websocket.send_text(json.dumps({
                        "type": "transcript",
                        "text": transcript
                    }))

                    await websocket.send_text(json.dumps({
                        "type": "processing",
                        "stage": "thinking"
                    }))

                    result = await process_command(transcript, source="voice")
                    response_text = result["response"]
                    await websocket.send_text(json.dumps({
                        "type": "response",
                        "text": response_text
                    }))

                    await websocket.send_text(json.dumps({
                        "type": "processing",
                        "stage": "synthesizing"
                    }))

                    speak_text = response_text
                    if "```" in response_text or len(response_text) > 400:
                        speak_text = "I have generated the requested integration code. Please check the chat to view it."

                    audio_bytes = await synthesize_speech(speak_text)
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

            if msg_type == "ping":
                await websocket.send_text(json.dumps({
                    "type": "pong"
                }))
    
    except asyncio.TimeoutError:
        logger.warning("websocket_auth_timeout")
        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": "Authentication timeout — please reconnect and send auth within 10 seconds"
            }))
            await websocket.close()
        except Exception:
            pass
    except WebSocketDisconnect:
        logger.info("websocket_disconnected")
    except Exception as e:
        logger.error("websocket_error", error=str(e))

@router.post("/process")
async def process_text(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    body = await request.json()
    text = body.get("text", "")
    repo_url = body.get("repo_url", "")
    # Auto-detect GitHub URL from user text if not provided separately
    if not repo_url:
        url_match = re.search(r'https?://github\.com/([\w.-]+/[\w.-]+)', text)
        if url_match:
            repo_url = f"https://github.com/{url_match.group(1)}"
    conversation_history = body.get("conversation_history", [])

    if not text:
        raise HTTPException(status_code=400, detail="No text provided")

    result = await process_command(
        text,
        source="text",
        repo_url=repo_url,
        user_id=payload["sub"],
        db=db,
        conversation_history=conversation_history,
    )

    api_name = result.get("api_name", "")
    target_file = result.get("target_file", "")
    repo_path = result.get("repo_path", "")
    response_text = result.get("response", "")

    return {
        "response": response_text,
        "api_name": api_name,
        "target_file": target_file,
        "language": result.get("language", "python"),
        "default_branch": result.get("default_branch", "main"),
        "repo_path": repo_path,
    }


@router.post("/ingest")
async def ingest_docs(request: Request):
    """
    Ingests API documentation into ChromaDB.
    Send raw text of any API docs.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.replace("Bearer ", "")
    if not verify_token(token):
        raise HTTPException(status_code=401, detail="Invalid token")

    body = await request.json()
    text = body.get("text", "")
    source = body.get("source", "manual")

    if not text:
        raise HTTPException(status_code=400, detail="No text provided")

    chunks = await ingest_document(text=text, source=source)
    return {"message": f"Ingested {chunks} chunks", "source": source}