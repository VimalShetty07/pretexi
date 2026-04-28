import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Protexi — Under Development",
  description: "Marketing page is currently under development.",
};

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-brand-900">
      <section className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6">
        <div className="rounded-2xl border border-border bg-white p-10 text-center shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Under Development
          </h1>
          <p className="mt-3 text-base text-brand-700/80">
            The Protexi marketing page is currently being built.
          </p>
        </div>
      </section>
    </main>
  );
}
