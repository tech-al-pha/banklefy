import { Upload, Brain, Download } from "lucide-react";

export const HowItWorks = () => {
  const steps = [
    {
      icon: Upload,
      number: "01",
      title: "Upload",
      description: "Upload your bank statement in any format - PDF, scanned image, or photo. We support documents from any bank worldwide."
    },
    {
      icon: Brain,
      number: "02",
      title: "AI Processing",
      description: "Our AI-powered OCR instantly extracts and organizes transaction data with 99.9% accuracy. Supports 50+ languages including Hindi, Arabic, and Mandarin."
    },
    {
      icon: Download,
      number: "03",
      title: "Download Excel",
      description: "Receive a clean, structured Excel spreadsheet ready for accounting, analysis, or integration with your financial tools."
    }
  ];

  return (
    <section className="py-16 px-4 sm:px-6 relative overflow-hidden bg-[#0A0502]">
      <div className="container mx-auto relative z-10">
        <div className="text-center mb-12 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold italic text-white">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Transform your bank statements into Excel in three simple steps
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div 
              key={index} 
              className="relative group"
            >
              {/* Card */}
              <div className="relative bg-[#1a120b]/80 backdrop-blur-xl border border-primary/20 rounded-2xl p-8 space-y-4 hover:border-primary/40 transition-all duration-300 hover:shadow-neon group-hover:scale-[1.02] h-full">
                {/* Number Badge */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm shadow-neon">
                  {step.number}
                </div>

                {/* Icon */}
                <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 mt-2">
                  <step.icon className="w-7 h-7 text-primary-foreground" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-white">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
