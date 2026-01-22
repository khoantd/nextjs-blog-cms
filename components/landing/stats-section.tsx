import { BarChart3, Brain, Globe, Zap } from "lucide-react";

const stats = [
  {
    icon: BarChart3,
    value: "11",
    label: "Stock Factors",
    description: "Technical + Fundamental indicators",
    color: "blue"
  },
  {
    icon: Zap,
    value: "Daily",
    label: "Scoring System",
    description: "Weighted prediction algorithm",
    color: "indigo"
  },
  {
    icon: Globe,
    value: "2",
    label: "Markets",
    description: "US & Vietnamese stocks",
    color: "purple"
  },
  {
    icon: Brain,
    value: "AI",
    label: "Powered Insights",
    description: "LiteLLM integration",
    color: "cyan"
  }
];

const colorClasses = {
  blue: {
    bg: "bg-blue-100",
    icon: "text-blue-600",
    gradient: "from-blue-500 to-cyan-500"
  },
  indigo: {
    bg: "bg-indigo-100",
    icon: "text-indigo-600",
    gradient: "from-indigo-500 to-purple-500"
  },
  purple: {
    bg: "bg-purple-100",
    icon: "text-purple-600",
    gradient: "from-purple-500 to-pink-500"
  },
  cyan: {
    bg: "bg-cyan-100",
    icon: "text-cyan-600",
    gradient: "from-cyan-500 to-blue-500"
  }
};

export function StatsSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20 sm:py-24">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))] -z-10" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Powerful Analytics at Your Fingertips
          </h2>
          <p className="text-lg text-slate-300">
            Our platform combines cutting-edge technology with comprehensive market analysis to give you an edge.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const colors = colorClasses[stat.color as keyof typeof colorClasses];

            return (
              <div
                key={stat.label}
                className="group relative rounded-xl border border-slate-700 bg-slate-800/50 p-8 backdrop-blur-sm transition-all hover:border-slate-600 hover:bg-slate-800/80"
              >
                {/* Icon */}
                <div className={`mb-4 inline-flex rounded-lg ${colors.bg} p-3`}>
                  <Icon className={`h-6 w-6 ${colors.icon}`} />
                </div>

                {/* Value */}
                <div className={`mb-2 bg-gradient-to-r ${colors.gradient} bg-clip-text text-4xl font-bold text-transparent`}>
                  {stat.value}
                </div>

                {/* Label */}
                <h3 className="mb-2 text-lg font-semibold text-white">
                  {stat.label}
                </h3>

                {/* Description */}
                <p className="text-sm text-slate-400">
                  {stat.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
