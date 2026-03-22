const FeatureCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm ${className ?? ""}`}>
    {children}
  </div>
);

const VisaIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-white">
    <rect x="4" y="4" width="16" height="14" rx="2"/>
    <path d="M4 9h16"/>
    <circle cx="12" cy="14" r="2.5"/>
    <path d="M12 12.5v1.5l1 .8"/>
    <path d="M7 7v1M7 12h2M7 15h1.5"/>
  </svg>
);

const VerifyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-white">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.3-4.3"/>
    <path d="M9 11l2 2 4-4"/>
  </svg>
);

const DocAutoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-white">
    <path d="M7 2h7l5 5v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>
    <path d="M14 2v5h5"/>
    <path d="M8 11h8M8 15h5"/>
    <path d="M11 8l-1 4h2l-1 4"/>
  </svg>
);

const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-white">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const ChartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-white">
    <path d="M3 3v18h18"/>
    <path d="M7 14v-4M11 14V8M15 14v-2M19 14V6"/>
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-white">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <path d="M16 2v4M8 2v4M3 10h18"/>
    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
  </svg>
);

const features = [
  {
    icon: (
      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shrink-0">
        <VisaIcon />
      </div>
    ),
    title: "Visa Expiry Tracking",
    desc: "Track every visa holder in one live register, with clear ownership and upcoming risk dates.",
    bullets: ["Alerts at 90, 60, 30 and 7 days", "Visa type, expiry and status in one view", "Audit-ready exports in minutes"],
    topColor: "border-t-[#1657ad]",
  },
  {
    icon: (
      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shrink-0">
        <VerifyIcon />
      </div>
    ),
    title: "Background Verification",
    desc: "Run checks in a consistent flow so every hire has the same standard of evidence.",
    bullets: ["Right-to-work evidence tracking", "DBS and reference progress logs", "Time-stamped audit trail end to end"],
    topColor: "border-t-blue-600",
  },
  {
    icon: (
      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shrink-0">
        <DocAutoIcon />
      </div>
    ),
    title: "Document Automation",
    desc: "Send document requests automatically and collect files securely without manual follow-up.",
    bullets: ["Role-based checklist templates", "Secure upload links and reminders", "Version history with expiry monitoring"],
    topColor: "border-t-blue-600",
  },
  {
    icon: (
      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shrink-0">
        <AlertIcon />
      </div>
    ),
    title: "Smart Alerts",
    desc: "Route the right alert to the right person before a deadline becomes a licence risk.",
    bullets: ["Email, Slack and in-app notifications", "Rules by team, role or event type", "Escalation paths for missed actions"],
    topColor: "border-t-blue-500",
  },
  {
    icon: (
      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shrink-0">
        <ChartIcon />
      </div>
    ),
    title: "CoS Planning Insights",
    desc: "See CoS allocation versus usage clearly, so planning and requests are based on real demand.",
    bullets: ["Allocation vs usage trend view", "Forward demand forecast", "Budget and usage tracking"],
    topColor: "border-t-blue-600",
  },
  {
    icon: (
      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shrink-0">
        <CalendarIcon />
      </div>
    ),
    title: "Compliance Calendar",
    desc: "Plan renewals, reporting windows and licence tasks on one shared compliance timeline.",
    bullets: ["Renewal and reporting milestones", "Training and policy deadlines", "Licence review reminders"],
    topColor: "border-t-blue-600",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-28 bg-white relative overflow-hidden">
      <div className="absolute inset-0 dot-grid opacity-40" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-50 rounded-full blur-[120px] pointer-events-none opacity-80" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            Everything you need to stay compliant
          </h2>
          <p className="text-slate-500 text-base max-w-2xl mx-auto">Built for UK sponsor licence teams. Every workflow is designed around what you need to show during a Home Office review.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f) => (
            <FeatureCard key={f.title} className={`border-t-4 ${f.topColor}`}>
              <div className="p-8 group">
                <div className="flex items-start gap-4 mb-5">
                  <div className="group-hover:scale-105 transition-transform duration-200">{f.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="mb-1">
                      <h3 className="text-lg font-semibold text-slate-900">{f.title}</h3>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-slate-500">
                  {f.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </FeatureCard>
          ))}
        </div>
      </div>
    </section>
  );
}
