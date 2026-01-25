import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Globe, Brain, Zap, FileSpreadsheet, Lock, Clock, 
  MessageCircle, Calculator, ShieldCheck, FileText, PieChart, 
  BarChart3, CreditCard, TrendingUp, AlertTriangle, Download,
  RefreshCw, Eye, Layers, Database, CheckCircle2
} from "lucide-react";
import Logo from "@/components/Logo";

const features = [
  // Core Features
  {
    icon: Brain,
    title: "AI-POWERED OCR ENGINE",
    category: "Core Technology",
    description: "Our advanced Groq Vision OCR engine extracts data from any bank statement format - PDFs, scanned images, or photos. It intelligently recognizes transaction tables, dates, amounts, and descriptions with near-perfect accuracy, even from low-quality or handwritten documents.",
  },
  {
    icon: FileSpreadsheet,
    title: "EXCEL & CSV EXPORT",
    category: "Export",
    description: "Convert your bank statements to clean, professionally formatted Excel (.xlsx) and CSV files. All transactions are organized with proper columns for Date, Description, Debit, Credit, Balance, and AI-generated Category. Compatible with QuickBooks, Tally, Xero, and all major accounting software.",
  },
  {
    icon: FileText,
    title: "PDF REPORT GENERATION",
    category: "Export",
    description: "Generate comprehensive PDF reports with Akromeda branding, complete financial summary, underwriting metrics, and detailed transaction breakdown. Perfect for loan applications, audits, and client presentations.",
  },
  
  // Financial Analysis
  {
    icon: Calculator,
    title: "FOIR CALCULATION",
    category: "Financial Analysis",
    description: "Automatic Fixed Obligations to Income Ratio (FOIR) calculation using rule-based analysis. The system identifies salary credits and EMI debits to compute your FOIR score - a critical metric used by banks and NBFCs for loan eligibility assessment.",
  },
  {
    icon: CreditCard,
    title: "EMI DETECTION",
    category: "Financial Analysis",
    description: "Intelligent EMI detection using regex patterns and keyword matching. Identifies all recurring loan payments including home loans, car loans, personal loans, credit card EMIs, and BNPL payments. No AI guessing - pure deterministic pattern matching.",
  },
  {
    icon: TrendingUp,
    title: "SALARY CREDIT ANALYSIS",
    category: "Financial Analysis",
    description: "Automatically detects salary credits based on patterns like 'SALARY', 'SAL', 'NEFT' from employers, and recurring monthly credits. Calculates average monthly income for underwriting decisions.",
  },
  {
    icon: PieChart,
    title: "CASHFLOW ANALYSIS",
    category: "Financial Analysis",
    description: "Complete cashflow breakdown with total inflows, outflows, and net cashflow calculation. Visualize your money movement with categorized transaction summaries and monthly trends.",
  },
  {
    icon: BarChart3,
    title: "AVERAGE DAILY BALANCE",
    category: "Financial Analysis",
    description: "Computes your Average Daily Balance (ADB) and Average Monthly Balance (AMB) - key metrics used by banks for maintaining minimum balance requirements and loan assessments.",
  },
  
  // Fraud & Risk
  {
    icon: AlertTriangle,
    title: "FRAUD DETECTION",
    category: "Risk Analysis",
    description: "Advanced fraud detection panel that flags suspicious transactions, unusual patterns, and potential red flags. Identifies round-figure transactions, weekend anomalies, duplicate entries, and balance mismatches.",
  },
  {
    icon: ShieldCheck,
    title: "INTEGRITY SCORING",
    category: "Risk Analysis",
    description: "Bank-grade integrity scoring system that validates statement authenticity. Checks for balance continuity, date sequence, and mathematical consistency across all transactions.",
  },
  {
    icon: Eye,
    title: "UNDERWRITING PANEL",
    category: "Risk Analysis",
    description: "Comprehensive underwriting dashboard showing all key financial metrics at a glance - monthly income, EMI obligations, FOIR, balance trends, and risk flags. Perfect for lending decisions.",
  },
  
  // User Experience
  {
    icon: Globe,
    title: "50+ LANGUAGE SUPPORT",
    category: "Accessibility",
    description: "Process bank statements in over 50 languages including Hindi, Arabic, Mandarin, Japanese, Spanish, French, German, and more. Our AI accurately handles multilingual documents and international bank formats.",
  },
  {
    icon: Zap,
    title: "INSTANT PROCESSING",
    category: "Performance",
    description: "Lightning-fast conversion with results in under 30 seconds. Upload your document and get your Excel file almost instantly - perfect for time-sensitive accounting tasks and audits.",
  },
  {
    icon: RefreshCw,
    title: "BATCH PROCESSING",
    category: "Performance",
    description: "Process multiple bank statements simultaneously. Upload an entire year of statements and convert them all in parallel. Ideal for accountants and financial analysts handling bulk data.",
  },
  {
    icon: MessageCircle,
    title: "CHAT AURA AI ASSISTANT",
    category: "AI Assistant",
    description: "Interactive AI chat assistant that helps you understand your financial data, answer questions about transactions, and provide insights about your spending patterns and cash flow.",
  },
  
  // Security & Privacy
  {
    icon: Lock,
    title: "BANK-GRADE ENCRYPTION",
    category: "Security",
    description: "Military-grade AES-256 encryption for all documents during upload, processing, and storage. Your financial data is protected with the same security standards used by major banks.",
  },
  {
    icon: Database,
    title: "ZERO DATA RETENTION",
    category: "Privacy",
    description: "We don't store your bank statements after processing. All documents are automatically deleted after conversion is complete. You maintain full control over your sensitive financial information.",
  },
  
  // Technical Features
  {
    icon: Layers,
    title: "SMART CATEGORIZATION",
    category: "AI",
    description: "Mistral AI-powered transaction categorization that intelligently classifies each transaction into categories like Salary, EMI, Utilities, Shopping, Food, Transfer, and more. Fully customizable category mapping.",
  },
  {
    icon: Download,
    title: "MULTIPLE EXPORT FORMATS",
    category: "Export",
    description: "Export your data in multiple formats - Excel (.xlsx), CSV, JSON, and branded PDF reports. Each format is optimized for different use cases from accounting software to data analysis.",
  },
  {
    icon: CheckCircle2,
    title: "RULE-BASED ACCURACY",
    category: "Technology",
    description: "Unlike pure AI systems, Akromeda uses deterministic rule-based analysis for financial calculations. No hallucinations, no guessing - every number is calculated with mathematical precision and is fully explainable.",
  },
  {
    icon: Clock,
    title: "DAILY RESET LIMITS",
    category: "Usage",
    description: "Your conversion limits reset daily at midnight in your local timezone. Anonymous users get 2 free conversions per day, while registered users enjoy 6 conversions daily with additional benefits.",
  },
];

