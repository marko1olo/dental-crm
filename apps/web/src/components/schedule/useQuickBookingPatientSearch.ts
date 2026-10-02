import type { Dashboard, Patient } from "@dental/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { logger } from "../../utils/logger";
import { normalizePhoneToNational } from "../../utils/patientSearchUtils";
import { showToast } from "../GlobalToast";
import { useDebounce } from "../../hooks/useDebounce";
import {
  findPotentialDuplicates,
  searchPatientsQuick,
  type PotentialDuplicateItem,
} from "./patientSearchEngine";
import {
  calculatePatientReliability,
  type PatientReliabilityAssessment,
} from "./patientReliabilityScore";
import type { QuickBookingSlotInfo } from "./QuickBookingDrawerTypes";

export interface UseQuickBookingPatientSearchOptions {
  dashboard?: Dashboard | null | undefined;
  initialSlot?: QuickBookingSlotInfo | null | undefined;
  initialMatchedPatient?: Patient | null | undefined;
  setDashboard?: ((dashboard: Dashboard) => void) | undefined;
  isOpen: boolean;
}

export function useQuickBookingPatientSearch({
  dashboard,
  initialSlot,
  initialMatchedPatient,
  setDashboard,
  isOpen,
}: UseQuickBookingPatientSearchOptions) {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(
    () => initialMatchedPatient || null,
  );
  const [patientId, setPatientId] = useState<string>(
    () => initialMatchedPatient?.id || initialSlot?.patientId || "",
  );
  const [searchQuery, setSearchQuery] = useState(() => {
    if (initialMatchedPatient) return initialMatchedPatient.fullName;
    if (initialSlot?.patientName) return initialSlot.patientName;
    if (initialSlot?.patientPhone) return initialSlot.patientPhone;
    return "";
  });
  const [isTypeaheadOpen, setIsTypeaheadOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const [showInlineNewPatient, setShowInlineNewPatient] = useState(() => {
    return Boolean(!initialMatchedPatient && (initialSlot?.patientName || initialSlot?.patientPhone));
  });
  const [newPatientFullName, setNewPatientFullName] = useState(() => {
    return !initialMatchedPatient && initialSlot?.patientName ? initialSlot.patientName : "";
  });
  const [newPatientPhone, setNewPatientPhone] = useState(() => initialSlot?.patientPhone || "");
  const [newPatientBirthDate, setNewPatientBirthDate] = useState("");
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [potentialDuplicates, setPotentialDuplicates] = useState<PotentialDuplicateItem[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const newPatientFullNameInputRef = useRef<HTMLInputElement>(null);
  const focusTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize patient state on initialSlot or open change
  useEffect(() => {
    if (!isOpen) return;

    if (initialSlot?.patientId) {
      const found = (dashboard?.patients ?? []).find((p) => p.id === initialSlot.patientId);
      if (found) {
        setPatientId(found.id);
        setSelectedPatient(found);
        setSearchQuery(found.fullName);
      } else {
        setPatientId(initialSlot.patientId);
        setSelectedPatient(null);
        setSearchQuery("");
      }
      setShowInlineNewPatient(false);
      setNewPatientFullName("");
      setNewPatientPhone("");
    } else if (initialSlot?.patientName || initialSlot?.patientPhone) {
      const candidateName = initialSlot.patientName?.trim() || "";
      const candidatePhone = initialSlot.patientPhone?.trim() || "";
      const found = candidateName
        ? (dashboard?.patients ?? []).find(
            (p) => p.status === "active" && p.fullName.toLowerCase() === candidateName.toLowerCase(),
          )
        : null;
      if (found) {
        setPatientId(found.id);
        setSelectedPatient(found);
        setSearchQuery(found.fullName);
        setShowInlineNewPatient(false);
        setNewPatientFullName("");
        setNewPatientPhone("");
      } else {
        setPatientId("");
        setSelectedPatient(null);
        setSearchQuery(candidateName || candidatePhone);
        setShowInlineNewPatient(true);
        setNewPatientFullName(candidateName);
        setNewPatientPhone(candidatePhone);
      }
    } else {
      setPatientId("");
      setSelectedPatient(null);
      setSearchQuery("");
      setShowInlineNewPatient(false);
      setNewPatientFullName("");
      setNewPatientPhone("");
    }
  }, [isOpen, initialSlot, dashboard?.patients]);

  const debouncedSearchQuery = useDebounce(searchQuery);

  const searchResults = useMemo(() => {
    if (!debouncedSearchQuery || typeof debouncedSearchQuery !== "string" || !debouncedSearchQuery.trim() || selectedPatient) {
      return [];
    }
    return searchPatientsQuick(dashboard?.patients || [], debouncedSearchQuery);
  }, [debouncedSearchQuery, selectedPatient, dashboard?.patients]);

  const selectPatient = useCallback((p: Patient) => {
    setSelectedPatient(p);
    setPatientId(p.id);
    setSearchQuery(p.fullName);
    setIsTypeaheadOpen(false);
    setShowInlineNewPatient(false);
  }, []);

  useEffect(() => {
    if (!showInlineNewPatient) {
      setPotentialDuplicates([]);
      return;
    }
    const qName = newPatientFullName.trim();
    const qPhone = newPatientPhone.trim();
    if (!qName && !qPhone) {
      setPotentialDuplicates([]);
      return;
    }
    const duplicates = findPotentialDuplicates(
      dashboard?.patients || [],
      { fullName: qName, phone: qPhone },
    );
    setPotentialDuplicates(duplicates);
  }, [showInlineNewPatient, newPatientFullName, newPatientPhone, dashboard?.patients]);

  const patientReliability = useMemo<PatientReliabilityAssessment | null>(() => {
    if (!selectedPatient) return null;
    return calculatePatientReliability(selectedPatient, dashboard?.appointments);
  }, [selectedPatient, dashboard?.appointments]);

  const hasActivePatientVisit = useMemo(() => {
    if (!selectedPatient || !dashboard?.activeVisit) return false;
    return dashboard.activeVisit.patientId === selectedPatient.id;
  }, [selectedPatient, dashboard?.activeVisit]);

  const handleCreateInlinePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameCandidate =
      newPatientFullName.trim() ||
      (newPatientPhone.trim() ? `Пациент (${newPatientPhone.trim()})` : "") ||
      searchQuery.trim();

    if (!nameCandidate) {
      showToast("Укажите имя или телефон нового пациента", "warning");
      newPatientFullNameInputRef.current?.focus();
      return;
    }

    setIsCreatingPatient(true);
    try {
      const cleanPhone = newPatientPhone.trim()
        ? normalizePhoneToNational(newPatientPhone.trim())
        : null;

      let createdPatient: Patient | null = null;
      try {
        const resp = await fetch("/api/patients", {
          method: "POST",
          headers: denteAdminSecretRequestHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            fullName: nameCandidate,
            phone: cleanPhone || newPatientPhone.trim() || null,
            birthDate: newPatientBirthDate.trim() || null,
          }),
        });
        if (resp.ok) {
          const body = await resp.json();
          createdPatient = body.patient || body;
        }
      } catch {
        // Fallback optimistic
      }

      if (!createdPatient || !createdPatient.id) {
        createdPatient = {
          id: `pat-${Date.now()}`,
          fullName: nameCandidate,
          phone: cleanPhone || newPatientPhone.trim() || null,
          birthDate: newPatientBirthDate.trim() || null,
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Patient;
      }

      if (typeof setDashboard === "function" && dashboard) {
        const updatedPatients = [createdPatient, ...(dashboard.patients || [])];
        setDashboard({ ...dashboard, patients: updatedPatients });
      }

      setSelectedPatient(createdPatient);
      setPatientId(createdPatient.id);
      setSearchQuery(createdPatient.fullName);
      setShowInlineNewPatient(false);
      showToast(`Пациент «${createdPatient.fullName}» создан!`, "success");
    } catch (err) {
      logger.error("Failed to create inline patient", err);
      showToast("Не удалось создать пациента", "error");
    } finally {
      setIsCreatingPatient(false);
    }
  };

  return {
    selectedPatient,
    setSelectedPatient,
    patientId,
    setPatientId,
    searchQuery,
    setSearchQuery,
    isTypeaheadOpen,
    setIsTypeaheadOpen,
    highlightedIndex,
    setHighlightedIndex,
    showInlineNewPatient,
    setShowInlineNewPatient,
    newPatientFullName,
    setNewPatientFullName,
    newPatientPhone,
    setNewPatientPhone,
    newPatientBirthDate,
    setNewPatientBirthDate,
    isCreatingPatient,
    setIsCreatingPatient,
    potentialDuplicates,
    setPotentialDuplicates,
    searchInputRef,
    newPatientFullNameInputRef,
    focusTimerRef,
    searchResults,
    selectPatient,
    patientReliability,
    hasActivePatientVisit,
    handleCreateInlinePatient,
  };
}
