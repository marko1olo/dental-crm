import { useState, useEffect, useCallback } from "react";

import { denteAdminSecretRequestHeaders } from "../AppHelpers";

export interface MaxStaffRoutingRule {
  intent: string;
  assignToUserId: string | null;
}

export interface MaxStaffRouting {
  defaultUserId: string | null;
  rules: MaxStaffRoutingRule[];
}

export interface MaxSettings {
  id: string;
  organizationId: string;
  botId: string | null;
  hasToken: boolean;
  webhookUrl: string | null;
  enabledFeatures: string[];
  staffRouting: MaxStaffRouting;
  isActive: boolean;
  updatedAt: string;
}

export interface MaxConnectionStatus {
  channel: "max";
  connected: boolean;
  detail: string | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function useMaxSettings() {
  const [settings, setSettings] = useState<MaxSettings | null>(null);
  const [status, setStatus] = useState<MaxConnectionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const [botIdDraft, setBotIdDraft] = useState("");
  const [apiTokenDraft, setApiTokenDraft] = useState("");
  const [webhookUrlDraft, setWebhookUrlDraft] = useState("");
  const [isActiveDraft, setIsActiveDraft] = useState(false);
  const [staffRoutingDraft, setStaffRoutingDraft] =
    useState<MaxStaffRouting>({ defaultUserId: null, rules: [] });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/max/settings", {
        headers: denteAdminSecretRequestHeaders(),
      });
      if (res.ok) {
        const data = (await res.json()) as MaxSettings;
        setSettings(data);
        setBotIdDraft(data.botId ?? "");
        setWebhookUrlDraft(data.webhookUrl ?? "");
        setIsActiveDraft(data.isActive);
        setStaffRoutingDraft(data.staffRouting);
      } else if (res.status !== 404) {
        console.error("Failed to load MAX settings", res.status);
      }
    } catch (err) {
      console.error("MAX settings fetch error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/max/status", {
        headers: denteAdminSecretRequestHeaders(),
      });
      if (res.ok) {
        setStatus((await res.json()) as MaxConnectionStatus);
      }
    } catch {
      // ignore — status is optional
    }
  }, []);

  useEffect(() => {
    void load();
    void checkStatus();
  }, [load, checkStatus]);

  const save = useCallback(async () => {
    setSaveState("saving");
    setSaveError(null);
    try {
      const body: Record<string, unknown> = {
        botId: botIdDraft.trim() || null,
        webhookUrl: webhookUrlDraft.trim() || null,
        isActive: isActiveDraft,
        staffRouting: staffRoutingDraft,
      };
      if (apiTokenDraft.trim()) {
        body.apiToken = apiTokenDraft.trim();
      }
      const res = await fetch("/api/max/settings", {
        method: "PUT",
        headers: {
          ...denteAdminSecretRequestHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSaveState("saved");
        setApiTokenDraft("");
        await load();
        await checkStatus();
        setTimeout(() => setSaveState("idle"), 2000);
      } else {
        const err = (await res.json()) as { message?: string };
        setSaveError(err.message ?? "Ошибка сохранения");
        setSaveState("error");
      }
    } catch (err) {
      setSaveError(String(err));
      setSaveState("error");
    }
  }, [
    botIdDraft,
    apiTokenDraft,
    webhookUrlDraft,
    isActiveDraft,
    staffRoutingDraft,
    load,
    checkStatus,
  ]);

  return {
    settings,
    status,
    loading,
    saveState,
    saveError,
    botIdDraft,
    setBotIdDraft,
    apiTokenDraft,
    setApiTokenDraft,
    webhookUrlDraft,
    setWebhookUrlDraft,
    isActiveDraft,
    setIsActiveDraft,
    staffRoutingDraft,
    setStaffRoutingDraft,
    save,
    reload: load,
  };
}
