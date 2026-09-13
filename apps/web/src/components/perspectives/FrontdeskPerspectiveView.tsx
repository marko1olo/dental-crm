import React from "react";
import { ScheduleView } from "../../ScheduleView";

export interface CheckoutItem {
	appointmentId: string;
	patientId: string;
	patientName: string;
	doctorName: string;
	serviceSummary: string;
	amountRub: number;
	fiscalStatus: "pending" | "paid";
	time: string;
}

export interface FrontdeskPerspectiveViewProps {
	readonly initialActiveSbpQrAppointment?: CheckoutItem | null;
}

/**
 * FrontdeskPerspectiveView — чистый фасад режима ресепшн и кассы 54-ФЗ.
 * Делегирует рендер каноническому ScheduleView (Мандат 8s: Закон Единого Неделимого Авторитета).
 */
export function FrontdeskPerspectiveView({
	initialActiveSbpQrAppointment = null,
}: FrontdeskPerspectiveViewProps = {}) {
	return <ScheduleView />;
}
