import { useEffect } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  FlaskConical,
  HelpCircle,
  Library,
  Lock,
  Puzzle,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Wand2,
  Zap,
} from 'lucide-react';
import RoomOutput from '../components/RoomOutput';
import { DEMO_ROOM } from '../lib/demoRoom';
import { getCanonicalUrl, publicConfig } from '../config';
import type { Page } from '../App';

interface LandingPageProps {
  onNavigate: (page: Page) => void;
  onNavigateApp: () => void;
  onUpgrade: () => void;
  isUpgradeLoading?: boolean;
  checkoutError?: string;
}

const features = [
  {
    icon: <Puzzle size={22} />,
    title: 'Puzzle flow generation',
    copy: 'Turn a theme, duration, player count, and format into a logical 5–8 puzzle chain with clear inputs and outputs.',
  },
  {
    icon: <ShoppingCart size={22} />,
    title: 'Prop and shopping lists',
    copy: 'Get the physical materials, scenic items, locks, clue carriers, and consumables operators need to build the experience.',
  },
  {
    icon: <ClipboardCheck size={22} />,
    title: 'Reset checklists',
    copy: 'Give staff a practical reset sequence so the room can turn over consistently between teams.',
  },
  {
    icon: <FileText size={22} />,
    title: 'Operator notes',
    copy: 'Capture setup, hinting, safety, accessibility, staffing, and production considerations in one operator-ready plan.',
  },
  {
    icon: <Library size={22} />,
    title: 'Save library',
    copy: 'Store generated rooms in your Pro library, search by title or theme, filter by format, and duplicate promising concepts.',
  },
  {
    icon: <Download size={22} />,
    title: 'Export options',
    copy: 'Print, save Markdown, download JSON, or copy the operator summary for planning docs, build meetings, and vendor briefs.',
  },
];

const faqs = [
  {
    question: 'Is it a complete room design?',
    answer: 'PuzzleFlow AI creates a production-ready puzzle-flow plan, not a turnkey construction package. It gives operators story beats, chained puzzles, prop lists, reset notes, and staffing guidance that can be adapted to a real venue.',
  },
  {
    question: 'Can I edit the output?',
    answer: 'Yes. Export the room as Markdown or JSON, copy the operator summary, print it for review, or duplicate a saved room before refining it into a stronger concept.',
  },
  {
    question: 'Does it replace a human designer?',
    answer: 'No. It accelerates the first professional draft. Human designers still validate safety, accessibility, fabrication constraints, scenic feasibility, puzzle fairness, and brand fit.',
  },
  {
    question: 'What AI provider is used?',
    answer: 'The secure server endpoint can be configured by the site owner for OpenAI, Gemini, or mock development mode. API keys remain server-side and are never exposed in frontend code.',
  },
  {
    question: 'What happens after purchase?',
    answer: 'Stripe processes the one-time lifetime purchase, then PuzzleFlow AI refreshes your PocketBase account entitlement so Pro generation, saving, library, and export features unlock for your signed-in account.',
  },
];

function setMetaAttribute(selector: string, attribute: string, value: string) {
  const element = document.head.querySelector(selector);
  if (element) {
    element.setAttribute(attribute, value);
  }
}

function useLandingSeo() {
  useEffect(() => {
    const canonicalUrl = getCanonicalUrl('/');
    const socialImageUrl = getCanonicalUrl('/social-card.svg');
    const title = 'PuzzleFlow AI — Production-Ready Escape Room Puzzle Flows';
    const description = 'Generate escape-room puzzle flows, prop lists, reset checklists, and operator-ready plans for escape-room owners, haunt designers, and immersive-event producers.';

    document.title = title;
    setMetaAttribute('meta[name="description"]', 'content', description);
    setMetaAttribute('meta[property="og:title"]', 'content', title);
    setMetaAttribute('meta[property="og:description"]', 'content', description);
    setMetaAttribute('meta[property="og:url"]', 'content', canonicalUrl);
    setMetaAttribute('meta[property="og:type"]', 'content', 'website');
    setMetaAttribute('meta[property="og:image"]', 'content', socialImageUrl);
    setMetaAttribute('meta[name="twitter:title"]', 'content', title);
    setMetaAttribute('meta[name="twitter:description"]', 'content', description);
    setMetaAttribute('meta[name="twitter:card"]', 'content', 'summary_large_image');
    setMetaAttribute('meta[name="twitter:image"]', 'content', socialImageUrl);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    const existingSchema = document.getElementById('puzzleflow-jsonld');
    existingSchema?.remove();

    const schema = document.createElement('script');
    schema.id = 'puzzleflow-jsonld';
    schema.type = 'application/ld+json';
    schema.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${canonicalUrl}#organization`,
          name: 'PuzzleFlow AI',
          url: canonicalUrl,
          email: publicConfig.supportEmail,
        },
        {
          '@type': 'WebSite',
          '@id': `${canonicalUrl}#website`,
          name: 'PuzzleFlow AI',
          url: canonicalUrl,
          publisher: { '@id': `${canonicalUrl}#organization` },
        },
        {
          '@type': ['Product', 'SoftwareApplication'],
          '@id': `${canonicalUrl}#software`,
          name: 'PuzzleFlow AI',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          description,
          url: canonicalUrl,
          brand: { '@id': `${canonicalUrl}#organization` },
          offers: {
            '@type': 'Offer',
            price: '97',
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
            category: 'Lifetime access',
          },
        },
        {
          '@type': 'FAQPage',
          '@id': `${canonicalUrl}#faq`,
          mainEntity: faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.answer,
            },
          })),
        },
      ],
    });
    document.head.appendChild(schema);
  }, []);
}

