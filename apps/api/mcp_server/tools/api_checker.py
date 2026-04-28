import httpx
from fastmcp import FastMCP
from app.core.logger import logger

def register_api_checker(mcp: FastMCP):

    @mcp.tool()
    async def check_stripe_health(secret_key: str = "sk_test_demo") -> dict:
        """
        Checks if Stripe API is reachable and credentials work.
        Makes lightweight call to /v1/balance endpoint.
        """
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    "https://api.stripe.com/v1/balance",
                    headers={"Authorization": f"Bearer {secret_key}"}
                )
                if response.status_code == 200:
                    logger.info("stripe_health_ok")
                    return {"healthy": True, "status": response.status_code}
                else:
                    logger.warning("stripe_health_fail",
                                   status=response.status_code)
                    return {
                        "healthy": False,
                        "status": response.status_code,
                        "error": response.text[:200]
                    }
        except Exception as e:
            logger.error("stripe_health_error", error=str(e))
            return {"healthy": False, "error": str(e)}

    @mcp.tool()
    async def check_github_health(token: str = "demo_token") -> dict:
        """
        Checks if GitHub API is reachable and token is valid.
        Makes lightweight call to /rate_limit endpoint.
        """
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    "https://api.github.com/rate_limit",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Accept": "application/vnd.github.v3+json"
                    }
                )
                healthy = response.status_code == 200
                logger.info("github_health_check", healthy=healthy)
                return {
                    "healthy": healthy,
                    "status": response.status_code
                }
        except Exception as e:
            logger.error("github_health_error", error=str(e))
            return {"healthy": False, "error": str(e)}

    @mcp.tool()
    async def check_generic_api_health(
        url: str,
        method: str = "GET",
        headers: dict = {}
    ) -> dict:
        """
        Generic health check for any API endpoint.
        Only allows GET and HEAD methods for safety.
        """
        if method.upper() not in ["GET", "HEAD"]:
            return {
                "healthy": False,
                "error": "Only GET and HEAD allowed for safety"
            }

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.request(
                    method=method.upper(),
                    url=url,
                    headers=headers
                )
                healthy = 200 <= response.status_code < 300
                return {
                    "healthy": healthy,
                    "status": response.status_code
                }
        except Exception as e:
            return {"healthy": False, "error": str(e)}