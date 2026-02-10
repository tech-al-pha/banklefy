import { useNavigate } from "react-router-dom";
import { ArrowLeft, PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";

const Blog = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-primary/10 bg-ink/40 backdrop-blur-md p-4">
        <div className="container mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="back-pill w-full sm:w-auto"
          >
            <ArrowLeft size={18} /> Back to Home
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-16 sm:pt-28 sm:pb-20 max-w-5xl">
        <section className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-primary">
            <PenSquare className="h-4 w-4" />
            Blog
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white">
            Akromeda Blog
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Updates, tutorials, and product announcements from the Akromeda team.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Button className="bg-primary text-primary-foreground shadow-neon" onClick={() => navigate("/features")}>
              Explore Features
            </Button>
            <Button variant="outline" className="border-primary/40 text-foreground" onClick={() => navigate("/pricing")}>
              View Pricing
            </Button>
          </div>
        </section>

        <section className="glass-card border border-primary/20 rounded-2xl p-8 text-center">
          <p className="text-muted-foreground">
            No posts yet. Check back soon for the first update.
          </p>
        </section>
      </main>
    </div>
  );
};

export default Blog;
