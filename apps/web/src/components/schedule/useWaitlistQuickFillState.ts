/**
 * apps/web/src/components/schedule/useWaitlistQuickFillState.ts
 * Unified orchestrator hook for WaitlistQuickFillModal (<120 lines).
 */

import { useCallback, useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { logger } from "../../utils/logger";
import { useWaitlistAddForm } from "./useWaitlistAddForm";
import { useWaitlistBookingAction } from "./useWaitlistBookingAction";
import { useWaitlistMessaging } from "./useWaitlistMessaging";
import { useWaitlistScoringState } from "./useWaitlistScoringState";
import { useWaitlistSlotsDiscovery } from "./useWaitlistSlotsDiscovery";
import {
  DEMO_SHOWCASE_WAITLIST_ENTRIES,
  type WaitlistPatientEntry,
} from "./waitlistMatchScoring";
import type { WaitlistQuickFillModalProps } from "./WaitlistQuickFillModal";

function waitlistWriteHeaders(): Record<string, string> {
  return denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });
}

export function useWaitlistQuickFillState(props: WaitlistQuickFillModalProps) {
  const { isOpen, onClose, targetSlot, updateNewAppointmentDraft, focusNewAppointmentEditor, onBookSlot, onAppointmentCreated } = props;
  const ctx = useOptionalAppLogicContext();
  const dashboard = props.dashboard || ctx?.dashboard;
  const auth = props.auth || ctx?.auth;

  const [activeTab, setActiveTab] = useState<"match" | "list" | "add">(targetSlot ? "match" : "list");
  const [items, setItems] = useState<WaitlistPatientEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>("all");
  const [activeMenuPatientId, setActiveMenuPatientId] = useState<string | null>(null);

  const staff = dashboard?.clinicSettings?.staff ?? [];
  const doctors = staff.filter((s: any) => s.role === "doctor" || s.role === "Врач" || s.role === "admin");
  const patientsList = dashboard?.patients ?? [];
  const clinicName = dashboard?.clinicSettings?.name || "DENTE";

  const fetchWaitlist = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/waitlist", { headers: auth?.denteClinicalReadHeaders ? auth.denteClinicalReadHeaders() : {} });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setItems(list.length === 0 && isDemoShowcaseMode() ? DEMO_SHOWCASE_WAITLIST_ENTRIES : list);
      } else if (isDemoShowcaseMode()) {
        setItems(DEMO_SHOWCASE_WAITLIST_ENTRIES);
      }
    } catch (e) {
      logger.error("Failed to load waitlist", e);
      if (isDemoShowcaseMode()) setItems(DEMO_SHOWCASE_WAITLIST_ENTRIES);
    } finally {
      setIsLoading(false);
    }
  }, [auth]);

  const addForm = useWaitlistAddForm({ targetSlot, fetchWaitlist, setActiveTab, waitlistWriteHeaders });
  const slotsDiscovery = useWaitlistSlotsDiscovery({ isOpen, targetSlot, dashboard, auth });
  const { activeTargetSlot, combinedDiscoveredSlots } = slotsDiscovery;

  const scoring = useWaitlistScoringState({ isOpen, activeTargetSlot, items, searchQuery, selectedPriorityFilter, auth });
  const messaging = useWaitlistMessaging({ targetSlot: activeTargetSlot, clinicName });
  const booking = useWaitlistBookingAction({
    activeTargetSlot,
    targetSlot,
    dashboard,
    onBookSlot,
    onAppointmentCreated,
    onClose,
    fetchWaitlist,
    updateNewAppointmentDraft,
    focusNewAppointmentEditor,
    waitlistWriteHeaders,
  });

  useEffect(() => {
    if (isOpen) {
      fetchWaitlist();
      if (targetSlot || combinedDiscoveredSlots.length > 0) setActiveTab("match");
    } else {
      setActiveMenuPatientId(null);
    }
  }, [isOpen, targetSlot, combinedDiscoveredSlots.length, fetchWaitlist]);

  return {
    activeTab,
    setActiveTab,
    items,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedPriorityFilter,
    setSelectedPriorityFilter,
    activeMenuPatientId,
    setActiveMenuPatientId,
    patientsList,
    doctors,
    ...slotsDiscovery,
    ...scoring,
    ...messaging,
    ...booking,
    ...addForm,
  };
}
