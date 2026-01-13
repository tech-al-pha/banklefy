import { Globe, Lock, Zap, FileSpreadsheet, Brain, Clock, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

const features = [
  {
    icon: Globe,
    title: "Multilingual Support",
    teaser: "Support for 50+ languages including Hindi, Arabic, Mandarin, and more",
    description: "Akromeda supports over 50 languages including Hindi, Arabic, Mandarin, French, Spanish, German, Portuguese, Russian, and many more. Our AI accurately recognizes and processes bank statements in any language, making it perfect for international businesses and individuals working with global financial documents. No matter where your bank is located or what language your statements are in, Akromeda handles them all with precision.",
  },
  {
    icon: Brain,
    title: "AI-Powered OCR",
    teaser: "Advanced OCR extracts data from any quality statement or scanned document",
    description: "Our advanced Optical Character Recognition (OCR) technology powered by cutting-edge AI can extract data from any type of bank statement - whether it's a high-quality digital PDF or a low-resolution scanned document. The AI intelligently identifies transaction details, dates, amounts, and descriptions even from poor quality images, handwritten notes, or complex table structures. This ensures you can convert any statement, regardless of its source or quality.",
  },
  {
    icon: Zap,
    title: "Instant Processing",
    teaser: "Lightning-fast conversion with results delivered in seconds",
    description: "Experience lightning-fast conversion speeds with results delivered in seconds, not hours. Akromeda's optimized processing pipeline uses distributed computing to analyze and convert your statements instantly. Upload your document and get your Excel file almost immediately - perfect for time-sensitive accounting tasks, audits, or financial analysis. No waiting, no delays, just instant results.",
  },
  {
    icon: FileSpreadsheet,
    title: "Excel Compatible",
    teaser: "Get clean, formatted spreadsheets compatible with all major accounting software",
    description: "Get clean, professionally formatted Excel spreadsheets that are fully compatible with all major accounting software including QuickBooks, Xero, SAP, and more. Each converted file is structured with proper columns for dates, descriptions, debits, credits, and running balances - ready for immediate use in financial analysis, tax preparation, or bookkeeping. You can also export to CSV and JSON formats for maximum flexibility with your workflow.",
  },
  {
    icon: Lock,
    title: "Bank-Level Security",
    teaser: "Military-grade encryption protects your sensitive financial data",
    description: "Your financial data security is our top priority. Akromeda uses military-grade end-to-end encryption to protect your sensitive banking information. All documents are encrypted during upload, processing, and storage. We never store your data longer than necessary, and you have full control to delete your conversions at any time. Our security measures meet international banking compliance standards, ensuring your financial information stays completely private and secure.",
  },
  {
    icon: Clock,
    title: "Batch Processing",
    teaser: "Process multiple bank statements simultaneously to save time",
    description: "Save time by uploading and processing multiple bank statements simultaneously. Whether you need to convert dozens of monthly statements or handle multiple accounts at once, Akromeda's batch processing feature handles them all in parallel. Perfect for accountants, financial analysts, and business owners who need to process large volumes of statements efficiently. Process your entire year's worth of statements in minutes, not hours.",
  },
];

const FeatureCard = ({ feature, index }: { feature: typeof features[0], index: number }) => {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = feature.icon;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="relative group bg-card/60 backdrop-blur-lg border-primary/20 hover:border-primary/50 transition-all duration-300 hover:shadow-neon">
        <div className="absolute inset-0 bg-gradient-glow opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
        <CollapsibleTrigger className="w-full text-left p-6 cursor-pointer">
          <div className="relative space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <ChevronDown 
                className={`w-5 h-5 text-primary transition-transform duration-300 flex-shrink-0 mt-3 ${
                  isOpen ? 'rotate-180' : ''
                }`} 
              />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {feature.teaser}
              </p>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-6 pb-6">
          <div className="pt-2 animate-accordion-down">
            <p className="text-muted-foreground">
              {feature.description}
            </p>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export const Features = () => {
  return (
    <section className="relative py-24 px-6">
      <div className="container mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            Powerful Features for
            <span className="bg-gradient-primary bg-clip-text text-transparent"> Global Finance</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to convert and manage bank statements from anywhere in the world
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};
