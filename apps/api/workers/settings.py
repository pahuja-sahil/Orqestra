"""
Alternative entry point — kept for reference.
The actual worker is entrypoint.py used by docker-compose.
"""
if __name__ == "__main__":
    from workers.entrypoint import main
    import asyncio
    asyncio.run(main())
