import { useCallback, useEffect, useMemo, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import {
	createHealthySomaticNormProfile,
	DEFAULT_SOMATIC_HEALTHY_NORM,
	evaluatePatientSafetyFlags,
	type PatientClinicalSafetyProfile,
} from "../../patients/safetyMath";
import type { PatientGeneralInfo } from "../../patients/tabs/PatientGeneralInfoTab";
import type { PatientDetailsModalProps, PatientDetailsTab } from "./patientDetailsTypes";

export function usePatientDetailsLogic(props: PatientDetailsModalProps) {
	const { isOpen, onClose, patient: initPatient, patientId: expId, initialTab = "general", safetyProfile: initSafety, onSave, onApplySomaticNorm } = props;
	const [activeTab, setActiveTab] = useState<PatientDetailsTab>(initialTab);
	const [isSaving, setIsSaving] = useState(false);
	// biome-ignore lint/suspicious/noExplicitAny: family payload
	const [familyData, setFamilyData] = useState<any | null>(null);

	const [patientData, setPatientData] = useState<PatientGeneralInfo>(() => ({
		id: initPatient?.id || expId || undefined,
		fullName: initPatient?.fullName || "",
		phone: initPatient?.phone || "",
		birthDate: initPatient?.birthDate || "",
		gender: initPatient?.gender || "other",
		address: initPatient?.address || "",
		notes: initPatient?.notes || "",
		medicalCardNumber: initPatient?.medicalCardNumber || "",
		patientBalanceRub: initPatient?.patientBalanceRub ?? 0,
	}));

	const [safety, setSafety] = useState<PatientClinicalSafetyProfile>(() => ({
		...DEFAULT_SOMATIC_HEALTHY_NORM,
		...initSafety,
	}));

	const effectivePatientId = patientData.id || expId || initPatient?.id || null;

	useEffect(() => {
		if (initPatient) setPatientData((p) => ({ ...p, ...initPatient, id: initPatient.id || p.id }));
	}, [initPatient]);
	useEffect(() => {
		if (initSafety) setSafety((p) => ({ ...p, ...initSafety }));
	}, [initSafety]);
	useEffect(() => {
		if (initialTab) setActiveTab(initialTab);
	}, [initialTab]);

	const loadFamily = useCallback(async () => {
		if (!effectivePatientId) return;
		try {
			const res = await fetch(`/api/finance/family/patient/${effectivePatientId}`, { headers: denteAdminSecretRequestHeaders() });
			setFamilyData(res.ok ? await res.json() : null);
		} catch { setFamilyData(null); }
	}, [effectivePatientId]);

	useEffect(() => {
		if (isOpen && effectivePatientId) loadFamily();
	}, [isOpen, effectivePatientId, loadFamily]);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape" && isOpen) onClose(); };
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isOpen, onClose]);

	const safetyEvaluation = useMemo(() => evaluatePatientSafetyFlags(safety), [safety]);

	const handleApplyNorm = useCallback(() => {
		setSafety(createHealthySomaticNormProfile());
		onApplySomaticNorm?.();
		showToast("✓ Применена физиологическая норма: соматически здоров", "success");
	}, [onApplySomaticNorm]);

	const handleUpdateField = useCallback((field: keyof PatientGeneralInfo, val: unknown) => {
		setPatientData((p) => ({ ...p, [field]: val }));
	}, []);

	const handleSave = useCallback(async () => {
		setIsSaving(true);
		try {
			const payload: PatientGeneralInfo = { ...patientData, fullName: patientData.fullName?.trim() || "Пациент без ФИО" };
			if (payload.id) {
				await fetch(`/api/patients/${payload.id}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
					body: JSON.stringify({ fullName: payload.fullName, phone: payload.phone || undefined, birthDate: payload.birthDate || undefined, gender: payload.gender || undefined, address: payload.address || undefined, notes: payload.notes || undefined }),
				}).catch((err) => logger.warn("Server patient update warning", err));
			}
			onSave?.(payload, safety);
			showToast("Карта пациента успешно сохранена", "success");
			onClose();
		} catch (err) {
			logger.error("Save patient error", err);
			showToast("Не удалось сохранить карту", "error");
		} finally { setIsSaving(false); }
	}, [patientData, safety, onSave, onClose]);

	const handlePrint = useCallback(() => { if (typeof window !== "undefined") window.print(); }, []);

	return { activeTab, setActiveTab, isSaving, patientData, safety, setSafety, familyData, effectivePatientId, safetyEvaluation, loadFamily, handleApplyNorm, handleUpdateField, handleSave, handlePrint };
}
