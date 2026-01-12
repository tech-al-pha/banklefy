import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { LogOut, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";

interface NavbarProps {
  variant?: "landing" | "dashboard";
}

export const Navbar = ({ variant = "landing" }: NavbarProps) => {
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

  const scrollToSection = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-navbar">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Logo />
          <div className="hidden md:flex items-center gap-2">
            {variant === "landing" && (
              <>
                <a 
                  href="#features" 
                  onClick={scrollToSection('features')}
                  className="nav-link text-sm cursor-pointer"
                >
                  Features
                </a>
                <a 
                  href="#pricing"
                  onClick={scrollToSection('pricing')}
                  className="nav-link text-sm cursor-pointer"
                >
                  Pricing
                </a>
                <a 
                  href="#demo"
                  onClick={scrollToSection('demo')}
                  className="nav-link text-sm cursor-pointer"
                >
                  Demo
                </a>
              </>
            )}
            {user && (
              <Button 
                variant="ghost"
                size="sm" 
                onClick={() => navigate('/dashboard')}
                className="nav-link text-sm"
              >
                Dashboard
              </Button>
            )}
            {isAdmin && (
              <Button 
                variant="ghost"
                size="sm" 
                onClick={() => navigate('/admin')}
                className="nav-link text-sm gap-1"
              >
                <Shield className="h-4 w-4" />
                Admin
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2 border-primary/30 hover:bg-primary/10 hover:border-primary/50"
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
            {variant === "landing" && (
              <Button 
                size="sm" 
                className="btn-premium bg-gradient-primary text-white shadow-neon"
                onClick={scrollToSection('demo')}
              >
                Get Started
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
