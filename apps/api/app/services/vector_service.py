import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core.config import settings
from app.core.logger import logger
import httpx

# Initialize ChromaDB client
# Stores data in a local folder called "chroma_db"
chroma_client = chromadb.PersistentClient(
    path="./chroma_db",
    settings=ChromaSettings(anonymized_telemetry=False)
)

async def get_jina_embedding(text: str) -> list[float]:
    """Get embedding from Jina v4 API."""
    async with httpx.AsyncClient(timeout=30) as client:
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
        return data["data"][0]["embedding"]

async def get_jina_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Get embeddings for multiple texts."""
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            "https://api.jina.ai/v1/embeddings",
            headers={
                "Authorization": f"Bearer {settings.JINA_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "jina-embeddings-v3",
                "task": "retrieval.passage",
                "input": texts
            }
        )
        data = response.json()
        return [item["embedding"] for item in data["data"]]

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

        # NEW: use Jina for query embedding
        # task="retrieval.query" for questions (different from passage)
        async with httpx.AsyncClient(timeout=30) as client:
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