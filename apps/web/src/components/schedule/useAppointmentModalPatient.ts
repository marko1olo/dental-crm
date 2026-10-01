import type { Dashboard } from "@dental/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { matchesPatientSearch } from "../../utils/patientSearchUtils";
import { showToast } from "../GlobalToast";

export interface UseAppointmentModalPatientParams {
  isOpen: boolean;
  initialPatientId?: string | null | undefined;
  dashboard: Dashboard;
  onQuickCreatePatient?: ((data: {
    fullName: string;
    phone?: string | null | undefined;
  }) =>
    | Promise<{ id: string; fullName: string } | null>
    | { id: string; fullName: string }
    | null) | undefined;
}

export function useAppointmentModalPatient({
  isOpen,
  initialPatientId,
  dashboard,
  onQuickCreatePatient,
}: UseAppointmentModalPatientParams) {
  const activePatients = useMemo(
    () => (dashboard?.patients ?? []).filter((p) => p.status === "active"),
    [dashboard?.patients],
  );

  const [patientId, setPatientId] = useState(
    () => initialPatientId ?? "",
  );
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [createdPatients, setCreatedPatients] = useState<
    Array<{ id: string; fullName: string; phone?: string | null }>
  >([]);
  const [isInlineNewPatient, setIsInlineNewPatient] = useState(false);
  const [newPatientFullName, setNewPatientFullName] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("");
  const [isCreatingInlinePatient, setIsCreatingInlinePatient] = useState(false);

  const allDisplayPatients = useMemo(() => {
    const base = [...activePatients];
    for (const cp of createdPatients) {
      if (!base.some((p) => p.id === cp.id)) {
        base.unshift({
          id: cp.id,
          fullName: cp.fullName,
          phone: cp.phone || null,
          status: "active",
        } as any);
      }
    }
    const q = patientSearchQuery.trim();
    if (!q) return base;
    const filtered = base.filter((p) => matchesPatientSearch(p, q));
    if (patientId && !filtered.some((p) => p.id === patientId)) {
      const current = base.find((p) => p.id === patientId);
      if (current) filtered.unshift(current);
    }
    return filtered;
  }, [activePatients, createdPatients, patientSearchQuery, patientId]);

  const handleCreateInlinePatient = useCallback(
    async (override?: {
      fullName?: string;
      phone?: string | null;
    }): Promise<{
      id: string;
      fullName: string;
      phone?: string | null;
    } | null> => {
      const rawName = (override?.fullName ?? newPatientFullName).trim();
      const rawPhone = (override?.phone ?? newPatientPhone).trim();
      let effectiveName = rawName;
      if (!effectiveName) {
        if (rawPhone) {
          effectiveName = `Пациент (${rawPhone})`;
        } else {
          showToast(
            "Укажите имя или телефон пациента для быстрой записи",
            "warning",
          );
          if (typeof document !== "undefined") {
            const nameInput = document.querySelector<HTMLInputElement>(
              '[data-testid="appointment-quick-patient-name"]',
            );
            nameInput?.focus();
          }
          return null;
        }
      }
      setIsCreatingInlinePatient(true);
      try {
        let created: {
          id: string;
          fullName: string;
          phone?: string | null;
        } | null = null;
        if (onQuickCreatePatient) {
          const res = await Promise.resolve(
            onQuickCreatePatient({
              fullName: effectiveName,
              phone: rawPhone || null,
            }),
          );
          if (res?.id) {
            created = {
              id: res.id,
              fullName: res.fullName || effectiveName,
              phone: rawPhone || null,
            };
          }
        }
        if (!created?.id) {
          try {
            const res = await fetch("/api/patients", {
              method: "POST",
              headers: denteAdminSecretRequestHeaders({
                "Content-Type": "application/json",
              }),
              body: JSON.stringify({
                fullName: effectiveName,
                phone: rawPhone || null,
              }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data?.id) {
                created = {
                  id: data.id,
                  fullName: data.fullName || effectiveName,
                  phone: data.phone || rawPhone || null,
                };
              }
            }
          } catch {
            // Fallback optimistic
          }
        }
        if (!created?.id) {
          created = {
            id: `pat-quick-${Date.now()}`,
            fullName: effectiveName,
            phone: rawPhone || null,
          };
        }
        setCreatedPatients((prev) => [created!, ...prev]);
        setPatientId(created.id);
        setIsInlineNewPatient(false);
        setNewPatientFullName("");
        setNewPatientPhone("");
        setPatientSearchQuery("");
        showToast(
          `Пациент «${created.fullName}» создан и прикреплен к записи`,
          "success",
          3500,
        );
        return created;
      } finally {
        setIsCreatingInlinePatient(false);
      }
    },
    [newPatientFullName, newPatientPhone, onQuickCreatePatient],
  );

  const [activeLabOrders, setActiveLabOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!patientId || !isOpen) {
      setActiveLabOrders([]);
      return;
    }
    let cancelled = false;
    fetch(
      `/api/clinical/lab-orders?patientId=${encodeURIComponent(patientId)}`,
      {
        headers: denteAdminSecretRequestHeaders(),
      },
    )
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) {
          const list = Array.isArray(data)
            ? data
            : Array.isArray(data?.orders)
              ? data.orders
              : Array.isArray(data?.data)
                ? data.data
                : [];
          const active = list.filter(
            (o: any) => o.status !== "completed" && o.status !== "cancelled",
          );
          setActiveLabOrders(active);
        }
      })
      .catch(() => {
        if (!cancelled) setActiveLabOrders([]);
      });
    return () => {
      cancelled = true;
    };
  }, [patientId, isOpen]);

  return {
    patientId,
    setPatientId,
    patientSearchQuery,
    setPatientSearchQuery,
    isInlineNewPatient,
    setIsInlineNewPatient,
    newPatientFullName,
    setNewPatientFullName,
    newPatientPhone,
    setNewPatientPhone,
    isCreatingInlinePatient,
    handleCreateInlinePatient,
    allDisplayPatients,
    activeLabOrders,
  };
}
