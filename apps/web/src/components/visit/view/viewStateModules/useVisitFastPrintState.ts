/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Visit Fast Print & Clinical Status Badges Hook
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Подготовка данных для быстрой печати дневника 043/у, информированного согласия (ИДС),
 * акта оказанных услуг, сметы лечения, а также соматические бейджи и норма в 1 клик.
 */

import { useMemo, useCallback } from "react";
import { showToast } from "../../../GlobalToast";
import { calculateActivePatientCriticalBadges } from "../visitCriticalBadges";
import { executeApplySomaticNormAutonomy } from "../visitViewAutonomyActions";
import {
	executeFastPrint043u,
	executeFastPrintInformedConsent,
	executeFastPrintCompletedAct,
	executeFastPrintTreatmentPlanEstimate,
} from "../visitFastPrint";
import type { VisitViewProps } from "../types";

export interface UseVisitFastPrintStateParams {
	activePatient: VisitViewProps["activePatient"];
	activeDoctor: VisitViewProps["activeDoctor"];
	activeAppointment: VisitViewProps["activeAppointment"];
	visitNoteForm: VisitViewProps["visitNoteForm"];
	dashboard: VisitViewProps["dashboard"];
	toothStateByCode: VisitViewProps["toothStateByCode"];
	selectedToothForMenu: any;
	updateVisitNoteField: VisitViewProps["updateVisitNoteField"];
}

