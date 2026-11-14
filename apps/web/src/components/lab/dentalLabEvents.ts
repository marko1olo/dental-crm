/**
 * apps/web/src/components/lab/dentalLabEvents.ts
 *
 * DENTE Dental CRM — Единая шина событий зуботехнической лаборатории (Event Bus SSOT).
 * Мандаты: 8b (Модульность), 8e (Автономия врача), 8zq (Реактивная гидратация).
 */

export const DENTE_LAB_EVENTS = {
	OPEN_ORDER: "dente:lab:open-order",
	OPEN_REGISTRY: "dente:lab:open-registry",
	ORDER_CREATED: "dente:lab:order-created",
	ORDER_FITTING_CONFIRMED: "dente:lab:order-fitting-confirmed",
	ORDER_STATUS_CHANGED: "dente:lab:order-status-changed",
	// Legacy aliases for backward compatibility
	LEGACY_OPEN_CREATE: "dente-open-create-lab-order",
	LEGACY_OPEN_MODAL: "dente-open-lab-order-modal",
	LEGACY_OPEN_LAB: "dente:open-lab",
	LEGACY_OPEN_REGISTRY: "dente-open-lab-registry",
	LEGACY_ORDER_CREATED: "dente-lab-order-created",
	LEGACY_ORDER_FITTING_CONFIRMED: "dente-lab-order-fitting-confirmed",
	LEGACY_STATUS_CHANGED: "dente-lab-order-status-changed",
} as const;

export interface LabOpenOrderPayload {
	patientId?: string;
	patientName?: string;
	doctorId?: string;
	doctorName?: string;
	toothFdi?: string | number;
	toothNumber?: string | number;
	appointmentId?: string;
	treatmentPlanId?: string;
	[key: string]: unknown;
}

export interface LabOrderCreatedPayload {
	orderId?: string;
	id?: string;
	order?: unknown;
	[key: string]: unknown;
}

export interface LabFittingConfirmedPayload {
	orderId?: string;
	id?: string;
	appointmentId?: string;
	status?: string;
	stage?: string;
	notes?: string;
	[key: string]: unknown;
}

/**
 * Открытие модалки оформления наряда в лабораторию с передачей контекста.
 */
export function dispatchLabOpenOrder(payload?: LabOpenOrderPayload): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new CustomEvent(DENTE_LAB_EVENTS.OPEN_ORDER, { detail: payload }));
	window.dispatchEvent(new CustomEvent(DENTE_LAB_EVENTS.LEGACY_OPEN_CREATE, { detail: payload }));
	window.dispatchEvent(new CustomEvent(DENTE_LAB_EVENTS.LEGACY_OPEN_MODAL, { detail: payload }));
	window.dispatchEvent(new CustomEvent(DENTE_LAB_EVENTS.LEGACY_OPEN_LAB, { detail: payload }));
}

/**
 * Открытие реестра/канбана нарядов лаборатории.
 */
export function dispatchLabOpenRegistry(payload?: Record<string, unknown>): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new CustomEvent(DENTE_LAB_EVENTS.OPEN_REGISTRY, { detail: payload }));
	window.dispatchEvent(new CustomEvent(DENTE_LAB_EVENTS.LEGACY_OPEN_REGISTRY, { detail: payload }));
	if (window.location.hash !== "#lab") {
		window.location.hash = "#lab";
	}
}

/**
 * Уведомление об успешном создании наряда в лабораторию.
 */
export function dispatchLabOrderCreated(payload: LabOrderCreatedPayload): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new CustomEvent(DENTE_LAB_EVENTS.ORDER_CREATED, { detail: payload }));
	window.dispatchEvent(new CustomEvent(DENTE_LAB_EVENTS.LEGACY_ORDER_CREATED, { detail: payload }));
}

/**
 * Подтверждение примерки ортопедической конструкции у кресла.
 */
export function dispatchLabFittingConfirmed(payload: LabFittingConfirmedPayload): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new CustomEvent(DENTE_LAB_EVENTS.ORDER_FITTING_CONFIRMED, { detail: payload }));
	window.dispatchEvent(new CustomEvent(DENTE_LAB_EVENTS.LEGACY_ORDER_FITTING_CONFIRMED, { detail: payload }));
}

/**
 * Изменение статуса наряда.
 */
export function dispatchLabStatusChanged(payload: Record<string, unknown>): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(new CustomEvent(DENTE_LAB_EVENTS.ORDER_STATUS_CHANGED, { detail: payload }));
	window.dispatchEvent(new CustomEvent(DENTE_LAB_EVENTS.LEGACY_STATUS_CHANGED, { detail: payload }));
}
