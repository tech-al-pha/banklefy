import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { Pricing } from "@/components/Pricing";
import { UploadDemo } from "@/components/UploadDemo";
import { Navbar, Footer } from "@/components/layout";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-dark text-foreground">
      <Navbar variant="landing" />

      {/* Hero Section */}
      <Hero />

      {/* How It Works Section */}
      <HowItWorks />

      {/* Features Section */}
      <div id="features">
        <Features />
      </div>

      {/* Pricing Section */}
      <div id="pricing">
        <Pricing />
      </div>

      {/* Upload Demo Section */}
      <div id="demo">
        <UploadDemo />
      </div>

      <Footer />
    </div>
  );
};

export default Index;
