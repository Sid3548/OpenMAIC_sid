'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  GraduationCap,
  Plus,
  Search,
  SortAsc,
  Star,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { listStages, getFirstSlideByStages, deleteStageData } from '@/lib/utils/stage-storage';
import type { StageListItem } from '@/lib/utils/stage-storage';
import { ThumbnailSlide } from '@/components/slide-renderer/components/ThumbnailSlide';
import type { Slide } from '@/lib/types/slides';

// ─── Storage keys ─────────────────────────────────────────────────
const TAGS_KEY = 'classroomTags';
const FAVORITES_KEY = 'classroomFavorites';
const FILTER_ALL = '__all__';
const FILTER_FAVORITES = '__favorites__';

type SortKey = 'updated' | 'created' | 'name' | 'scenes';
type TagMap = Record<string, string[]>;

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'updated', label: 'Last updated' },
  { key: 'created', label: 'Date created' },
  { key: 'name', label: 'Name A–Z' },
  { key: 'scenes', label: 'Most scenes' },
];

function formatDate(ts: number): string {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Tag Popover ──────────────────────────────────────────────────
function TagPopover({
  classroomId,
  currentTags,
  allTags,
  onUpdate,
}: {
  classroomId: string;
  currentTags: string[];
  allTags: string[];
  onUpdate: (id: string, tags: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');

  const toggle = (tag: string) => {
    const next = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    onUpdate(classroomId, next);
  };

  const add = () => {
    const t = input.trim();
    if (!t || currentTags.includes(t)) {
      setInput('');
      return;
    }
    onUpdate(classroomId, [...currentTags, t]);
    setInput('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 hover:border-lime-400 hover:text-lime-500 transition-colors"
        >
          <Tag className="size-2.5" />
          {currentTags.length === 0 ? 'add tag' : `+${currentTags.length}`}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-52 p-2.5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        side="bottom"
        align="start"
        sideOffset={6}
      >
        <p className="text-[11px] font-semibold text-muted-foreground mb-2 px-0.5">Assign tags</p>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggle(tag)}
                className={cn(
                  'px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors border',
                  currentTags.includes(tag)
                    ? 'bg-lime-100 dark:bg-lime-900/30 border-lime-300 dark:border-lime-700 text-lime-700 dark:text-lime-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-lime-300 hover:text-lime-600',
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-1.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add();
            }}
            placeholder="New tag…"
            className="flex-1 text-[12px] bg-muted/60 rounded-lg px-2.5 py-1.5 outline-none border border-transparent focus:border-lime-400/50 dark:focus:border-lime-600/50 placeholder:text-muted-foreground/50"
          />
          <button
            onClick={add}
            className="px-2.5 py-1.5 rounded-lg bg-lime-500 hover:bg-lime-400 text-black text-[11px] font-semibold transition-colors"
          >
            Add
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Library Card ─────────────────────────────────────────────────
function LibraryCard({
  classroom,
  slide,
  isFavorite,
  tags,
  allTags,
  onFavorite,
  onUpdateTags,
  onDelete,
  onOpen,
}: {
  classroom: StageListItem;
  slide?: Slide;
  isFavorite: boolean;
  tags: string[];
  allTags: string[];
  onFavorite: () => void;
  onUpdateTags: (id: string, tags: string[]) => void;
  onDelete: () => void;
  onOpen: () => void;
}) {
  const thumbRef = useRef<HTMLDivElement>(null);
  const [thumbWidth, setThumbWidth] = useState(0);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const el = thumbRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setThumbWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className="group flex flex-col gap-2 cursor-pointer"
      onClick={confirming ? undefined : onOpen}
    >
      {/* ── Thumbnail ── */}
      <div
        ref={thumbRef}
        className="relative w-full aspect-[16/9] rounded-2xl bg-slate-100 dark:bg-slate-800/80 overflow-hidden ring-1 ring-transparent group-hover:ring-lime-400/50 transition-all duration-200 group-hover:scale-[1.015]"
      >
        {slide && thumbWidth > 0 ? (
          <ThumbnailSlide
            slide={slide}
            size={thumbWidth}
            viewportSize={slide.viewportSize ?? 1000}
            viewportRatio={slide.viewportRatio ?? 0.5625}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-lime-100 to-emerald-100 dark:from-lime-900/30 dark:to-emerald-900/30 flex items-center justify-center">
              <GraduationCap className="size-5 text-lime-500/60" />
            </div>
          </div>
        )}

        {/* Continue overlay */}
        {!confirming && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-gray-900/90 text-[13px] font-semibold text-gray-900 dark:text-white shadow-lg backdrop-blur-sm">
              Continue <ChevronRight className="size-3.5" />
            </span>
          </div>
        )}

        {/* Favourite */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavorite();
          }}
          className={cn(
            'absolute top-2 left-2 p-1.5 rounded-full backdrop-blur-sm transition-all duration-150',
            isFavorite
              ? 'opacity-100 bg-amber-400/95 text-white shadow-sm'
              : 'opacity-0 group-hover:opacity-100 bg-black/30 text-white/80 hover:bg-amber-400/90 hover:text-white',
          )}
          aria-label="Toggle favourite"
        >
          <Star className={cn('size-3.5', isFavorite && 'fill-current')} />
        </button>

        {/* Delete / confirm */}
        <AnimatePresence>
          {!confirming ? (
            <motion.button
              key="delete-btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                setConfirming(true);
              }}
              className="absolute top-2 right-2 size-7 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 hover:bg-destructive/80 text-white backdrop-blur-sm"
            >
              <Trash2 className="size-3.5" />
            </motion.button>
          ) : (
            <motion.div
              key="confirm-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/55 backdrop-blur-[6px] rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-[13px] font-medium text-white/90">Delete this classroom?</span>
              <div className="flex gap-2">
                <button
                  className="px-3.5 py-1 rounded-lg text-[12px] font-medium bg-white/15 text-white/80 hover:bg-white/25 transition-colors"
                  onClick={() => setConfirming(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-3.5 py-1 rounded-lg text-[12px] font-medium bg-red-500/90 text-white hover:bg-red-500 transition-colors"
                  onClick={() => {
                    setConfirming(false);
                    onDelete();
                  }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Info ── */}
      <div className="flex flex-col gap-1 px-0.5">
        <p className="font-medium text-[14px] leading-snug text-foreground/90 line-clamp-2">
          {classroom.name}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center rounded-full bg-lime-100 dark:bg-lime-900/30 px-2 py-0.5 text-[10px] font-medium text-lime-700 dark:text-lime-400 shrink-0">
            {classroom.sceneCount} scenes · {formatDate(classroom.updatedAt)}
          </span>
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400"
            >
              {tag}
            </span>
          ))}
          <TagPopover
            classroomId={classroom.id}
            currentTags={tags}
            allTags={allTags}
            onUpdate={onUpdateTags}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────
function EmptyState({ hasFilters, onReset }: { hasFilters: boolean; onReset: () => void }) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-3">
        <div className="size-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Search className="size-5 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-foreground/70">No classrooms match</p>
        <button
          onClick={onReset}
          className="text-xs text-lime-600 dark:text-lime-400 hover:underline underline-offset-2"
        >
          Clear filters
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-28 gap-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="size-20 rounded-3xl bg-gradient-to-br from-lime-100 to-emerald-100 dark:from-lime-900/20 dark:to-emerald-900/20 flex items-center justify-center"
      >
        <GraduationCap className="size-9 text-lime-500/70" />
      </motion.div>
      <div className="text-center">
        <p className="font-semibold text-foreground/80">Your library is empty</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Generate your first classroom and it will appear here automatically.
        </p>
      </div>
      <Link
        href="/create"
        className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-lime-500 hover:bg-lime-400 text-black text-sm font-semibold transition-colors shadow-sm shadow-lime-500/20"
      >
        <Plus className="size-4" />
        Create a classroom
      </Link>
    </div>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="w-full aspect-[16/9] rounded-2xl bg-gray-100 dark:bg-gray-800/60 animate-pulse" />
          <div className="h-4 w-3/4 rounded-full bg-gray-100 dark:bg-gray-800/60 animate-pulse" />
          <div className="h-3 w-1/3 rounded-full bg-gray-100 dark:bg-gray-800/60 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function LibraryPage() {
  const router = useRouter();
  const [classrooms, setClassrooms] = useState<StageListItem[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, Slide>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>(FILTER_ALL);
  const [sort, setSort] = useState<SortKey>('updated');

  // Tag + favorites state (persisted in localStorage)
  const [tagsMap, setTagsMap] = useState<TagMap>({});
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      const t = localStorage.getItem(TAGS_KEY);
      const f = localStorage.getItem(FAVORITES_KEY);
      if (t) setTagsMap(JSON.parse(t));
      if (f) setFavorites(JSON.parse(f));
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  const updateTags = useCallback((id: string, newTags: string[]) => {
    setTagsMap((prev) => {
      const next = { ...prev, [id]: newTags };
      try {
        localStorage.setItem(TAGS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const allTags = Array.from(new Set(Object.values(tagsMap).flat())).sort();

  // Load classrooms from IndexedDB
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listStages();
      setClassrooms(list);
      if (list.length > 0) {
        const slides = await getFirstSlideByStages(list.map((c) => c.id));
        setThumbnails(slides);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteStageData(id);
      setClassrooms((prev) => prev.filter((c) => c.id !== id));
      setThumbnails((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
      toast.success('Classroom deleted');
    } catch {
      toast.error('Failed to delete classroom');
    }
  }, []);

  // Filter + sort
  const filtered = classrooms
    .filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (activeFilter === FILTER_FAVORITES) return favorites.includes(c.id);
      if (activeFilter !== FILTER_ALL) return (tagsMap[c.id] ?? []).includes(activeFilter);
      return true;
    })
    .sort((a, b) => {
      switch (sort) {
        case 'updated':
          return b.updatedAt - a.updatedAt;
        case 'created':
          return b.createdAt - a.createdAt;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'scenes':
          return b.sceneCount - a.sceneCount;
      }
    });

  const totalScenes = classrooms.reduce((s, c) => s + c.sceneCount, 0);
  const hasFilters = !!search || activeFilter !== FILTER_ALL;

  const filterPills = [
    { key: FILTER_ALL, label: 'All' },
    { key: FILTER_FAVORITES, label: '⭐ Favourites' },
    ...allTags.map((t) => ({ key: t, label: t })),
  ];

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-b from-lime-50/40 via-white to-stone-100 dark:from-[#0a0a0a] dark:via-[#0f0f0f] dark:to-[#111111]">
      {/* Background ambient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 left-1/4 w-[600px] h-[600px] bg-lime-400/5 rounded-full blur-3xl"
          style={{ animationDuration: '8s' }}
        />
        <div
          className="absolute bottom-0 right-1/3 w-96 h-96 bg-emerald-400/5 rounded-full blur-3xl"
          style={{ animationDuration: '10s' }}
        />
      </div>

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-40 border-b border-gray-200/50 dark:border-gray-800/50 bg-white/75 dark:bg-[#0f0f0f]/85 backdrop-blur-xl">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 h-14 flex items-center gap-3">
          {/* Back */}
          <Link
            href="/create"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline text-[13px]">Create</span>
          </Link>

          {/* Title */}
          <div className="flex items-center gap-2 flex-1">
            <BookOpen className="size-4 text-lime-500 shrink-0" />
            <h1 className="font-semibold text-[15px] tracking-tight">My Library</h1>
            {!loading && classrooms.length > 0 && (
              <span className="text-[11px] text-muted-foreground/60 tabular-nums">
                {classrooms.length} · {totalScenes} scenes
              </span>
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="pl-8 pr-3 py-1.5 text-sm rounded-full bg-gray-100/80 dark:bg-gray-800/80 border border-transparent focus:border-lime-400/60 dark:focus:border-lime-600/60 outline-none w-32 focus:w-48 transition-all duration-300 placeholder:text-muted-foreground/50"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* New classroom */}
            <Link
              href="/create"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-lime-500 hover:bg-lime-400 text-black text-[13px] font-semibold transition-colors shrink-0 shadow-sm shadow-lime-500/20"
            >
              <Plus className="size-3.5" />
              <span>New</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-4 md:px-8 py-6">
        {/* ── Filter + Sort row ── */}
        <div className="flex items-center gap-2 mb-7 flex-wrap">
          {/* Category pills */}
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
            {filterPills.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={cn(
                  'px-3 py-1 rounded-full text-[12px] font-medium transition-all duration-150 border shrink-0',
                  activeFilter === key
                    ? 'bg-lime-500 border-lime-500 text-black shadow-sm shadow-lime-500/20'
                    : 'border-gray-200 dark:border-gray-700/80 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900/60 hover:border-gray-300 dark:hover:border-gray-600',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900/60 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 transition-colors shrink-0">
                <SortAsc className="size-3.5" />
                {SORT_OPTIONS.find((s) => s.key === sort)?.label}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[148px]">
              {SORT_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.key}
                  onClick={() => setSort(opt.key)}
                  className={cn(
                    'text-[12px] cursor-pointer',
                    sort === opt.key && 'text-lime-600 dark:text-lime-400 font-semibold',
                  )}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ── Grid / States ── */}
        {loading ? (
          <SkeletonGrid />
        ) : filtered.length === 0 ? (
          <EmptyState
            hasFilters={hasFilters}
            onReset={() => {
              setSearch('');
              setActiveFilter(FILTER_ALL);
            }}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
            {filtered.map((classroom, i) => (
              <motion.div
                key={classroom.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.3, ease: 'easeOut' }}
              >
                <LibraryCard
                  classroom={classroom}
                  slide={thumbnails[classroom.id]}
                  isFavorite={favorites.includes(classroom.id)}
                  tags={tagsMap[classroom.id] ?? []}
                  allTags={allTags}
                  onFavorite={() => toggleFavorite(classroom.id)}
                  onUpdateTags={updateTags}
                  onDelete={() => handleDelete(classroom.id)}
                  onOpen={() => router.push(`/classroom/${classroom.id}`)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
