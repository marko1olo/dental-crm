/**
 * apps/web/src/lib/clinicEventBus.ts
 *
 * Типизированная шина клинических и студийных событий (SSOT).
 * Заменяет 50 разрозненных window.addEventListener("dente:*") и гарантирует 100% cleanup.
 */

import { useEffect, useRef } from "react";
import type { PrimaryWorkspaceView, WorkspaceOverlayStudio } from "@dental/shared";

export interface ClinicEventMap {
	readonly "studio:open": {
		readonly studio: WorkspaceOverlayStudio;
		readonly pushBackStack?: WorkspaceOverlayStudio | undefined;
	};
	readonly "studio:close": { readonly kind?: WorkspaceOverlayStudio["kind"] | undefined };
	readonly "workspace:navigate": {
		readonly view: PrimaryWorkspaceView;
		readonly subTab?: string | undefined;
		readonly entityId?: string | undefined;
	};
	readonly "patient:select": {
		readonly patientId: string;
		readonly patientName?: string | undefined;
	};
	readonly "cashbox:apply-split": {
		readonly cashKopecks?: number | undefined;
		readonly cardKopecks?: number | undefined;
		readonly sbpKopecks?: number | undefined;
		readonly depositKopecks?: number | undefined;
	};
	readonly "emk:insert-protocol": {
		readonly text: string;
		readonly target?: "notes" | "statusLocalis" | "treatment" | undefined;
	};
	readonly "shortcuts:open": undefined;
}

const BUS_EVENT_PREFIX = "dente:bus:";

export function emitClinicEvent<K extends keyof ClinicEventMap>(
	eventName: K,
	...[detail]: ClinicEventMap[K] extends undefined ? [] : [ClinicEventMap[K]]
): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(
		new CustomEvent(`${BUS_EVENT_PREFIX}${String(eventName)}`, {
			detail: detail ?? null,
		}),
	);
}

let pendingStudioNavigation: {
	studio: WorkspaceOverlayStudio;
	pushBackStack?: WorkspaceOverlayStudio | undefined;
} | null = null;

export function consumePendingStudioNavigation(): {
	studio: WorkspaceOverlayStudio;
	pushBackStack?: WorkspaceOverlayStudio | undefined;
} | null {
	const next = pendingStudioNavigation;
	pendingStudioNavigation = null;
	return next;
}

/**
 * Плоский переход в студию (Max Modal Depth = 1) с опциональной записью в studioBackStack.
 * Сохраняет pending-навигацию на случай, если WorkspaceStudioOverlayHost ещё монтируется (выход из aux_popout).
 */
export function navigateToStudio(
	studio: WorkspaceOverlayStudio,
	pushBackStack?: WorkspaceOverlayStudio,
): void {
	pendingStudioNavigation = { studio, pushBackStack };
	emitClinicEvent("studio:open", {
		studio,
		...(pushBackStack !== undefined ? { pushBackStack } : {}),
	});
}

export function useClinicEvent<K extends keyof ClinicEventMap>(
	eventName: K,
	handler: (payload: ClinicEventMap[K]) => void,
): void {
	const handlerRef = useRef(handler);
	handlerRef.current = handler;

	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		const domEvent = `${BUS_EVENT_PREFIX}${String(eventName)}`;
		const listener = (event: Event) => {
			const custom = event as CustomEvent<ClinicEventMap[K]>;
			handlerRef.current(custom.detail);
		};
		window.addEventListener(domEvent, listener);
		return () => {
			window.removeEventListener(domEvent, listener);
		};
	}, [eventName]);
}