export function useVisitFastPrintState({
	activePatient,
	activeDoctor,
	activeAppointment,
	visitNoteForm,
	dashboard,
	toothStateByCode,
	selectedToothForMenu,
	updateVisitNoteField,
}: UseVisitFastPrintStateParams) {
	const patientAge = useMemo(() => {
		if (!activePatient?.birthDate) return null;
		const diff = Date.now() - new Date(activePatient.birthDate).getTime();
		const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
		return `${years} лет`;
	}, [activePatient?.birthDate]);

	// Tier 1 Critical Badges & Autonomy (Mandates 8e, 8i, 8y)
	const activePatientCriticalBadges = useMemo(() => {
		return calculateActivePatientCriticalBadges(activePatient, visitNoteForm?.anamnesis);
	}, [activePatient, visitNoteForm?.anamnesis]);

	// Единая консолидированная плашка аллергии без тройного дублирования
	const consolidatedAllergyChip = useMemo(() => {
		if (!activePatientCriticalBadges || activePatientCriticalBadges.length === 0) return null;
		const rawAllergies = activePatient?.allergies;
		const allergyStr = Array.isArray(rawAllergies) ? rawAllergies.join(", ") : String(rawAllergies || "");
		const parts: string[] = [];
		if (allergyStr.trim() && !allergyStr.toLowerCase().includes("не выявлен") && !allergyStr.toLowerCase().includes("нет аллерг")) {
			const cleaned = allergyStr
				.trim()
				.replace(/^аллерги[яи][: \t-]*/i, "")
				.replace(/^на\s+/i, "")
				.replace(/\s*\([^)]*\)/g, "")
				.trim();
			if (cleaned) parts.push(cleaned.charAt(0).toUpperCase() + cleaned.slice(1));
		}
		for (const b of activePatientCriticalBadges) {
			if (b.id !== "allergy") {
				const short = b.shortLabel ? b.shortLabel.replace(/[\u26a0\ufe0f!]/gu, "").trim() : "";
				if (short && !parts.some((p) => p.toLowerCase().includes(short.toLowerCase()))) {
					const isAcronym = /^(АГ|ССЗ|ЭКС|СД|НПВП)/i.test(short);
					const formatted = isAcronym
						? short.toUpperCase()
						: short.charAt(0).toUpperCase() + short.slice(1).toLowerCase();
					parts.push(formatted);
				}
			}
		}
		const detail = parts.length > 0 ? parts.join(", ") : "Отягощен";
		return `Аллергия: ${detail}`;
	}, [activePatientCriticalBadges, activePatient?.allergies]);

	const handleApplySomaticNormQuick = useCallback(() => {
		return executeApplySomaticNormAutonomy({
			updateVisitNoteField,
			visitNoteForm,
			showToastFn: showToast,
			activePatient,
		});
	}, [updateVisitNoteField, visitNoteForm, activePatient]);

	// Dynamic treatment plan age & soft expiration calculation
	const activePlan = useMemo(() => {
		const scenarios = dashboard?.treatmentPlanScenarios || [];
		const patientScenarios = scenarios.filter((s) => s.patientId === activePatient?.id);
		if (patientScenarios.length > 0) return patientScenarios[0];
		const items = dashboard?.treatmentPlanItems || [];
		const patientItems = items.filter((i) => i.patientId === activePatient?.id);
		if (patientItems.length > 0) return patientItems[0];
		return null;
	}, [dashboard?.treatmentPlanScenarios, dashboard?.treatmentPlanItems, activePatient?.id]);

	const treatmentPlanAgeDays = useMemo(() => {
		if (!activePlan) return 0;
		const rawDate =
			("createdAt" in activePlan ? activePlan.createdAt : undefined) ||
			("plannedAt" in (activePlan as Record<string, unknown>)
				? String((activePlan as Record<string, unknown>).plannedAt)
				: undefined) ||
			("completedAt" in activePlan ? activePlan.completedAt : undefined) ||
			undefined;
		if (!rawDate) return 0;
		const createdTime = new Date(String(rawDate)).getTime();
		if (Number.isNaN(createdTime)) return 0;
		return Math.max(0, Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24)));
	}, [activePlan]);

	const isTreatmentPlanExpiredSoft = activePlan !== null && treatmentPlanAgeDays > 30;

	const handlePrintForm043uFast = useCallback(() => {
		const isClosed =
			activeAppointment?.status === "completed" ||
			activeAppointment?.status === "signed" ||
			activeAppointment?.status === "closed" ||
			visitNoteForm?.status === "completed" ||
			visitNoteForm?.status === "signed";
		const watermarkText = isClosed ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК";
		executeFastPrint043u({
			activePatient,
			activeDoctor,
			activeAppointment,
			visitNoteForm,
			isClosed,
			watermarkText,
			dashboard,
			teethFormula: toothStateByCode,
			selectedToothForMenu,
		});
	}, [activeAppointment, activeDoctor, activePatient, dashboard, selectedToothForMenu, toothStateByCode, visitNoteForm]);

	const handlePrintInformedConsentFast = useCallback(() => {
		executeFastPrintInformedConsent({
			activePatient,
			activeDoctor,
			activeAppointment,
			visitNoteForm,
			dashboard,
			selectedToothForMenu,
		});
	}, [activeAppointment, activeDoctor, activePatient, dashboard, selectedToothForMenu, visitNoteForm]);

	const handlePrintCompletedActFast = useCallback(() => {
		const isClosed =
			activeAppointment?.status === "completed" ||
			activeAppointment?.status === "signed" ||
			activeAppointment?.status === "closed" ||
			visitNoteForm?.status === "completed" ||
			visitNoteForm?.status === "signed";
		executeFastPrintCompletedAct({
			activePatient,
			activeDoctor,
			activeAppointment,
			visitNoteForm,
			dashboard,
			activePlan,
			isClosed,
		});
	}, [activeAppointment, activeDoctor, activePatient, activePlan, dashboard, visitNoteForm]);

	const handlePrintEstimateFast = useCallback(() => {
		executeFastPrintTreatmentPlanEstimate({
			activePatient,
			activeDoctor,
			activeAppointment,
			dashboard,
			activePlan,
		});
	}, [activeAppointment, activeDoctor, activePatient, activePlan, dashboard]);

	return {
		patientAge,
		activePatientCriticalBadges,
		consolidatedAllergyChip,
		handleApplySomaticNormQuick,
		activePlan,
		treatmentPlanAgeDays,
		isTreatmentPlanExpiredSoft,
		handlePrintForm043uFast,
		handlePrintInformedConsentFast,
		handlePrintCompletedActFast,
		handlePrintEstimateFast,
	};
}
