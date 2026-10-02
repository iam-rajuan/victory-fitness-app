import { create } from 'zustand';

export type ResourceEnvelope<T = unknown> = {
  data: T;
  updatedAt: number;
};

type ResourceStoreState = {
  resources: Record<string, ResourceEnvelope>;
  loading: Record<string, boolean>;
  setResource: <T>(key: string, data: T, updatedAt?: number) => void;
  setResourceEnvelope: <T>(key: string, envelope: ResourceEnvelope<T>) => void;
  removeResource: (key: string) => void;
  clearResources: () => void;
  setResourceLoading: (key: string, loading: boolean) => void;
};

export const useResourceStore = create<ResourceStoreState>((set) => ({
  resources: {},
  loading: {},
  setResource: (key, data, updatedAt = Date.now()) =>
    set((state) => ({
      resources: {
        ...state.resources,
        [key]: { data, updatedAt },
      },
    })),
  setResourceEnvelope: (key, envelope) =>
    set((state) => ({
      resources: {
        ...state.resources,
        [key]: envelope as ResourceEnvelope,
      },
    })),
  removeResource: (key) =>
    set((state) => {
      const resources = { ...state.resources };
      const loading = { ...state.loading };
      delete resources[key];
      delete loading[key];
      return { resources, loading };
    }),
  clearResources: () => ({ resources: {}, loading: {} }),
  setResourceLoading: (key, isLoading) =>
    set((state) => ({
      loading: {
        ...state.loading,
        [key]: isLoading,
      },
    })),
}));

export function getResourceSnapshot<T>(key: string): T | undefined {
  return useResourceStore.getState().resources[key]?.data as T | undefined;
}

export function setResourceSnapshot<T>(key: string, data: T, updatedAt = Date.now()) {
  useResourceStore.getState().setResource(key, data, updatedAt);
}
