import { describe, expect, it } from "vitest";
import {
  DEFAULT_ALARM_SETTINGS,
  ONLINE_ALARM_MAX_ALARMS,
  alarmRepeatLabel,
  createOnlineAlarm,
  defaultAlarmTime,
  dismissAlarmOccurrence,
  enableOnlineAlarm,
  formatAlarmCountdown,
  getDueAlarmOccurrence,
  getNextAlarmOccurrence,
  nextAlarmTimestamp,
  normalizeAlarmClockStore,
  normalizeAlarmDays,
  normalizeAlarmTime,
  parseAlarmClockStore,
  serializeAlarmClockStore,
  snoozeAlarmOccurrence,
} from "./online-alarm-clock";

function localMs(year: number, month: number, day: number, hours: number, minutes: number, seconds = 0) {
  return new Date(year, month - 1, day, hours, minutes, seconds, 0).getTime();
}

describe("online alarm clock engine", () => {
  it("schedules a one-time alarm today or tomorrow from local wall time", () => {
    const morning = localMs(2026, 8, 11, 6, 30);
    expect(nextAlarmTimestamp("07:00", "once", [], morning)).toBe(localMs(2026, 8, 11, 7, 0));
    const evening = localMs(2026, 8, 11, 20, 0);
    expect(nextAlarmTimestamp("07:00", "once", [], evening)).toBe(localMs(2026, 8, 12, 7, 0));
  });

  it("respects weekday, weekend, and custom recurrence", () => {
    const fridayEvening = localMs(2026, 8, 14, 20, 0);
    expect(new Date(nextAlarmTimestamp("07:00", "weekdays", [], fridayEvening)).getDay()).toBe(1);
    expect(new Date(nextAlarmTimestamp("07:00", "weekends", [], fridayEvening)).getDay()).toBe(6);
    expect(new Date(nextAlarmTimestamp("07:00", "custom", [2, 4], fridayEvening)).getDay()).toBe(2);
  });

  it("creates, enables, and finds the earliest occurrence across alarms", () => {
    const now = localMs(2026, 8, 11, 6, 0);
    const later = createOnlineAlarm({ label: "สาย", time: "08:00", enabled: true }, "later", now);
    const earlier = createOnlineAlarm({ label: "เช้า", time: "07:00", enabled: true }, "earlier", now);
    expect(getNextAlarmOccurrence([later, earlier])).toMatchObject({ alarm: { id: "earlier" }, source: "alarm", atMs: localMs(2026, 8, 11, 7, 0) });
    expect(getDueAlarmOccurrence([later, earlier], localMs(2026, 8, 11, 6, 59))).toBeNull();
    expect(getDueAlarmOccurrence([later, earlier], localMs(2026, 8, 11, 7, 0))?.alarm.id).toBe("earlier");
    expect(enableOnlineAlarm({ ...earlier, enabled: false }, localMs(2026, 8, 11, 7, 1)).nextTriggerAtMs).toBe(localMs(2026, 8, 12, 7, 0));
  });

  it("snoozes one-time alarms and disables them only after the snooze is dismissed", () => {
    const now = localMs(2026, 8, 11, 7, 0);
    const alarm = createOnlineAlarm({ time: "07:00", repeat: "once", snoozeMinutes: 5, enabled: true }, "once", now - 60_000);
    const snoozed = snoozeAlarmOccurrence(alarm, "alarm", now);
    expect(snoozed).toMatchObject({ enabled: true, nextTriggerAtMs: null, snoozeUntilMs: now + 300_000 });
    expect(dismissAlarmOccurrence(snoozed, "snooze", now + 300_000)).toMatchObject({ enabled: false, nextTriggerAtMs: null, snoozeUntilMs: null });
  });

  it("reschedules repeating alarms before snoozing and after dismissal", () => {
    const now = localMs(2026, 8, 11, 7, 0);
    const daily = createOnlineAlarm({ time: "07:00", repeat: "daily", snoozeMinutes: 10, enabled: true }, "daily", now - 60_000);
    const snoozed = snoozeAlarmOccurrence(daily, "alarm", now);
    expect(snoozed.snoozeUntilMs).toBe(now + 600_000);
    expect(snoozed.nextTriggerAtMs).toBe(localMs(2026, 8, 12, 7, 0));
    const dismissed = dismissAlarmOccurrence(daily, "alarm", now);
    expect(dismissed.nextTriggerAtMs).toBe(localMs(2026, 8, 12, 7, 0));
  });

  it("sanitizes stored alarms, rejects stale schedules, deduplicates IDs, and caps records", () => {
    const now = localMs(2026, 8, 11, 6, 0);
    const alarms = Array.from({ length: ONLINE_ALARM_MAX_ALARMS + 3 }, (_, index) => ({
      id: index < 2 ? "same" : `alarm-${index}`,
      label: index === 0 ? "  ประชุม\nทีม  " : `Alarm ${index}`,
      time: index === 0 ? "99:99" : "07:00",
      repeat: index === 0 ? "bad" : "daily",
      days: [-1, 1, 1, 8],
      enabled: true,
      nextTriggerAtMs: now - 1,
      snoozeMinutes: 999,
    }));
    const store = normalizeAlarmClockStore({ alarms, settings: { use24Hour: false, keepAwake: true, notificationsEnabled: true, volume: 9 } }, now);
    expect(store.alarms).toHaveLength(ONLINE_ALARM_MAX_ALARMS - 1);
    expect(store.alarms[0]).toMatchObject({ label: "ประชุม ทีม", repeat: "once", days: [1], snoozeMinutes: 30, enabled: true });
    expect(store.alarms[0]?.nextTriggerAtMs).toBeGreaterThan(now);
    expect(store.settings).toEqual({ use24Hour: false, keepAwake: true, notificationsEnabled: true, volume: 1 });
  });

  it("fails closed for malformed storage and round-trips safe data", () => {
    expect(parseAlarmClockStore("not-json")).toEqual({ alarms: [], settings: DEFAULT_ALARM_SETTINGS });
    const now = localMs(2026, 8, 11, 6, 0);
    const store = { alarms: [createOnlineAlarm({ time: "07:00", enabled: true }, "a", now)], settings: DEFAULT_ALARM_SETTINGS };
    expect(parseAlarmClockStore(serializeAlarmClockStore(store, now), now)).toEqual(store);
  });

  it("normalizes helpers and formats countdowns and repeat labels", () => {
    expect(normalizeAlarmTime("7:00")).toBe("07:00");
    expect(normalizeAlarmDays([6, 1, 6, 9])).toEqual([1, 6]);
    expect(defaultAlarmTime(localMs(2026, 8, 11, 6, 58), 5)).toBe("07:03");
    expect(formatAlarmCountdown(3_661_000)).toBe("01:01:01");
    expect(alarmRepeatLabel({ repeat: "custom", days: [1, 3, 5] })).toBe("จ. พ. ศ.");
  });
});
