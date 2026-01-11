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
    <section className="py-24 px-6 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 mesh-bg opacity-50" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px]" />
      
      <div className="container mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20 backdrop-blur-sm mb-4">
            <span className="text-sm font-medium text-secondary">Simple Process</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Transform your bank statements into Excel in three simple steps
          </p>
        </div>

        {/* Timeline Steps */}
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-secondary/50 to-accent/50 md:-translate-x-1/2" />

            {steps.map((step, index) => (
              <div 
                key={index} 
                className={`relative flex items-start gap-8 mb-16 last:mb-0 ${
                  index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                }`}
              >
                {/* Number Badge - Centered on line */}
                <div className="absolute left-8 md:left-1/2 -translate-x-1/2 z-10">
                  <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center shadow-neon">
                    <span className="text-xl font-bold text-white">{step.number}</span>
                  </div>
                </div>

                {/* Content Card */}
                <div className={`ml-24 md:ml-0 md:w-[calc(50%-4rem)] ${index % 2 === 0 ? 'md:pr-8' : 'md:pl-8'}`}>
                  <div className="bento-card group">
                    {/* Icon */}
                    <div className="w-14 h-14 rounded-xl bg-gradient-glow border border-primary/20 flex items-center justify-center mb-6 group-hover:shadow-neon transition-all duration-300">
                      <step.icon className="w-7 h-7 text-primary" />
                    </div>

                    {/* Content */}
                    <h3 className="text-2xl font-bold mb-3 group-hover:gradient-text transition-all duration-300">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Empty space for alternating layout */}
                <div className="hidden md:block md:w-[calc(50%-4rem)]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
