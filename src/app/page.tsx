"use client";

import { useMemo, useState } from "react";

type DiscType = "D" | "I" | "S" | "C";
type MarketId = "suburban" | "metro" | "rural";
type BrokerageId = "team" | "traditional" | "independent";
type FocusId = "buyers" | "listings" | "hybrid";
type ExpenseId = "crm" | "dialer" | "marketing" | "coach" | "assistant";
type MethodId = "sphere" | "referrals" | "openHouse" | "expireds" | "circle" | "online";

type DiscQuestion = {
  id: string;
  prompt: string;
  options: Array<{ label: string; type: DiscType }>;
};

type Method = {
  id: MethodId;
  label: string;
  category: "Warm" | "Cold" | "Event" | "Online";
  description: string;
  defaultShare: number;
  cost: number;
  leadsPerHour: number;
  appointmentRate: number;
  closeRate: number;
  discFit: Record<DiscType, number>;
  marketFit: Record<MarketId, number>;
};

type OptionalExpense = {
  id: ExpenseId;
  label: string;
  cost: number;
  description: string;
  apptBoost?: number;
  closeBoost?: number;
  hoursBoost?: number;
  leadBoost?: number;
};

const discProfiles: Record<
  DiscType,
  {
    title: string;
    summary: string;
    strengths: string[];
    watchout: string;
    idealPlay: string;
    accent: string;
  }
> = {
  D: {
    title: "Driver",
    summary: "Fast, decisive, competitive, and motivated by visible progress.",
    strengths: ["direct seller conversations", "clear scoreboards", "fast follow-up"],
    watchout: "Don’t sacrifice nurture and repeat touches for speed.",
    idealPlay: "Lean into higher-urgency outbound, structured call blocks, and tight KPIs.",
    accent: "from-rose-500/25 to-orange-500/10",
  },
  I: {
    title: "Influencer",
    summary: "High energy, people-oriented, and naturally strong at momentum and rapport.",
    strengths: ["referrals", "open houses", "community visibility"],
    watchout: "Don’t let energy replace process discipline.",
    idealPlay: "Focus on referral asks, events, social proof, and fast relational follow-up.",
    accent: "from-fuchsia-500/25 to-pink-500/10",
  },
  S: {
    title: "Steady Connector",
    summary: "Trust-building, dependable, and strongest in consistency over time.",
    strengths: ["sphere care", "repeat follow-up", "client experience"],
    watchout: "Don’t stay too safe when volume needs to increase.",
    idealPlay: "Build around warm database touches, referral systems, and service-led nurture.",
    accent: "from-emerald-500/25 to-cyan-500/10",
  },
  C: {
    title: "Strategic Analyst",
    summary: "Thoughtful, structured, and excellent when the business runs on clarity and precision.",
    strengths: ["CRM rigor", "scripts", "consultative expertise"],
    watchout: "Don’t wait for perfect systems before taking enough swings.",
    idealPlay: "Use organized follow-up, numbers reviews, and credible market guidance to win.",
    accent: "from-sky-500/25 to-indigo-500/10",
  },
};

const discQuestions: DiscQuestion[] = [
  {
    id: "q1",
    prompt: "When a new lead comes in, your first instinct is…",
    options: [
      { label: "Move them toward a decision quickly.", type: "D" },
      { label: "Build excitement and rapport first.", type: "I" },
      { label: "Listen and make them comfortable.", type: "S" },
      { label: "Qualify carefully and structure next steps.", type: "C" },
    ],
  },
  {
    id: "q2",
    prompt: "The work that gives you the most energy is…",
    options: [
      { label: "Competitive conversations with a clear outcome.", type: "D" },
      { label: "Meeting people and creating momentum.", type: "I" },
      { label: "Helping people feel supported and safe.", type: "S" },
      { label: "Solving problems with a smart plan.", type: "C" },
    ],
  },
  {
    id: "q3",
    prompt: "If your month is slipping, you usually respond by…",
    options: [
      { label: "Pushing activity up immediately.", type: "D" },
      { label: "Talking to more people and creating buzz.", type: "I" },
      { label: "Doubling down on care and follow-up.", type: "S" },
      { label: "Reviewing numbers to find the leak.", type: "C" },
    ],
  },
  {
    id: "q4",
    prompt: "Clients tend to trust you most because you are…",
    options: [
      { label: "Confident and decisive.", type: "D" },
      { label: "Engaging and memorable.", type: "I" },
      { label: "Patient and dependable.", type: "S" },
      { label: "Prepared and detail-oriented.", type: "C" },
    ],
  },
  {
    id: "q5",
    prompt: "Your ideal weekly prospecting rhythm feels…",
    options: [
      { label: "Fast, direct, and performance-driven.", type: "D" },
      { label: "Social, flexible, and high-energy.", type: "I" },
      { label: "Consistent, warm, and relationship-first.", type: "S" },
      { label: "Structured, measured, and optimized.", type: "C" },
    ],
  },
  {
    id: "q6",
    prompt: "The accountability that motivates you most is…",
    options: [
      { label: "A target to beat.", type: "D" },
      { label: "Recognition and visible momentum.", type: "I" },
      { label: "Steady support and cadence.", type: "S" },
      { label: "Clear standards and scorekeeping.", type: "C" },
    ],
  },
];