const LEGACY_EVENT_MAPPERS: ReadonlyArray<{
	readonly events: readonly string[];
	readonly mapToStudio: (detail: Record<string, unknown> | null) => WorkspaceOverlayStudio;
}> = [
	{
		events: ["dente:open-patient-card", "dente-open-patient-card"],
		mapToStudio: (d) => ({
			kind: "patient_card",
			patientId: typeof d?.patientId === "string" ? d.patientId : undefined,
			initialTab: typeof d?.initialTab === "string" ? d.initialTab : undefined,
			mode: d?.mode === "edit" || d?.mode === "create" ? d.mode : "view",
		}),
	},
	{
		events: [
			"dente:open-cashbox", "dente-open-cashbox",
			"dente:open-cashier", "dente-open-cashier",
			"dente:open-fast-checkout", "dente-open-fast-checkout",
			"dente:open-payment-modal", "dente-open-payment-modal",
		],
		mapToStudio: (d) => ({
			kind: "cashbox",
			mode: d?.mode === "shift" || d?.mode === "studio" ? d.mode : "checkout",
			patientId: typeof d?.patientId === "string" ? d.patientId : undefined,
			patientName: typeof d?.patientName === "string" ? d.patientName : undefined,
			invoiceId: typeof d?.invoiceId === "string" ? d.invoiceId : undefined,
			amountKopecks:
				typeof d?.amountKopecks === "number"
					? d.amountKopecks
					: typeof d?.amountRub === "number"
						? Math.round(d.amountRub * 100)
						: undefined,
			doctorName: typeof d?.doctorFullName === "string" ? d.doctorFullName : undefined,
			serviceTitle: typeof d?.serviceTitle === "string" ? d.serviceTitle : undefined,
		}),
	},
	{
		events: ["dente:open-quick-booking", "dente-open-quick-booking"],
		mapToStudio: (d) => ({
			kind: "quick_booking",
			patientId: typeof d?.patientId === "string" ? d.patientId : undefined,
			slotIso: typeof d?.startsAt === "string" ? d.startsAt : undefined,
			chairId: typeof d?.chairId === "string" ? d.chairId : undefined,
			doctorId: typeof d?.doctorId === "string" ? d.doctorId : undefined,
			emergency: Boolean(d?.isCitoEmergency || d?.emergency),
		}),
	},
	{
		events: ["dente:open-emr", "dente-open-emr", "dente:open-medical-record"],
		mapToStudio: (d) => ({
			kind: "emr_record",
			patientId: typeof d?.patientId === "string" ? d.patientId : undefined,
			visitId: typeof d?.visitId === "string" ? d.visitId : undefined,
			initialTab: typeof d?.initialTab === "string" ? d.initialTab : undefined,
		}),
	},
	{
		events: ["dente:open-odontogram", "dente-open-odontogram"],
		mapToStudio: (d) => ({
			kind: "odontogram_fullscreen",
			patientId: typeof d?.patientId === "string" ? d.patientId : undefined,
		}),
	},
	{
		events: ["dente:open-perio", "dente:open-psr", "dente:open-perio-modal", "dente-open-perio-modal"],
		mapToStudio: (d) => ({
			kind: "perio",
			patientId: typeof d?.patientId === "string" ? d.patientId : undefined,
		}),
	},
	{
		events: ["dente:open-endo", "dente:open-endodontics", "dente:open-root-canals"],
		mapToStudio: (d) => ({
			kind: "endo",
			patientId: typeof d?.patientId === "string" ? d.patientId : undefined,
			toothFdi: typeof d?.toothNumber === "number" ? d.toothNumber : undefined,
		}),
	},
	{
		events: ["dente:open-surgery", "dente-open-surgery", "dente:open-implant"],
		mapToStudio: (d) => ({
			kind: "surgery",
			patientId: typeof d?.patientId === "string" ? d.patientId : undefined,
			toothFdi: typeof d?.toothNumber === "number" ? d.toothNumber : undefined,
			initialTab: d?.initialTab === "passport" ? "passport" : "protocol",
		}),
	},
	{
		events: ["dente:open-orthopedics", "dente:open-crowns"],
		mapToStudio: (d) => ({
			kind: "orthopedics",
			patientId: typeof d?.patientId === "string" ? d.patientId : undefined,
			toothFdi: typeof d?.toothFdi === "number" ? d.toothFdi : undefined,
		}),
	},
	{
		events: ["dente:open-orthodontics", "dente:open-ortho-studio"],
		mapToStudio: (d) => ({
			kind: "orthodontics",
			patientId: typeof d?.patientId === "string" ? d.patientId : undefined,
		}),
	},
	{
		events: ["dente:open-hygiene", "dente:open-cleaning"],
		mapToStudio: (d) => ({
			kind: "hygiene",
			patientId: typeof d?.patientId === "string" ? d.patientId : undefined,
			visitId: typeof d?.visitId === "string" ? d.visitId : undefined,
		}),
	},
	{
		events: ["dente:open-pediatric", "dente:open-bravery-diploma", "dente-open-bravery-diploma"],
		mapToStudio: (d) => ({
			kind: "pediatric",
			patientId: typeof d?.patientId === "string" ? d.patientId : undefined,
			mode: Boolean(d?.diploma) ? "diploma" : "dentition",
		}),
	},
	{
		events: ["dente:open-photo-protocol", "dente:open-photo-qr", "dente:open-dsd", "dente:open-photo"],
		mapToStudio: (d) => ({
			kind: "photo_protocol",
			patientId: typeof d?.patientId === "string" ? d.patientId : undefined,
			mode: d?.dsd ? "dsd" : d?.qrOnly ? "qr" : "grid",
		}),
	},
	{
		events: [
			"dente:open-direct-rvg", "dente:open-rvg-capture", "dente-open-rvg-capture",
			"dente:open-rvg", "dente-open-rvg", "dente:open-xray",
		],
		mapToStudio: (d) => ({
			kind: "rvg_capture",
			patientId: typeof d?.patientId === "string" ? d.patientId : undefined,
			toothFdi: typeof d?.toothFdi === "number" ? d.toothFdi : undefined,
		}),
	},
	{
		events: ["dente:open-prescriptions", "dente-open-prescriptions"],
		mapToStudio: (d) => ({
			kind: "prescriptions",
			patientId: typeof d?.patientId === "string" ? d.patientId : undefined,
		}),
	},
	{
		events: ["dente:open-recalls", "dente:open-recalls-hub"],
		mapToStudio: () => ({ kind: "recalls" }),
	},
	{
		events: ["dente:open-warranty-passport", "dente-open-warranty-passport"],
		mapToStudio: (d) => ({
			kind: "warranty",
			patientId: typeof d?.patientId === "string" ? d.patientId : undefined,
		}),
	},
	{
		events: ["dente:open-consents", "dente-open-consents"],
		mapToStudio: (d) => ({
			kind: "consents",
			patientId: typeof d?.patientId === "string" ? d.patientId : undefined,
			docId: typeof d?.docId === "string" ? d.docId : undefined,
		}),
	},
	{
		events: ["dente:open-ukep", "dente:open-cryptopro"],
		mapToStudio: (d) => ({
			kind: "ukep",
			patientId: typeof d?.patientId === "string" ? d.patientId : undefined,
		}),
	},
	{
		events: [
			"dente:open-insurance", "dente-open-insurance",
			"dente:open-dms", "dente-open-dms",
			"dente:open-dms-letters", "dente-open-dms-letters",
		],
		mapToStudio: () => ({ kind: "dms" }),
	},
	{
		events: ["dente:open-loyalty", "dente-open-loyalty", "dente:open-bonuses"],
		mapToStudio: () => ({ kind: "loyalty" }),
	},
	{
		events: [
			"dente:open-sanpin", "dente:open-autoclave",
			"dente:open-sterilization", "dente:open-sterilization-hub",
			"dente:open-kraft",
		],
		mapToStudio: () => ({ kind: "sanpin", initialTab: "autoclave" }),
	},
	{
		events: ["dente:open-telephony"],
		mapToStudio: () => ({ kind: "telephony" }),
	},
	{
		events: ["dente:open-knowledge-hub", "dente-open-knowledge-hub"],
		mapToStudio: (d) => ({
			kind: "knowledge_base",
			initialTab: typeof d?.tab === "string" ? d.tab : undefined,
		}),
	},
	{
		events: ["dente:open-doctor-payroll", "dente-open-payroll", "dente:open-payroll"],
		mapToStudio: () => ({ kind: "doctor_payroll" }),
	},
	{
		events: ["dente:open-booking", "dente:open-online-booking", "dente:open-public-booking"],
		mapToStudio: () => ({ kind: "public_booking" }),
	},
	{
		events: ["dente:open-copilot", "dente-open-copilot"],
		mapToStudio: (d) => ({
			kind: "copilot",
			initialTab:
				d?.initialTab === "actions" || d?.initialTab === "memory" ? d.initialTab : "dialog",
			patientId: typeof d?.patientId === "string" ? d.patientId : undefined,
		}),
	},
	{
		events: ["dente:open-z-report", "dente:open-shift-close"],
		mapToStudio: () => ({ kind: "shift_close" }),
	},
	{
		events: ["dente:open-shift", "dente-open-shift"],
		mapToStudio: (d) =>
			d?.tab === "closing"
				? { kind: "shift_close" }
				: { kind: "cashbox", mode: "shift" },
	},
];

/**
 * Подписка-мост в одном месте (WorkspaceStudioOverlayHost) для legacy DOM CustomEvents -> typed clinicEventBus.
 */
export function subscribeLegacyStudioEvents(
	onOpenStudio: (studio: WorkspaceOverlayStudio) => void,
	onCloseAll: () => void,
): () => void {
	if (typeof window === "undefined") return () => {};
	const cleanups: Array<() => void> = [];

	for (const mapper of LEGACY_EVENT_MAPPERS) {
		for (const eventName of mapper.events) {
			const listener = (event: Event) => {
				const detail =
					event instanceof CustomEvent && typeof event.detail === "object" && event.detail !== null
						? (event.detail as Record<string, unknown>)
						: null;
				onOpenStudio(mapper.mapToStudio(detail));
			};
			window.addEventListener(eventName, listener);
			cleanups.push(() => window.removeEventListener(eventName, listener));
		}
	}

	const closeListener = () => onCloseAll();
	window.addEventListener("dente:close-modals", closeListener);
	cleanups.push(() => window.removeEventListener("dente:close-modals", closeListener));

	return () => {
		for (const cleanup of cleanups) cleanup();
	};
}
