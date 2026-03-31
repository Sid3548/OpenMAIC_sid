'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useTheme } from '@/lib/hooks/use-theme';
import { Sun, Moon, Menu, X, LogOut } from 'lucide-react';

// Razorpay global type (loaded via CDN script)
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, any>) => { open(): void };
  }
}

// ── Step data for "How it works" section ──────────────────────────
const HOW_TO_STEPS = [
  {
    num: '01',
    title: 'Tell it what you need to learn',
    desc: 'Be specific — say what confuses you, not just the topic name.',
    heading: 'The more specific, the better',
    body: 'A good prompt creates a class tailored to exactly where you are. Mention your level, what confuses you, and what you want to walk away understanding.',
    code: `// Generic (produces a shallow class)
quantum physics

// Specific (produces a class that actually helps)
Explain quantum entanglement to someone who
understands classical physics but has never
done quantum mechanics. Focus on Bell's
theorem and why it matters. Skip the math.`,
    tip: 'Add "I\'m confused about X" — the class will specifically tackle your confusion, not just give a textbook overview.',
  },
  {
    num: '02',
    title: 'Use your own study material',
    desc: 'Upload a PDF, paste a URL, or drop in text from your actual textbook.',
    heading: 'Learn from YOUR material, not generic content',
    body: "Studying from a textbook, research paper, or lecture notes? Paste the content directly. Open Classroom builds the class around your actual material — so the quizzes, explanations, and simulations are about what you're actually studying.",
    code: `Works with:
• PDF upload (textbooks, papers, notes)
• Paste raw text directly
• Any public URL (articles, docs)
• YouTube video URL (auto-transcribed)`,
    tip: 'For dense papers, paste just the abstract + one key section. You get a deeper, more focused class than trying to cover everything.',
  },
  {
    num: '03',
    title: "Participate — don't just watch",
    desc: 'Answer quizzes, ask questions mid-class, interact with simulations.',
    heading: 'You learn by doing, not watching',
    body: 'Every class includes quizzes that test your understanding, simulations you can interact with, and moments where the teacher asks YOU questions. If you answer wrong, you get a targeted explanation of your specific mistake — not a generic correction.',
    code: `During a class, you can:
• Answer quiz questions (get instant feedback)
• "Wait, explain that part again"
• "Give me a real-world example"
• Drag sliders in interactive simulations
• "Quiz me harder on this"`,
    tip: 'Wrong answers are the most valuable part. Ask "explain why I was wrong" — you get a personalized explanation that sticks.',
  },
  {
    num: '04',
    title: 'Explore different perspectives',
    desc: 'Use Roundtable mode for topics with multiple valid viewpoints.',
    heading: 'Hear both sides, then decide',
    body: 'For nuanced topics — ethical debates, design trade-offs, historical interpretations — Roundtable mode presents multiple perspectives that challenge each other. You can jump in and argue. This builds deeper understanding than any single explanation.',
    code: `Great for:
• Should I use React or Vue for this project?
• Was the French Revolution justified?
• Microservices vs monolith — for MY use case
• Nature vs nurture in language development
• Active vs passive investing`,
    tip: "Pick a side at the start. The class will challenge your position directly — that's where the real learning happens.",
  },
];

