import { apiRequest } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type StrengthPlanExercise = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest: string;
  weight: string;
  type: string;
};

export type StrengthPlanSection = {
  id: string;
  title: string;
  estimated_minutes: number;
  exercises: StrengthPlanExercise[];
};

export type StrengthPlanDay = {
  day: string;
  title: string;
  est_time: string;
  volume: string;
  intensity: string;
  sections: StrengthPlanSection[];
  exercises: StrengthPlanExercise[];
};

export type StrengthPlanDayProgress = {
  day: string;
  started: boolean;
  completed: boolean;
  completed_section_ids: string[];
  completed_exercise_ids: string[];
  started_at?: string | null;
  completed_at?: string | null;
  duration_seconds?: number | null;
};

export type StrengthPlanResponse = {
  plan_id?: string | null;
  summary: string;
  days: StrengthPlanDay[];
  progress: StrengthPlanDayProgress[];
  created_at?: string | null;
};

export type StrengthPlanListResponse = {
  items: StrengthPlanResponse[];
};

export type VideoPlanItem = {
  id: string;
  title: string;
  duration: string;
  category: string;
  image: string;
  tag: string;
  vimeo_id: string;
  video_url: string;
  video_source: string;
};

export type VideoPlanDay = {
  day: string;
  duration_label: string;
  workouts_count: number;
  workouts: VideoPlanItem[];
};

export type VideoPlanResponse = {
  summary: string;
  days: VideoPlanDay[];
};

let latestStrengthPlan: StrengthPlanResponse | null = null;
let latestVideoPlan: VideoPlanResponse | null = null;
const STRENGTH_PLAN_STORAGE_KEY = 'victory-strength-workout-plan';
const VIDEO_PLAN_STORAGE_KEY = 'victory-video-workout-plan';

async function persistLatestStrengthPlan(plan: StrengthPlanResponse | null) {
  latestStrengthPlan = plan;
  if (plan) {
    await AsyncStorage.setItem(STRENGTH_PLAN_STORAGE_KEY, JSON.stringify(plan));
  } else {
    await AsyncStorage.removeItem(STRENGTH_PLAN_STORAGE_KEY);
  }
}

export async function createStrengthWorkoutPlan(payload: Record<string, unknown>) {
  const plan = await apiRequest<StrengthPlanResponse>('/ai/workout-plan/strength', {
    method: 'POST',
    body: payload,
    timeoutMs: 120_000,
  });
  await persistLatestStrengthPlan(plan);
  return plan;
}

export async function fetchLatestStrengthWorkoutPlan() {
  const response = await apiRequest<StrengthPlanListResponse>('/ai/workout-plan/strength');
  const plan = response.items[0] ?? null;
  await persistLatestStrengthPlan(plan);
  return plan;
}

export async function fetchStrengthWorkoutPlans() {
  const response = await apiRequest<StrengthPlanListResponse>('/ai/workout-plan/strength');
  const latest = response.items[0] ?? null;
  await persistLatestStrengthPlan(latest);
  return response.items;
}

export async function deleteLatestStrengthWorkoutPlan() {
  await apiRequest<{ status: string; message: string }>('/ai/workout-plan/strength/latest', {
    method: 'DELETE',
  });
  await persistLatestStrengthPlan(null);
}

export async function deleteStrengthWorkoutPlan(planId: string) {
  await apiRequest<{ status: string; message: string }>(`/ai/workout-plan/strength/${encodeURIComponent(planId)}`, {
    method: 'DELETE',
  });
  await persistLatestStrengthPlan(null);
}

export type StrengthFeedbackResponse = {
  plan: StrengthPlanResponse;
  adjustment_pct: number;
  next_volume_direction: string;
  next_intensity_target: string;
  summary: string;
  what_went_well?: string;
  cautions?: string;
  next_steps?: string;
  updated_at: string;
};

export async function submitStrengthWorkoutFeedback(
  planId: string,
  payload: {
    day: string;
    perceived_difficulty: string;
    energy?: string;
    soreness?: string;
    notes?: string;
    pain_flag?: boolean;
    sweet_spot_flag?: boolean;
  }
): Promise<StrengthFeedbackResponse> {
  const result = await apiRequest<StrengthFeedbackResponse>(`/ai/workout-plan/strength/${encodeURIComponent(planId)}/feedback`, {
    method: 'POST',
    body: payload,
  });
  if (result.plan) {
    await persistLatestStrengthPlan(result.plan);
  }
  return result;
}

