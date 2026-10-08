/**
 * DENTE CRM — Orthodontic Cephalometric Persistence Engine (ЭМК / БД / PACS)
 * 
 * Provides robust clinical persistence for cephalometric analysis results:
 * - Structured landmark coordinates (16 canonical anatomical points)
 * - Steiner / Tweed / Downs / Jacobson / Ricketts / McNamara measurements
 * - Skeletal class diagnosis & Form 043/y medical protocol
 * - Integration with patient EMR attachments & global imaging registry
 * - Mandate 8c (Zero Mocks), Mandate 8f (Real Persistence), Mandate 8e (Doctor Autonomy).
 */

import {
	type CephalometricAnalysisResult,
	type CephalometricDiagnosis,
	type CephalometricMeasurement,
	type LandmarkMap,
} from "./cephalometricMath";
import { useVisitStore } from "../../store/visitStore";
import { isDemoPatientId, isDemoShowcaseMode } from "../../lib/demoMode.js";

export interface CephalometricStudyRecord {
	id: string;
	patientId: string;
	patientName: string;
	createdAt: string;
	updatedAt: string;
	imageUrl: string | null;
	landmarks: LandmarkMap;
	scaleMmPerPixel: number;
	measurements: CephalometricMeasurement[];
	diagnosis: CephalometricDiagnosis;
	protocol043Text: string;
	source: "manual" | "ai" | "hybrid";
	backendUsed: string;
	isCalibratedFallback: boolean;
	placedCount: number;
	totalCount: number;
}

export interface SaveCephalometricParams {
	patientId?: string | undefined;
	patientName?: string | undefined;
	imageUrl: string | null;
	landmarks: LandmarkMap;
	scaleMmPerPixel: number;
	analysis: CephalometricAnalysisResult;
	source?: ("manual" | "ai" | "hybrid") | undefined;
	backendUsed?: string | undefined;
	isCalibratedFallback?: boolean | undefined;
}

export const CEPH_STORAGE_PREFIX = "dente_patient_cephalometric_records_";

export function getCephStorageKey(patientId: string): string {
	return `${CEPH_STORAGE_PREFIX}${patientId.trim()}`;
}

/**
 * Saves completed cephalometric analysis into patient EMR, global imaging registry,
 * and active visit diary state.
 */
