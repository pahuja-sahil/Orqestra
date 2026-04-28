import httpx
from bs4 import BeautifulSoup
from fastmcp import FastMCP
from app.services.vector_service import ingest_document
from app.core.logger import logger

ALLOWED_DOC_DOMAINS = [
    "docs.stripe.com",
    "docs.github.com",
    "www.twilio.com",
    "docs.sendgrid.com",
    "developers.google.com",
    "docs.aws.amazon.com",
    "docs.anthropic.com",
    "platform.openai.com",
]


def register_doc_fetcher(mcp: FastMCP):

    @mcp.tool()
    async def fetch_and_ingest_api_docs(
        url: str,
        api_name: str
    ) -> dict:
        """
        Fetches API documentation from an allowed domain.
        Extracts clean text and ingests into ChromaDB.
        Only allowed domains can be fetched for security.
        """
        domain = url.split("/")[2] if "/" in url else url

        if not any(allowed in domain for allowed in ALLOWED_DOC_DOMAINS):
            logger.warning("doc_fetch_blocked", domain=domain)
            return {
                "success": False,
                "error": f"Domain {domain} not in allowed list"
            }

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(
                    url,
                    headers={"User-Agent": "NEXUS/1.0 API Doc Fetcher"}
                )

                if response.status_code != 200:
                    return {
                        "success": False,
                        "error": f"HTTP {response.status_code}"
                    }

                soup = BeautifulSoup(response.text, "html.parser")

                for tag in soup(["script", "style", "nav",
                                  "footer", "header"]):
                    tag.decompose()

                text = soup.get_text(separator="\n", strip=True)
                text = "\n".join(
                    line for line in text.splitlines()
                    if len(line.strip()) > 20
                )

                if len(text) < 100:
                    return {
                        "success": False,
                        "error": "Not enough content extracted"
                    }

                chunks = await ingest_document(
                    text=text[:50000],
                    source=f"{api_name}_fetched"
                )

                logger.info("docs_fetched_ingested",
                            api=api_name,
                            url=url,
                            chunks=chunks)

                return {
                    "success": True,
                    "chunks_ingested": chunks,
                    "api_name": api_name
                }

        except Exception as e:
            logger.error("doc_fetch_error", error=str(e))
            return {"success": False, "error": str(e)}