export async function updateStrengthWorkoutPlanProgress(
  planId: string,
  payload: {
    day: string;
    section_id?: string | null;
    exercise_id?: string | null;
    started?: boolean;
    completed?: boolean;
    reset_timer?: boolean;
    started_at?: string;
    duration_seconds?: number;
  }
) {
  try {
    const plan = await apiRequest<StrengthPlanResponse>(`/ai/workout-plan/strength/${encodeURIComponent(planId)}/progress`, {
      method: 'PATCH',
      body: payload,
    });
    await persistLatestStrengthPlan(plan);
    return plan;
  } catch (netErr) {
    // OFFLINE RESILIENCE: Apply progress updates directly to local cache
    const current = latestStrengthPlan || (await loadLatestStrengthWorkoutPlan());
    if (!current) throw netErr;

    const progressList = Array.isArray(current.progress) ? [...current.progress] : [];
    const dayIndex = progressList.findIndex((p) => p.day === payload.day);
    const existing = dayIndex >= 0 ? progressList[dayIndex] : {
      day: payload.day,
      started: false,
      completed: false,
      completed_section_ids: [],
      completed_exercise_ids: [],
    };

    const nextDay = { ...existing };
    if (typeof payload.started === 'boolean') {
      nextDay.started = payload.started;
      if (payload.started && !nextDay.started_at) {
        nextDay.started_at = payload.started_at || new Date().toISOString();
      }
    }
    if (typeof payload.completed === 'boolean' && !payload.exercise_id && !payload.section_id) {
      nextDay.completed = payload.completed;
      if (payload.completed && !nextDay.completed_at) {
        nextDay.completed_at = new Date().toISOString();
      }
    }
    if (payload.reset_timer) {
      nextDay.started_at = payload.started_at || new Date().toISOString();
    }
    if (payload.duration_seconds !== undefined) {
      nextDay.duration_seconds = payload.duration_seconds;
    }
    if (payload.exercise_id) {
      nextDay.started = true;
      if (!nextDay.started_at) {
        nextDay.started_at = new Date().toISOString();
      }
      const exSet = new Set(nextDay.completed_exercise_ids || []);
      if (payload.completed === false || exSet.has(payload.exercise_id)) {
        exSet.delete(payload.exercise_id);
      } else {
        exSet.add(payload.exercise_id);
      }
      nextDay.completed_exercise_ids = Array.from(exSet);
    }
    if (payload.section_id) {
      const secSet = new Set(nextDay.completed_section_ids || []);
      if (secSet.has(payload.section_id)) {
        secSet.delete(payload.section_id);
      } else {
        secSet.add(payload.section_id);
      }
      nextDay.completed_section_ids = Array.from(secSet);
    }

    if (dayIndex >= 0) {
      progressList[dayIndex] = nextDay;
    } else {
      progressList.push(nextDay);
    }

    const updatedPlan: StrengthPlanResponse = {
      ...current,
      progress: progressList,
    };
    await persistLatestStrengthPlan(updatedPlan);
    return updatedPlan;
  }
}

export async function createVideoWorkoutPlan(payload: Record<string, unknown>) {
  const plan = await apiRequest<VideoPlanResponse>('/ai/workout-plan/video', {
    method: 'POST',
    body: payload,
  });
  latestVideoPlan = plan;
  await AsyncStorage.setItem(VIDEO_PLAN_STORAGE_KEY, JSON.stringify(plan));
  return plan;
}

export function getLatestStrengthWorkoutPlan() {
  return latestStrengthPlan;
}

export function getLatestVideoWorkoutPlan() {
  return latestVideoPlan;
}

export async function loadLatestStrengthWorkoutPlan() {
  if (latestStrengthPlan) {
    return latestStrengthPlan;
  }
  const raw = await AsyncStorage.getItem(STRENGTH_PLAN_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  latestStrengthPlan = JSON.parse(raw) as StrengthPlanResponse;
  return latestStrengthPlan;
}

export async function loadLatestVideoWorkoutPlan() {
  if (latestVideoPlan) {
    return latestVideoPlan;
  }
  const raw = await AsyncStorage.getItem(VIDEO_PLAN_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  latestVideoPlan = JSON.parse(raw) as VideoPlanResponse;
  return latestVideoPlan;
}

export async function clearLatestVideoWorkoutPlan() {
  latestVideoPlan = null;
  await AsyncStorage.removeItem(VIDEO_PLAN_STORAGE_KEY);
}
