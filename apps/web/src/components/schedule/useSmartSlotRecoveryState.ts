/**
 * apps/web/src/components/schedule/useSmartSlotRecoveryState.ts
 * Hook managing candidate data, whatsapp dispatch and slot booking.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { showToast } from "../GlobalToast";
import { logger } from "../../utils/logger";
import {
  type SmartSlotCandidateMatch,
  type WaitlistEntryLike,
  matchWaitlistCandidatesForSlot,
} from "./smartSlotRecoveryEngine";
import type { SmartSlotRecoveryTargetSlot } from "./SmartSlotRecoveryPopover";

const DEMO_WAITLIST_ENTRIES: WaitlistEntryLike[] = [
  {
    id: "demo-wl-1",
    patientId: "demo-p-1",
    patientName: "Волков Сергей Николаевич",
    patientPhone: "+7 (916) 111-22-33",
    preferredDoctorId: "doc-1",
    priorityLevel: "high",
    urgency: "acute_pain",
    treatmentCategory: "Терапия (Острая боль)",
    notes: "Острая боль 4.6, просит ближайшее утро",
    status: "waiting",
    createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 4).toISOString(),
    waitingDays: 4,
  },
  {
    id: "demo-wl-2",
    patientId: "demo-p-2",
    patientName: "Морозова Елена Викторовна",
    patientPhone: "+7 (926) 444-55-66",
    preferredDoctorId: "doc-1",
    priorityLevel: "medium",
    urgency: "ortho_endo",
    treatmentCategory: "Ортодонтия (Активация)",
    notes: "Готова подойти в любое окно сегодня",
    status: "waiting",
    createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 6).toISOString(),
    waitingDays: 6,
  },
  {
    id: "demo-wl-3",
    patientId: "demo-p-3",
    patientName: "Кузнецов Дмитрий Павлович",
    patientPhone: "+7 (903) 777-88-99",
    preferredDoctorId: null,
    priorityLevel: "medium",
    urgency: "hygiene",
    treatmentCategory: "Профгигиена Air-Flow",
    notes: "Профгигиена, любой терапевт клиники",
    status: "waiting",
    createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 2).toISOString(),
    waitingDays: 2,
  },
];

export function useSmartSlotRecoveryState(params: {
  isOpen: boolean;
  slot: SmartSlotRecoveryTargetSlot | null;
  waitlistEntries?: WaitlistEntryLike[];
  clinicName?: string;
  onBookCandidate?: (candidate: WaitlistEntryLike, slot: SmartSlotRecoveryTargetSlot) => Promise<void> | void;
  onClose: () => void;
}) {
  const { isOpen, slot, waitlistEntries: propWaitlistEntries, clinicName: propClinicName, onBookCandidate, onClose } = params;
  const appLogic = useOptionalAppLogicContext();
  const clinicName = propClinicName || appLogic?.dashboard?.clinicSettings?.name || "DENTE";

  const [entries, setEntries] = useState<WaitlistEntryLike[]>(propWaitlistEntries || []);
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [contactedSet, setContactedSet] = useState<Set<string>>(new Set());
  const [copiedSet, setCopiedSet] = useState<Set<string>>(new Set());
  const [serverMatchesMap, setServerMatchesMap] = useState<Map<string, any> | null>(null);

  useEffect(() => {
    const apptId = slot?.appointmentId;
    if (!apptId || !isOpen) { setServerMatchesMap(null); return; }
    let isCancelled = false;
    fetch(`/api/appointments/${encodeURIComponent(apptId)}/waitlist-matches`, {
      headers: appLogic?.auth?.denteClinicalReadHeaders ? appLogic.auth.denteClinicalReadHeaders() : {},
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isCancelled && data && Array.isArray(data.matches)) {
          const map = new Map<string, any>();
          for (const m of data.matches) {
            if (m.entryId) map.set(m.entryId, m);
            if (m.patientId) map.set(m.patientId, m);
          }
          setServerMatchesMap(map);
        }
      })
      .catch((err) => logger.warn("Could not load server matches:", err));
    return () => { isCancelled = true; };
  }, [slot?.appointmentId, isOpen, appLogic?.auth]);

  useEffect(() => {
    if (!isOpen) return;
    if (propWaitlistEntries && propWaitlistEntries.length > 0) {
      setEntries(propWaitlistEntries);
      return;
    }
    let isMounted = true;
    setLoading(true);
    fetch("/api/waitlist", {
      headers: appLogic?.auth?.denteClinicalReadHeaders ? appLogic.auth.denteClinicalReadHeaders() : {},
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!isMounted) return;
        const list = Array.isArray(data) ? data : [];
        setEntries(list.length === 0 && isDemoShowcaseMode() ? DEMO_WAITLIST_ENTRIES : list);
      })
      .catch((err) => {
        if (!isMounted) return;
        logger.warn("Could not load waitlist:", err);
        if (isDemoShowcaseMode() || entries.length === 0) setEntries(DEMO_WAITLIST_ENTRIES);
      })
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [isOpen, propWaitlistEntries, appLogic?.auth]);

  const effectiveEntries = propWaitlistEntries ?? entries;

  const recoveryResult = useMemo(() => {
    if (!slot) return null;
    return matchWaitlistCandidatesForSlot({
      doctorId: slot.doctorId,
      doctorName: slot.doctorName,
      chairId: slot.chairId,
      chairName: slot.chairName,
      startAt: slot.startsAt,
      endAt: slot.endsAt,
      waitlistEntries: effectiveEntries,
      limit: 3,
      clinicName,
    });
  }, [slot, effectiveEntries, clinicName]);

  const matches = useMemo(() => {
    const base = recoveryResult?.matches || [];
    if (!serverMatchesMap) return base;
    return base.map((m) => {
      const sm = serverMatchesMap.get(m.id) || (m.patientId ? serverMatchesMap.get(m.patientId) : null);
      if (!sm) return m;
      const reasons = [...(m.matchReasons || [])];
      if (sm.reason && !reasons.includes(sm.reason)) reasons.unshift(sm.reason);
      if (sm.alreadyBooked && !reasons.includes("Уже есть будущая запись")) reasons.push("Уже есть будущая запись");
      let score = m.score;
      if (sm.sameDoctor && sm.timeFits) score = Math.max(score, 95);
      else if (sm.sameDoctor || sm.timeFits) score = Math.max(score, 80);
      if (sm.alreadyBooked) score = Math.max(15, score - 35);
      return { ...m, score, matchReasons: reasons };
    }).sort((a, b) => b.score - a.score);
  }, [recoveryResult?.matches, serverMatchesMap]);

  const handleOfferWhatsApp = useCallback((match: SmartSlotCandidateMatch) => {
    if (!match.phone) { showToast("У пациента не указан номер телефона", "warning"); return; }
    setContactedSet((prev) => new Set(prev).add(match.id));
    if (match.whatsappUrl && typeof window !== "undefined") window.open(match.whatsappUrl, "_blank", "noopener,noreferrer");
    showToast(`Текст предложения сформирован для ${match.patientName}`, "success");
  }, []);

  const handleCopyMessage = useCallback((match: SmartSlotCandidateMatch) => {
    if (!navigator?.clipboard) { showToast("Буфер обмена недоступен", "warning"); return; }
    navigator.clipboard.writeText(match.offerMessage).then(() => {
      setCopiedSet((prev) => new Set(prev).add(match.id));
      showToast("Текст сообщения скопирован в буфер", "success");
    }).catch(() => showToast("Не удалось скопировать текст", "error"));
  }, []);

  const handleBook = useCallback(async (match: SmartSlotCandidateMatch) => {
    if (!slot || bookingId) return;
    setBookingId(match.id);
    try {
      if (onBookCandidate) {
        await onBookCandidate(match.candidate, slot);
        showToast(`Пациент «${match.patientName}» записан в освободившееся окно!`, "success");
        onClose();
        return;
      }
      if (slot.appointmentId) {
        const patchRes = await fetch(`/api/appointments/${encodeURIComponent(slot.appointmentId)}`, {
          method: "PATCH",
          headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            patientId: match.patientId,
            status: "planned",
            reason: match.procedureName || "Запись из листа ожидания",
            comment: `Окно занято из листа ожидания: ${match.patientName}`,
            expectedCurrentStatus: ["cancelled", "no_show"],
          }),
        });
        if (!patchRes.ok) {
          const err = await patchRes.json().catch(() => null);
          showToast(err?.message || "Не удалось обновить запись в расписании", "error");
          return;
        }
        const entryId = match.candidate.id || match.candidate.entryId;
        if (entryId) {
          await fetch(`/api/waitlist/${encodeURIComponent(entryId)}`, {
            method: "PUT",
            headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ status: "fulfilled" }),
          }).catch(() => {});
        }
        showToast(`Пациент «${match.patientName}» успешно записан в окно!`, "success");
        if (appLogic?.loadDashboard) void appLogic.loadDashboard();
        onClose();
      } else {
        showToast("Запись слота не найдена для изменения", "warning");
      }
    } catch (err) {
      logger.error("Smart slot recovery booking error:", err);
      showToast("Ошибка при записи пациента в свободное окно", "error");
    } finally {
      setBookingId(null);
    }
  }, [slot, bookingId, onBookCandidate, onClose, appLogic]);

  return {
    entries: effectiveEntries,
    loading,
    bookingId,
    contactedSet,
    copiedSet,
    matches,
    durationMinutes: recoveryResult?.slot?.durationMinutes || 30,
    handleOfferWhatsApp,
    handleCopyMessage,
    handleBook,
  };
}
