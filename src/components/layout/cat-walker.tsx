"use client";

import Image from "next/image";
import { Cat } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { setMotionOverride, useMotionPreference } from "@/hooks/use-motion-preference";

// Keep the legacy storage key so returning visitors do not lose their preference.
const CAT_PREFERENCE_KEY = "devthai-cat-enabled";
const CAT_PREFERENCE_EVENT = "meaw-cat-preference";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CAT_PREFERENCE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CAT_PREFERENCE_EVENT, callback);
  };
}

function getCatPreference() {
  return window.localStorage.getItem(CAT_PREFERENCE_KEY) !== "false";
}

export function CatWalker() {
  const enabled = useSyncExternalStore(subscribe, getCatPreference, () => true);
  const { motionEnabled, motionOverride, prefersReducedMotion } = useMotionPreference();
  const invitesMotion = enabled && prefersReducedMotion && !motionOverride;

  const toggleCat = () => {
    if (!enabled) {
      window.localStorage.setItem(CAT_PREFERENCE_KEY, "true");
      if (prefersReducedMotion) setMotionOverride(true);
    } else if (invitesMotion) {
      setMotionOverride(true);
    } else {
      window.localStorage.setItem(CAT_PREFERENCE_KEY, "false");
    }
    window.dispatchEvent(new Event(CAT_PREFERENCE_EVENT));
  };

  return (
    <>
      {enabled ? (
        <div className={`meaw-playground pointer-events-none fixed inset-x-0 bottom-0 z-10 h-36 overflow-hidden ${motionEnabled ? "motion-enabled" : "motion-reduced"}`} aria-hidden="true">
          <div className="cat-walker-track absolute left-0 w-28">
            <span className="cat-walker-message">เมี้ยว~</span>
            <div className="cat-walker-direction relative">
              <span className="cat-walker-shadow" />
              <span className="cat-walker-paws" />
              {motionEnabled ? (
                <span className="cat-walker-character">
                  <span className="cat-walker-image cat-walker-sprite" />
                  <span className="cat-walker-image cat-walker-rest" />
                </span>
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
        className="meaw-shell-glass fixed bottom-3 right-3 z-[45] rounded-full border-primary/20 shadow-lg shadow-foreground/10 hover:bg-accent"
      >
        <Cat className="size-4" />
        <span className={invitesMotion ? undefined : "hidden sm:inline"}>{invitesMotion ? "ให้ Meaw เดิน" : enabled ? "พัก Meaw" : "เรียก Meaw"}</span>
      </Button>
    </>
  );
}
