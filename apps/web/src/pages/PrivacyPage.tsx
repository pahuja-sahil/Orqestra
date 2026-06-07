import { motion } from "motion/react"
import { Link } from "react-router-dom"
import { useThemeStore } from "@/store/themeStore"

export default function PrivacyPage() {
  const { isDark } = useThemeStore()

  const sections = [
    {
      title: "1. Information We Collect",
      content: "We collect information you provide when creating an account, including your name, email address, and profile picture (via Google OAuth). We also collect information about your integrations, GitHub repositories you connect, and usage data such as pages visited and features used."
    },
    {
      title: "2. How We Use Your Information",
      content: "Your information is used to: provide and maintain the platform; generate integration code based on your requests; monitor integration health and perform automated repairs; send email notifications about integration status; improve and optimize the platform; and comply with legal obligations."
    },
    {
      title: "3. Third-Party Services",
      content: "ORQESTRA uses the following third-party services: Google (authentication via OAuth), GitHub (code hosting and PR creation), Resend (email delivery), and AI/LLM providers (Gemini, Groq, OpenRouter) for code generation. Each service processes data according to its own privacy policy."
    },
    {
      title: "4. Data Storage & Security",
      content: "We encrypt sensitive data such as GitHub access tokens using industry-standard encryption (Fernet). Your data is stored in PostgreSQL databases with Redis caching. We implement rate limiting, circuit breakers, and authentication controls to protect your information. However, no method of transmission is 100% secure."
    },
    {
      title: "5. Code & Integration Data",
      content: "Generated integration code is stored in your account and may be shared with GitHub when you choose to create pull requests. We may cache API documentation and integration metadata to improve performance. You can delete integrations at any time through the dashboard."
    },
    {
      title: "6. Email Communications",
      content: "We send emails related to account activity (welcome emails) and integration status changes (broken, fixed, escalation alerts). You cannot opt out of service-critical emails, but you can manage your integrations to reduce alert volume."
    },
    {
      title: "7. Cookies & Tracking",
      content: "We use essential cookies for authentication (httpOnly refresh tokens) and functionality. We do not use tracking cookies or third-party analytics cookies. Theme preferences are stored in localStorage on your device."
    },
    {
      title: "8. Data Retention",
      content: "We retain your account data until you delete your account. Integration data is retained until the integration is deleted. Logs and monitoring data may be retained for up to 90 days for diagnostic purposes. You may request deletion of your data by contacting us."
    },
    {
      title: "9. Your Rights",
      content: "Depending on your jurisdiction, you may have rights including: access to your personal data, correction of inaccurate data, deletion of your data, restriction of processing, data portability, and withdrawal of consent. To exercise these rights, please contact us."
    },
    {
      title: "10. Changes to This Policy",
      content: "We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated 'Last updated' date. Continued use of the platform after changes constitutes acceptance of the updated policy."
    },
    {
      title: "11. Contact Us",
      content: "If you have questions about this Privacy Policy or how your data is handled, please contact us through the platform or at the support email provided on our website."
    }
  ]

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isDark ? "bg-zinc-950" : "bg-zinc-50"}`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Link
            to="/"
            className={`inline-flex items-center gap-2 text-sm font-medium mb-8 transition-colors duration-200 ${
              isDark ? "text-violet-500 hover:text-violet-400" : "text-violet-600 hover:text-violet-500"
            }`}
          >
            ← Back to home
          </Link>

          <div className={`p-6 sm:p-8 md:p-10 rounded-3xl border transition-colors duration-500 ${
            isDark
              ? "border-violet-950/40 bg-zinc-900/50"
              : "border-violet-100 bg-white"
          }`}>
            <h1 className={`text-3xl sm:text-4xl font-bold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
              Privacy Policy
            </h1>
            <p className={`text-sm mb-8 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              Last updated: June 7, 2026
            </p>

            <div className="space-y-8">
              {sections.map((section, i) => (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                >
                  <h2 className={`text-lg font-semibold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
                    {section.title}
                  </h2>
                  <p className={`text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    {section.content}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
