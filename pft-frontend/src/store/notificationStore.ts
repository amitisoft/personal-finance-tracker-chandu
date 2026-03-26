import { create } from "zustand";

export type RuleAlertNotification = {
  id: string;
  message: string;
  createdAt: string;
};

type NotificationState = {
  ruleAlerts: RuleAlertNotification[];
  addRuleAlerts: (messages: string[]) => void;
  clearRuleAlerts: () => void;
};

const RULE_ALERTS_KEY = "pft.ruleAlerts";
const MAX_RULE_ALERTS = 20;

function readStoredRuleAlerts(): RuleAlertNotification[] {
  try {
    const raw = localStorage.getItem(RULE_ALERTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        id: String(item?.id ?? ""),
        message: String(item?.message ?? ""),
        createdAt: String(item?.createdAt ?? ""),
      }))
      .filter((item) => item.id && item.message && item.createdAt);
  } catch {
    return [];
  }
}

function persist(ruleAlerts: RuleAlertNotification[]) {
  localStorage.setItem(RULE_ALERTS_KEY, JSON.stringify(ruleAlerts));
}

export const useNotificationStore = create<NotificationState>((set) => ({
  ruleAlerts: readStoredRuleAlerts(),
  addRuleAlerts: (messages) =>
    set((state) => {
      const next = messages
        .map((message, index) => message.trim() ? {
          id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
          message: message.trim(),
          createdAt: new Date().toISOString(),
        } : null)
        .filter((item): item is RuleAlertNotification => item !== null);

      const ruleAlerts = [...next.reverse(), ...state.ruleAlerts].slice(0, MAX_RULE_ALERTS);
      persist(ruleAlerts);
      return { ruleAlerts };
    }),
  clearRuleAlerts: () => {
    persist([]);
    set({ ruleAlerts: [] });
  },
}));
