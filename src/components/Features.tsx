import { Globe, Lock, Zap, FileSpreadsheet, Brain, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: Globe,
    title: "Multilingual Support",
    description: "Akromeda supports over 50 languages including Hindi, Arabic, Mandarin, French, Spanish, German, Portuguese, Russian, and many more. Our AI accurately recognizes and processes bank statements in any language, making it perfect for international businesses and individuals working with global financial documents. No matter where your bank is located or what language your statements are in, Akromeda handles them all with precision.",
  },
  {
    icon: Brain,
    title: "AI-Powered OCR",
    description: "Our advanced Optical Character Recognition (OCR) technology powered by cutting-edge AI can extract data from any type of bank statement - whether it's a high-quality digital PDF or a low-resolution scanned document. The AI intelligently identifies transaction details, dates, amounts, and descriptions even from poor quality images, handwritten notes, or complex table structures. This ensures you can convert any statement, regardless of its source or quality.",
  },
  {
    icon: Zap,
    title: "Instant Processing",
    description: "Experience lightning-fast conversion speeds with results delivered in seconds, not hours. Akromeda's optimized processing pipeline uses distributed computing to analyze and convert your statements instantly. Upload your document and get your Excel file almost immediately - perfect for time-sensitive accounting tasks, audits, or financial analysis. No waiting, no delays, just instant results.",
  },
  {
    icon: FileSpreadsheet,
    title: "Excel Compatible",
    description: "Get clean, professionally formatted Excel spreadsheets that are fully compatible with all major accounting software including QuickBooks, Xero, SAP, and more. Each converted file is structured with proper columns for dates, descriptions, debits, credits, and running balances - ready for immediate use in financial analysis, tax preparation, or bookkeeping. You can also export to CSV and JSON formats for maximum flexibility with your workflow.",
  },
  {
    icon: Lock,
    title: "Bank-Level Security",
    description: "Your financial data security is our top priority. Akromeda uses military-grade end-to-end encryption to protect your sensitive banking information. All documents are encrypted during upload, processing, and storage. We never store your data longer than necessary, and you have full control to delete your conversions at any time. Our security measures meet international banking compliance standards, ensuring your financial information stays completely private and secure.",
  },
  {
    icon: Clock,
    title: "Batch Processing",
    description: "Save time by uploading and processing multiple bank statements simultaneously. Whether you need to convert dozens of monthly statements or handle multiple accounts at once, Akromeda's batch processing feature handles them all in parallel. Perfect for accountants, financial analysts, and business owners who need to process large volumes of statements efficiently. Process your entire year's worth of statements in minutes, not hours.",
  },
];

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
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="relative group p-6 bg-card/60 backdrop-blur-lg border-primary/20 hover:border-primary/50 transition-all duration-300 hover:shadow-neon"
              >
                <div className="absolute inset-0 bg-gradient-glow opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
                <div className="relative space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
