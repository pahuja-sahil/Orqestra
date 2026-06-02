import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core.config import settings
from app.core.circuit_breaker import get_redis
from app.core.logger import logger
import httpx
import hashlib

# Initialize ChromaDB client
# Supports persistent (local) or HTTP (server) mode via CHROMA_MODE env var
if settings.CHROMA_MODE == "http":
    chroma_client = chromadb.HttpClient(
        host=settings.CHROMA_HOST,
        port=settings.CHROMA_PORT,
        settings=ChromaSettings(anonymized_telemetry=False)
    )
else:
    chroma_client = chromadb.PersistentClient(
        path="./chroma_db",
        settings=ChromaSettings(anonymized_telemetry=False)
    )

_shared_httpx_client = None


def _get_shared_client() -> httpx.AsyncClient:
    global _shared_httpx_client
    if _shared_httpx_client is None:
        _shared_httpx_client = httpx.AsyncClient(timeout=30)
    return _shared_httpx_client


def _text_hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


async def get_jina_embedding(text: str) -> list[float]:
    """Get embedding from Jina v4 API with Redis caching (Issue #24)."""
    text_h = _text_hash(text)
    try:
        redis = await get_redis()
        cached = await redis.get(f"embedding:{text_h}")
        if cached:
            import json
            return json.loads(cached)
    except Exception:
        pass

    client = _get_shared_client()
    response = await client.post(
        "https://api.jina.ai/v1/embeddings",
        headers={
            "Authorization": f"Bearer {settings.JINA_API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "model": "jina-embeddings-v3",
            "task": "retrieval.passage",
            "input": [text]
        }
    )
    data = response.json()
    embedding = data["data"][0]["embedding"]

    try:
        import json
        redis = await get_redis()
        await redis.setex(f"embedding:{text_h}", 3600, json.dumps(embedding))
    except Exception:
        pass

    return embedding


async def get_jina_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Get embeddings for multiple texts with individual caching."""
    client = _get_shared_client()
    uncached_texts = []
    uncached_indices = []
    results = [None] * len(texts)

    try:
        redis = await get_redis()
        import json
        for i, text in enumerate(texts):
            text_h = _text_hash(text)
            cached = await redis.get(f"embedding:{text_h}")
            if cached:
                results[i] = json.loads(cached)
            else:
                uncached_texts.append(text)
                uncached_indices.append(i)
    except Exception:
        uncached_texts = texts
        uncached_indices = list(range(len(texts)))

    if uncached_texts:
        response = await client.post(
            "https://api.jina.ai/v1/embeddings",
            headers={
                "Authorization": f"Bearer {settings.JINA_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "jina-embeddings-v3",
                "task": "retrieval.passage",
                "input": uncached_texts
            }
        )
        data = response.json()
        try:
            import json
            redis = await get_redis()
            for idx, item in zip(uncached_indices, data["data"]):
                embedding = item["embedding"]
                results[idx] = embedding
                text_h = _text_hash(uncached_texts[uncached_indices.index(idx)])
                await redis.setex(f"embedding:{text_h}", 3600, json.dumps(embedding))
        except Exception:
            pass

    return results

def get_or_create_collection(name: str):
    """Get existing collection or create new one."""
    try:
        return chroma_client.get_collection(name=name)
    except Exception:
        return chroma_client.create_collection(name=name)

async def ingest_document(
    text: str,
    source: str,
    collection_name: str = "api_docs"
) -> int:
    try:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ".", " "]
        )
        chunks = splitter.split_text(text)
        logger.info("document_split", chunks=len(chunks), source=source)

        collection = get_or_create_collection(collection_name)

        # NEW: use Jina batch embeddings
        embedded = await get_jina_embeddings_batch(chunks)

        ids = [f"{source}_{i}" for i in range(len(chunks))]

        existing = collection.get(ids=ids)
        if existing["ids"]:
            collection.delete(ids=existing["ids"])

        collection.add(
            documents=chunks,
            embeddings=embedded,
            ids=ids,
            metadatas=[{"source": source, "chunk": i}
                       for i in range(len(chunks))]
        )

        logger.info("document_ingested", chunks=len(chunks), source=source)
        return len(chunks)

    except Exception as e:
        logger.error("ingestion_failed", error=str(e))
        raise

async def retrieve_relevant_chunks(
    query: str,
    collection_name: str = "api_docs",
    n_results: int = 5
) -> list[str]:
    try:
        collection = get_or_create_collection(collection_name)

        if collection.count() == 0:
            logger.warning("collection_empty", name=collection_name)
            return []

        # Cache query embedding in Redis (Issue #24)
        query_h = _text_hash(f"query:{query}")
        query_embedding = None
        try:
            redis = await get_redis()
            import json
            cached = await redis.get(f"qembed:{query_h}")
            if cached:
                query_embedding = json.loads(cached)
        except Exception:
            pass

        if query_embedding is None:
            client = _get_shared_client()
            response = await client.post(
                "https://api.jina.ai/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {settings.JINA_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "jina-embeddings-v3",
                    "task": "retrieval.query",
                    "input": [query]
                }
            )
            data = response.json()
            query_embedding = data["data"][0]["embedding"]
            try:
                import json
                redis = await get_redis()
                await redis.setex(f"qembed:{query_h}", 3600, json.dumps(query_embedding))
            except Exception:
                pass

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(n_results, collection.count())
        )

        chunks = results["documents"][0] if results["documents"] else []
        logger.info("chunks_retrieved", count=len(chunks), query=query[:50])
        return chunks

    except Exception as e:
        logger.error("retrieval_failed", error=str(e))
        return []


async def get_relevant_docs(api_name: str, top_k: int = 3) -> str:
    """
    Get relevant API documentation for a given API name.
    Used by repair agent to get context.
    """
    query = f"{api_name} API documentation authentication endpoints"
    chunks = await retrieve_relevant_chunks(query, n_results=top_k)
    
    if not chunks:
        return f"No documentation found for {api_name}"
    
    return "\n\n---\n\n".join(chunks)