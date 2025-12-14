import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { Pricing } from "@/components/Pricing";
import { UploadDemo } from "@/components/UploadDemo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { LogOut, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import akromedaLogo from "@/assets/akromeda-logo.png";

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        const { data } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });
        setIsAdmin(!!data);
      } else {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [user]);

  const handleAuthClick = () => {
    if (user) {
      signOut();
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-primary/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={akromedaLogo} alt="Akromeda" className="h-8 w-8" />
              <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Akromeda
              </span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a 
                href="#features" 
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Features
              </a>
              <a 
                href="#pricing"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Pricing
              </a>
              <a 
                href="#demo"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Demo
              </a>
              {user && (
                <Button 
                  variant="ghost"
                  size="sm" 
                  onClick={() => navigate('/dashboard')}
                  className="text-sm"
                >
                  Dashboard
                </Button>
              )}
              {isAdmin && (
                <Button 
                  variant="ghost"
                  size="sm" 
                  onClick={() => navigate('/admin')}
                  className="text-sm gap-1"
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="border-primary/50 hover:bg-primary/10"
                onClick={handleAuthClick}
              >
                {user ? (
                  <>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
              <Button 
                size="sm" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-neon"
                onClick={() => {
                  document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

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

      {/* Footer CTA */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-primary opacity-10" />
        <div className="container mx-auto text-center relative z-10 space-y-6">
          <h2 className="text-4xl md:text-5xl font-bold">
            Ready to Transform Your
            <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Financial Workflow?
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of businesses and individuals who trust Akromeda for accurate, 
            instant bank statement conversions.
          </p>
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-neon transition-all duration-300 hover:scale-105"
            onClick={() => {
              document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Start Converting Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-primary/10 py-12 px-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <img src={akromedaLogo} alt="Akromeda" className="h-8 w-8" />
                <h3 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Akromeda
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Transform your bank statements into organized Excel files instantly with AI-powered precision.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing</a></li>
                <li><a href="#demo" className="hover:text-primary transition-colors">How It Works</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <button 
                    onClick={() => navigate('/privacy')}
                    className="hover:text-primary transition-colors text-left"
                  >
                    About & Privacy
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate('/privacy')}
                    className="hover:text-primary transition-colors text-left"
                  >
                    Privacy Policy
                  </button>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-foreground">Contact</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="tel:+917240233173" className="hover:text-primary transition-colors">
                    📱 +91 7240233173
                  </a>
                </li>
                <li>
                  <a href="mailto:inspirexali@gmail.com" className="hover:text-primary transition-colors">
                    📧 inspirexali@gmail.com
                  </a>
                </li>
                <li>
                  <a href="https://www.instagram.com/inspirexali" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                    📸 @inspirexali
                  </a>
                </li>
                <li className="text-muted-foreground/60">
                  📍 Kota, Rajasthan, India
                </li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-primary/10 text-center text-sm text-muted-foreground">
            <p>© 2026 Akromeda. Created by Sayyed Faizan Rizvi.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