const FAQ_ITEMS = [
  {
    q: 'How is this different from watching YouTube or asking ChatGPT?',
    a: 'YouTube is passive — you watch, maybe zone out, maybe rewind 10 times. ChatGPT gives you text walls you skim. Open Classroom is structured like a real class: a teacher explains with diagrams, quizzes check if you actually understood, and interactive simulations let you experiment. You participate, not just consume.',
  },
  {
    q: 'Do I just watch, or do I actually participate?',
    a: 'You actively participate. Every class includes quizzes where you answer questions and get instant feedback, interactive simulations where you drag sliders and see results change, and moments where the teacher asks you directly. If you get something wrong, you get a targeted explanation of your specific mistake.',
  },
  {
    q: 'Can I use my own textbook or study material?',
    a: "Yes — upload a PDF, paste a URL, or drop in text from your actual course material. The class is built around YOUR content, not generic knowledge. So the quizzes, examples, and explanations are directly relevant to what you're studying.",
  },
  {
    q: 'What subjects work best?',
    a: 'Anything conceptual — physics, chemistry, biology, math, computer science, history, economics, philosophy, law, medicine. It works especially well for topics where understanding WHY matters more than memorizing facts. If a good teacher could explain it better than a textbook, Open Classroom can help.',
  },
  {
    q: 'What do I get in the 2 free classes?',
    a: 'The exact same experience as paid classes — full teaching with visual diagrams, interactive quizzes, simulations, voice narration, and the ability to ask questions mid-class. No features are locked behind payment. The free classes refresh every week.',
  },
  {
    q: 'How long does each class take?',
    a: 'A class generates in about 60 seconds. The class itself runs at a natural pace — typically 10–20 minutes depending on the topic depth. You control the speed: pause, skip ahead, go back, or ask the teacher to slow down and explain something again.',
  },
];

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window.Razorpay !== 'undefined') {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

async function startCheckout(plan: string, onSuccess: () => void) {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    alert('Failed to load Razorpay. Check your connection.');
    return;
  }

  const res = await fetch('/api/razorpay-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  });
  const data = await res.json();
  if (res.status === 401) {
    window.location.href = '/login?next=/';
    return;
  }
  if (data.error) {
    alert(`Checkout error: ${data.error}`);
    return;
  }

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
  const { data: session } = useSession();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Redirect logged-in users to the create page
  useEffect(() => {
    if (session?.user) {
      router.replace('/create');
    }
  }, [session, router]);

  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  const handleCheckout = useCallback(async (plan: string) => {
    setCheckingOut(plan);
    await startCheckout(plan, () => {
      setCheckingOut(null);
      window.location.href = '/payment/success';
    });
    setCheckingOut(null);
  }, []);

  // Don't render marketing page for logged-in users (redirecting to /create)
  if (session?.user) return null;

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
          <Link href="/library" style={{ color: 'inherit', textDecoration: 'none' }}>
            My Library
          </Link>
          {session ? (
            <>
              <Link href="/create" style={{ color: 'inherit', textDecoration: 'none' }}>
                {session.user?.name || session.user?.email || 'Dashboard'}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="landing-cta-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <LogOut size={14} /> Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" style={{ color: 'inherit', textDecoration: 'none' }}>
                Sign in
              </Link>
              <Link href="/signup" className="landing-cta-btn">
                Sign up free →
              </Link>
            </>
          )}
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
        {/* Mobile menu toggle */}
        <button
          className="landing-mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="landing-mobile-menu" onClick={() => setMobileMenuOpen(false)}>
          <a href="#how-to-use">How it works</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="https://github.com/Sid3548/OpenMAIC_sid" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <Link href="/library" style={{ color: 'inherit', textDecoration: 'none' }}>
            My Library
          </Link>
          {session ? (
            <>
              <Link href="/create" style={{ color: 'inherit', textDecoration: 'none' }}>
                {session.user?.name || session.user?.email || 'Dashboard'}
              </Link>
              <button
                onClick={() => {
                  signOut({ callbackUrl: '/login' });
                  setMobileMenuOpen(false);
                }}
                className="landing-cta-btn"
                style={{
                  textAlign: 'center',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <LogOut size={14} /> Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" style={{ color: 'inherit', textDecoration: 'none' }}>
                Sign in
              </Link>
              <Link href="/signup" className="landing-cta-btn" style={{ textAlign: 'center' }}>
                Sign up free →
              </Link>
            </>
          )}
        </div>
      )}

      {/* ── HERO ── */}
      <section className="landing-hero">
        <div className="landing-eyebrow">Stop watching. Start understanding.</div>
        <h1 className="landing-h1">
          Understand anything.
          <br />
          <em>Faster.</em>
        </h1>
        <p className="landing-hero-sub">
          Open Classroom replaces scattered YouTube videos and ChatGPT walls of text with
          structured, interactive classes — complete with teaching, quizzes, and simulations. You
          don&apos;t just read. You participate, answer, and actually learn.
        </p>
        <div className="landing-hero-actions">
          <Link href="/signup" className="landing-btn-primary">
            Try 2 full classes free →
          </Link>
          <a href="#how-to-use" className="landing-btn-ghost">
            See how it works
          </a>
        </div>
        <p className="landing-hero-note">No credit card required. 2 free classes every week.</p>
        <div className="landing-hero-stats">
          <div>
            <span className="landing-stat-val">60s</span>
            <span className="landing-stat-label">to generate a full class</span>
          </div>
          <div>
            <span className="landing-stat-val">Quizzes</span>
            <span className="landing-stat-label">that test real understanding</span>
          </div>
          <div>
            <span className="landing-stat-val">Simulations</span>
            <span className="landing-stat-label">you interact with, not watch</span>
          </div>
          <div>
            <span className="landing-stat-val">Any topic</span>
            <span className="landing-stat-label">from your textbook or curiosity</span>
          </div>
        </div>
      </section>

      {/* ── DEMO WINDOW ── */}
      <section className="landing-demo-section">
        <p
          className="landing-section-sub"
          style={{
            textAlign: 'center',
            marginBottom: 24,
            maxWidth: 560,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          Here&apos;s what a class actually looks like — teaching, questions, and quizzes that test
          your understanding:
        </p>
        <div className="landing-demo-window">
          <div className="landing-demo-titlebar">
            <span className="landing-dot landing-dot-r" />
            <span className="landing-dot landing-dot-y" />
            <span className="landing-dot landing-dot-g" />
            <span className="landing-demo-url">
              openclassroom / quantum-entanglement / slide 3 of 8
            </span>
          </div>
          <div className="landing-demo-body">
            <div className="landing-demo-scene">
              <span className="landing-demo-label">Teaching — Quantum Entanglement</span>
              <div className="landing-demo-scene-title">
                Why Einstein called it &quot;spooky action at a distance&quot;
              </div>
              <div className="landing-demo-agent landing-demo-agent-prof">
                <div className="landing-agent-avatar">T</div>
                <div>
                  <div className="landing-agent-name">Teacher</div>
                  <div className="landing-agent-text">
                    &quot;Imagine two gloves in separate boxes, sent to opposite ends of the
                    universe. The moment you open one and see it&apos;s a left glove — you instantly
                    know the other is right. Entanglement is like that, except…&quot;
                  </div>
                </div>
              </div>
              <div className="landing-demo-agent landing-demo-agent-student">
                <div className="landing-agent-avatar landing-agent-avatar-green">You</div>
                <div>
                  <div className="landing-agent-name" style={{ color: 'var(--l-accent2)' }}>
                    Your question
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
                Quiz — Do you actually understand?
              </div>
              <div className="landing-quiz-q">What does quantum entanglement NOT allow?</div>
              <div className="landing-quiz-opt">Instant correlation between measurements</div>
              <div className="landing-quiz-opt landing-quiz-opt-correct">
                Faster-than-light communication ✓
              </div>
              <div className="landing-quiz-opt">Violation of local realism</div>
              <div className="landing-quiz-opt">Shared quantum state between particles</div>
              <div className="landing-quiz-feedback">
                Correct! The no-communication theorem prevents FTL signalling despite the
                correlations. You got this because the glove analogy made it click.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="landing-section" id="features">
        <div className="landing-eyebrow">Why it works</div>
        <h2 className="landing-section-title">
          You participate.
          <br />
          That&apos;s why you remember.
        </h2>
        <p className="landing-section-sub">
          Every class is structured to make you think, answer, and interact — not passively scroll.
        </p>
        <div className="landing-features-grid">
          {[
            {
              icon: '✋',
              title: 'You answer, not just read',
              desc: 'Quizzes throughout every class test whether you actually understood — not whether you can copy-paste. Get wrong? You get a targeted explanation of YOUR specific mistake.',
            },
            {
              icon: '🔬',
              title: 'Touch it, not just hear about it',
              desc: 'Drag a slider to change gravity. Adjust variables in a chemical reaction. Watch a sorting algorithm run. Interactive simulations make abstract concepts concrete and intuitive.',
            },
            {
              icon: '🖊️',
              title: 'See it drawn out, step by step',
              desc: 'Diagrams, equations, and flowcharts are drawn in real time as concepts are explained. You see how the pieces connect — not just the final answer.',
            },
            {
              icon: '📄',
              title: 'Learn from YOUR textbook',
              desc: 'Upload your actual PDF, paste a URL, or drop in your course notes. The class is built around what you need to study — not generic internet content.',
            },
            {
              icon: '🏗️',
              title: "Build something, don't just memorize",
              desc: 'For complex topics, structured projects guide you through building real understanding. Milestones keep you on track. You walk away knowing how to apply what you learned.',
            },
            {
              icon: '📤',
              title: 'Take it with you',
              desc: 'Download slides as an editable .pptx for revision. Export interactive content as a standalone file. Share with classmates or review before an exam.',
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
        <div className="landing-eyebrow">How it works</div>
        <h2 className="landing-section-title">
          Four steps to
          <br />
          actually understanding
        </h2>
        <p className="landing-section-sub">
          Each class is structured around active learning — you don&apos;t just sit and watch.
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
          Try 2 full classes free.
          <br />
          Every week. No card needed.
        </h2>
        <p className="landing-section-sub">
          Each class includes structured teaching with visual diagrams, interactive quizzes,
          hands-on simulations, and voice narration. Upload your own material or pick any topic.
        </p>

        {/* What's in a class — live preview tiles */}
        <div className="landing-class-includes">
          {/* TEACHING tile */}
          <div className="landing-class-tile">
            <div className="landing-tile-header">
              <span className="landing-tile-emoji">🎓</span>
              <div>
                <div className="landing-tile-label">Teaching</div>
                <div className="landing-tile-sublabel">AI teacher explains with live diagrams</div>
              </div>
            </div>
            <div className="landing-tile-preview landing-tile-preview-teach">
              <div className="landing-preview-agent">
                <div className="landing-preview-avatar" style={{ background: '#4F46E5' }}>
                  T
                </div>
                <div className="landing-preview-bubble">
                  <div className="landing-preview-name">Teacher</div>
                  <div className="landing-preview-text">
                    &quot;Imagine a leaf as a tiny solar panel — it captures sunlight and converts
                    it into sugar the plant uses as food...&quot;
                  </div>
                </div>
              </div>
              <div className="landing-preview-whiteboard">
                <div className="landing-preview-wb-label">☀️ Sunlight</div>
                <div className="landing-preview-wb-arrow">↓</div>
                <div className="landing-preview-wb-box">🌿 Leaf (Chloroplast)</div>
                <div className="landing-preview-wb-arrow">↓</div>
                <div className="landing-preview-wb-row">
                  <span>🍬 Glucose</span>
                  <span>+</span>
                  <span>💨 O₂</span>
                </div>
              </div>
            </div>
          </div>

          {/* QUIZZES tile */}
          <div className="landing-class-tile">
            <div className="landing-tile-header">
              <span className="landing-tile-emoji">🧩</span>
              <div>
                <div className="landing-tile-label">Quizzes</div>
                <div className="landing-tile-sublabel">
                  Test real understanding, get instant feedback
                </div>
              </div>
            </div>
            <div className="landing-tile-preview landing-tile-preview-quiz">
              <div className="landing-preview-question">
                What do plants release during photosynthesis?
              </div>
              <div className="landing-preview-options">
                <div className="landing-preview-opt landing-preview-opt-wrong">
                  Carbon dioxide ✗
                </div>
                <div className="landing-preview-opt landing-preview-opt-correct">Oxygen ✓</div>
                <div className="landing-preview-opt">Nitrogen</div>
                <div className="landing-preview-opt">Water vapour</div>
              </div>
              <div className="landing-preview-feedback">
                💡 Correct! Plants absorb CO₂ and release O₂ — which is why forests are called the
                lungs of the Earth.
              </div>
            </div>
          </div>

          {/* SIMULATIONS tile */}
          <div className="landing-class-tile">
            <div className="landing-tile-header">
              <span className="landing-tile-emoji">🔬</span>
              <div>
                <div className="landing-tile-label">Simulations</div>
                <div className="landing-tile-sublabel">Interact with live experiments</div>
              </div>
            </div>
            <div className="landing-tile-preview landing-tile-preview-sim">
              <div className="landing-preview-sim-label">💡 Circuit Simulator</div>
              <div className="landing-preview-sim-body">
                <div className="landing-preview-sim-row">
                  <span className="landing-preview-sim-item landing-preview-sim-battery">🔋</span>
                  <div className="landing-preview-sim-wire" />
                  <span className="landing-preview-sim-item landing-preview-sim-bulb">💡</span>
                  <div className="landing-preview-sim-wire" />
                  <span className="landing-preview-sim-item">🔌</span>
                </div>
                <div className="landing-preview-sim-slider">
                  <div className="landing-preview-sim-slider-label">
                    Voltage <strong>9V</strong>
                  </div>
                  <div className="landing-preview-sim-track">
                    <div className="landing-preview-sim-fill" style={{ width: '65%' }} />
                    <div className="landing-preview-sim-thumb" style={{ left: '65%' }} />
                  </div>
                </div>
                <div className="landing-preview-sim-result">
                  Brightness: <strong style={{ color: '#F59E0B' }}>████░░</strong>
                </div>
              </div>
              <div className="landing-preview-sim-hint">← drag to change voltage</div>
            </div>
          </div>

          {/* VOICE tile */}
          <div className="landing-class-tile">
            <div className="landing-tile-header">
              <span className="landing-tile-emoji">🔊</span>
              <div>
                <div className="landing-tile-label">Voice</div>
                <div className="landing-tile-sublabel">Listen to your AI teacher speak</div>
              </div>
            </div>
            <div className="landing-tile-preview landing-tile-preview-voice">
              <div className="landing-preview-voice-player">
                <div className="landing-preview-voice-avatar">T</div>
                <div className="landing-preview-voice-info">
                  <div className="landing-preview-voice-name">Teacher — Slide 3 of 8</div>
                  <div className="landing-preview-voice-topic">Photosynthesis explained</div>
                </div>
              </div>
              <div className="landing-preview-voice-wave">
                {[3, 6, 9, 12, 8, 5, 10, 14, 7, 4, 11, 6, 9, 3, 8, 12, 5, 10].map((h, i) => (
                  <div
                    key={i}
                    className="landing-preview-voice-bar"
                    style={{
                      height: `${h * 2}px`,
                      animationDelay: `${i * 0.08}s`,
                      opacity: i < 10 ? 1 : 0.3,
                    }}
                  />
                ))}
              </div>
              <div className="landing-preview-voice-controls">
                <span>◀◀</span>
                <span className="landing-preview-voice-play">▶</span>
                <span>▶▶</span>
              </div>
              <div className="landing-preview-voice-time">1:24 / 3:10</div>
            </div>
          </div>
        </div>

        <div className="landing-pricing-grid">
          {/* Starter */}
          <div className="landing-plan">
            <div className="landing-plan-name">Starter</div>
            <div className="landing-plan-price">
              <sup>₹</sup>299<span>/mo</span>
            </div>
            <div className="landing-plan-price-usd">$4.99/mo</div>
            <div className="landing-plan-tagline">
              15 classes a month — enough for regular study sessions.
            </div>
            <hr className="landing-plan-divider" />
            <ul className="landing-plan-features">
              {[
                '15 full classes/month',
                'Teaching + quizzes + simulations',
                'Voice narration in every class',
                'Upload your own study material',
                'Export slides and interactive content',
                'Refund if a class doesn\u2019t generate properly',
              ].map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button
              className="landing-plan-btn landing-plan-btn-ghost"
              onClick={() => handleCheckout('starter')}
              disabled={checkingOut === 'starter'}
            >
              {checkingOut === 'starter' ? 'Redirecting…' : 'Get started →'}
            </button>
          </div>
          {/* Pro */}
          <div className="landing-plan landing-plan-featured">
            <div className="landing-plan-badge">Best value</div>
            <div className="landing-plan-name">Pro</div>
            <div className="landing-plan-price">
              <sup>₹</sup>499<span>/mo</span>
            </div>
            <div className="landing-plan-price-usd">$9.99/mo</div>
            <div className="landing-plan-tagline">
              30 classes a month — for serious learners and exam prep.
            </div>
            <hr className="landing-plan-divider" />
            <ul className="landing-plan-features">
              {[
                '30 full classes/month',
                'Teaching + quizzes + simulations',
                'Voice narration in every class',
                'Upload your own study material',
                'Export slides and interactive content',
                'Priority — your classes generate first',
                'Refund if a class doesn\u2019t generate properly',
              ].map((f) => (
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
          {/* Team */}
          <div className="landing-plan">
            <div className="landing-plan-name">Team</div>
            <div className="landing-plan-price">
              <sup>₹</sup>399<span>/user/mo</span>
            </div>
            <div className="landing-plan-price-usd">$7.99/user/mo</div>
            <div className="landing-plan-tagline">For educators and teams. Minimum 5 users.</div>
            <hr className="landing-plan-divider" />
            <ul className="landing-plan-features">
              {[
                '30 classes/user/month',
                'Everything in Pro',
                'Shared classroom library',
                'Admin dashboard',
                'Priority email support',
                'Onboarding call included',
              ].map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <a
              href="mailto:contact@openclassroom.online?subject=Team%20Plan%20Inquiry"
              className="landing-plan-btn landing-plan-btn-ghost"
            >
              Contact us →
            </a>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 32, marginBottom: 8 }}>
          <Link
            href="/signup"
            className="landing-btn-primary"
            style={{ fontSize: 15, padding: '14px 32px' }}
          >
            Try 2 full classes free →
          </Link>
          <p style={{ fontSize: 13, color: 'var(--l-muted)', marginTop: 10 }}>
            No credit card. 2 free classes every week. Same quality as paid plans.
          </p>
        </div>
        <div className="landing-payment-note">
          <span style={{ fontSize: 20 }}>🔒</span>
          <div>
            <strong>Secure payments via Razorpay.</strong> Cancel anytime. If a class fails to
            generate or something goes wrong, your credit is automatically refunded.
          </div>
        </div>
        <div className="landing-payment-note" style={{ marginTop: 12 }}>
          <span style={{ fontSize: 20 }}>🌍</span>
          <div>
            <strong>Paying from outside India?</strong> We&apos;re setting up international
            payments. Sign up for free now and{' '}
            <a
              href="mailto:contact@openclassroom.online?subject=International%20Subscription&body=Hi%2C%20I'd%20like%20to%20subscribe%20from%20outside%20India.%20Please%20let%20me%20know%20when%20USD%20payments%20are%20available."
              style={{ color: 'var(--l-accent)', textDecoration: 'underline' }}
            >
              drop us an email
            </a>
            &nbsp;— we&apos;ll set up your subscription personally and notify you when USD payments
            go live.
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
            <div key={i} className={`landing-faq-item${openFaq === i ? ' landing-faq-open' : ''}`}>
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
          What do you need
          <br />
          to <em>understand</em> today?
        </h2>
        <p>
          Pick a topic. 60 seconds later, you&apos;re learning — with quizzes, diagrams, and
          simulations.
        </p>
        <Link
          href="/signup"
          className="landing-btn-primary"
          style={{ fontSize: 16, padding: '16px 36px' }}
        >
          Try 2 classes free →
        </Link>
        <p style={{ fontSize: 13, color: 'var(--l-muted)', marginTop: 12 }}>
          No credit card required.
        </p>
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
