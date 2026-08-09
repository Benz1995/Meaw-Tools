"use client";

import { useSyncExternalStore } from "react";

const MOTION_OVERRIDE_KEY = "meaw-motion-override";
const LEGACY_CAT_MOTION_OVERRIDE_KEY = "meaw-cat-motion-override";
const MOTION_PREFERENCE_EVENT = "meaw-motion-preference";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const motionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  window.addEventListener("storage", callback);
  window.addEventListener(MOTION_PREFERENCE_EVENT, callback);
  motionQuery.addEventListener("change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(MOTION_PREFERENCE_EVENT, callback);
    motionQuery.removeEventListener("change", callback);
  };
}

function getSnapshot() {
  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;
  const motionOverride = window.localStorage.getItem(MOTION_OVERRIDE_KEY) === "true"
    || window.localStorage.getItem(LEGACY_CAT_MOTION_OVERRIDE_KEY) === "true";
  return `${reducedMotion ? "reduce" : "normal"}:${motionOverride ? "override" : "system"}`;
}

export function setMotionOverride(enabled: boolean) {
  if (enabled) window.localStorage.setItem(MOTION_OVERRIDE_KEY, "true");
  else {
    window.localStorage.removeItem(MOTION_OVERRIDE_KEY);
    window.localStorage.removeItem(LEGACY_CAT_MOTION_OVERRIDE_KEY);
  }
  window.dispatchEvent(new Event(MOTION_PREFERENCE_EVENT));
}

export function useMotionPreference() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => "normal:system");
  const [systemPreference, overridePreference] = snapshot.split(":");
  const prefersReducedMotion = systemPreference === "reduce";
  const motionOverride = overridePreference === "override";

  return {
    motionEnabled: !prefersReducedMotion || motionOverride,
    motionOverride,
    prefersReducedMotion,
  };
}
