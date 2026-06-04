import asyncio
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
        await asyncio.to_thread(resend.Emails.send, {
            "from": settings.RESEND_FROM_EMAIL,
            "to": user_email,
            "subject": f"⚠️ ORQESTRA: Your {api_name} integration needs attention",
            "html": f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #0a0005; padding: 24px; border-radius: 12px;">
                    <h1 style="margin: 0 0 8px; display: flex; align-items: center; justify-content: center; gap: 8px;">
  <span style="display: inline-block; padding: 8px; background: rgba(59, 7, 100, 0.6); border-radius: 10px; line-height: 0;">
    <img src="https://orqestra.me/webhook.png" style="height: 20px; width: 20px; display: block;" alt="" />
  </span>
  <span style="color: #a78bfa;">ORQESTRA</span>
</h1>
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
                    
                    <p>ORQESTRA is working on fixing this automatically. 
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
        await asyncio.to_thread(resend.Emails.send, {
            "from": settings.RESEND_FROM_EMAIL,
            "to": user_email,
            "subject": f"✅ ORQESTRA: Your {api_name} integration has been fixed",
            "html": f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #0a0005; padding: 24px; border-radius: 12px;">
                    <h1 style="margin: 0 0 8px; display: flex; align-items: center; justify-content: center; gap: 8px;">
  <span style="display: inline-block; padding: 8px; background: rgba(59, 7, 100, 0.6); border-radius: 10px; line-height: 0;">
    <img src="https://orqestra.me/webhook.png" style="height: 20px; width: 20px; display: block;" alt="" />
  </span>
  <span style="color: #a78bfa;">ORQESTRA</span>
</h1>
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
                    
                    <p>No action required on your part. ORQESTRA handled everything automatically.</p>
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
        await asyncio.to_thread(resend.Emails.send, {
            "from": settings.RESEND_FROM_EMAIL,
            "to": user_email,
            "subject": f"🚨 ORQESTRA: Manual attention required for {api_name}",
            "html": f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #0a0005; padding: 24px; border-radius: 12px;">
                    <h1 style="margin: 0 0 8px; display: flex; align-items: center; justify-content: center; gap: 8px;">
  <span style="display: inline-block; padding: 8px; background: rgba(59, 7, 100, 0.6); border-radius: 10px; line-height: 0;">
    <img src="https://orqestra.me/webhook.png" style="height: 20px; width: 20px; display: block;" alt="" />
  </span>
  <span style="color: #a78bfa;">ORQESTRA</span>
</h1>
                    <p style="color: #94a3b8; margin: 0;">Autonomous API Integration Platform</p>
                </div>
                
                <div style="padding: 24px; border: 1px solid #fca5a5; border-radius: 12px; margin-top: 16px;">
                    <h2 style="color: #dc2626;">Manual Attention Required 🚨</h2>
                    <p>Hi <strong>{user_name}</strong>,</p>
<p>ORQESTRA attempted to automatically repair your 
                    <strong>{integration_name}</strong> ({api_name}) integration 
                    but was unable to fix it after 4 attempts.</p>
                    
                    <div style="background: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #dc2626;">
                        <strong>Integration:</strong> {integration_name}<br/>
                        <strong>API:</strong> {api_name}<br/>
                        <strong>Status:</strong> Repair Failed — Manual Review Needed
                    </div>
                    
                    <p>Please log in to your ORQESTRA dashboard to review and fix this integration manually.</p>
                    <a href="{settings.FRONTEND_URL}/dashboard" 
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


async def send_welcome_email(user_email: str, user_name: str):
    display_name = user_name or "there"
    try:
        await asyncio.to_thread(resend.Emails.send, {
            "from": settings.RESEND_FROM_EMAIL,
            "to": user_email,
            "subject": "🎉 Welcome to ORQESTRA — Your AI Integration Platform",
            "html": f"""
            <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #0a0005, #1a0020); padding: 32px; border-radius: 12px; text-align: center;">
                    <h1 style="margin: 0 0 4px; display: flex; align-items: center; justify-content: center; gap: 8px;">
  <span style="display: inline-block; padding: 8px; background: rgba(59, 7, 100, 0.6); border-radius: 10px; line-height: 0;">
    <img src="https://orqestra.me/webhook.png" style="height: 20px; width: 20px; display: block;" alt="" />
  </span>
  <span style="color: #a78bfa;">ORQESTRA</span>
</h1>
                    <p style="color: #94a3b8; margin: 0;">Autonomous API Integration Platform</p>
                </div>

                <div style="padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; margin-top: 16px;">
                    <h2 style="color: #1e293b; font-size: 22px;">Welcome, {display_name}! 🚀</h2>
                    <p style="color: #475569; line-height: 1.6;">Thanks for joining ORQESTRA. Your account is ready, and you can start integrating APIs in minutes — no manual coding required.</p>

                    <div style="background: #f8fafc; border-radius: 10px; padding: 20px; margin: 20px 0;">
                        <p style="margin: 8px 0;">🤖 <strong>Converse with AI</strong> — Describe your API, and ORQESTRA generates the code</p>
                        <p style="margin: 8px 0;">🔄 <strong>Self-healing</strong> — Integrations that repair themselves when issues arise</p>
                        <p style="margin: 8px 0;">📊 <strong>Real-time monitoring</strong> — Dashboard with live health status</p>
                        <p style="margin: 8px 0;">🔗 <strong>GitHub sync</strong> — Auto-create PRs with generated integration code</p>
                    </div>

                    <a href="{settings.FRONTEND_URL}/dashboard" 
                       style="background: #7c3aed; color: white; padding: 14px 32px; border-radius: 10px; 
                              text-decoration: none; display: inline-block; font-size: 16px; font-weight: 600;">
                        Go to Dashboard →
                    </a>

                    <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">
                        If you have questions, reply to this email or visit <a href="https://orqestra.me" style="color: #7c3aed;">orqestra.me</a>
                    </p>
                </div>
            </div>
            """
        })
        logger.info("welcome_email_sent", email=user_email)
    except Exception as e:
        logger.error("welcome_email_failed", error=str(e))