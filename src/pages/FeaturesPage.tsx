import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Globe, Brain, Zap, FileSpreadsheet, Lock, Clock } from "lucide-react";
import Logo from "@/components/Logo";

const features = [
  {
    icon: Globe,
    title: "MULTILINGUAL SUPPORT",
    description: "Akromeda supports over 50 languages including Hindi, Arabic, Mandarin, French, Spanish, German, Portuguese, Russian, and many more. Our AI accurately recognizes and processes bank statements in any language, making it perfect for international businesses and individuals working with global financial documents. No matter where your bank is located or what language your statements are in, Akromeda handles them all with precision.",
  },
  {
    icon: Brain,
    title: "AI-POWERED OCR",
    description: "Our advanced Optical Character Recognition (OCR) technology powered by cutting-edge AI can extract data from any type of bank statement - whether it's a high-quality digital PDF or a low-resolution scanned document. The AI intelligently identifies transaction details, dates, amounts, and descriptions even from poor quality images, handwritten notes, or complex table structures. This ensures you can convert any statement, regardless of its source or quality.",
  },
  {
    icon: Zap,
    title: "INSTANT PROCESSING",
    description: "Experience lightning-fast conversion speeds with results delivered in seconds, not hours. Akromeda's optimized processing pipeline uses distributed computing to analyze and convert your statements instantly. Upload your document and get your Excel file almost immediately - perfect for time-sensitive accounting tasks, audits, or financial analysis. No waiting, no delays, just instant results.",
  },
  {
    icon: FileSpreadsheet,
    title: "EXCEL COMPATIBLE",
    description: "Get clean, professionally formatted Excel spreadsheets that are fully compatible with all major accounting software including QuickBooks, Xero, SAP, and more. Each converted file is structured with proper columns for dates, descriptions, debits, credits, and running balances - ready for immediate use in financial analysis, tax preparation, or bookkeeping. You can also export to CSV and JSON formats for maximum flexibility with your workflow.",
  },
  {
    icon: Lock,
    title: "BANK-LEVEL SECURITY",
    description: "Your financial data security is our top priority. Akromeda uses military-grade end-to-end encryption to protect your sensitive banking information. All documents are encrypted during upload, processing, and storage. We never store your data longer than necessary, and you have full control to delete your conversions at any time. Our security measures meet international banking compliance standards, ensuring your financial information stays completely private and secure.",
  },
  {
    icon: Clock,
    title: "BATCH PROCESSING",
    description: "Save time by uploading and processing multiple bank statements simultaneously. Whether you need to convert dozens of monthly statements or handle multiple accounts at once, Akromeda's batch processing feature handles them all in parallel. Perfect for accountants, financial analysts, and business owners who need to process large volumes of statements efficiently. Process your entire year's worth of statements in minutes, not hours.",
  },
];

const FeaturesPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0502] text-white font-sans selection:bg-primary/30">
      {/* Header Area */}
      <nav className="border-b border-primary/10 bg-black/40 backdrop-blur-md p-4 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <Logo />
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')} 
            className="text-primary hover:bg-primary/10 gap-2 font-bold uppercase tracking-tighter"
          >
            <ArrowLeft size={18} /> Back to Home
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-16 max-w-5xl">
        {/* Header Section */}
        <section className="text-center mb-20 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-primary uppercase mb-6">
            FEATURES
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to convert and manage bank statements from anywhere in the world
          </p>
        </section>

        {/* Features List */}
        <section className="space-y-16">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index}
                className="animate-in fade-in slide-in-from-bottom-5 duration-700"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start gap-6 p-8 bg-[#1A100B] border border-primary/20 rounded-[2rem] transition-all hover:border-primary hover:shadow-neon">
                  <div className="bg-primary/10 p-4 rounded-full text-primary flex-shrink-0">
                    <Icon size={32} />
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-2xl md:text-3xl font-black text-primary uppercase tracking-wide">
                      {feature.title}
                    </h2>
                    <p className="text-muted-foreground leading-relaxed text-lg">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <footer className="mt-20 pt-8 border-t border-white/5 text-center text-xs text-muted-foreground tracking-[0.3em] uppercase">
          © 2026 Akromeda | Engineered for Excellence
        </footer>
      </main>
    </div>
  );
};

export default FeaturesPage;