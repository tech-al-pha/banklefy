import { ArrowLeft, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import SupportContactDialog from "@/components/SupportContactDialog";
import { contactCards } from "@/content/footerPages";
import AutoHideHeader from "@/components/AutoHideHeader";

const Contact = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <AutoHideHeader as="nav" className="bg-surface-elevated/80 backdrop-blur-xl border-b border-primary/20">
        <div className="container mx-auto px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <Button variant="ghost" onClick={() => navigate("/")} className="back-pill w-full sm:w-auto">
            <ArrowLeft size={18} /> Back to Home
          </Button>
        </div>
      </AutoHideHeader>

      <main className="container mx-auto max-w-4xl px-6 pt-32 pb-16">
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/60 px-4 py-2">
            <Mail className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground/80">Contact</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white">Contact</h1>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            Use this page for conversion issues, account access, billing questions, privacy requests,
            and export problems. Include the file name and conversion ID when you have them.
          </p>
          <p className="text-xs text-muted-foreground">Last updated: March 27, 2026</p>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          {contactCards.map((card) => {
            const Icon = card.icon;
            const content = (
              <article className="glass-card rounded-2xl p-6 space-y-4 transition-all hover:shadow-neon">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-white">{card.title}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{card.content}</p>
                </div>
              </article>
            );

            if (card.title === "Support form") {
              return (
                <div key={card.title} className="space-y-4">
                  {content}
                  <SupportContactDialog
                    source="contact_page"
                    trigger={
                      <Button className="w-full bg-primary text-primary-foreground shadow-neon">
                        {card.actionLabel ?? "Open Support"}
                      </Button>
                    }
                  />
                </div>
              );
            }

            return (
              <div key={card.title} className="space-y-4">
                {content}
                {card.href ? (
                  <Button asChild className="w-full bg-primary text-primary-foreground shadow-neon">
                    <a href={card.href}>{card.actionLabel ?? "Open"}</a>
                  </Button>
                ) : null}
              </div>
            );
          })}
        </section>

        <section className="mt-10 glass-card rounded-2xl p-6 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-white">What to include</h2>
          <p className="mt-2">
            File name, conversion ID, order ID for billing-related issues, a screenshot when the issue is visual,
            and the browser or device you used.
          </p>
        </section>
      </main>
    </div>
  );
};

export default Contact;
