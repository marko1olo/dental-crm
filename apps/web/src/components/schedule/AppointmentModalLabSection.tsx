import type { Appointment } from "@dental/shared";
import { FlaskConical } from "lucide-react";
import React from "react";
import { useAppStore } from "../../store/appStore";
import { showToast } from "../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { AppointmentModalLabEmpty } from "./appointmentModalLab/AppointmentModalLabEmpty";
import { AppointmentModalLabCard } from "./appointmentModalLab/AppointmentModalLabCard";
import {
  type NormalizedLabItem,
  normalizeAppointmentLabItems,
} from "./appointmentModalLab/labSectionNormalize";

export interface AppointmentModalLabSectionProps {
  appointment: Appointment;
  activeLabOrders?: any[];
  startsAtLocal?: string;
  setStartsAtLocal?: (val: string) => void;
  setEndsAtLocal?: (val: string) => void;
  onClose?: () => void;
}

export function AppointmentModalLabSection({
  appointment,
  activeLabOrders = [],
  startsAtLocal,
  setStartsAtLocal,
  setEndsAtLocal,
  onClose,
}: AppointmentModalLabSectionProps) {
  const referenceDate = startsAtLocal ? new Date(startsAtLocal) : new Date();
  const items = normalizeAppointmentLabItems(appointment, activeLabOrders, referenceDate);

  const handleNavigateToLab = (orderNumber?: string) => {
    onClose?.();
    useAppStore.getState().setCurrentView("lab");
    if (typeof window !== "undefined") {
      window.location.hash = "#lab";
    }
    showToast(
      orderNumber ? `ЗТЛ: открыт наряд ${orderNumber}` : "Открыт журнал лаборатории (#lab)",
      "info",
    );
  };

  const handleConfirmFitting = (item: NormalizedLabItem) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("dente-lab-order-fitting-confirmed", {
          detail: {
            orderId: item.id,
            orderNumber: item.orderNumber,
            toothFdi: item.toothFdi,
            construction: item.construction,
            timestamp: new Date().toISOString(),
          },
        }),
      );
    }
    if (item.id && !item.id.startsWith("appt-lab-")) {
      fetch(`/api/lab/orders/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
        body: JSON.stringify({ stage: "fitting", notes: "Примерка успешно подтверждена у кресла в 1 клик" }),
      }).catch(() => {});
    }
    showToast(`Примерка наряда ${item.orderNumber} успешно подтверждена!`, "success", 3000);
  };

  if (items.length === 0) {
    return <AppointmentModalLabEmpty onNavigateToLab={() => handleNavigateToLab()} />;
  }

  return (
    <div className="sm:col-span-2 space-y-2" data-testid="appointment-modal-lab-section">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
        <span className="flex items-center gap-1.5 text-[var(--teal)]">
          <FlaskConical size={13} />
          <span>Заказ в лабораторию (ЗТЛ)</span>
        </span>
        <span className="text-[10px] lowercase font-normal opacity-70">
          {items.length === 1 ? "1 наряд" : `${items.length} наряда`}
        </span>
      </div>

      {items.map((item) => (
        <AppointmentModalLabCard
          key={item.id}
          item={item}
          startsAtLocal={startsAtLocal}
          setStartsAtLocal={setStartsAtLocal}
          setEndsAtLocal={setEndsAtLocal}
          onNavigateToLab={handleNavigateToLab}
          onConfirmFitting={handleConfirmFitting}
        />
      ))}
    </div>
  );
}
