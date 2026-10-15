import { useState } from "react";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import type { PreferredTimeOfDay, WaitlistPriority } from "./waitlistMatchScoring";

export interface UseWaitlistAddFormParams {
  targetSlot: any;
  fetchWaitlist: () => void;
  setActiveTab: (tab: "match" | "list" | "add") => void;
  waitlistWriteHeaders: () => Record<string, string>;
}

export function useWaitlistAddForm({
  targetSlot,
  fetchWaitlist,
  setActiveTab,
  waitlistWriteHeaders,
}: UseWaitlistAddFormParams) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [preferredDoctorId, setPreferredDoctorId] = useState("");
  const [priorityLevel, setPriorityLevel] = useState<WaitlistPriority>("medium");
  const [treatmentCategory, setTreatmentCategory] = useState("");
  const [preferredDays, setPreferredDays] = useState<string[]>(["weekdays"]);
  const [preferredTimeOfDay, setPreferredTimeOfDay] = useState<PreferredTimeOfDay[]>(["morning", "day"]);
  const [expiryDays, setExpiryDays] = useState<number | null>(14);
  const [customExpiryDate, setCustomExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!selectedPatientId) {
      showToast("Выберите пациента из базы", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      let expiryIso: string | undefined;
      if (customExpiryDate) expiryIso = new Date(`${customExpiryDate}T23:59:59`).toISOString();
      else if (expiryDays) {
        const exp = new Date();
        exp.setDate(exp.getDate() + expiryDays);
        expiryIso = exp.toISOString();
      }

      const preferredTimeRangesFormatted = preferredDays.flatMap((day) =>
        preferredTimeOfDay.map((time) => ({
          day,
          slot: time === "morning" ? "09:00-12:00" : time === "day" ? "12:00-17:00" : time === "evening" ? "17:00-21:00" : "09:00-21:00",
        }))
      );

      const payload = {
        patientId: selectedPatientId,
        preferredDoctorId: preferredDoctorId || null,
        priorityLevel: priorityLevel === "urgent" || priorityLevel === "acute_pain" ? "high" : priorityLevel === "treatment_plan" || priorityLevel === "vip" ? "medium" : "low",
        preferredTimeRanges: preferredTimeRangesFormatted,
        treatmentCategory: treatmentCategory || null,
        notes: notes.trim() || null,
        expiryDate: expiryIso,
      };

      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: waitlistWriteHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast("Пациент успешно добавлен в лист ожидания", "success");
        setSelectedPatientId("");
        setPreferredDoctorId("");
        setPriorityLevel("medium");
        setTreatmentCategory("");
        setNotes("");
        fetchWaitlist();
        setActiveTab(targetSlot ? "match" : "list");
      } else {
        const errorData = await res.json().catch(() => null);
        showToast(errorData?.message || "Не удалось сохранить заявку в лист ожидания", "error");
      }
    } catch (err) {
      logger.error("Failed to add waitlist item", err);
      showToast("Ошибка соединения с сервером клиники", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    selectedPatientId,
    setSelectedPatientId,
    preferredDoctorId,
    setPreferredDoctorId,
    priorityLevel,
    setPriorityLevel,
    treatmentCategory,
    setTreatmentCategory,
    preferredDays,
    setPreferredDays,
    preferredTimeOfDay,
    setPreferredTimeOfDay,
    expiryDays,
    setExpiryDays,
    customExpiryDate,
    setCustomExpiryDate,
    notes,
    setNotes,
    isSubmitting,
    handleAddPatient,
  };
}