// Group features by category
const categoryOrder = [
  "Core Technology",
  "Financial Analysis",
  "Risk Analysis",
  "AI Assistant",
  "Export",
  "Performance",
  "Security",
  "Privacy",
  "Accessibility",
  "Technology",
  "Usage"
];

const FeaturesPage = () => {
  const navigate = useNavigate();
  
  // Group features by category
  const groupedFeatures = categoryOrder.reduce((acc, category) => {
    const categoryFeatures = features.filter(f => f.category === category);
    if (categoryFeatures.length > 0) {
      acc[category] = categoryFeatures;
    }
    return acc;
  }, {} as Record<string, typeof features>);

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

      <main className="container mx-auto px-6 py-16 max-w-6xl">
        {/* Header Section */}
        <section className="text-center mb-20 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-primary uppercase mb-6">
            ALL FEATURES
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Complete A-Z list of everything Akromeda offers - from AI-powered OCR to bank-grade security. 
            Built for accuracy, speed, and enterprise-grade financial analysis.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {categoryOrder.map((cat) => (
              <span 
                key={cat} 
                className="px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs text-primary uppercase tracking-wider font-medium"
              >
                {cat}
              </span>
            ))}
          </div>
        </section>

        {/* Features by Category */}
        {Object.entries(groupedFeatures).map(([category, categoryFeatures], catIdx) => (
          <section key={category} className="mb-16">
            <h2 className="text-2xl font-black text-primary uppercase tracking-widest mb-8 border-b border-primary/20 pb-4">
              {category}
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {categoryFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div 
                    key={index}
                    className="animate-in fade-in slide-in-from-bottom-5 duration-700"
                    style={{ animationDelay: `${(catIdx * 50) + (index * 50)}ms` }}
                  >
                    <div className="h-full flex items-start gap-5 p-6 bg-[#1A100B] border border-primary/20 rounded-2xl transition-all hover:border-primary hover:shadow-neon">
                      <div className="bg-primary/10 p-3 rounded-full text-primary flex-shrink-0">
                        <Icon size={24} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-black text-white uppercase tracking-wide">
                          {feature.title}
                        </h3>
                        <p className="text-muted-foreground leading-relaxed text-sm">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* CTA Section */}
        <section className="mt-20 text-center p-12 bg-[#1A100B] border border-primary/20 rounded-3xl">
          <h2 className="text-3xl font-black text-primary uppercase mb-4">
            Ready to Experience All Features?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Start converting your bank statements now with 2 free conversions daily. 
            Sign up for 6 daily conversions and unlock the full power of Akromeda.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button 
              onClick={() => navigate('/')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-6 text-lg"
            >
              Try Demo Now
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/auth')}
              className="border-primary/50 text-primary hover:bg-primary/10 font-bold px-8 py-6 text-lg"
            >
              Sign Up Free
            </Button>
          </div>
        </section>

        <footer className="mt-20 pt-8 border-t border-white/5 text-center text-xs text-muted-foreground tracking-[0.3em] uppercase">
          © 2026 Akromeda | Engineered for Excellence
        </footer>
      </main>
    </div>
  );
};

export default FeaturesPage;