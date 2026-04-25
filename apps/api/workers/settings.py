from arq.connections import RedisSettings
from arq.cron import cron
from app.core.config import settings
from workers.monitor import monitor_integrations
from workers.repair import repair_integration

REDIS_SETTINGS = RedisSettings.from_dsn(settings.REDIS_URL)


class WorkerSettings:
    functions = [repair_integration]
    cron_jobs = [
        cron(monitor_integrations, minute={0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55})
    ]
    redis_settings = REDIS_SETTINGS
    max_jobs = 10
    job_timeout = 300