export default function LandingPage({ onNavigate, onNavigateApp, onUpgrade, isUpgradeLoading = false, checkoutError = '' }: LandingPageProps) {
  useLandingSeo();

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <header className="relative z-10 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <button onClick={onNavigateApp} className="flex items-center gap-3 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-cyan-400/70" aria-label="Open PuzzleFlow AI app">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20">
              <Wand2 size={20} />
            </span>
            <span>
              <span className="block text-sm font-bold tracking-wide text-white">PuzzleFlow AI</span>
              <span className="block text-xs text-slate-400">Escape-room planning engine</span>
            </span>
          </button>

          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <a href="#features" className="rounded hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/70">Features</a>
            <a href="#demo" className="rounded hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/70">Demo</a>
            <a href="#pricing" className="rounded hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/70">Pricing</a>
            <a href="#faq" className="rounded hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/70">FAQ</a>
          </nav>

          <button
            onClick={onNavigateApp}
            className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-cyan-400 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/70"
          >
            Open App
          </button>
        </div>
      </header>

      <main>
        <section className="relative isolate px-6 py-20 sm:py-24 lg:py-28">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.12),transparent_32%)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
                <Sparkles size={14} /> Operator-ready AI planning
              </div>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                Generate production-ready escape-room puzzle flows in minutes.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
                PuzzleFlow AI helps escape-room owners, haunt designers, and immersive-event producers turn a theme into a structured puzzle sequence, prop list, reset checklist, and operator-ready plan.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => onNavigate('demo')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition-colors hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-slate-950"
                >
                  <FlaskConical size={18} /> View Demo Room
                </button>
                <button
                  onClick={onUpgrade}
                  disabled={isUpgradeLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-6 py-3 font-bold text-amber-200 transition-colors hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-amber-300/70"
                >
                  <Zap size={18} /> {isUpgradeLoading ? 'Opening secure checkout...' : 'Unlock Pro — $97 Lifetime'}
                </button>
              </div>
              {checkoutError && (
                <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{checkoutError}</p>
              )}
              <div className="mt-8 grid max-w-2xl gap-3 text-sm text-slate-300 sm:grid-cols-3">
                <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-cyan-300" /> Logical puzzle chains</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-cyan-300" /> Build-ready props</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-cyan-300" /> Staff reset notes</span>
              </div>
            </div>

            <div className="relative rounded-3xl border border-cyan-400/20 bg-slate-900/70 p-5 shadow-2xl shadow-cyan-950/40">
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-cyan-400/20 blur-3xl" />
              <div className="rounded-2xl border border-slate-700 bg-slate-950 p-5">
                <div className="mb-5 flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Planning board</p>
                    <h2 className="mt-1 text-xl font-bold text-white">Puzzle Blueprint</h2>
                  </div>
                  <Lock className="text-amber-300" size={22} />
                </div>
                <div className="space-y-4">
                  {['Theme brief', 'Puzzle 1 output', 'Puzzle 2 input', 'Prop list', 'Reset checklist'].map((label, index) => (
                    <div key={label} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-xs font-bold text-cyan-200">{index + 1}</div>
                      <div className="h-2 rounded-full bg-slate-800">
                        <div className={`h-2 rounded-full bg-gradient-to-r from-cyan-400 to-amber-300 ${index === 0 ? 'w-11/12' : index === 1 ? 'w-4/5' : index === 2 ? 'w-2/3' : index === 3 ? 'w-3/4' : 'w-1/2'}`} />
                      </div>
                      <span className="text-xs text-slate-400">{label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4">
                  <p className="text-sm font-semibold text-amber-100">Visual placeholder</p>
                  <p className="mt-1 text-sm text-slate-300">Dark dramatic escape-room planning board with connected clue cards, lock sketches, prop tags, and puzzle-blueprint lines.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-800 bg-slate-900/45 px-6 py-16">
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-300">The design bottleneck</p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Great room concepts fail when the puzzle chain and operator docs are weak.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Designing a room is not just writing a story. Operators have to make clues feed cleanly into the next lock, source physical props, plan reset steps, support staff hinting, and document safety or accessibility constraints. PuzzleFlow AI gives teams a structured first draft that keeps the experience practical instead of leaving critical details scattered across notes, spreadsheets, and memory.
            </p>
          </div>
        </section>

        <section id="features" className="px-6 py-20">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">What Pro includes</p>
              <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">From idea to operator packet.</h2>
              <p className="mt-4 text-slate-300">Every feature is designed around the practical handoff from creative concept to build meeting, game-master briefing, and reset procedure.</p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <article key={feature.title} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 transition-colors hover:border-cyan-400/40">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">{feature.icon}</div>
                  <h3 className="text-lg font-bold text-white">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{feature.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="demo" className="border-y border-slate-800 bg-slate-900/40 px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Demo preview</p>
                <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Feature room: The Alchemist’s Study</h2>
                <p className="mt-4 max-w-3xl text-slate-300">Preview a sample room plan with chained puzzles, physical props, and operator notes before unlocking custom generation.</p>
              </div>
              <button
                onClick={() => onNavigate('demo')}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/40 px-5 py-3 font-semibold text-cyan-200 hover:bg-cyan-400/10"
              >
                Open Full Demo <ArrowRight size={16} />
              </button>
            </div>
            <div className="max-h-[760px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-2xl shadow-slate-950/60">
              <RoomOutput room={DEMO_ROOM} showActions={false} />
            </div>
            <div className="mt-6 text-center">
              <button onClick={() => onNavigate('demo')} className="text-sm font-semibold text-cyan-300 hover:text-cyan-100">View the complete demo room</button>
            </div>
          </div>
        </section>

        <section id="pricing" className="px-6 py-20">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-300">Simple pricing</p>
              <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">One payment. Lifetime Pro access.</h2>
              <p className="mt-4 text-lg leading-8 text-slate-300">Unlock custom room generation, the saved-room library, and operator export tools with a secure Stripe checkout. No subscription meter. No monthly renewals.</p>
            </div>
            <div className="rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-400/15 to-cyan-400/10 p-8 shadow-2xl shadow-amber-950/30">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-200">PuzzleFlow Pro</p>
                  <p className="mt-3 text-5xl font-black text-white">$97</p>
                  <p className="mt-2 text-slate-300">One-time lifetime access</p>
                </div>
                <ShieldCheck className="text-cyan-300" size={34} />
              </div>
              <div className="mt-6 space-y-3 text-sm text-slate-200">
                <p className="flex items-center gap-2"><CheckCircle2 size={16} className="text-cyan-300" /> No subscription</p>
                <p className="flex items-center gap-2"><CheckCircle2 size={16} className="text-cyan-300" /> Stripe secure checkout</p>
                <p className="flex items-center gap-2"><CheckCircle2 size={16} className="text-cyan-300" /> Generate, save, duplicate, and export room plans</p>
              </div>
              <button
                onClick={onUpgrade}
                disabled={isUpgradeLoading}
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-6 py-4 font-black text-slate-950 transition-colors hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Zap size={18} /> {isUpgradeLoading ? 'Opening secure checkout...' : 'Unlock Pro — $97 Lifetime'}
              </button>
            </div>
          </div>
        </section>

        <section id="faq" className="border-t border-slate-800 bg-slate-900/45 px-6 py-20">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">FAQ</p>
              <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Questions operators ask before going Pro.</h2>
            </div>
            <div className="mt-10 space-y-4">
              {faqs.map((faq, index) => {
                const panelId = `faq-panel-${index}`;
                return (
                  <details key={faq.question} className="group rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                    <summary
                      className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg text-left font-bold text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/70"
                      aria-controls={panelId}
                    >
                      <span className="inline-flex items-center gap-3"><HelpCircle size={18} className="text-cyan-300" aria-hidden="true" /> {faq.question}</span>
                      <span className="text-cyan-300 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                    </summary>
                    <p id={panelId} className="mt-4 leading-7 text-slate-300">{faq.answer}</p>
                  </details>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 px-6 py-8 text-sm text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} PuzzleFlow AI. Planning software for immersive-experience operators.</p>
          <div className="flex flex-wrap gap-4">
            <button onClick={() => onNavigate('terms')} className="rounded hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/70">Terms</button>
            <button onClick={() => onNavigate('privacy')} className="rounded hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/70">Privacy</button>
            <a href={`mailto:${publicConfig.supportEmail}`} className="rounded hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/70">Support: {publicConfig.supportEmail}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
