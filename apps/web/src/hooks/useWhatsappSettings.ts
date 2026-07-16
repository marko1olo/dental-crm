import { useState, useEffect, useCallback } from "react";

import { denteAdminSecretRequestHeaders } from "../AppHelpers";

export interface WhatsappStaffRoutingRule {
  intent: string;
  assignToUserId: string | null;
}

export interface WhatsappStaffRouting {
  defaultUserId: string | null;
  rules: WhatsappStaffRoutingRule[];
}

export interface WhatsappSettings {
  id: string;
  organizationId: string;
  phoneNumberId: string | null;
  hasToken: boolean;
  webhookVerifyToken: string | null;
  enabledFeatures: string[];
  staffRouting: WhatsappStaffRouting;
  isActive: boolean;
  updatedAt: string;
}

export interface WhatsappConnectionStatus {
  channel: "whatsapp";
  connected: boolean;
  detail: string | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function useWhatsappSettings() {
  const [settings, setSettings] = useState<WhatsappSettings | null>(null);
  const [status, setStatus] = useState<WhatsappConnectionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const [phoneNumberIdDraft, setPhoneNumberIdDraft] = useState("");
  const [accessTokenDraft, setAccessTokenDraft] = useState("");
  const [webhookVerifyTokenDraft, setWebhookVerifyTokenDraft] = useState("");
  const [isActiveDraft, setIsActiveDraft] = useState(false);
  const [staffRoutingDraft, setStaffRoutingDraft] =
    useState<WhatsappStaffRouting>({ defaultUserId: null, rules: [] });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/settings", {
        headers: denteAdminSecretRequestHeaders(),
      });
      if (res.ok) {
        const data = (await res.json()) as WhatsappSettings;
        setSettings(data);
        setPhoneNumberIdDraft(data.phoneNumberId ?? "");
        setWebhookVerifyTokenDraft(data.webhookVerifyToken ?? "");
        setIsActiveDraft(data.isActive);
        setStaffRoutingDraft(data.staffRouting);
      } else if (res.status !== 404) {
        console.error("Failed to load WhatsApp settings", res.status);
      }
    } catch (err) {
      console.error("WhatsApp settings fetch error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/status", {
        headers: denteAdminSecretRequestHeaders(),
      });
      if (res.ok) {
        setStatus((await res.json()) as WhatsappConnectionStatus);
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
        phoneNumberId: phoneNumberIdDraft.trim() || null,
        webhookVerifyToken: webhookVerifyTokenDraft.trim() || null,
        isActive: isActiveDraft,
        staffRouting: staffRoutingDraft,
      };
      if (accessTokenDraft.trim()) {
        body.accessToken = accessTokenDraft.trim();
      }
      const res = await fetch("/api/whatsapp/settings", {
        method: "PUT",
        headers: {
          ...denteAdminSecretRequestHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSaveState("saved");
        setAccessTokenDraft("");
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
    phoneNumberIdDraft,
    accessTokenDraft,
    webhookVerifyTokenDraft,
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
    phoneNumberIdDraft,
    setPhoneNumberIdDraft,
    accessTokenDraft,
    setAccessTokenDraft,
    webhookVerifyTokenDraft,
    setWebhookVerifyTokenDraft,
    isActiveDraft,
    setIsActiveDraft,
    staffRoutingDraft,
    setStaffRoutingDraft,
    save,
    reload: load,
  };
}
