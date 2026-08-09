"use client";

import Image from "next/image";
import { Cat } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

// Keep the legacy storage key so returning visitors do not lose their preference.
const CAT_PREFERENCE_KEY = "devthai-cat-enabled";
const CAT_PREFERENCE_EVENT = "meaw-cat-preference";
const CAT_MOTION_OVERRIDE_KEY = "meaw-cat-motion-override";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const motionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  window.addEventListener("storage", callback);
  window.addEventListener(CAT_PREFERENCE_EVENT, callback);
  motionQuery.addEventListener("change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CAT_PREFERENCE_EVENT, callback);
    motionQuery.removeEventListener("change", callback);
  };
}

function getCatPreference() {
  return window.localStorage.getItem(CAT_PREFERENCE_KEY) !== "false";
}

function getMotionOverride() {
  return window.localStorage.getItem(CAT_MOTION_OVERRIDE_KEY) === "true";
}

function getReducedMotionPreference() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function CatWalker() {
  const enabled = useSyncExternalStore(subscribe, getCatPreference, () => true);
  const motionOverride = useSyncExternalStore(subscribe, getMotionOverride, () => false);
  const reducedMotion = useSyncExternalStore(subscribe, getReducedMotionPreference, () => false);
  const invitesMotion = enabled && reducedMotion && !motionOverride;
  const motionEnabled = enabled && (!reducedMotion || motionOverride);

  const toggleCat = () => {
    if (!enabled) {
      window.localStorage.setItem(CAT_PREFERENCE_KEY, "true");
      if (reducedMotion) window.localStorage.setItem(CAT_MOTION_OVERRIDE_KEY, "true");
    } else if (invitesMotion) {
      window.localStorage.setItem(CAT_MOTION_OVERRIDE_KEY, "true");
    } else {
      window.localStorage.setItem(CAT_PREFERENCE_KEY, "false");
    }
    window.dispatchEvent(new Event(CAT_PREFERENCE_EVENT));
  };

  return (
    <>
      {enabled ? (
        <div className={`meaw-playground pointer-events-none fixed inset-x-0 bottom-0 z-40 h-24 overflow-hidden ${motionEnabled ? "motion-enabled" : "motion-reduced"}`} aria-hidden="true">
          <div className="cat-walker-track absolute bottom-0 left-0 w-28">
            <span className="cat-walker-message">เมี้ยว~</span>
            <div className="cat-walker-direction relative">
              <span className="cat-walker-shadow" />
              <span className="cat-walker-paws" />
              {motionEnabled ? (
                <span className="cat-walker-image cat-walker-sprite" />
              ) : (
                <Image
                  src="/brand/devthai-cat.png"
                  alt=""
                  width={180}
                  height={120}
                  sizes="(max-width: 640px) 88px, 112px"
                  className="cat-walker-image cat-walker-static h-auto w-28 select-none object-contain drop-shadow-[0_5px_5px_rgb(75_53_34_/_0.18)]"
                  draggable={false}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={toggleCat}
        aria-pressed={enabled}
        aria-label={invitesMotion ? "ให้ Meaw เดินเล่น" : enabled ? "พัก Meaw" : "เรียก Meaw มาเดินเล่น"}
        className="fixed bottom-3 right-3 z-[45] rounded-full border-primary/20 bg-card/95 shadow-lg shadow-foreground/10 backdrop-blur hover:bg-accent"
      >
        <Cat className="size-4" />
        <span className={invitesMotion ? undefined : "hidden sm:inline"}>{invitesMotion ? "ให้ Meaw เดิน" : enabled ? "พัก Meaw" : "เรียก Meaw"}</span>
      </Button>
    </>
  );
}
