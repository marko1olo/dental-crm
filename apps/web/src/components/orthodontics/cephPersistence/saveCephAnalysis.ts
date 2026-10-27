import { useVisitStore } from "../../../store/visitStore";
import { isDemoPatientId, isDemoShowcaseMode } from "../../../lib/demoMode.js";
import { getCephStorageKey, type CephalometricStudyRecord, type SaveCephalometricParams } from "./types";

export function saveCephalometricAnalysisToEmr(params: SaveCephalometricParams): CephalometricStudyRecord {
	const effectivePatientId = (params.patientId || "").trim() || "anonymous_patient";
	const effectivePatientName = (params.patientName || "").trim() || "Пациент";
	const nowIso = new Date().toISOString();
	const recordId = `ceph_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

	const record: CephalometricStudyRecord = {
		id: recordId, patientId: effectivePatientId, patientName: effectivePatientName,
		createdAt: nowIso, updatedAt: nowIso, imageUrl: params.imageUrl, landmarks: { ...params.landmarks },
		scaleMmPerPixel: params.scaleMmPerPixel, measurements: params.analysis.measurements,
		diagnosis: params.analysis.diagnosis, protocol043Text: params.analysis.diagnosis.protocol043Text,
		source: params.source || "manual", backendUsed: params.backendUsed || "Manual Placement",
		isCalibratedFallback: Boolean(params.isCalibratedFallback), placedCount: params.analysis.placedCount,
		totalCount: params.analysis.totalCount,
	};

	if (typeof window !== "undefined" && window.localStorage) {
		try {
			const storageKey = getCephStorageKey(effectivePatientId);
			const rawExisting = window.localStorage.getItem(storageKey);
			const existingList: CephalometricStudyRecord[] = rawExisting ? JSON.parse(rawExisting) : [];
			window.localStorage.setItem(storageKey, JSON.stringify([record, ...existingList.filter((r) => r.id !== recordId)].slice(0, 30)));
		} catch (err) {
			console.warn("[CephPersistence] Failed local write:", err);
		}

		try {
			const emrKey = `dente_patient_emr_attachments_${effectivePatientId}`;
			const rawEmr = window.localStorage.getItem(emrKey);
			const existingEmr = rawEmr ? JSON.parse(rawEmr) : [];
			const emrAttachment = {
				id: `att_${recordId}`, studyId: recordId, type: "trg_cephalometric_lateral",
				modality: "cephalometric", title: `Цефалометрический анализ ТРГ (${record.diagnosis.skeletalClassRu})`,
				patientId: effectivePatientId, patientName: effectivePatientName, capturedAt: nowIso,
				previewUrl: params.imageUrl || "/radiology/sample_trg_cephalogram.jpg",
				viewerUrl: params.imageUrl || "/radiology/sample_trg_cephalogram.jpg",
				effectiveDoseMicrosv: 10, status: "analyzed",
				notes: `SNA: ${record.measurements.find((m) => m.id === "SNA")?.value ?? "—"}°, SNB: ${record.measurements.find((m) => m.id === "SNB")?.value ?? "—"}° [${record.diagnosis.skeletalClassRu}].`,
				landmarksCount: record.placedCount, isCalibratedFallback: record.isCalibratedFallback,
			};
			existingEmr.unshift(emrAttachment);
			window.localStorage.setItem(emrKey, JSON.stringify(existingEmr.slice(0, 50)));

			window.dispatchEvent(new CustomEvent("dente-add-imaging-study", { detail: emrAttachment }));
			window.dispatchEvent(new CustomEvent("dente-emr-attachment", { detail: emrAttachment }));
			window.dispatchEvent(new CustomEvent("dente-save-cephalometric-study", { detail: record }));
		} catch (err) {
			console.warn("[CephPersistence] Failed EMR attachment:", err);
		}
	}

	try {
		const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
		if (setVisitNoteForm) {
			const protocolText = record.protocol043Text;
			setVisitNoteForm((prev) => ({
				...prev,
				complaint: prev.complaint ? `${prev.complaint}\n\n[Ортодонтия] Ортодонтический прием (ТРГ)` : "Ортодонтический приём. Жалобы на нарушение прикуса.",
				objectiveStatus: prev.objectiveStatus ? `${prev.objectiveStatus}\n\n${protocolText}` : protocolText,
				treatmentPlan: prev.treatmentPlan ? `${prev.treatmentPlan}\n\n[Ортодонтия] ТРГ: ${record.diagnosis.skeletalClassRu}.` : `Ортодонтическое лечение: ${record.diagnosis.skeletalClassRu}.`,
			}));
		}
	} catch {
		// Non-fatal if visitStore is not mounted
	}

	if (typeof window !== "undefined" && typeof fetch !== "undefined") {
		const isDemo = isDemoShowcaseMode() || isDemoPatientId(effectivePatientId);
		if (!isDemo && effectivePatientId !== "anonymous_patient") {
			try {
				void fetch("/api/imaging/studies", {
					method: "POST", headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						patientId: effectivePatientId, modality: "cephalometric",
						notes: `ТРГ анализ: ${record.diagnosis.skeletalClassRu}`,
						metadata: {
							cephStudyId: recordId, landmarksCount: record.placedCount,
							skeletalClass: record.diagnosis.skeletalClass,
							anbAngle: record.measurements.find((m) => m.id === "ANB")?.value,
						},
					}),
				}).catch(() => {});
			} catch {}
		}
	}

	return record;
}
