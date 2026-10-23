/**
 * useDmsGuaranteeLetterState.ts — Хук управления состоянием гарантийного письма ДМС
 * (Мандат 8b: <= 120 строк)
 */

import { useMemo } from "react";
import { showToast } from "../../GlobalToast.js";
import { RUSSIAN_DMS_INSURERS } from "../insuranceMath.js";
import { buildCurrentLetter, persistAndDispatchLetter } from "./letterPersistence.js";
import type { DmsGuaranteeLetterModalProps, ExpressDmsGuaranteePreset, SplitEngineGuaranteeLetter } from "./types.js";
import { useLetterFieldsState } from "./useLetterFieldsState.js";
import { useLetterHydration } from "./useLetterHydration.js";

export function useDmsGuaranteeLetterState({
	isOpen, onClose, patient, initialLetter, onSave,
}: Pick<DmsGuaranteeLetterModalProps, "isOpen" | "onClose" | "patient" | "initialLetter" | "onSave">) {
	const safeInitialLetter = initialLetter ?? undefined;
	const f = useLetterFieldsState(patient, safeInitialLetter);
	useLetterHydration(isOpen, patient, safeInitialLetter, f);

	const activeInsurer = useMemo(() => RUSSIAN_DMS_INSURERS.find((i) => i.key === f.insurerKey), [f.insurerKey]);
	const insurerDisplayName = f.insurerKey === "custom" ? f.customInsurerName || "Страховая компания" : activeInsurer?.shortName || "Страховая компания";
	const remainingLimitRub = Math.max(0, f.maxCoverageRub - f.usedAmountRub);
	const usagePercent = f.maxCoverageRub > 0 ? Math.min(100, Math.round((f.usedAmountRub / f.maxCoverageRub) * 100)) : 0;

	const letterForSplit: SplitEngineGuaranteeLetter = useMemo(() => ({
		id: initialLetter?.id || "preview-letter", patientId: patient?.id || "preview-patient",
		patientFullName: patient?.fullName || "Пациент ДМС", insurerId: f.insurerKey, insurerName: insurerDisplayName,
		letterNumber: f.letterNumber || "ГП-ПРЕВЬЮ", policyNumber: f.policyNumber || "ПОЛИС",
		issueDate: f.issueDate, validFrom: f.validFrom, validUntil: f.validUntil,
		maxCoverageKopecks: Math.round(f.maxCoverageRub * 100), usedAmountKopecks: Math.round(f.usedAmountRub * 100),
		franchisePercent: f.franchiseType === "percent" ? f.franchisePct : 0,
		franchiseFixedKopecks: f.franchiseType === "fixed_rub" ? Math.round(f.franchiseFixedRub * 100) : 0,
		approvedTeethFdi: f.approvedTeethFdi, approvedServiceCodes804n: f.approvedServiceCodes,
		programExclusions: f.selectedExclusions, notes: f.notes, status: f.status,
	}), [initialLetter?.id, patient?.id, patient?.fullName, f, insurerDisplayName]);

	const toggleExclusion = (k: string) => f.setSelectedExclusions((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
	const toggleApprovedService = (c: string) => f.setApprovedServiceCodes((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
	const toggleDiagnosis = (c: string) => f.setApprovedDiagnosisCodes((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
	const toggleApprovedTooth = (t: string) => f.setApprovedTeethFdi((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

	const handleActivateEmergencyPainMode = () => {
		f.setIsEmergencyCare(true);
		if (!f.letterNumber.trim() || f.letterNumber.startsWith("ГП-")) f.setLetterNumber("ГП-ЭКСТРЕННО-ОСТРАЯ-БОЛЬ");
		if (!f.policyNumber.trim()) f.setPolicyNumber(patient?.policyNumber || "ПОЛИС-ДМС-ОСТРАЯ-БОЛЬ");
		f.setMaxCoverageRub((p) => (p < 35000 ? 50000 : p)); f.setStatus("active");
		f.setApprovedServiceCodes((p) => Array.from(new Set([...p, "A16.07.030.001", "A11.07.010", "A16.07.011", "A16.07.008.001", "A16.07.002.001", "B01.003.004.001"])));
		f.setApprovedDiagnosisCodes((p) => Array.from(new Set([...p, "K04.0", "K04.4"])));
		f.setNotes("Экстренный приём / Гарантия в пути (лечение начато без ожидания письма, устное подтверждение куратора).");
		showToast("Экстренный приём / Гарантия в пути: приём разблокирован!", "success");
	};

	const handleApplyExpressPreset = (preset: ExpressDmsGuaranteePreset) => {
		f.setInsurerKey(preset.insurerKey); f.setCustomInsurerName(preset.insurerNameRu);
		f.setMaxCoverageRub(preset.maxCoverageRub); f.setFranchisePct(preset.franchisePct); f.setFranchiseType("percent");
		f.setApprovedServiceCodes([...preset.approvedServiceCodes804n]); f.setApprovedDiagnosisCodes([...preset.approvedDiagnosisMkb10]);
		f.setNotes(preset.noteRu);
		const pfx = { sogaz: "СОГАЗ-ГП", ingosstrakh: "ИНГОС-ГП", alfastrakhovanie: "АЛЬФА-ГП", reso_garantiya: "РЕСО-ГП" }[preset.insurerKey] ?? "ГП";
		f.setLetterNumber(`${pfx}-${new Date().getFullYear()}-ПРЕСЕТ`);
		showToast(`Экспресс-шаблон «${preset.labelRu}» применен в 1 клик`, "info");
	};

	const saveLetter = async (overrideStatus?: string) => {
		const letter = buildCurrentLetter(f, patient, safeInitialLetter, overrideStatus as any);
		const saved = await persistAndDispatchLetter(letter, patient, initialLetter?.id);
		if (onSave) onSave(saved);
		return saved;
	};

	const handleSave = async () => {
		const l = await saveLetter();
		showToast(f.isEmergencyCare ? `Согласование по острой боли № ${l.letterNumber} сохранено` : `Письмо № ${l.letterNumber} сохранено`, "success");
		onClose();
	};

	const handleAttachToCurrentVisit = async () => {
		const l = await saveLetter();
		showToast(`Письмо № ${l.letterNumber} привязано к визиту`, "success");
		onClose();
	};

	const handleSendPreAuthRequest = async () => {
		f.setStatus("pending_approval");
		const l = await saveLetter("pending_approval");
		showToast(`Запрос (${l.approvedServiceCodes.length} усл.) отправлен куратору ${l.insurerName}`, "info");
	};

	return {
		...f, activeInsurer, insurerDisplayName, remainingLimitRub, usagePercent, letterForSplit,
		toggleExclusion, toggleApprovedService, toggleDiagnosis, toggleApprovedTooth,
		handleActivateEmergencyPainMode, handleApplyExpressPreset,
		handleSave, handleAttachToCurrentVisit, handleSendPreAuthRequest,
	};
}
