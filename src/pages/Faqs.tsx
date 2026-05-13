import { useEffect } from "react";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { faqSections, helpSections } from "@/content/footerPages";
import AutoHideHeader from "@/components/AutoHideHeader";

const Faqs = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const targetId = location.hash.replace("#", "");
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AutoHideHeader as="nav" className="bg-surface-elevated/80 backdrop-blur-xl border-b border-primary/20">
        <div className="container mx-auto flex flex-row items-center justify-between gap-3 px-6 py-4">
          <Logo />
          <Button variant="ghost" onClick={() => navigate("/")} className="back-pill">
            <ArrowLeft size={18} /> Back to Home
          </Button>
        </div>
      </AutoHideHeader>

      <main className="container mx-auto max-w-5xl px-6 pt-32 pb-16">
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/60 px-4 py-2">
            <HelpCircle className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground/80">FAQs & Help</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white">FAQs & Help</h1>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            Straight answers and practical notes for file handling, passwords, limits, storage,
            exports, and support.
          </p>
          <p className="text-xs text-muted-foreground">Last updated: March 27, 2026</p>
        </section>

        <section className="mt-12 space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-primary/10" />
            <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">FAQ</h2>
            <div className="h-px flex-1 bg-primary/10" />
          </div>

          <div className="space-y-4">
            {faqSections.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-2xl border border-primary/15 bg-[#141414] px-6 py-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">{item.content}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section id="help" className="mt-14 space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-primary/10" />
            <h2 className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Help</h2>
            <div className="h-px flex-1 bg-primary/10" />
          </div>

          <div className="space-y-4">
            {helpSections.map((section) => {
              const Icon = section.icon;
              return (
                <article
                  key={section.id}
                  id={section.id}
                  className="rounded-2xl border border-primary/15 bg-[#141414] px-6 py-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-white">{section.title}</h3>
                      <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                        {section.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Faqs;
