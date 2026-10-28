/**
 * useWaitlistState.ts — Единый хук управления состоянием листа ожидания и умного подбора
 * (Мандат 8b: Sweet Spot ~150-200 строк, строгая типизация, 0% рекурсивных ре-рендеров).
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import type { TargetSlotInfo, WaitlistCandidateItem, WaitlistUrgency } from "./waitlistTypes";
import { filterWaitlistCandidates, generateWaitlistOfferMessage } from "./waitlistTypes";

export interface UseWaitlistOptions {
  isOpen: boolean;
  targetSlot?: TargetSlotInfo | null;
  onBookSlot?: (patient: WaitlistCandidateItem, slot: TargetSlotInfo) => Promise<void> | void;
  onClose?: () => void;
  dashboard?: any;
  auth?: any;
}

export function useWaitlistState(options: UseWaitlistOptions) {
  const { isOpen, targetSlot, onBookSlot, onClose, dashboard, auth } = options;

  const [items, setItems] = useState<WaitlistCandidateItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Фильтры
  const [searchQuery, setSearchQuery] = useState("");
  const [sameDoctorOnly, setSameDoctorOnly] = useState(Boolean(targetSlot?.doctorUserId));
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"smart_match" | "all_patients" | "add_new">(
    targetSlot ? "smart_match" : "all_patients",
  );

  // Состояние создания новой заявки
  const [newPatientId, setNewPatientId] = useState("");
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("");
  const [newDoctorId, setNewDoctorId] = useState(targetSlot?.doctorUserId || "");
  const [newUrgency, setNewUrgency] = useState<WaitlistUrgency>("routine");
  const [newCategory, setNewCategory] = useState("therapy");
  const [newNotes, setNewNotes] = useState("");
  const [newTimeOfDay, setNewTimeOfDay] = useState("any");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Сброс вкладки при смене слота
  useEffect(() => {
    if (targetSlot) {
      setActiveTab("smart_match");
      if (targetSlot.doctorUserId) setSameDoctorOnly(true);
    }
  }, [targetSlot]);

  // Загрузка листа ожидания с бэкенда
  const loadWaitlist = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
      };
      if (auth?.denteClinicalReadHeaders) {
        Object.assign(headers, auth.denteClinicalReadHeaders());
      }
      const res = await fetch("/api/waitlist", { headers });
      if (!res.ok) {
        throw new Error(`Ошибка загрузки листа ожидания (${res.status})`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setItems(data);
      }
    } catch (err: any) {
      setError(err?.message || "Не удалось загрузить лист ожидания");
    } finally {
      setIsLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    if (isOpen) {
      void loadWaitlist();
    }
  }, [isOpen, loadWaitlist]);

  // Фильтрация и умный скоринг кандидатов
  const rankedCandidates = useMemo(() => {
    return filterWaitlistCandidates(items, targetSlot, {
      searchQuery,
      sameDoctorOnly: activeTab === "smart_match" ? sameDoctorOnly : false,
      urgencyFilter,
    });
  }, [items, targetSlot, searchQuery, sameDoctorOnly, urgencyFilter, activeTab]);

  // Количество пациентов, идеально подходящих под окно
  const matchedCount = useMemo(() => {
    if (!targetSlot) return 0;
    return items.filter((item) => {
      if (item.status && item.status !== "active" && item.status !== "waiting") return false;
      if (targetSlot.doctorUserId && item.preferredDoctorId && item.preferredDoctorId !== targetSlot.doctorUserId) {
        return false;
      }
      return true;
    }).length;
  }, [items, targetSlot]);

  // Бронирование слота
  const handleBookCandidate = useCallback(
    async (candidate: WaitlistCandidateItem) => {
      if (!targetSlot) return;
      try {
        if (onBookSlot) {
          await onBookSlot(candidate, targetSlot);
        }
        // Обновляем локальный статус
        setItems((prev) =>
          prev.map((it) => (it.id === candidate.id ? { ...it, status: "booked" } : it)),
        );
        if (onClose) onClose();
      } catch (err: any) {
        setError(err?.message || "Ошибка при записи пациента в слот");
      }
    },
    [targetSlot, onBookSlot, onClose],
  );

  // Добавление новой заявки в лист ожидания
  const handleCreateEntry = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!newPatientId && !newPatientName.trim()) {
        setError("Укажите пациента для добавления в лист ожидания");
        return;
      }

      setIsSubmitting(true);
      setError(null);
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json",
        };
        if (auth?.denteClinicalMutationHeaders) {
          Object.assign(headers, auth.denteClinicalMutationHeaders());
        }

        const payload = {
          patientId: newPatientId,
          preferredDoctorId: newDoctorId || null,
          priorityLevel: newUrgency === "urgent" || newUrgency === "acute_pain" ? "high" : "medium",
          urgency: newUrgency,
          treatmentCategory: newCategory,
          notes: newNotes.trim() || undefined,
          preferredTimeRanges: [
            {
              day: "Любой",
              slot: newTimeOfDay === "any" ? "any" : newTimeOfDay,
              notes: newNotes.trim() || undefined,
              urgency: newUrgency,
              treatmentCategory: newCategory,
            },
          ],
        };

        const res = await fetch("/api/waitlist", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Ошибка сохранения (${res.status})`);
        }

        const created = await res.json();
        setItems((prev) => [created, ...prev]);

        // Сброс формы и возврат на список
        setNewPatientId("");
        setNewPatientName("");
        setNewPatientPhone("");
        setNewNotes("");
        setActiveTab(targetSlot ? "smart_match" : "all_patients");
      } catch (err: any) {
        setError(err?.message || "Не удалось сохранить заявку в лист ожидания");
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      newPatientId,
      newPatientName,
      newDoctorId,
      newUrgency,
      newCategory,
      newNotes,
      newTimeOfDay,
      targetSlot,
      auth,
    ],
  );

  // Копирование вежливого сообщения в буфер
  const handleCopyOfferMessage = useCallback(
    (candidate: WaitlistCandidateItem) => {
      const clinicName = dashboard?.clinicSettings?.name || "Стоматология DENTE";
      const message = generateWaitlistOfferMessage({
        patientName: candidate.patientName,
        doctorName: targetSlot?.doctorName || candidate.preferredDoctorName,
        startsAt: targetSlot?.startsAt,
        clinicName,
      });

      if (navigator.clipboard) {
        navigator.clipboard.writeText(message);
        setCopiedId(candidate.id);
        setTimeout(() => setCopiedId(null), 2500);
      }
    },
    [targetSlot, dashboard],
  );

  return {
    items,
    rankedCandidates,
    matchedCount,
    isLoading,
    isSubmitting,
    error,
    setError,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    sameDoctorOnly,
    setSameDoctorOnly,
    urgencyFilter,
    setUrgencyFilter,
    copiedId,
    // Поля создания
    newPatientId,
    setNewPatientId,
    newPatientName,
    setNewPatientName,
    newPatientPhone,
    setNewPatientPhone,
    newDoctorId,
    setNewDoctorId,
    newUrgency,
    setNewUrgency,
    newCategory,
    setNewCategory,
    newNotes,
    setNewNotes,
    newTimeOfDay,
    setNewTimeOfDay,
    // Экшены
    loadWaitlist,
    handleBookCandidate,
    handleCreateEntry,
    handleCopyOfferMessage,
  };
}
