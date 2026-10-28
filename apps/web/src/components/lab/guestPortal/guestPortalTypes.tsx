import React from "react";
import { CheckCircle2, Clock, PackageCheck, RefreshCcw, Truck } from "lucide-react";

export interface GuestLabPortalProps {
	readonly token: string;
}

export interface LabOrderData {
	readonly id: string;
	readonly patientFullName?: string | null | undefined;
	readonly toothFdi?: string | null | undefined;
	readonly material?: string | null | undefined;
	readonly colorVita?: string | null | undefined;
	readonly status: string;
	readonly clinicalNotes?: string | null | undefined;
	readonly attachedImageUrl?: string | null | undefined;
	readonly dueDate?: string | null | undefined;
	readonly createdAt?: string | null | undefined;
}

export const LAB_PORTAL_STATUS_LABELS: Record<string, string> = {
	draft: "Черновик",
	sent: "Отправлен в лабораторию",
	in_progress: "В работе у техника",
	ready: "Работа готова",
	shipped: "Отправлено курьером в клинику",
	received: "Получен клиникой",
	refitting: "На переделке",
	completed: "Завершен / Установлен",
};

export function getLabPortalStatusLabel(status: string): string {
	return LAB_PORTAL_STATUS_LABELS[status] || status;
}

export function renderLabPortalStatusIcon(status: string): React.JSX.Element {
	switch (status) {
		case "in_progress":
			return <Clock size={20} />;
		case "refitting":
			return <RefreshCcw size={20} />;
		case "shipped":
			return <Truck size={20} />;
		case "ready":
			return <CheckCircle2 size={20} />;
		case "received":
		case "completed":
			return <PackageCheck size={20} />;
		default:
			return <Clock size={20} />;
	}
}
