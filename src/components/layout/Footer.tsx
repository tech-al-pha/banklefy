import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";

export const Footer = () => {
  const navigate = useNavigate();

  return (
    <>
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
              <Logo />
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
    </>
  );
};