const methods: Method[] = [
  {
    id: "sphere",
    label: "Sphere & database calls",
    category: "Warm",
    description: "Past clients, advocates, and database nurture for repeat and referral business.",
    defaultShare: 0.22,
    cost: 40,
    leadsPerHour: 1.7,
    appointmentRate: 0.32,
    closeRate: 0.22,
    discFit: { D: 1.02, I: 1.15, S: 1.22, C: 1.06 },
    marketFit: { suburban: 1.08, metro: 0.95, rural: 1.24 },
  },
  {
    id: "referrals",
    label: "Referral asks",
    category: "Warm",
    description: "Intentional referral generation with lenders, clients, vendors, and advocates.",
    defaultShare: 0.14,
    cost: 60,
    leadsPerHour: 1.1,
    appointmentRate: 0.45,
    closeRate: 0.3,
    discFit: { D: 0.95, I: 1.22, S: 1.14, C: 1.02 },
    marketFit: { suburban: 1.06, metro: 0.93, rural: 1.28 },
  },
  {
    id: "openHouse",
    label: "Open houses",
    category: "Event",
    description: "Weekend exposure with buyers, neighbors, and local foot traffic.",
    defaultShare: 0.2,
    cost: 220,
    leadsPerHour: 1.9,
    appointmentRate: 0.27,
    closeRate: 0.16,
    discFit: { D: 0.97, I: 1.24, S: 1.08, C: 0.94 },
    marketFit: { suburban: 1.12, metro: 1.02, rural: 0.88 },
  },
  {
    id: "expireds",
    label: "Expired listing calls",
    category: "Cold",
    description: "Urgent outbound to homeowners with recent listing pain and intent.",
    defaultShare: 0.16,
    cost: 140,
    leadsPerHour: 2.5,
    appointmentRate: 0.18,
    closeRate: 0.19,
    discFit: { D: 1.22, I: 0.94, S: 0.86, C: 1.09 },
    marketFit: { suburban: 1, metro: 1.16, rural: 0.8 },
  },
  {
    id: "circle",
    label: "Circle prospecting",
    category: "Cold",
    description: "Neighborhood calling around listings and recent sales to create volume.",
    defaultShare: 0.14,
    cost: 90,
    leadsPerHour: 2.2,
    appointmentRate: 0.14,
    closeRate: 0.15,
    discFit: { D: 1.08, I: 0.98, S: 0.9, C: 1.12 },
    marketFit: { suburban: 1.06, metro: 1.1, rural: 0.84 },
  },
  {
    id: "online",
    label: "Online lead follow-up",
    category: "Online",
    description: "Speed-to-lead inbound from paid, portal, or digital campaigns.",
    defaultShare: 0.14,
    cost: 350,
    leadsPerHour: 3.1,
    appointmentRate: 0.16,
    closeRate: 0.13,
    discFit: { D: 1.08, I: 1.01, S: 0.9, C: 1.14 },
    marketFit: { suburban: 0.98, metro: 1.2, rural: 0.75 },
  },
];

const optionalExpenses: OptionalExpense[] = [
  {
    id: "crm",
    label: "CRM upgrade",
    cost: 180,
    description: "Improves follow-up consistency, tagging, and long-tail nurture.",
    apptBoost: 0.04,
  },
  {
    id: "dialer",
    label: "Dialer / data stack",
    cost: 299,
    description: "Boosts throughput on outbound prospecting methods.",
    leadBoost: 0.06,
  },
  {
    id: "marketing",
    label: "Marketing spend",
    cost: 650,
    description: "Adds top-of-funnel visibility and inbound opportunities.",
    leadBoost: 0.08,
    apptBoost: 0.02,
  },
  {
    id: "coach",
    label: "Coaching",
    cost: 350,
    description: "Improves scripting, accountability, and appointment quality.",
    apptBoost: 0.08,
    closeBoost: 0.05,
  },
  {
    id: "assistant",
    label: "Assistant",
    cost: 1200,
    description: "Creates more selling time and tighter execution.",
    hoursBoost: 6,
    closeBoost: 0.04,
  },
];

