'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/lib/hooks/use-theme';
import { Sun, Moon } from 'lucide-react';

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
    body: 'If you\'re studying from a textbook, research paper, or lecture notes — paste the content directly. OpenMAIC builds the class around your material, not a generic summary of the topic.',
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
    body: 'Most people watch passively. That wastes 80% of what OpenMAIC can do. The agents are listening — they change course based on your responses.',
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
    code: `Recommended: Gemini 2.5 Flash
• Best speed/quality balance
• Set: GOOGLE_API_KEY=your_key

Also works:
• OpenAI (GPT-4o)
• Anthropic (Claude)
• DeepSeek (cheapest)`,
    tip: 'Self-host via Vercel for free — click Deploy on GitHub, add your API key in env vars, done. Zero monthly cost under the Vercel free tier.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Is this actually free to self-host?',
    a: 'Yes — completely. Clone the repo, deploy to Vercel (free tier), add your own LLM API key (Google Gemini has a generous free tier), and you\'re running at zero cost. The only expense is your own API usage, which is typically a few cents per classroom generation.',
  },
  {
    q: 'What LLMs does it support?',
    a: 'OpenAI (GPT-4o, o1), Anthropic (Claude 3.5+), Google Gemini (all models), DeepSeek, and any OpenAI-compatible API. We recommend Gemini 2.5 Flash for the best speed/quality/cost balance.',
  },
  {
    q: 'How is this different from ChatGPT asking me questions?',
    a: 'OpenMAIC runs multiple agents simultaneously — a professor, a TA, and a student peer who each have distinct personas. They interact with each other, not just with you. Combined with the whiteboard, interactive simulations, and structured scene types, it\'s a fundamentally different experience from a chat interface.',
  },
  {
    q: 'Can I use my own study materials?',
    a: 'Yes — this is one of the most powerful features. Upload a PDF, paste a URL, or drop in raw text. OpenMAIC will build the entire classroom around your source material rather than pulling from general knowledge.',
  },
  {
    q: "What's the AGPL license mean for me as a user?",
    a: "If you're just using OpenMAIC to learn — absolutely nothing. The AGPL license only applies to developers who modify and redistribute the software.",
  },
  {
    q: 'How long does a classroom take to generate?',
    a: 'Typically 45–90 seconds for a full 6–8 scene classroom. Generation is async — you can leave the page and come back. The live classroom runs in real time, with agent speech and whiteboard drawing happening at natural pace.',
  },
];

async function startCheckout(plan: 'pro' | 'teams') {
  try {
    const res = await fetch('/api/stripe-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert(`Checkout error: ${data.error ?? 'Unknown error'}`);
    }
  } catch {
    alert('Failed to start checkout. Please try again.');
  }
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

  const handleCheckout = async (plan: 'pro' | 'teams') => {
    setCheckingOut(plan);
    await startCheckout(plan);
    setCheckingOut(null);
  };

  return (
    <div className="landing-page">
      {/* ── NAV ── */}
      <nav className="landing-nav">
        <Link href="/" className="landing-logo">
          Open<span>MAIC</span>
        </Link>
        <div className="landing-nav-links">
          <a href="#how-to-use">How it works</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="https://github.com/Sid3548/OpenMAIC_sid" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <Link href="/create" className="landing-cta-btn">
            Start free →
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
          OpenMAIC turns any topic — a textbook, a paper, a URL — into a full classroom with AI
          teachers who lecture, debate, quiz, and draw on a whiteboard. In real time. In 60 seconds.
        </p>
        <div className="landing-hero-actions">
          <Link href="/create" className="landing-btn-primary">
            Try it free — no signup →
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
            <span className="landing-demo-url">openmaic/classroom/quantum-entanglement</span>
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
              desc: 'Upload a PDF, paste a URL, or drop in text. OpenMAIC reads your material and builds a class around it — not generic Wikipedia content.',
            },
            {
              icon: '🏗️',
              title: 'Project-based learning',
              desc: 'For complex topics, OpenMAIC creates a structured project with milestones and AI collaborators. Build something, not just memorize something.',
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
          Start free.<br />Pay for what you use.
        </h2>
        <p className="landing-section-sub">
          No subscriptions to forget about. Hosted credits for casual use. Bring your own API key
          for serious work. Self-host for free forever.
        </p>
        <div className="landing-pricing-grid">
          {/* Self-hosted */}
          <div className="landing-plan">
            <div className="landing-plan-name">Self-Hosted</div>
            <div className="landing-plan-price">
              <sup>$</sup>0
            </div>
            <div className="landing-plan-tagline">
              Deploy to Vercel in 2 minutes. Your API key, your infrastructure, zero cost from us.
            </div>
            <hr className="landing-plan-divider" />
            <ul className="landing-plan-features">
              {['Unlimited classrooms', 'All features included', 'Your own LLM API key', 'Docker + Vercel deploy', 'Full source code access'].map((f) => (
                <li key={f}>{f}</li>
              ))}
              {['No hosted dashboard', 'You manage updates'].map((f) => (
                <li key={f} className="landing-plan-feature-muted">{f}</li>
              ))}
            </ul>
            <a
              href="https://github.com/Sid3548/OpenMAIC_sid"
              target="_blank"
              rel="noreferrer"
              className="landing-plan-btn landing-plan-btn-ghost"
            >
              Deploy to Vercel →
            </a>
          </div>
          {/* Pro */}
          <div className="landing-plan landing-plan-featured">
            <div className="landing-plan-badge">Most popular</div>
            <div className="landing-plan-name">Hosted Credits</div>
            <div className="landing-plan-price">
              <sup>$</sup>12<span>/mo</span>
            </div>
            <div className="landing-plan-tagline">
              We handle the infrastructure and API costs. Just learn.
            </div>
            <hr className="landing-plan-divider" />
            <ul className="landing-plan-features">
              {['~50 classrooms/month', 'No API key needed', 'Gemini 2.5 Flash (fastest)', 'PDF & URL uploads', 'Export to PPTX + HTML', 'Voice narration included', 'Priority generation queue'].map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button
              className="landing-plan-btn landing-plan-btn-accent"
              onClick={() => handleCheckout('pro')}
              disabled={checkingOut === 'pro'}
            >
              {checkingOut === 'pro' ? 'Redirecting…' : 'Get started →'}
            </button>
          </div>
          {/* Teams */}
          <div className="landing-plan">
            <div className="landing-plan-name">Teams</div>
            <div className="landing-plan-price">
              <sup>$</sup>39<span>/mo</span>
            </div>
            <div className="landing-plan-tagline">
              For educators, tutors, and learning teams. Shared classroom library + admin dashboard.
            </div>
            <hr className="landing-plan-divider" />
            <ul className="landing-plan-features">
              {['Up to 5 users', 'Shared classroom library', 'Admin dashboard', '~250 classrooms/month', 'All Pro features', 'Bulk export', 'Priority email support'].map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button
              className="landing-plan-btn landing-plan-btn-ghost"
              onClick={() => handleCheckout('teams')}
              disabled={checkingOut === 'teams'}
            >
              {checkingOut === 'teams' ? 'Redirecting…' : 'Talk to us →'}
            </button>
          </div>
        </div>
        <div className="landing-payment-note">
          <span style={{ fontSize: 20 }}>🔒</span>
          <div>
            <strong>Secure payments via Stripe.</strong> Cancel anytime. No credit card required
            for the self-hosted version. Credits roll over within the same billing month.
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
          © 2025 OpenMAIC · AGPL-3.0 License · Forked from{' '}
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
          <a href="mailto:hello@openmaic.com">Contact</a>
        </div>
      </footer>
    </div>
  );
}
