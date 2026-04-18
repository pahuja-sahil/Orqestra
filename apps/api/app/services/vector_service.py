import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core.config import settings
from app.core.logger import logger

# Initialize ChromaDB client
# Stores data in a local folder called "chroma_db"
chroma_client = chromadb.PersistentClient(
    path="./chroma_db",
    settings=ChromaSettings(anonymized_telemetry=False)
)

# Initialize Gemini embeddings
# Embeddings convert text to vectors (numbers)
# Similar text → similar numbers → easy to search
embeddings = GoogleGenerativeAIEmbeddings(
    model="models/text-embedding-005",
    google_api_key=settings.GEMINI_API_KEY
)

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
    """
    Takes raw text → splits into chunks → 
    embeds each chunk → stores in ChromaDB
    
    Returns number of chunks stored.
    """
    try:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ".", " "]
        )
        chunks = splitter.split_text(text)
        logger.info("document_split", chunks=len(chunks), source=source)

        collection = get_or_create_collection(collection_name)

        embedded = await embeddings.aembed_documents(chunks)

        ids = [f"{source}_{i}" for i in range(len(chunks))]

        existing = collection.get(ids=ids)
        if existing["ids"]:
            collection.delete(ids=existing["ids"])

        collection.add(
            documents=chunks,
            embeddings=embedded,
            ids=ids,
            metadatas=[{"source": source, "chunk": i} for i in range(len(chunks))]
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
    """
    Takes a question → converts to embedding →
    finds most similar chunks in ChromaDB →
    returns relevant text
    """
    try:
        collection = get_or_create_collection(collection_name)

        if collection.count() == 0:
            logger.warning("collection_empty", name=collection_name)
            return []

        query_embedding = await embeddings.aembed_query(query)

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