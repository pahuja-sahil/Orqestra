import { motion } from "motion/react"
import { Link } from "react-router-dom"
import { useThemeStore } from "@/store/themeStore"

export default function TermsPage() {
  const { isDark } = useThemeStore()

  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: "By accessing or using ORQESTRA, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform. We may update these terms at any time, and continued use constitutes acceptance of the changes."
    },
    {
      title: "2. Description of Service",
      content: "ORQESTRA is an autonomous API integration platform that generates, monitors, and repairs integration code. The platform provides AI-powered code generation, voice-based interaction, background health monitoring, automated repair workflows, and GitHub integration features."
    },
    {
      title: "3. User Accounts",
      content: "You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate information during registration. You may not use another person's account without permission. Notify us immediately of any unauthorized access."
    },
    {
      title: "4. Acceptable Use",
      content: "You agree not to: (a) use the platform for any unlawful purpose; (b) attempt to bypass rate limits, authentication, or security measures; (c) upload malicious code or attempt to exploit the platform; (d) use the platform to generate code that violates third-party rights; (e) interfere with the operation of the service."
    },
    {
      title: "5. Code Generation & Ownership",
      content: "You retain full ownership of any code generated through ORQESTRA. We make no warranties about the correctness, security, or fitness of generated code. You are responsible for reviewing and testing all generated code before using it in production environments."
    },
    {
      title: "6. Third-Party Services",
      content: "ORQESTRA integrates with third-party services including Google (authentication), GitHub (code hosting), and various AI/LLM providers. Your use of these services is subject to their respective terms of service. We are not responsible for the availability or performance of third-party services."
    },
    {
      title: "7. Limitation of Liability",
      content: "ORQESTRA is provided 'as is' without warranties of any kind. We shall not be liable for any damages arising from your use of the platform, including but not limited to data loss, service interruption, or damages resulting from generated code."
    },
    {
      title: "8. Termination",
      content: "We reserve the right to suspend or terminate accounts that violate these terms or engage in abusive behavior. Upon termination, your right to use the platform ceases immediately. We may retain certain data as required by law."
    },
    {
      title: "9. Governing Law",
      content: "These terms shall be governed by the laws of the jurisdiction in which the company is registered. Any disputes shall be resolved through binding arbitration in accordance with standard commercial arbitration rules."
    },
    {
      title: "10. Contact",
      content: "For questions about these terms, please contact us through the platform or at the support email provided on our website."
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
              Terms of Service
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
