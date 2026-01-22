import { Upload, BarChart2, Sparkles, LineChart } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Upload Your Data",
    description: "Import CSV files with stock prices or connect to market data APIs for real-time analysis.",
    color: "blue"
  },
  {
    number: "02",
    icon: BarChart2,
    title: "Automated Analysis",
    description: "Our system analyzes your stock using 11 factors including technical indicators, fundamentals, and market dynamics.",
    color: "indigo"
  },
  {
    number: "03",
    icon: Sparkles,
    title: "AI Insights",
    description: "Advanced AI models generate buy/sell recommendations, price predictions, and confidence scores.",
    color: "purple"
  },
  {
    number: "04",
    icon: LineChart,
    title: "Make Decisions",
    description: "Visualize results with interactive charts and make informed investment decisions based on data-driven insights.",
    color: "cyan"
  }
];

const colorClasses = {
  blue: {
    bg: "bg-blue-100",
    icon: "text-blue-600",
    gradient: "from-blue-500 to-cyan-500",
    border: "border-blue-500"
  },
  indigo: {
    bg: "bg-indigo-100",
    icon: "text-indigo-600",
    gradient: "from-indigo-500 to-purple-500",
    border: "border-indigo-500"
  },
  purple: {
    bg: "bg-purple-100",
    icon: "text-purple-600",
    gradient: "from-purple-500 to-pink-500",
    border: "border-purple-500"
  },
  cyan: {
    bg: "bg-cyan-100",
    icon: "text-cyan-600",
    gradient: "from-cyan-500 to-blue-500",
    border: "border-cyan-500"
  }
};

export function HowItWorksSection() {
  return (
    <section className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-20 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            How It Works
          </h2>
          <p className="text-lg text-slate-600">
            Get started in minutes with our simple and powerful workflow.
          </p>
        </div>

        {/* Steps */}
        <div className="relative mx-auto max-w-6xl">
          {/* Connection line (desktop only) */}
          <div className="absolute left-0 right-0 top-16 hidden h-1 bg-gradient-to-r from-blue-500 via-indigo-500 via-purple-500 to-cyan-500 opacity-20 lg:block" />

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const colors = colorClasses[step.color as keyof typeof colorClasses];

              return (
                <div
                  key={step.number}
                  className="relative flex flex-col items-center text-center"
                >
                  {/* Step number badge */}
                  <div className={`absolute -top-4 left-1/2 -translate-x-1/2 rounded-full border-4 ${colors.border} bg-white px-4 py-2 text-sm font-bold ${colors.icon}`}>
                    {step.number}
                  </div>

                  {/* Card */}
                  <div className="w-full rounded-xl border border-slate-200 bg-white p-6 pt-8 shadow-sm transition-all hover:shadow-md">
                    {/* Icon */}
                    <div className={`mb-4 inline-flex rounded-lg ${colors.bg} p-3`}>
                      <Icon className={`h-8 w-8 ${colors.icon}`} />
                    </div>

                    {/* Title */}
                    <h3 className="mb-3 text-xl font-semibold text-slate-900">
                      {step.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-slate-600">
                      {step.description}
                    </p>
                  </div>

                  {/* Arrow connector (mobile only) */}
                  {index < steps.length - 1 && (
                    <div className="my-4 h-8 w-1 bg-gradient-to-b from-slate-300 to-slate-200 lg:hidden" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
