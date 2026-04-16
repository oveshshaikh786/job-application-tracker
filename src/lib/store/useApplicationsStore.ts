"use client";

import { create } from "zustand";
import type { Application as AppRow } from "@/domain/application/types";

type AppsUpdater = AppRow[] | ((prev: AppRow[]) => AppRow[]);

type ApplicationsState = {
  apps: AppRow[];
  hasHydrated: boolean;

  setApps: (next: AppsUpdater) => void;
  addApp: (app: AppRow) => void;
  updateApp: (app: AppRow) => void;
  removeApp: (id: string) => void;
  removeMany: (ids: string[]) => void;
  clearApps: () => void;
};

export const useApplicationsStore = create<ApplicationsState>((set) => ({
  apps: [],
  hasHydrated: false,

  setApps: (next) =>
    set((state) => ({
      apps: typeof next === "function" ? next(state.apps) : next,
      hasHydrated: true,
    })),

  addApp: (app) =>
    set((state) => ({
      apps: [app, ...state.apps.filter((a) => a.id !== app.id)],
    })),

  updateApp: (app) =>
    set((state) => ({
      apps: state.apps.map((a) => (a.id === app.id ? app : a)),
    })),

  removeApp: (id) =>
    set((state) => ({
      apps: state.apps.filter((a) => a.id !== id),
    })),

  removeMany: (ids) =>
    set((state) => {
      const idSet = new Set(ids);
      return {
        apps: state.apps.filter((a) => !idSet.has(a.id)),
      };
    }),

  clearApps: () =>
    set({
      apps: [],
      hasHydrated: false,
    }),
}));
