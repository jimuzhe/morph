import CustomersTableCard from "@/components/ui/customers-table-card";
import { Testimonials } from "@/components/ui/testimonials";

const stats = [
  { value: "2.8K", label: "active teams" },
  { value: "94%", label: "faster review" },
  { value: "12ms", label: "interaction feel" },
];

const featureItems = [
  "Live customer activity with clean status tracking",
  "Responsive glass cards that stay readable on dark surfaces",
  "Interactive social proof without interrupting the page flow",
];

export function FeatureSection() {
  return (
    <section className="relative z-10 px-4 pb-32 pt-8 md:px-6 md:pt-16">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div className="space-y-6">
            <div className="inline-flex rounded-full border border-[#EC4E02]/30 bg-[#EC4E02]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#ff9a6c] backdrop-blur-xl">
              Feature system
            </div>
            <div className="space-y-5">
              <h2 className="max-w-3xl text-4xl font-black tracking-[-0.04em] text-white md:text-6xl">
                Interfaces that feel fluid, focused, and alive.
              </h2>
              <p className="max-w-2xl text-base leading-7 text-white/58 md:text-lg">
                MOVTH combines motion-first presentation with practical product UI blocks, so the page keeps its cinematic feel while still showing real interface depth.
              </p>
            </div>
            <div className="grid max-w-xl grid-cols-3 gap-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
                  <div className="text-2xl font-black tracking-tight text-white md:text-3xl">{stat.value}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-white/40">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[40px] border border-white/10 bg-white/[0.035] p-3 shadow-2xl shadow-black/40 backdrop-blur-2xl md:p-4">
            <CustomersTableCard
              title="Customer Flow"
              subtitle="A compact activity view for conversion, revenue, and account state."
              className="rounded-[28px] bg-black/55"
            />
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-stretch">
          <div className="rounded-[32px] border border-white/10 bg-black/35 p-6 shadow-2xl shadow-black/25 backdrop-blur-xl md:p-8">
            <h3 className="text-xl font-bold tracking-tight text-white">Why this section exists</h3>
            <div className="mt-6 space-y-4">
              {featureItems.map((item, index) => (
                <div key={item} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#EC4E02]/15 text-sm font-bold text-[#ff9a6c]">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-white/62">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <Testimonials />
        </div>
      </div>
    </section>
  );
}
