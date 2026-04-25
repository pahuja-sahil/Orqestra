import resend
from app.core.config import settings
from app.core.logger import logger

resend.api_key = settings.RESEND_API_KEY


async def send_integration_broken(
    user_email: str,
    user_name: str,
    integration_name: str,
    api_name: str
):
    try:
        resend.Emails.send({
            "from": settings.RESEND_FROM_EMAIL,
            "to": user_email,
            "subject": f"⚠️ NEXUS: Your {api_name} integration needs attention",
            "html": f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #0a0005; padding: 24px; border-radius: 12px;">
                    <h1 style="color: #ef4444; margin: 0 0 8px;">⚡ NEXUS</h1>
                    <p style="color: #94a3b8; margin: 0;">Autonomous API Integration Platform</p>
                </div>
                
                <div style="padding: 24px; border: 1px solid #fca5a5; border-radius: 12px; margin-top: 16px;">
                    <h2 style="color: #1e293b;">Integration Alert</h2>
                    <p>Hi <strong>{user_name}</strong>,</p>
                    <p>Your <strong>{integration_name}</strong> ({api_name}) integration 
                    has encountered issues and is being automatically repaired.</p>
                    
                    <div style="background: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #ef4444;">
                        <strong>Integration:</strong> {integration_name}<br/>
                        <strong>API:</strong> {api_name}<br/>
                        <strong>Status:</strong> Repair in progress...
                    </div>
                    
                    <p>NEXUS is working on fixing this automatically. 
                    You'll receive another email once it's resolved.</p>
                </div>
            </div>
            """
        })
        logger.info("notification_sent_broken",
                    email=user_email,
                    integration=integration_name)
    except Exception as e:
        logger.error("notification_failed", error=str(e))


async def send_integration_fixed(
    user_email: str,
    user_name: str,
    integration_name: str,
    api_name: str
):
    try:
        resend.Emails.send({
            "from": settings.RESEND_FROM_EMAIL,
            "to": user_email,
            "subject": f"✅ NEXUS: Your {api_name} integration has been fixed",
            "html": f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #0a0005; padding: 24px; border-radius: 12px;">
                    <h1 style="color: #ef4444; margin: 0 0 8px;">⚡ NEXUS</h1>
                    <p style="color: #94a3b8; margin: 0;">Autonomous API Integration Platform</p>
                </div>
                
                <div style="padding: 24px; border: 1px solid #86efac; border-radius: 12px; margin-top: 16px;">
                    <h2 style="color: #1e293b;">Integration Fixed ✅</h2>
                    <p>Hi <strong>{user_name}</strong>,</p>
                    <p>Great news! Your <strong>{integration_name}</strong> ({api_name}) 
                    integration has been automatically repaired and is working normally.</p>
                    
                    <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #22c55e;">
                        <strong>Integration:</strong> {integration_name}<br/>
                        <strong>API:</strong> {api_name}<br/>
                        <strong>Status:</strong> Healthy ✅
                    </div>
                    
                    <p>No action required on your part. NEXUS handled everything automatically.</p>
                </div>
            </div>
            """
        })
        logger.info("notification_sent_fixed",
                    email=user_email,
                    integration=integration_name)
    except Exception as e:
        logger.error("notification_failed", error=str(e))


async def send_integration_failed_repair(
    user_email: str,
    user_name: str,
    integration_name: str,
    api_name: str
):
    try:
        resend.Emails.send({
            "from": settings.RESEND_FROM_EMAIL,
            "to": user_email,
            "subject": f"🚨 NEXUS: Manual attention required for {api_name}",
            "html": f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #0a0005; padding: 24px; border-radius: 12px;">
                    <h1 style="color: #ef4444; margin: 0 0 8px;">⚡ NEXUS</h1>
                    <p style="color: #94a3b8; margin: 0;">Autonomous API Integration Platform</p>
                </div>
                
                <div style="padding: 24px; border: 1px solid #fca5a5; border-radius: 12px; margin-top: 16px;">
                    <h2 style="color: #dc2626;">Manual Attention Required 🚨</h2>
                    <p>Hi <strong>{user_name}</strong>,</p>
                    <p>NEXUS attempted to automatically repair your 
                    <strong>{integration_name}</strong> ({api_name}) integration 
                    but was unable to fix it after 3 attempts.</p>
                    
                    <div style="background: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #dc2626;">
                        <strong>Integration:</strong> {integration_name}<br/>
                        <strong>API:</strong> {api_name}<br/>
                        <strong>Status:</strong> Repair Failed — Manual Review Needed
                    </div>
                    
                    <p>Please log in to your NEXUS dashboard to review and fix this integration manually.</p>
                    <a href="http://localhost:5173/dashboard" 
                       style="background: #dc2626; color: white; padding: 12px 24px; 
                              border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 8px;">
                        Open Dashboard
                    </a>
                </div>
            </div>
            """
        })
        logger.info("notification_sent_escalation",
                    email=user_email,
                    integration=integration_name)
    except Exception as e:
        logger.error("notification_failed", error=str(e))