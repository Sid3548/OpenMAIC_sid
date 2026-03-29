'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight, Sparkles, FileText, Settings, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const WALKTHROUGH_KEY = 'hasSeenWalkthrough';

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight?: string;
}

const STEPS: Step[] = [
  {
    icon: <Sparkles className="size-5 text-lime-500" />,
    title: 'Welcome to Open Classroom',
    description:
      "Create interactive AI-powered classrooms in seconds. Let's show you how it works.",
  },
  {
    icon: <FileText className="size-5 text-blue-500" />,
    title: 'Describe your topic',
    description:
      'Type any subject you want to learn — or upload a PDF/paste a URL to build a classroom from your own materials.',
    highlight: 'textarea',
  },
  {
    icon: <Settings className="size-5 text-amber-500" />,
    title: 'Connect your API key',
    description:
      'Click the Settings gear to add your OpenAI API key (GPT-5 mini is recommended). Free shared quota available to start.',
    highlight: 'settings',
  },
  {
    icon: <Zap className="size-5 text-lime-500" />,
    title: 'Generate & learn',
    description:
      'Hit the Generate button and watch multiple AI agents build your classroom — professor, TA, and peer working together.',
    highlight: 'generate',
  },
];

interface WalkthroughProps {
  onOpenSettings?: () => void;
}

export function Walkthrough({ onOpenSettings }: WalkthroughProps) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(WALKTHROUGH_KEY);
      if (!seen) {
        // Slight delay so the page renders first
        const t = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(t);
      }
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(WALKTHROUGH_KEY, 'true');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
      if (step === 2 && onOpenSettings) {
        onOpenSettings();
      }
    }
  };

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
            onClick={dismiss}
          />

          {/* Card */}
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed z-50 bottom-8 left-1/2 -translate-x-1/2 w-[min(90vw,400px)]"
          >
            <div className="relative rounded-2xl border border-white/10 bg-gray-900/95 backdrop-blur-xl shadow-2xl shadow-black/40 p-5">
              {/* Close */}
              <button
                onClick={dismiss}
                className="absolute top-3 right-3 p-1 rounded-full text-gray-500 hover:text-gray-300 hover:bg-white/10 transition-colors"
                aria-label="Close walkthrough"
              >
                <X className="size-4" />
              </button>

              {/* Step dots */}
              <div className="flex gap-1.5 mb-4">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1 rounded-full transition-all duration-300',
                      i === step
                        ? 'w-5 bg-lime-400'
                        : i < step
                          ? 'w-2 bg-lime-600/50'
                          : 'w-2 bg-gray-700',
                    )}
                  />
                ))}
              </div>

              {/* Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="shrink-0 size-8 rounded-lg bg-white/5 flex items-center justify-center">
                      {current.icon}
                    </div>
                    <p className="font-semibold text-sm text-white">{current.title}</p>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed pl-[2.625rem]">
                    {current.description}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Footer */}
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={dismiss}
                  className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={next}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-lime-500 hover:bg-lime-400 text-black text-xs font-semibold transition-colors"
                >
                  {isLast ? 'Get started' : 'Next'}
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
