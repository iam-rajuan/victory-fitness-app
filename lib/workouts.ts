import { apiRequest, resolveRemoteAssetUrl } from './api';
import { fetchCachedResource, getCachedResourceSnapshot, hydrateCachedResource } from './resourceCache';
import { HOME_WORKOUT_SUMMARY_CACHE_KEY } from './cacheKeys';
import { WORKOUT_CATEGORY_OPTIONS } from '../constants/WorkoutCategories';

export type WorkoutLibraryItem = {
  id: string;
  title: string;
  vimeoId: string;
  videoUrl: string;
  videoSource: 'VIMEO' | 'YOUTUBE' | 'UPLOAD' | string;
  tag: string;
  purposes: string[];
  equipment: string;
  level: string;
  levels: string[];
  durationMinutes: number;
  durationSeconds: number;
  thumbnail: string;
  movements: WorkoutMovementItem[];
  dateAdded: string;
};

export type WorkoutMovementItem = {
  id: string;
  name: string;
  sets: string;
  reps: string;
  load: string;
  equipment: string;
  restSeconds: number;
  notes: string;
  order: number;
};

export type WorkoutLibraryCategory = {
  id: string;
  name: string;
  count: number;
  image: string;
};

export type WorkoutLibraryResponse = {
  featuredWorkout: WorkoutLibraryItem | null;
  workouts: WorkoutLibraryItem[];
  categories: WorkoutLibraryCategory[];
};

function normalizeWorkoutCategories(values: unknown, fallback?: unknown) {
  const candidates = Array.isArray(values) ? values : [];
  if (!candidates.length && fallback) {
    candidates.push(fallback);
  }
  return WORKOUT_CATEGORY_OPTIONS.filter((category) =>
    candidates.some((item) => String(item ?? '').trim().toLowerCase() === category.toLowerCase())
  );
}

function normalizeWorkoutDurationMinutes(value: unknown) {
  const minutes = Math.max(Number(value ?? 0) || 0, 0);
  return minutes === 38 ? 35 : minutes;
}

export type HomeWorkoutWeekPip = {
  label: string;
  key?: string;
  state: 'done' | 'today' | 'optional' | 'rest' | 'missed' | string;
};

export type HomeWorkoutPlanSummary = {
  source: 'strength_plan' | 'workout_library' | string;
  hasPlan?: boolean;
  planId?: string;
  day?: string;
  title: string;
  dayKicker: string;
  planSource: string;
  durationMinutes: number;
  equipment: string;
  whyToday?: string;
  week: {
    pips: HomeWorkoutWeekPip[];
    note: string;
    doneCount: number;
    targetCount: number;
    remainingLightSessions: number;
    todayCompleted: boolean;
  };
  session: {
    exerciseCount: number;
    setCount: number;
    compoundCount: number;
  };
};

export function getWorkoutLibraryCacheKey(query = '') {
  return `workout-library:${query.trim().toLowerCase() || 'default'}`;
}

function normalizeWorkoutItem(value: unknown): WorkoutLibraryItem | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const item = value as Record<string, unknown>;
  const id = String(item.id ?? '').trim();
  const title = String(item.title ?? '').trim();
  if (!id || !title) {
    return null;
  }

  return {
    id,
    title,
    vimeoId: String(item.vimeoId ?? ''),
    videoUrl: String(item.videoUrl ?? ''),
    videoSource: String(item.videoSource ?? 'VIMEO'),
    tag: normalizeWorkoutCategories(item.purposes, item.tag)[0] || '',
    purposes: normalizeWorkoutCategories(item.purposes, item.tag),
    equipment: String(item.equipment ?? ''),
    level: String(item.level ?? ''),
    levels: Array.isArray(item.levels)
      ? item.levels.map((level) => String(level).trim()).filter(Boolean)
      : String(item.level ?? '').trim()
        ? [String(item.level).trim()]
        : [],
    durationMinutes: normalizeWorkoutDurationMinutes(item.durationMinutes),
    durationSeconds: Math.max(Number(item.durationSeconds ?? 0) || 0, 0),
    thumbnail: resolveRemoteAssetUrl(String(item.thumbnail ?? '')),
    movements: Array.isArray(item.movements)
      ? item.movements.map(normalizeWorkoutMovement).filter((movement): movement is WorkoutMovementItem => Boolean(movement))
      : [],
    dateAdded: String(item.dateAdded ?? ''),
  };
}

function normalizeWorkoutMovement(value: unknown): WorkoutMovementItem | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const movement = value as Record<string, unknown>;
  const name = String(movement.name ?? '').trim();
  if (!name) {
    return null;
  }
  return {
    id: String(movement.id ?? ''),
    name,
    sets: String(movement.sets ?? ''),
    reps: String(movement.reps ?? ''),
    load: String(movement.load ?? ''),
    equipment: String(movement.equipment ?? ''),
    restSeconds: Math.max(Number(movement.restSeconds ?? 0) || 0, 0),
    notes: String(movement.notes ?? ''),
    order: Math.max(Number(movement.order ?? 0) || 0, 0),
  };
}

function normalizeWorkoutCategory(value: unknown): WorkoutLibraryCategory | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const category = value as Record<string, unknown>;
  const id = String(category.id ?? '').trim();
  const name = String(category.name ?? '').trim();
  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    count: Math.max(Number(category.count ?? 0) || 0, 0),
    image: resolveRemoteAssetUrl(String(category.image ?? '')),
  };
}

function normalizeWorkoutLibraryResponse(value: unknown): WorkoutLibraryResponse {
  const response = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const workouts = Array.isArray(response.workouts)
    ? response.workouts.map(normalizeWorkoutItem).filter((item): item is WorkoutLibraryItem => Boolean(item))
    : [];
  const categories = Array.isArray(response.categories)
    ? response.categories.map(normalizeWorkoutCategory).filter((item): item is WorkoutLibraryCategory => Boolean(item))
    : [];
  const orderedCategories = WORKOUT_CATEGORY_OPTIONS
    .map((category) => categories.find((item) => item.name.toLowerCase() === category.toLowerCase()))
    .filter((item): item is WorkoutLibraryCategory => Boolean(item));
  const featuredWorkout = normalizeWorkoutItem(response.featuredWorkout);

  return {
    featuredWorkout: featuredWorkout ?? workouts[0] ?? null,
    workouts,
    categories: orderedCategories,
  };
}

export async function fetchWorkoutLibrary(query = '') {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set('query', query.trim());
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  const cacheKey = getWorkoutLibraryCacheKey(query);
  return fetchCachedResource(cacheKey, async () => {
    const response = await apiRequest<WorkoutLibraryResponse>(`/workouts/library${suffix}`);
    return normalizeWorkoutLibraryResponse(response);
  });
}

export async function fetchHomeWorkoutPlanSummary() {
  return fetchCachedResource(HOME_WORKOUT_SUMMARY_CACHE_KEY, () =>
    apiRequest<HomeWorkoutPlanSummary>('/workouts/home-plan-summary')
  );
}

export function getCachedWorkoutLibrary(query = '') {
  return getCachedResourceSnapshot<WorkoutLibraryResponse>(getWorkoutLibraryCacheKey(query));
}

export async function hydrateCachedWorkoutLibrary(query = '') {
  const cached = await hydrateCachedResource<WorkoutLibraryResponse>(getWorkoutLibraryCacheKey(query));
  return cached ? normalizeWorkoutLibraryResponse(cached) : null;
}
