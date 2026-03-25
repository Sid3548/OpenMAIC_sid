'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTheme } from '@/lib/hooks/use-theme';
import { Sun, Moon } from 'lucide-react';

// Razorpay global type (loaded via CDN script)
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, any>) => { open(): void };
  }
}

// ── Step data for "How to use" section ──────────────────────────
const HOW_TO_STEPS = [
  {
    num: '01',
    title: 'Write a real prompt',
    desc: 'Not "quantum physics." Tell it what level you\'re at and what confused you.',
    heading: 'The prompt is everything',
    body: 'Vague prompts create generic classrooms. The more context you give, the more specific and useful the class becomes.',
    code: `// Bad
quantum physics

// Good
Explain quantum entanglement to someone who
understands classical physics but has never
done quantum mechanics. Focus on Bell's
theorem and why it matters. Skip the math.`,
    tip: 'Add "I\'m confused about X" at the end. The agents will specifically address your confusion in the discussion segments.',
  },
  {
    num: '02',
    title: 'Upload your own material',
    desc: 'Paste a PDF, URL, or text. It reads your actual source, not Wikipedia.',
    heading: 'Upload your actual source material',
    body: 'If you\'re studying from a textbook, research paper, or lecture notes — paste the content directly. Open Classroom builds the class around your material, not a generic summary of the topic.',
    code: `• PDF upload (textbooks, papers, notes)
• Paste raw text directly
• Any public URL (articles, docs)
• YouTube video URL (auto-transcribed)`,
    tip: 'For dense papers, paste just the abstract + one specific section. Trying to teach a 40-page paper at once produces shallower classes.',
  },
  {
    num: '03',
    title: 'Talk back during the class',
    desc: 'The agents go off-script when you respond. Ask "wait, explain that again."',
    heading: 'The class responds to you',
    body: 'Most people watch passively. That wastes 80% of what Open Classroom can do. The agents are listening — they change course based on your responses.',
    code: `• "Can you slow down and explain [X] again?"
• "I don't buy that explanation — why?"
• "Give me a real-world example of this"
• "What's the most common mistake here?"
• "Quiz me harder"`,
    tip: 'If you answer a quiz question wrong, ask "explain why I was wrong." The agent gives a targeted explanation for your specific misconception.',
  },
  {
    num: '04',
    title: 'Use the roundtable for hard topics',
    desc: 'Pick "Debate mode" to see multiple agents argue both sides of a concept.',
    heading: 'Roundtable = best for nuanced topics',
    body: 'For topics with multiple valid perspectives — ethical debates, design decisions, historical interpretations — pick the Roundtable mode. Multiple agents take different positions and debate. You can jump in and argue with them.',
    code: `Best topics for roundtable:
• React vs Vue vs Svelte
• Was Napoleon good or bad for Europe?
• Tabs vs spaces (genuinely, try it)
• Should you learn Rust before C?
• Microservices vs monolith for your use case`,
    tip: 'In roundtable mode, take a side at the start. The agents will directly challenge your position. This forces deeper engagement.',
  },
  {
    num: '05',
    title: 'Set up your own API key',
    desc: 'Free tier uses shared quota. Your own key = no limits, faster generation.',
    heading: 'Bring your own API key',
    body: 'The hosted version uses shared quota. For heavy use or if you hit rate limits, connect your own API key in Settings → Providers.',
    code: `Recommended: GPT-5 mini
• Best speed/quality balance
• Set: OPENAI_API_KEY=your_key

Also works:
• Anthropic (Claude)
• Google (Gemini)
• DeepSeek (cheapest)`,
    tip: 'Self-host via Vercel for free — click Deploy on GitHub, add your API key in env vars, done. Zero monthly cost under the Vercel free tier.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Is this actually free to self-host?',
    a: 'Yes — completely. Clone the repo, deploy to Vercel (free tier), add your own LLM API key (OpenAI GPT-5 mini is fast and affordable), and you\'re running at zero cost. The only expense is your own API usage, which is typically a few cents per classroom generation.',
  },
  {
    q: 'What LLMs does it support?',
    a: 'OpenAI (GPT-5 mini, GPT-5, GPT-5.4), Anthropic (Claude 3.5+), Google Gemini (all models), DeepSeek, and any OpenAI-compatible API. We recommend GPT-5 mini for the best speed/quality/cost balance.',
  },
  {
    q: 'How is this different from ChatGPT asking me questions?',
    a: 'Open Classroom runs multiple agents simultaneously — a professor, a TA, and a student peer who each have distinct personas. They interact with each other, not just with you. Combined with the whiteboard, interactive simulations, and structured scene types, it\'s a fundamentally different experience from a chat interface.',
  },
  {
    q: 'Can I use my own study materials?',
    a: 'Yes — this is one of the most powerful features. Upload a PDF, paste a URL, or drop in raw text. Open Classroom will build the entire classroom around your source material rather than pulling from general knowledge.',
  },
  {
    q: "What's the AGPL license mean for me as a user?",
    a: "If you're just using Open Classroom to learn — absolutely nothing. The AGPL license only applies to developers who modify and redistribute the software.",
  },
  {
    q: 'How long does a classroom take to generate?',
    a: 'Typically 45–90 seconds for a full 6–8 scene classroom. Generation is async — you can leave the page and come back. The live classroom runs in real time, with agent speech and whiteboard drawing happening at natural pace.',
  },
];

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window.Razorpay !== 'undefined') { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

async function startCheckout(plan: string, onSuccess: () => void) {
  const loaded = await loadRazorpayScript();
  if (!loaded) { alert('Failed to load Razorpay. Check your connection.'); return; }

  const res = await fetch('/api/razorpay-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  });
  const data = await res.json();
  if (res.status === 401) { window.location.href = '/login?next=/'; return; }
  if (data.error) { alert(`Checkout error: ${data.error}`); return; }

  const rzp = new window.Razorpay({
    key: data.keyId,
    amount: data.amount,
    currency: data.currency,
    name: 'Open Classroom',
    description: data.name,
    order_id: data.orderId,
    theme: { color: '#c8f53a' },
    handler: onSuccess,
  });
  rzp.open();
}

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  const handleCheckout = useCallback(async (plan: string) => {
    setCheckingOut(plan);
    await startCheckout(plan, () => {
      setCheckingOut(null);
      window.location.href = '/payment/success';
    });
    setCheckingOut(null);
  }, []);

  return (
    <div className="landing-page">
      {/* ── NAV ── */}
      <nav className="landing-nav">
        <Link href="/" className="landing-logo">
          Open<span>Classroom</span>
        </Link>
        <div className="landing-nav-links">
          <a href="#how-to-use">How it works</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="https://github.com/Sid3548/OpenMAIC_sid" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <Link href="/login" style={{ color: 'inherit', textDecoration: 'none' }}>
            Sign in
          </Link>
          <Link href="/signup" className="landing-cta-btn">
            Sign up free →
          </Link>
        </div>
        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={toggleTheme}
            className="landing-theme-toggle"
            aria-label="Toggle theme"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="landing-hero">
        <div className="landing-eyebrow">Multi-agent AI classroom</div>
        <h1 className="landing-h1">
          Learn anything.<br />
          <em>Actually</em> learn it.
        </h1>
        <p className="landing-hero-sub">
          Open Classroom turns any topic — a textbook, a paper, a URL — into a full classroom with AI
          teachers who lecture, debate, quiz, and draw on a whiteboard. In real time. In 60 seconds.
        </p>
        <div className="landing-hero-actions">
          <Link href="/signup" className="landing-btn-primary">
            Try it free — sign up →
          </Link>
          <a href="#how-to-use" className="landing-btn-ghost">
            See how it works
          </a>
        </div>
        <div className="landing-hero-stats">
          <div>
            <span className="landing-stat-val">4</span>
            <span className="landing-stat-label">AI agents per classroom</span>
          </div>
          <div>
            <span className="landing-stat-val">60s</span>
            <span className="landing-stat-label">Avg classroom generation</span>
          </div>
          <div>
            <span className="landing-stat-val">28+</span>
            <span className="landing-stat-label">Action types (speech, draw, quiz…)</span>
          </div>
          <div>
            <span className="landing-stat-val">∞</span>
            <span className="landing-stat-label">Topics you can teach it</span>
          </div>
        </div>
      </section>

      {/* ── DEMO WINDOW ── */}
      <section className="landing-demo-section">
        <div className="landing-demo-window">
          <div className="landing-demo-titlebar">
            <span className="landing-dot landing-dot-r" />
            <span className="landing-dot landing-dot-y" />
            <span className="landing-dot landing-dot-g" />
            <span className="landing-demo-url">openclassroom/classroom/quantum-entanglement</span>
          </div>
          <div className="landing-demo-body">
            <div className="landing-demo-scene">
              <span className="landing-demo-label">Slide 3 / 8 — Quantum Entanglement</span>
              <div className="landing-demo-scene-title">
                Why Einstein called it &quot;spooky action at a distance&quot;
              </div>
              <div className="landing-demo-agent landing-demo-agent-prof">
                <div className="landing-agent-avatar">P</div>
                <div>
                  <div className="landing-agent-name">Prof. Ada</div>
                  <div className="landing-agent-text">
                    &quot;Imagine two gloves in separate boxes, sent to opposite ends of the
                    universe. The moment you open one and see it&apos;s a left glove — you
                    instantly know the other is right. Entanglement is like that, except…&quot;
                  </div>
                </div>
              </div>
              <div className="landing-demo-agent landing-demo-agent-student">
                <div className="landing-agent-avatar landing-agent-avatar-green">S</div>
                <div>
                  <div className="landing-agent-name" style={{ color: 'var(--l-accent2)' }}>
                    Student Alex
                  </div>
                  <div className="landing-agent-text">
                    &quot;Wait — but the gloves always had a handedness. Quantum particles
                    don&apos;t have a spin until measured, right?&quot;
                  </div>
                </div>
              </div>
            </div>
            <div className="landing-demo-quiz">
              <div className="landing-demo-label" style={{ marginBottom: 16 }}>
                Quick check — Quiz
              </div>
              <div className="landing-quiz-q">
                What does quantum entanglement NOT allow?
              </div>
              <div className="landing-quiz-opt">Instant correlation between measurements</div>
              <div className="landing-quiz-opt landing-quiz-opt-correct">
                Faster-than-light communication ✓
              </div>
              <div className="landing-quiz-opt">Violation of local realism</div>
              <div className="landing-quiz-opt">Shared quantum state between particles</div>
              <div className="landing-quiz-feedback">
                Correct! The no-communication theorem prevents FTL signalling despite the
                correlations.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="landing-section" id="features">
        <div className="landing-eyebrow">What you get</div>
        <h2 className="landing-section-title">
          Not flashcards.<br />A real classroom.
        </h2>
        <p className="landing-section-sub">
          Every generation is a complete, interactive learning experience. Not a summary, not a quiz
          bank — an actual class.
        </p>
        <div className="landing-features-grid">
          {[
            {
              icon: '🎓',
              title: 'AI teachers that actually teach',
              desc: 'Multiple agents with distinct personas — professor, TA, fellow student. They lecture, debate each other, ask you questions, and call you out if you go quiet.',
            },
            {
              icon: '🖊️',
              title: 'Live whiteboard drawing',
              desc: 'Agents draw diagrams, equations, and flowcharts in real time as they explain. Physics problems get drawn out step by step. Circuits get diagrammed.',
            },
            {
              icon: '🧪',
              title: 'Interactive simulations',
              desc: 'HTML-based experiments built on the fly. Drag a slider to change gravity. Watch a neural network train. Simulate gas molecules in a box.',
            },
            {
              icon: '📄',
              title: 'Teach from your own docs',
              desc: 'Upload a PDF, paste a URL, or drop in text. Open Classroom reads your material and builds a class around it — not generic Wikipedia content.',
            },
            {
              icon: '🏗️',
              title: 'Project-based learning',
              desc: 'For complex topics, Open Classroom creates a structured project with milestones and AI collaborators. Build something, not just memorize something.',
            },
            {
              icon: '📤',
              title: 'Export everything',
              desc: 'Download the slides as an editable .pptx. Export interactive content as a standalone HTML file. Share with classmates or embed anywhere.',
            },
          ].map((f) => (
            <div key={f.title} className="landing-feature">
              <span className="landing-feature-icon">{f.icon}</span>
              <div className="landing-feature-title">{f.title}</div>
              <p className="landing-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW TO USE ── */}
      <section className="landing-section landing-howto" id="how-to-use">
        <div className="landing-eyebrow">The guide people usually skip</div>
        <h2 className="landing-section-title">
          How to get the<br />most out of it
        </h2>
        <p className="landing-section-sub">
          Most people type one word, get confused, and leave. Here&apos;s exactly how to get a
          classroom that blows your mind.
        </p>
        <div className="landing-howto-grid">
          <div className="landing-howto-steps">
            {HOW_TO_STEPS.map((step, i) => (
              <div
                key={i}
                className={`landing-step${activeStep === i ? ' landing-step-active' : ''}`}
                onClick={() => setActiveStep(i)}
              >
                <div className="landing-step-num">{step.num}</div>
                <div>
                  <div className="landing-step-title">{step.title}</div>
                  <div className="landing-step-desc">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="landing-howto-detail">
            {HOW_TO_STEPS.map((step, i) => (
              <div
                key={i}
                className={`landing-detail-panel${activeStep === i ? ' landing-detail-active' : ''}`}
              >
                <h3>{step.heading}</h3>
                <p>{step.body}</p>
                <pre className="landing-code-block">{step.code}</pre>
                <div className="landing-tip-box">
                  <strong>Pro tip:</strong> {step.tip}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="landing-section" id="pricing">
        <div className="landing-eyebrow">Pricing</div>
        <h2 className="landing-section-title">
          1 credit = 1 activity.<br />Start with 1 free.
        </h2>
        <p className="landing-section-sub">
          Sign up and get 1 free activity credit to try it out — no card needed.
          Buy a plan to unlock 30 credits a month.
        </p>
        <div className="landing-pricing-grid">
          {/* Free trial */}
          <div className="landing-plan">
            <div className="landing-plan-name">Free Trial</div>
            <div className="landing-plan-price">
              <sup>₹</sup>0
            </div>
            <div className="landing-plan-tagline">
              Sign up and get 1 free credit to explore the platform at no cost.
            </div>
            <hr className="landing-plan-divider" />
            <ul className="landing-plan-features">
              {['1 free activity credit', 'Full classroom experience', 'All AI features included', 'No credit card required'].map((f) => (
                <li key={f}>{f}</li>
              ))}
              {['Credits do not renew', 'No priority queue'].map((f) => (
                <li key={f} className="landing-plan-feature-muted">{f}</li>
              ))}
            </ul>
            <Link href="/signup" className="landing-plan-btn landing-plan-btn-ghost">
              Sign up free →
            </Link>
          </div>
          {/* Individual */}
          <div className="landing-plan landing-plan-featured">
            <div className="landing-plan-badge">Most popular</div>
            <div className="landing-plan-name">Individual</div>
            <div className="landing-plan-price">
              <sup>₹</sup>499<span>/mo</span>
            </div>
            <div className="landing-plan-tagline">
              30 activity credits every month. We handle infrastructure and AI costs.
            </div>
            <hr className="landing-plan-divider" />
            <ul className="landing-plan-features">
              {['30 credits/month (~30 classrooms)', 'No API key needed', 'GPT-5 powered generation', 'PDF & URL uploads', 'Export to PPTX + HTML', 'Voice narration (Google TTS)', 'Quiz + interview modules', 'Credit refund if anything breaks'].map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button
              className="landing-plan-btn landing-plan-btn-accent"
              onClick={() => handleCheckout('individual')}
              disabled={checkingOut === 'individual'}
            >
              {checkingOut === 'individual' ? 'Redirecting…' : 'Get started →'}
            </button>
          </div>
          {/* Batch / Teacher */}
          <div className="landing-plan">
            <div className="landing-plan-name">Batch / Teacher</div>
            <div className="landing-plan-price">
              <sup>₹</sup>399<span>/user/mo</span>
            </div>
            <div className="landing-plan-tagline">
              For educators managing multiple students. Minimum 5 users. Contact us to set up.
            </div>
            <hr className="landing-plan-divider" />
            <ul className="landing-plan-features">
              {['Min. 5 users', '30 credits/user/month', 'Shared classroom library', 'Admin dashboard', 'All Individual features', 'Priority email support', 'Onboarding call included'].map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <a
              href="mailto:contact@openclassroom.online?subject=Batch%20Plan%20Inquiry"
              className="landing-plan-btn landing-plan-btn-ghost"
            >
              Contact us →
            </a>
          </div>
        </div>
        <div className="landing-payment-note">
          <span style={{ fontSize: 20 }}>🔒</span>
          <div>
            <strong>Secure payments via Razorpay.</strong> Cancel anytime.
            If a generation fails or the AI misbehaves, your credit is automatically refunded
            with an apology.
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="landing-section" style={{ paddingTop: 60 }}>
        <div className="landing-eyebrow">Questions</div>
        <h2 className="landing-section-title" style={{ marginBottom: 40 }}>
          Quick answers
        </h2>
        <div className="landing-faq-list">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className={`landing-faq-item${openFaq === i ? ' landing-faq-open' : ''}`}
            >
              <button
                className="landing-faq-q"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                {item.q}
              </button>
              {openFaq === i && <div className="landing-faq-a">{item.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BAND ── */}
      <section className="landing-cta-band">
        <h2>
          What do you want<br />to <em>actually</em> learn today?
        </h2>
        <p>Type a topic. 60 seconds later, you&apos;re in class.</p>
        <Link href="/create" className="landing-btn-primary" style={{ fontSize: 16, padding: '16px 36px' }}>
          Open the classroom →
        </Link>
      </section>

      {/* ── FOOTER ── */}
      <footer className="landing-footer">
        <div className="landing-footer-left">
          © 2025 Open Classroom · AGPL-3.0 License · Forked from{' '}
          <a href="https://github.com/THU-MAIC/OpenMAIC" target="_blank" rel="noreferrer">
            THU-MAIC
          </a>
          {' · '}AI Classroom for Every Student
        </div>
        <div className="landing-footer-links">
          <a href="https://github.com/Sid3548/OpenMAIC_sid" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <Link href="/create">Live demo</Link>
          <a href="mailto:hello@openclassroom.online">Contact</a>
        </div>
      </footer>
    </div>
  );
}