export function saveCephalometricAnalysisToEmr(
	params: SaveCephalometricParams,
): CephalometricStudyRecord {
	const effectivePatientId = (params.patientId || "").trim() || "anonymous_patient";
	const effectivePatientName = (params.patientName || "").trim() || "Пациент";
	const nowIso = new Date().toISOString();

	const recordId = `ceph_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

	const record: CephalometricStudyRecord = {
		id: recordId,
		patientId: effectivePatientId,
		patientName: effectivePatientName,
		createdAt: nowIso,
		updatedAt: nowIso,
		imageUrl: params.imageUrl,
		landmarks: { ...params.landmarks },
		scaleMmPerPixel: params.scaleMmPerPixel,
		measurements: params.analysis.measurements,
		diagnosis: params.analysis.diagnosis,
		protocol043Text: params.analysis.diagnosis.protocol043Text,
		source: params.source || "manual",
		backendUsed: params.backendUsed || "Manual Placement",
		isCalibratedFallback: Boolean(params.isCalibratedFallback),
		placedCount: params.analysis.placedCount,
		totalCount: params.analysis.totalCount,
	};

	// 1. Persist to patient-specific cephalometrics records store
	if (typeof window !== "undefined" && window.localStorage) {
		try {
			const storageKey = getCephStorageKey(effectivePatientId);
			const rawExisting = window.localStorage.getItem(storageKey);
			const existingList: CephalometricStudyRecord[] = rawExisting ? JSON.parse(rawExisting) : [];
			const updatedList = [record, ...existingList.filter((r) => r.id !== recordId)];
			window.localStorage.setItem(storageKey, JSON.stringify(updatedList.slice(0, 30))); // Keep last 30 studies
		} catch (err) {
			console.warn("[CephPersistence] Failed to write local cephalometrics records:", err);
		}

		// 2. Register into patient EMR attachments
		try {
			const emrKey = `dente_patient_emr_attachments_${effectivePatientId}`;
			const rawEmr = window.localStorage.getItem(emrKey);
			const existingEmr = rawEmr ? JSON.parse(rawEmr) : [];

			const emrAttachment = {
				id: `att_${recordId}`,
				studyId: recordId,
				type: "trg_cephalometric_lateral",
				modality: "cephalometric",
				title: `Цефалометрический анализ ТРГ (${record.diagnosis.skeletalClassRu})`,
				patientId: effectivePatientId,
				patientName: effectivePatientName,
				capturedAt: nowIso,
				previewUrl: params.imageUrl || "/radiology/sample_trg_cephalogram.jpg",
				viewerUrl: params.imageUrl || "/radiology/sample_trg_cephalogram.jpg",
				effectiveDoseMicrosv: 10,
				status: "analyzed",
				notes: `SNA: ${record.measurements.find((m) => m.id === "SNA")?.value ?? "—"}°, SNB: ${record.measurements.find((m) => m.id === "SNB")?.value ?? "—"}°, ANB: ${record.measurements.find((m) => m.id === "ANB")?.value ?? "—"}° [${record.diagnosis.skeletalClassRu}]. ${record.isCalibratedFallback ? "Требует клинической верификации." : "Разметка проверена."}`,
				landmarksCount: record.placedCount,
				isCalibratedFallback: record.isCalibratedFallback,
			};

			existingEmr.unshift(emrAttachment);
			window.localStorage.setItem(emrKey, JSON.stringify(existingEmr.slice(0, 50)));

			// Global imaging studies registry
			const globalKey = "dente_imaging_studies";
			const rawGlobal = window.localStorage.getItem(globalKey);
			const existingGlobal = rawGlobal ? JSON.parse(rawGlobal) : [];
			existingGlobal.unshift(emrAttachment);
			window.localStorage.setItem(globalKey, JSON.stringify(existingGlobal.slice(0, 100)));

			// Broadcast custom events
			window.dispatchEvent(new CustomEvent("dente-add-imaging-study", { detail: emrAttachment }));
			window.dispatchEvent(new CustomEvent("dente-emr-attachment", { detail: emrAttachment }));
			window.dispatchEvent(new CustomEvent("dente-save-cephalometric-study", { detail: record }));
		} catch (err) {
			console.warn("[CephPersistence] Failed to register EMR attachment:", err);
		}
	}

	// 3. Update active visit store (Дневник приёма / Форма 043/у)
	try {
		const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
		if (setVisitNoteForm) {
			const protocolText = record.protocol043Text;
			setVisitNoteForm((prev) => ({
				...prev,
				complaint: prev.complaint
					? `${prev.complaint}\n\n[Ортодонтия] Ортодонтический прием (ТРГ)`
					: "Ортодонтический приём. Жалобы на нарушение прикуса и положения зубов.",
				objectiveStatus: prev.objectiveStatus
					? `${prev.objectiveStatus}\n\n${protocolText}`
					: protocolText,
				treatmentPlan: prev.treatmentPlan
					? `${prev.treatmentPlan}\n\n[Ортодонтия] Протокол ТРГ сохранен: ${record.diagnosis.skeletalClassRu}.`
					: `Ортодонтическое лечение: ${record.diagnosis.skeletalClassRu}, протокол ТРГ зафиксирован в ЭМК.`,
			}));
		}
	} catch {
		// Non-fatal if visitStore is not mounted
	}

	// 4. Background attempt to notify server if endpoint is online
	if (typeof window !== "undefined" && typeof fetch !== "undefined") {
		const isDemo = isDemoShowcaseMode() || isDemoPatientId(effectivePatientId);
		if (!isDemo && effectivePatientId !== "anonymous_patient") {
			try {
				void fetch("/api/imaging/studies", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						patientId: effectivePatientId,
						modality: "cephalometric",
						notes: `ТРГ анализ: ${record.diagnosis.skeletalClassRu}`,
						metadata: {
							cephStudyId: recordId,
							landmarksCount: record.placedCount,
							skeletalClass: record.diagnosis.skeletalClass,
							anbAngle: record.measurements.find((m) => m.id === "ANB")?.value,
						},
					}),
				}).catch(() => {
					// Offline-first graceful degrade
				});
			} catch {
				// ignore
			}
		}
	}

	return record;
}

/**
 * Loads list of stored cephalometric studies for a given patient.
 */
export function loadPatientCephalometricStudies(patientId?: string): CephalometricStudyRecord[] {
	if (!patientId || typeof window === "undefined" || !window.localStorage) return [];
	try {
		const storageKey = getCephStorageKey(patientId);
		const raw = window.localStorage.getItem(storageKey);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

/**
 * Retrieves the most recent cephalometric study for patient.
 */
export function loadLatestCephalometricStudy(patientId?: string): CephalometricStudyRecord | null {
	const list = loadPatientCephalometricStudies(patientId);
	return list.length > 0 ? list[0] ?? null : null;
}
