'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, Play, Square, ChevronDown, Check, Globe } from 'lucide-react';
import { useSettingsStore } from '@/lib/store/settings';
import { TTS_PROVIDERS } from '@/lib/audio/constants';
import type { TTSProviderId, TTSVoiceInfo } from '@/lib/audio/types';
import { cn } from '@/lib/utils';

/**
 * Voice picker widget shown during generation to let users choose a voice
 * while the AI generates their classroom — makes the wait productive.
 */
export function VoicePicker() {
  const ttsProviderId = useSettingsStore((s) => s.ttsProviderId);
  const ttsVoice = useSettingsStore((s) => s.ttsVoice);
  const setTTSProvider = useSettingsStore((s) => s.setTTSProvider);
  const setTTSVoice = useSettingsStore((s) => s.setTTSVoice);

  const [expanded, setExpanded] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Get the active provider config
  const provider = TTS_PROVIDERS[ttsProviderId];
  const voices = provider?.voices ?? [];

  // Group voices by language
  const voicesByLang: Record<string, TTSVoiceInfo[]> = {};
  for (const v of voices) {
    const lang = (v as TTSVoiceInfo & { localeName?: string }).localeName || v.language || 'Other';
    if (!voicesByLang[lang]) voicesByLang[lang] = [];
    voicesByLang[lang].push(v);
  }

  const stopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
    setPlayingVoice(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopPreview(), [stopPreview]);

  const previewVoice = useCallback(
    async (voiceId: string) => {
      stopPreview();

      const controller = new AbortController();
      abortRef.current = controller;
      setPlayingVoice(voiceId);

      try {
        const resp = await fetch('/api/generate/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: 'Welcome to your AI classroom. Let me be your guide today.',
            voiceId,
            providerId: ttsProviderId,
          }),
          signal: controller.signal,
        });

        if (!resp.ok) {
          setPlayingVoice(null);
          return;
        }

        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(url);
          setPlayingVoice(null);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          setPlayingVoice(null);
        };

        await audio.play();
      } catch {
        setPlayingVoice(null);
      }
    },
    [ttsProviderId, stopPreview],
  );

  const selectVoice = useCallback(
    (voiceId: string) => {
      setTTSVoice(voiceId);
    },
    [setTTSVoice],
  );

  // Available providers (only show ones that are configured or google-tts which uses server key)
  const availableProviders = Object.values(TTS_PROVIDERS).filter(
    (p) => p.id === 'google-tts' || p.id === 'browser-native-tts' || p.id === ttsProviderId,
  );

  const selectedVoiceInfo = voices.find((v: TTSVoiceInfo) => v.id === ttsVoice);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="w-full max-w-lg"
    >
      <div className="rounded-2xl border border-muted/40 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg overflow-hidden">
        {/* Header */}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-teal-500/10 flex items-center justify-center">
              <Volume2 className="size-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold">Choose your teacher&apos;s voice</div>
              <div className="text-xs text-muted-foreground">
                {selectedVoiceInfo
                  ? `${selectedVoiceInfo.name} · ${selectedVoiceInfo.gender}`
                  : 'Select a voice while we generate your classroom'}
              </div>
            </div>
          </div>
          <ChevronDown
            className={cn(
              'size-4 text-muted-foreground transition-transform duration-200',
              expanded && 'rotate-180',
            )}
          />
        </button>

        {/* Expanded content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 space-y-4">
                {/* Provider tabs */}
                {availableProviders.length > 1 && (
                  <div className="flex gap-1 p-1 rounded-lg bg-muted/30">
                    {availableProviders.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setTTSProvider(p.id as TTSProviderId)}
                        className={cn(
                          'flex-1 text-xs py-1.5 px-2 rounded-md transition-all font-medium',
                          ttsProviderId === p.id
                            ? 'bg-white dark:bg-slate-800 shadow-sm text-foreground'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Voice list grouped by language */}
                <div className="max-h-64 overflow-y-auto space-y-3 -mx-1 px-1 scrollbar-thin">
                  {Object.entries(voicesByLang).map(([lang, langVoices]) => (
                    <div key={lang}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Globe className="size-3 text-muted-foreground/60" />
                        <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                          {lang}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(langVoices as TTSVoiceInfo[]).map((voice: TTSVoiceInfo) => {
                          const isSelected = ttsVoice === voice.id;
                          const isPlaying = playingVoice === voice.id;

                          return (
                            <div
                              key={voice.id}
                              className={cn(
                                'group flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer',
                                isSelected
                                  ? 'border-teal-400/50 bg-teal-500/8 dark:bg-teal-400/8'
                                  : 'border-transparent hover:border-muted/60 hover:bg-muted/20',
                              )}
                              onClick={() => selectVoice(voice.id)}
                            >
                              {/* Select indicator */}
                              <div
                                className={cn(
                                  'size-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                                  isSelected
                                    ? 'border-teal-500 bg-teal-500'
                                    : 'border-muted-foreground/30',
                                )}
                              >
                                {isSelected && <Check className="size-2.5 text-white" />}
                              </div>

                              {/* Voice info */}
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium truncate">{voice.name}</div>
                                <div className="text-[10px] text-muted-foreground capitalize">
                                  {voice.gender}
                                </div>
                              </div>

                              {/* Preview button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isPlaying) stopPreview();
                                  else previewVoice(voice.id);
                                }}
                                className={cn(
                                  'size-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                                  isPlaying
                                    ? 'bg-teal-500 text-white'
                                    : 'opacity-0 group-hover:opacity-100 bg-muted/50 hover:bg-muted text-muted-foreground',
                                )}
                              >
                                {isPlaying ? (
                                  <Square className="size-2.5 fill-current" />
                                ) : (
                                  <Play className="size-3 fill-current ml-0.5" />
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
