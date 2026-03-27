import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import SupportContactDialog from "@/components/SupportContactDialog";
import { aboutContacts, aboutHighlights, aboutPrinciples } from "@/content/footerPages";

const AboutPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-elevated/80 backdrop-blur-xl border-b border-primary/20">
        <div className="container mx-auto px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <Button variant="ghost" onClick={() => navigate("/")} className="back-pill w-full sm:w-auto">
            <ArrowLeft size={18} /> Back to Home
          </Button>
        </div>
      </nav>

      <main className="container mx-auto max-w-5xl px-6 pt-32 pb-16">
        <section className="space-y-4 text-center">
          <p className="inline-flex items-center rounded-full border border-primary/30 bg-card/60 px-4 py-2 text-sm text-foreground/80">
            About Banklefy
          </p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white">About Banklefy</h1>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            Banklefy converts bank statements into structured exports for review, reconciliation, and
            downstream accounting work. Text-based PDFs are parsed directly. Scanned or image-based
            pages use OCR only where needed.
          </p>
          <p className="text-xs text-muted-foreground">Last updated: March 27, 2026</p>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          {aboutHighlights.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-2xl border border-primary/20 bg-[#141414] p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-white">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.content}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          {aboutPrinciples.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-2xl border border-primary/20 bg-[#141414] p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-white">{item.title}</h2>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
                  {item.items.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-3">
          {aboutContacts.map((item) => {
            const Icon = item.icon;
            const card = (
              <article className="rounded-2xl border border-primary/20 bg-[#141414] p-6 h-full">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-white">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.content}</p>
              </article>
            );

            if (item.title === "Support") {
              return (
                <div key={item.title} className="space-y-4">
                  {card}
                  <SupportContactDialog
                    source="about_page"
                    trigger={
                      <Button className="w-full bg-primary text-primary-foreground shadow-neon">
                        {item.actionLabel ?? "Contact Support"}
                      </Button>
                    }
                  />
                </div>
              );
            }

            if (item.href) {
              return (
                <div key={item.title} className="space-y-4">
                  {card}
                  <Button asChild className="w-full bg-primary text-primary-foreground shadow-neon">
                    <a
                      href={item.href}
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noopener noreferrer" : undefined}
                    >
                      {item.actionLabel ?? "Open"}
                    </a>
                  </Button>
                </div>
              );
            }

            return (
              <div key={item.title} className="space-y-4">
                {card}
              </div>
            );
          })}
        </section>

        <footer className="mt-12 border-t border-primary/10 pt-6 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Banklefy is a processing tool. Review every export before using it in accounting, lending, or tax work.
        </footer>
      </main>
    </div>
  );
};

export default AboutPage;
