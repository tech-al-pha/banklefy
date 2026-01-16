import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { Pricing } from "@/components/Pricing";
import { UploadDemo } from "@/components/UploadDemo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { LogOut, Shield, History, Settings, PlayCircle } from "lucide-react"; // PlayCircle add kiya hai icon ke liye
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";

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
            <Logo />
            <div className="hidden md:flex items-center gap-6">
              
              {/* FIXED: Demo Button matches History/Settings style now */}
              <Button 
                variant="ghost"
                size="sm" 
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-sm gap-2 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300 font-medium"
              >
                <PlayCircle className="h-4 w-4" />
                Demo
              </Button>

              <Button 
                variant="ghost"
                size="sm" 
                onClick={() => navigate('/dashboard')}
                className="text-sm gap-2 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300"
              >
                <History className="h-4 w-4" />
                History
              </Button>

              <Button 
                variant="ghost"
                size="sm" 
                onClick={() => navigate('/settings')}
                className="text-sm gap-2 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>

              {isAdmin && (
                <Button 
                  variant="ghost"
                  size="sm" 
                  onClick={() => navigate('/admin')}
                  className="text-sm gap-1 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Button>
              )}

              <Button 
                variant="outline" 
                size="sm" 
                className="border-primary/50 text-foreground hover:bg-primary/10 transition-colors"
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
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-neon transition-transform active:scale-95"
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

      <Hero />
      <HowItWorks />

      <div id="features">
        <Features />
      </div>

      <div id="pricing">
        <Pricing />
      </div>

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
          <button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-neon transition-all duration-300 hover:scale-105 px-8 py-3 rounded-md font-bold"
            onClick={() => {
              document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Start Converting Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-primary/10 py-16 px-6 bg-background">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div className="space-y-4">
              <Logo />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Transform your bank statements into organized Excel files instantly with AI-powered precision.
              </p>
            </div>
            
            <div className="flex flex-col md:items-center">
              <div>
                <h4 className="font-bold mb-6 text-foreground uppercase tracking-widest text-xs">Product</h4>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
                  <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing</a></li>
                  <li><a href="#demo" className="hover:text-primary transition-colors">How It Works</a></li>
                </ul>
              </div>
            </div>
            
            <div className="flex flex-col md:items-end">
              <div className="w-full md:w-auto">
                <h4 className="font-bold mb-6 text-foreground uppercase tracking-widest text-xs">Company</h4>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li>
                    <button 
                      onClick={() => navigate('/about')}
                      className="hover:text-primary transition-colors text-left font-medium"
                    >
                      About 
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => navigate('/privacy')}
                      className="hover:text-primary transition-colors text-left font-medium"
                    >
                      Privacy Policy
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t border-primary/10 text-center text-xs text-muted-foreground tracking-[0.2em] uppercase">
            <p>© 2026 Akromeda. Created by Faizan Rizvi.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;