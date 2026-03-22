import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-[#06122b] text-white py-16 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#1657ad] via-[#2563eb] to-[#0f3f86]" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-blue-700/10 rounded-full blur-[80px]" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="relative w-32 h-9 mb-4">
              <Image src="/logo.png" alt="Protexi" fill className="object-contain" />
            </div>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">UK Sponsor Compliance, Simplified. Built for HR teams, compliance managers, and leadership.</p>
            <div className="flex gap-2">
              {[["Li","LinkedIn"],["Tw","Twitter"],["Gh","GitHub"]].map(([s,label]) => (
                <a key={s} href="#" aria-label={label} className="w-8 h-8 rounded-lg bg-white/6 hover:bg-white/12 flex items-center justify-center text-xs font-bold text-slate-500 hover:text-white transition-all">{s}</a>
              ))}
            </div>
          </div>
          {[
            { title: "Product", links: ["Features","Pricing","Changelog","Roadmap","API Docs"] },
            { title: "Company", links: ["About","Blog","Careers","Contact","Press Kit"] },
            { title: "Legal",   links: ["Privacy Policy","Terms of Service","Cookie Policy","Data Processing","Security"] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-bold text-slate-200 mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}><a href="#" className="text-sm text-slate-500 hover:text-slate-200 transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/6 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-600">© {new Date().getFullYear()} Protexi Ltd. All rights reserved. Registered in England & Wales.</p>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
