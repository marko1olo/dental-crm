/**
 * apps/web/src/components/treatment-plans/curator/curatorConstants.ts
 *
 * Константы и вспомогательные функции курации планов (Фича #27).
 * Мандаты 8e, 8k, 8n: автономия врача, самокурация, суверенитет масштаба.
 */

import type { CuratorFunnelStage, CuratorPlanAssignmentPayload } from "@dental/shared";

export const DOCTOR_SELF_CURATOR_ID = "doctor_self";

export const isDoctorSelfCurator = (id?: string | null): boolean => {
	return !id || id === DOCTOR_SELF_CURATOR_ID;
};

// Разрешенные роли для курации планов (включая всех стоматологов для соло-практик и малых клиник, Мандат 8n)
export const CURATOR_ALLOWED_STAFF_ROLES = new Set([
	"curator",
	"administrator",
	"manager",
	"admin",
	"owner",
	"doctor",
	"therapist",
	"surgeon",
	"orthopedist",
	"orthodontist",
	"periodontist",
	"pediatric",
]);

export const CURATOR_ROLE_LABELS: Record<string, string> = {
	curator: "Куратор",
	administrator: "Администратор",
	manager: "Менеджер",
	admin: "Управляющий",
	owner: "Главврач / Владелец",
	doctor: "Врач-стоматолог",
	therapist: "Стоматолог-терапевт",
	surgeon: "Стоматолог-хирург",
	orthopedist: "Стоматолог-ортопед",
	orthodontist: "Ортодонт",
	periodontist: "Пародонтолог",
	pediatric: "Детский стоматолог",
};

export interface CuratorPlanAssignmentModalProps {
	readonly isOpen: boolean;
	readonly patientId: string;
	readonly patientName: string;
	readonly treatmentPlanId: string;
	readonly treatmentPlanTitle: string;
	readonly currentCuratorId?: string | null | undefined;
	readonly currentCuratorName?: string | undefined;
	readonly currentStage?: CuratorFunnelStage | undefined;
	readonly onClose: () => void;
	readonly onAssigned?: ((payload: CuratorPlanAssignmentPayload) => void) | undefined;
}
