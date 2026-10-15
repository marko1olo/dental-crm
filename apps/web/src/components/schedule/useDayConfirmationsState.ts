/**
 * apps/web/src/components/schedule/useDayConfirmationsState.ts
 * Extracted state and action handlers for DayConfirmationsPanel.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { actionFailureToast } from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";
import {
  type ConfirmationRow,
  type DayConfirmations,
  dayConfirmationsRequestPath,
} from "./dayConfirmationsTypes";

export function useDayConfirmationsState() {
  const appLogic = useAppLogicContext();
  const auth = appLogic?.auth;
  const authRef = useRef(auth);
  authRef.current = auth;

  const [requestedDate, setRequestedDate] = useState("");
  const [data, setData] = useState<DayConfirmations | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [handled, setHandled] = useState<Set<string>>(new Set());
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const liveRegion = useRef<HTMLParagraphElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = authRef.current ? authRef.current.denteClinicalReadHeaders() : {};
      const res = await fetch(dayConfirmationsRequestPath(requestedDate), { headers });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.message || `Сервер ответил ${res.status}`);
      setData(payload);
      setHandled(new Set());
    } catch (loadError) {
      showToast(actionFailureToast("Ошибка выполнения операции", (loadError as any)?.status ?? null), "error");
      setData(null);
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, [requestedDate]);

  useEffect(() => { void load(); }, [load]);

  const visibleRows = useMemo(() => {
    if (!data) return [];
    return showAll ? (data.rows ?? []) : (data.rows ?? []).filter((r) => r?.needsCall);
  }, [data, showAll]);

  const callProgress = useMemo(() => {
    if (!data) return { done: 0, total: 0 };
    const total = data.summary?.needsCall ?? 0;
    const done = (data.rows ?? []).filter((r) => r?.needsCall && handled.has(r.appointmentId)).length;
    return { done, total };
  }, [data, handled]);

  const handleStatusChange = async (row: ConfirmationRow, newStatus: "confirmed" | "cancelled") => {
    setStatusUpdatingId(row.appointmentId);
    try {
      const headers = authRef.current ? authRef.current.denteClinicalReadHeaders() : {};
      const res = await fetch(`/api/appointments/${row.appointmentId}/status`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`Ошибка смены статуса: ${res.status}`);

      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rows: (prev.rows ?? []).map((r) => r.appointmentId === row.appointmentId ? { ...r, status: newStatus, needsCall: false } : r),
          summary: {
            ...prev.summary,
            confirmed: prev.summary.confirmed + (newStatus === "confirmed" ? 1 : row.status === "confirmed" ? -1 : 0),
            cancelled: prev.summary.cancelled + (newStatus === "cancelled" ? 1 : 0),
            needsCall: Math.max(0, prev.summary.needsCall - (row.needsCall ? 1 : 0)),
          },
        };
      });
      setHandled((prev) => new Set(prev).add(row.appointmentId));
      if (newStatus === "confirmed") {
        showToast(`Явка подтверждена: ${row.patientName}`, "success");
      } else {
        showToast("Приём отменён. Слот освобождён под лист ожидания", "info");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("dente:open-waitlist-for-slot", {
            detail: { appointmentId: row.appointmentId, startsAt: row.startsAt, patientName: row.patientName, doctorName: row.doctorName },
          }));
        }
      }
    } catch (err) {
      showToast(actionFailureToast("Не удалось обновить статус визита", (err as any)?.status ?? null), "error");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const toggleHandled = (row: ConfirmationRow) => {
    setHandled((prev) => {
      const next = new Set(prev);
      if (next.has(row.appointmentId)) next.delete(row.appointmentId); else next.add(row.appointmentId);
      return next;
    });
    if (liveRegion.current) {
      liveRegion.current.textContent = handled.has(row.appointmentId)
        ? `${row.patientName} возвращён в список обзвона`
        : `${row.patientName} отмечен как обзвоненный`;
    }
  };

  return {
    requestedDate,
    setRequestedDate,
    data,
    error,
    loading,
    showAll,
    setShowAll,
    handled,
    statusUpdatingId,
    liveRegion,
    load,
    visibleRows,
    callProgress,
    handleStatusChange,
    toggleHandled,
  };
}