const marketOptions = {
  suburban: { label: "Steady suburban", factor: 1.02 },
  metro: { label: "Hyper-competitive metro", factor: 1.1 },
  rural: { label: "Relationship-driven rural", factor: 0.92 },
} as const;

const brokerageOptions = {
  team: { label: "Team split", commissionRate: 0.5, supportFactor: 1.08, fee: 350 },
  traditional: { label: "Traditional brokerage", commissionRate: 0.7, supportFactor: 1, fee: 550 },
  independent: { label: "High split / low support", commissionRate: 0.9, supportFactor: 0.94, fee: 950 },
} as const;

const focusOptions = {
  buyers: { label: "Buyer-heavy", closeModifier: 0.96, avgPriceBias: 0.98 },
  listings: { label: "Listing-heavy", closeModifier: 1.05, avgPriceBias: 1.05 },
  hybrid: { label: "Balanced hybrid", closeModifier: 1, avgPriceBias: 1 },
} as const;

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    Math.round(value),
  );
}

function number(value: number, digits = 1) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getStageLabel(months: number) {
  if (months < 3) return "Fragile runway";
  if (months < 6) return "Manageable but tight";
  if (months < 12) return "Healthy operating room";
  return "Strong cushion";
}

export default function Home() {
  const [profile, setProfile] = useState({
    fullName: "",
    market: "Charlotte, NC",
    currentRole: "New / rebuilding agent",
    experienceYears: 1,
    averagePrice: 450000,
    targetCommissionPercent: 2.7,
    marketType: "suburban" as MarketId,
    brokerage: "traditional" as BrokerageId,
    focus: "hybrid" as FocusId,
  });

  const [discAnswers, setDiscAnswers] = useState<Partial<Record<string, DiscType>>>({});

  const [businessState, setBusinessState] = useState({
    monthlyClosings: 1,
    monthlyVolume: 450000,
    databaseSize: 180,
    weeklyHours: 28,
    monthlyLivingExpenses: 4200,
    monthlyBusinessExpenses: 1300,
    cashReserves: 12000,
    teamMembers: 1,
  });

  const [goals, setGoals] = useState({
    targetAnnualIncome: 180000,
    targetMonthlyClosings: 3,
    targetResponseMinutes: 5,
    leadSourcesToMaster: 3,
    desiredTimeOffWeeks: 4,
  });

  const [sandbox, setSandbox] = useState<Record<MethodId, number>>({
    sphere: 20,
    referrals: 15,
    openHouse: 20,
    expireds: 15,
    circle: 15,
    online: 15,
  });

  const [enabledExpenses, setEnabledExpenses] = useState<Record<ExpenseId, boolean>>({
    crm: true,
    dialer: false,
    marketing: false,
    coach: false,
    assistant: false,
  });

  const discCompletionCount = Object.keys(discAnswers).length;
  const discComplete = discCompletionCount === discQuestions.length;

  const discResult = useMemo(() => {
    const scores: Record<DiscType, number> = { D: 0, I: 0, S: 0, C: 0 };
    discQuestions.forEach((question) => {
      const answer = discAnswers[question.id];
      if (answer) scores[answer] += 1;
    });
    const ranking = (["D", "I", "S", "C"] as DiscType[]).sort((a, b) => scores[b] - scores[a]);
    return {
      scores,
      primary: ranking[0],
      secondary: ranking[1],
      profile: discProfiles[ranking[0]],
    };
  }, [discAnswers]);

  const activeExpenses = useMemo(
    () => optionalExpenses.filter((expense) => enabledExpenses[expense.id]),
    [enabledExpenses],
  );

  const forecast = useMemo(() => {
    const avgGrossCommission =
      profile.averagePrice * (profile.targetCommissionPercent / 100) * brokerageOptions[profile.brokerage].commissionRate;
    const supportFactor = brokerageOptions[profile.brokerage].supportFactor;
    const focusModifier = focusOptions[profile.focus].closeModifier;
    const selectedMarket = profile.marketType;
    const leadBoost = activeExpenses.reduce((sum, item) => sum + (item.leadBoost ?? 0), 0);
    const apptBoost = activeExpenses.reduce((sum, item) => sum + (item.apptBoost ?? 0), 0);
    const closeBoost = activeExpenses.reduce((sum, item) => sum + (item.closeBoost ?? 0), 0);
    const hoursBoost = activeExpenses.reduce((sum, item) => sum + (item.hoursBoost ?? 0), 0);

    const usableHours = Math.max(8, businessState.weeklyHours + hoursBoost);
    const totalShare = Object.values(sandbox).reduce((sum, value) => sum + value, 0) || 1;

    const methodRows = methods.map((method) => {
      const share = sandbox[method.id] / totalShare;
      const hours = usableHours * share;
      const leads =
        hours *
        method.leadsPerHour *
        method.discFit[discResult.primary] *
        method.marketFit[selectedMarket] *
        supportFactor *
        (1 + leadBoost);
      const appointments = leads * method.appointmentRate * (1 + apptBoost);
      const closings = appointments * method.closeRate * focusModifier * (1 + closeBoost);
      const income = closings * avgGrossCommission;
      return {
        ...method,
        hours,
        leads,
        appointments,
        closings,
        income,
      };
    });

    const projectedClosings = methodRows.reduce((sum, row) => sum + row.closings, 0);
    const projectedIncome = methodRows.reduce((sum, row) => sum + row.income, 0);
    const monthlyExpenses =
      businessState.monthlyLivingExpenses +
      businessState.monthlyBusinessExpenses +
      brokerageOptions[profile.brokerage].fee +
      methodRows.reduce((sum, row) => sum + row.cost, 0) +
      activeExpenses.reduce((sum, item) => sum + item.cost, 0);
    const netIncome = projectedIncome - monthlyExpenses;
    const annualizedIncome = netIncome * 12;
    const targetMonthlyIncome = goals.targetAnnualIncome / 12;
    const incomeGap = targetMonthlyIncome - netIncome;
    const runwayMonths = businessState.cashReserves / Math.max(monthlyExpenses - Math.max(projectedIncome, 0), 500);
    const breakEvenClosings = monthlyExpenses / Math.max(avgGrossCommission, 1);

    return {
      avgGrossCommission,
      usableHours,
      methodRows,
      projectedClosings,
      projectedIncome,
      monthlyExpenses,
      netIncome,
      annualizedIncome,
      targetMonthlyIncome,
      incomeGap,
      runwayMonths,
      breakEvenClosings,
      annualGoalProgress: clamp((annualizedIncome / Math.max(goals.targetAnnualIncome, 1)) * 100, 0, 180),
      closingGoalProgress: clamp((projectedClosings / Math.max(goals.targetMonthlyClosings, 1)) * 100, 0, 180),
      responseGap: Math.max(0, goals.targetResponseMinutes - 5),
    };
  }, [activeExpenses, businessState, discResult.primary, goals, profile, sandbox]);

  const actionPlan = useMemo(() => {
    const topMethods = [...forecast.methodRows]
      .sort((a, b) => b.closings - a.closings)
      .slice(0, 3)
      .map((method) => method.label);

    const priorities = [] as string[];
    const risks = [] as string[];
    const wins = [] as string[];

    if (forecast.netIncome < 0) {
      priorities.push("Trim optional overhead or increase weekly prospecting hours until the model turns profitable.");
      risks.push("Current scenario is operating below break-even.");
    } else {
      wins.push("Current model is profitable on paper.");
    }

    if (forecast.projectedClosings < goals.targetMonthlyClosings) {
      priorities.push(`Increase production toward ${goals.targetMonthlyClosings} monthly closings by concentrating on the top 2–3 channels.`);
      risks.push("Closing pace is still below stated monthly goal.");
    } else {
      wins.push("Projected closings are meeting or exceeding the monthly target.");
    }

    if (businessState.cashReserves / Math.max(forecast.monthlyExpenses, 1) < 3) {
      priorities.push("Protect cash: avoid adding fixed costs until three months of operating reserves are covered.");
      risks.push("Cash runway is thin relative to monthly operating load.");
    } else {
      wins.push("Cash reserves provide workable operating flexibility.");
    }

    if (discResult.primary === "I" || discResult.primary === "S") {
      priorities.push("Build a CRM-based nurture cadence so relational strengths compound instead of staying informal.");
    }
    if (discResult.primary === "D" || discResult.primary === "C") {
      priorities.push("Use scripts, scoreboards, and disciplined follow-up blocks to convert activity into appointments.");
    }

    return {
      topMethods,
      priorities: priorities.slice(0, 4),
      risks: risks.slice(0, 3),
      wins: wins.slice(0, 3),
      ninetyDayPlan: [
        `Double down on ${topMethods.slice(0, 2).join(" + ")} as the core lane mix.`,
        `Run ${Math.round(forecast.usableHours)} selling hours per week with protected call blocks on the calendar.`,
        `Track weekly leads, appointments, signed clients, and closings in one scoreboard.`,
        `Review conversion every Friday and reallocate time away from the weakest channel.`,
      ],
    };
  }, [businessState.cashReserves, discResult.primary, forecast, goals.targetMonthlyClosings]);

  const updateSandbox = (id: MethodId, value: number) => {
    setSandbox((current) => ({ ...current, [id]: value }));
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_25%),radial-gradient(circle_at_right,_rgba(56,189,248,0.16),_transparent_22%),linear-gradient(180deg,_#06111c_0%,_#0b1325_45%,_#111827_100%)] text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.05] shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="grid gap-8 px-5 py-6 sm:px-7 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-8">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                <Badge>Professional intake</Badge>
                <Badge>DISC assessment</Badge>
                <Badge>Forecast sandbox</Badge>
                <Badge>Action plan</Badge>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-emerald-200">RE Career Forecaster</p>
                <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                  One coherent forecasting flow for profile intake, business reality, goals, and live what-if planning.
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                  Build the agent profile, finish the DISC read, enter current production and expense data, then pressure-test the business with real-time forecast updates, dashboard metrics, and a generated action plan.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <TopStat label="Primary DISC" value={discComplete ? `${discResult.primary} · ${discResult.profile.title}` : `${discCompletionCount}/${discQuestions.length} answered`} note="Assessment shapes recommended channel mix." />
                <TopStat label="Projected monthly income" value={currency(forecast.netIncome)} note="Net after modeled fixed and optional costs." />
                <TopStat label="Monthly closings" value={number(forecast.projectedClosings)} note={`Goal: ${goals.targetMonthlyClosings} closings/month.`} />
                <TopStat label="Runway" value={`${number(forecast.runwayMonths)} mo`} note={getStageLabel(forecast.runwayMonths)} />
              </div>
            </div>
            <aside className="rounded-[28px] border border-emerald-400/15 bg-[linear-gradient(180deg,rgba(16,185,129,0.14),rgba(15,23,42,0.82))] p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">Executive summary</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Current scenario pulse</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <MetricCard label="Gross commission / closing" value={currency(forecast.avgGrossCommission)} note="Derived from avg price, commission, and brokerage split." />
                <MetricCard label="Break-even closings" value={number(forecast.breakEvenClosings)} note="Approximate closings needed to cover monthly burn." />
                <MetricCard label="Annualized net" value={currency(forecast.annualizedIncome)} note="If the current monthly model repeated for 12 months." />
                <MetricCard label="Top lanes" value={actionPlan.topMethods.slice(0, 2).join(" + ")} note="Highest-output forecast channels right now." />
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Coach’s read</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {forecast.netIncome >= 0
                    ? "This model is viable on paper, but it still depends on disciplined execution."
                    : "This model needs either more production, a tighter mix, or less overhead before it is safe."}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{discResult.profile.idealPlay}</p>
              </div>
            </aside>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
          <Panel>
            <SectionHeader eyebrow="Step 1" title="Professional intake / profile builder" description="Capture the business context the forecast should be built around." />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <input value={profile.fullName} onChange={(e) => setProfile((current) => ({ ...current, fullName: e.target.value }))} className={inputClass} placeholder="Agent name" />
              </Field>
              <Field label="Primary market">
                <input value={profile.market} onChange={(e) => setProfile((current) => ({ ...current, market: e.target.value }))} className={inputClass} placeholder="City / market" />
              </Field>
              <Field label="Current role">
                <input value={profile.currentRole} onChange={(e) => setProfile((current) => ({ ...current, currentRole: e.target.value }))} className={inputClass} placeholder="Role / stage" />
              </Field>
              <Field label="Experience (years)">
                <input type="number" min={0} max={40} value={profile.experienceYears} onChange={(e) => setProfile((current) => ({ ...current, experienceYears: Number(e.target.value) }))} className={inputClass} />
              </Field>
              <Field label="Average home price">
                <input type="number" min={100000} step={5000} value={profile.averagePrice} onChange={(e) => setProfile((current) => ({ ...current, averagePrice: Number(e.target.value) }))} className={inputClass} />
              </Field>
              <Field label="Target commission %">
                <input type="number" min={1} max={6} step={0.1} value={profile.targetCommissionPercent} onChange={(e) => setProfile((current) => ({ ...current, targetCommissionPercent: Number(e.target.value) }))} className={inputClass} />
              </Field>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <SelectorCardGroup
                title="Market type"
                items={Object.entries(marketOptions).map(([id, value]) => ({ id, label: value.label }))}
                selected={profile.marketType}
                onSelect={(id) => setProfile((current) => ({ ...current, marketType: id as MarketId }))}
              />
              <SelectorCardGroup
                title="Brokerage"
                items={Object.entries(brokerageOptions).map(([id, value]) => ({ id, label: value.label }))}
                selected={profile.brokerage}
                onSelect={(id) => setProfile((current) => ({ ...current, brokerage: id as BrokerageId }))}
              />
              <SelectorCardGroup
                title="Business focus"
                items={Object.entries(focusOptions).map(([id, value]) => ({ id, label: value.label }))}
                selected={profile.focus}
                onSelect={(id) => setProfile((current) => ({ ...current, focus: id as FocusId }))}
              />
            </div>
          </Panel>

          <Panel>
            <SectionHeader eyebrow="Step 2" title="DISC personality assessment" description="Identify the natural working style that should influence lead strategy and follow-up design." />
            <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/15 p-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Completion</p>
                <p className="mt-1 text-2xl font-semibold text-white">{discCompletionCount}/{discQuestions.length}</p>
              </div>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400 transition-all" style={{ width: `${(discCompletionCount / discQuestions.length) * 100}%` }} />
              </div>
            </div>
            <div className="mt-5 grid gap-4">
              {discQuestions.map((question, index) => (
                <div key={question.id} className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Question {index + 1}</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">{question.prompt}</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {question.options.map((option) => {
                      const selected = discAnswers[question.id] === option.type;
                      return (
                        <button
                          key={`${question.id}-${option.type}`}
                          type="button"
                          onClick={() => setDiscAnswers((current) => ({ ...current, [question.id]: option.type }))}
                          className={`rounded-2xl border p-4 text-left transition ${selected ? "border-emerald-300/30 bg-emerald-500/10" : "border-white/10 bg-black/15 hover:border-white/20"}`}
                        >
                          <div className="flex gap-3">
                            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${selected ? "border-emerald-200 bg-emerald-300 text-slate-950" : "border-white/15 bg-white/5 text-slate-200"}`}>
                              {option.type}
                            </span>
                            <p className="text-sm leading-6 text-slate-200">{option.label}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className={`mt-5 rounded-[28px] border border-white/10 bg-gradient-to-br p-5 ${discResult.profile.accent}`}>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">Current DISC read</p>
              <h3 className="mt-2 text-3xl font-semibold text-white">{discResult.primary} · {discResult.profile.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-100">{discResult.profile.summary}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <InfoCard label="Natural strengths" body={discResult.profile.strengths.join(", ")} />
                <InfoCard label="Watchout" body={discResult.profile.watchout} />
              </div>
            </div>
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
          <Panel>
            <SectionHeader eyebrow="Step 3" title="Current business state" description="Enter the present production, expense, and team reality the forecast must respect." />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Monthly closings">
                <input type="number" min={0} step={0.1} value={businessState.monthlyClosings} onChange={(e) => setBusinessState((current) => ({ ...current, monthlyClosings: Number(e.target.value) }))} className={inputClass} />
              </Field>
              <Field label="Monthly volume">
                <input type="number" min={0} step={10000} value={businessState.monthlyVolume} onChange={(e) => setBusinessState((current) => ({ ...current, monthlyVolume: Number(e.target.value) }))} className={inputClass} />
              </Field>
              <Field label="Database size">
                <input type="number" min={0} step={10} value={businessState.databaseSize} onChange={(e) => setBusinessState((current) => ({ ...current, databaseSize: Number(e.target.value) }))} className={inputClass} />
              </Field>
              <Field label="Selling hours / week">
                <input type="number" min={5} max={80} value={businessState.weeklyHours} onChange={(e) => setBusinessState((current) => ({ ...current, weeklyHours: Number(e.target.value) }))} className={inputClass} />
              </Field>
              <Field label="Monthly living expenses">
                <input type="number" min={0} step={100} value={businessState.monthlyLivingExpenses} onChange={(e) => setBusinessState((current) => ({ ...current, monthlyLivingExpenses: Number(e.target.value) }))} className={inputClass} />
              </Field>
              <Field label="Monthly business expenses">
                <input type="number" min={0} step={100} value={businessState.monthlyBusinessExpenses} onChange={(e) => setBusinessState((current) => ({ ...current, monthlyBusinessExpenses: Number(e.target.value) }))} className={inputClass} />
              </Field>
              <Field label="Cash reserves">
                <input type="number" min={0} step={500} value={businessState.cashReserves} onChange={(e) => setBusinessState((current) => ({ ...current, cashReserves: Number(e.target.value) }))} className={inputClass} />
              </Field>
              <Field label="Team members involved">
                <input type="number" min={1} max={20} value={businessState.teamMembers} onChange={(e) => setBusinessState((current) => ({ ...current, teamMembers: Number(e.target.value) }))} className={inputClass} />
              </Field>
            </div>
          </Panel>

          <Panel>
            <SectionHeader eyebrow="Step 4" title="Goals input" description="Model the business against concrete income, production, and operating targets." />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Target annual income">
                <input type="number" min={0} step={5000} value={goals.targetAnnualIncome} onChange={(e) => setGoals((current) => ({ ...current, targetAnnualIncome: Number(e.target.value) }))} className={inputClass} />
              </Field>
              <Field label="Target monthly closings">
                <input type="number" min={0} step={0.5} value={goals.targetMonthlyClosings} onChange={(e) => setGoals((current) => ({ ...current, targetMonthlyClosings: Number(e.target.value) }))} className={inputClass} />
              </Field>
              <Field label="Target response time (minutes)">
                <input type="number" min={1} max={60} value={goals.targetResponseMinutes} onChange={(e) => setGoals((current) => ({ ...current, targetResponseMinutes: Number(e.target.value) }))} className={inputClass} />
              </Field>
              <Field label="Lead sources to master">
                <input type="number" min={1} max={6} value={goals.leadSourcesToMaster} onChange={(e) => setGoals((current) => ({ ...current, leadSourcesToMaster: Number(e.target.value) }))} className={inputClass} />
              </Field>
              <Field label="Desired time off (weeks / year)">
                <input type="number" min={0} max={12} value={goals.desiredTimeOffWeeks} onChange={(e) => setGoals((current) => ({ ...current, desiredTimeOffWeeks: Number(e.target.value) }))} className={inputClass} />
              </Field>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MetricCard label="Monthly income target" value={currency(forecast.targetMonthlyIncome)} note="Annual goal translated to monthly pace." />
              <MetricCard label="Annual goal progress" value={`${number(forecast.annualGoalProgress, 0)}%`} note="Current annualized net vs stated goal." />
              <MetricCard label="Closing goal progress" value={`${number(forecast.closingGoalProgress, 0)}%`} note="Projected monthly closings vs target." />
            </div>
          </Panel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Panel>
            <SectionHeader eyebrow="Step 5" title="Interactive sandbox / what-if engine" description="Rebalance prospecting, hours, and support costs. Every change updates the forecast instantly." />
            <div className="mt-5 rounded-[28px] border border-white/10 bg-black/15 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Weekly hours in play</p>
                  <p className="mt-2 text-4xl font-semibold text-white">{Math.round(forecast.usableHours)}</p>
                </div>
                <input
                  type="range"
                  min={10}
                  max={60}
                  step={1}
                  value={businessState.weeklyHours}
                  onChange={(e) => setBusinessState((current) => ({ ...current, weeklyHours: Number(e.target.value) }))}
                  className="w-full max-w-md cursor-pointer accent-emerald-400"
                />
              </div>
            </div>
            <div className="mt-5 grid gap-4">
              {methods.map((method) => (
                <div key={method.id} className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">{method.category}</span>
                        <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100">{sandbox[method.id]}% time share</span>
                      </div>
                      <h3 className="text-xl font-semibold text-white">{method.label}</h3>
                      <p className="text-sm leading-6 text-slate-300">{method.description}</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[320px]">
                      <MiniMetric label="Leads" value={number(forecast.methodRows.find((row) => row.id === method.id)?.leads ?? 0)} />
                      <MiniMetric label="Appts" value={number(forecast.methodRows.find((row) => row.id === method.id)?.appointments ?? 0)} />
                      <MiniMetric label="Closings" value={number(forecast.methodRows.find((row) => row.id === method.id)?.closings ?? 0)} />
                    </div>
                  </div>
                  <input type="range" min={0} max={50} step={5} value={sandbox[method.id]} onChange={(e) => updateSandbox(method.id, Number(e.target.value))} className="mt-4 w-full cursor-pointer accent-emerald-400" />
                </div>
              ))}
            </div>
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Optional support stack</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {optionalExpenses.map((expense) => {
                  const enabled = enabledExpenses[expense.id];
                  return (
                    <button
                      key={expense.id}
                      type="button"
                      onClick={() => setEnabledExpenses((current) => ({ ...current, [expense.id]: !current[expense.id] }))}
                      className={`rounded-[26px] border p-4 text-left transition ${enabled ? "border-emerald-300/30 bg-emerald-500/10" : "border-white/10 bg-white/[0.03] hover:border-white/20"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{expense.label}</h3>
                          <p className="mt-2 text-sm leading-6 text-slate-300">{expense.description}</p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                          {enabled ? "Included" : "Optional"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-medium text-emerald-200">{currency(expense.cost)} / month</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </Panel>

          <div className="space-y-6">
            <Panel>
              <SectionHeader eyebrow="Step 6" title="Stats dashboard" description="A live scorecard for production, cost, runway, and goal pacing." />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <DashboardCard label="Current closings" value={number(businessState.monthlyClosings)} note="Baseline monthly closings entered in business state." emphasis="default" />
                <DashboardCard label="Projected closings" value={number(forecast.projectedClosings)} note="Monthly closings from current mix." emphasis={forecast.projectedClosings >= goals.targetMonthlyClosings ? "safe" : "warn"} />
                <DashboardCard label="Current volume" value={currency(businessState.monthlyVolume)} note="Current monthly production volume baseline." emphasis="default" />
                <DashboardCard label="Projected gross income" value={currency(forecast.projectedIncome)} note="Gross commission produced by active scenario." emphasis="default" />
                <DashboardCard label="Database + team" value={`${number(businessState.databaseSize, 0)} · ${number(businessState.teamMembers, 0)}`} note="Contacts in database and people involved in delivery." emphasis="default" />
                <DashboardCard label="Modeled expenses" value={currency(forecast.monthlyExpenses)} note="Living + business + brokerage + methods + support." emphasis="default" />
                <DashboardCard label="Projected net income" value={currency(forecast.netIncome)} note="Monthly net before tax." emphasis={forecast.netIncome >= 0 ? "safe" : "danger"} />
                <DashboardCard label="Runway months" value={number(forecast.runwayMonths)} note={getStageLabel(forecast.runwayMonths)} emphasis={forecast.runwayMonths >= 6 ? "safe" : forecast.runwayMonths >= 3 ? "warn" : "danger"} />
                <DashboardCard label="Income gap to goal" value={forecast.incomeGap > 0 ? currency(forecast.incomeGap) : "At goal"} note="How far current net sits from monthly target." emphasis={forecast.incomeGap <= 0 ? "safe" : "warn"} />
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Channel contribution</p>
                <div className="mt-3 space-y-3">
                  {forecast.methodRows
                    .sort((a, b) => b.closings - a.closings)
                    .map((row) => (
                      <div key={row.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">{row.label}</p>
                            <p className="mt-1 text-xs text-slate-400">{number(row.hours)} hrs/wk · {number(row.leads)} leads · {number(row.appointments)} appts</p>
                          </div>
                          <span className="text-sm font-semibold text-emerald-200">{number(row.closings)} closings</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </Panel>

            <Panel>
              <SectionHeader eyebrow="Step 7" title="Action plan output" description="Turn the forecast into practical coaching guidance and a next-90-day plan." />
              <div className="mt-5 grid gap-4">
                <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Priority moves</p>
                  <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-200">
                    {actionPlan.priorities.map((item) => (
                      <li key={item} className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <ListCard title="Current wins" items={actionPlan.wins.length ? actionPlan.wins : ["No major wins flagged yet. Improve the scenario mix."]} />
                  <ListCard title="Current risks" items={actionPlan.risks.length ? actionPlan.risks : ["No major risks flagged in the current scenario."]} />
                </div>
                <ListCard title="90-day operating plan" items={actionPlan.ninetyDayPlan} />
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </main>
  );
}

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300/30 focus:bg-white/[0.05]";

function Panel({ children }: { children: React.ReactNode }) {
  return <section className="rounded-[30px] border border-white/10 bg-slate-950/70 p-5 shadow-xl shadow-black/20 sm:p-6">{children}</section>;
}

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{description}</p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{children}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function SelectorCardGroup({
  title,
  items,
  selected,
  onSelect,
}: {
  title: string;
  items: Array<{ id: string; label: string }>;
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <div className="mt-4 grid gap-3">
        {items.map((item) => {
          const isSelected = selected === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${isSelected ? "border-emerald-300/30 bg-emerald-500/10 text-white" : "border-white/10 bg-black/15 text-slate-300 hover:border-white/20"}`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TopStat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{note}</p>
    </div>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-300">{note}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function DashboardCard({
  label,
  value,
  note,
  emphasis,
}: {
  label: string;
  value: string;
  note: string;
  emphasis: "default" | "safe" | "warn" | "danger";
}) {
  const styles = {
    default: "border-white/10 bg-black/15",
    safe: "border-emerald-400/20 bg-emerald-500/10",
    warn: "border-amber-400/20 bg-amber-500/10",
    danger: "border-rose-400/20 bg-rose-500/10",
  } as const;

  return (
    <div className={`rounded-2xl border p-4 ${styles[emphasis]}`}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{note}</p>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-200">
        {items.map((item) => (
          <li key={item} className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function InfoCard({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-200">{body}</p>
    </div>
  );
}
