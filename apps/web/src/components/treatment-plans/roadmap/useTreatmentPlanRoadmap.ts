/**
 * DENTE CRM — Treatment Plan Roadmap Custom Hook
 * (Layer 3: State, Logic & Lifecycle — stages matching, completion status, metrics & tax)
 */

import { useState, useEffect, useMemo } from "react";
import { calculatePlanTaxDeductionBreakdown } from "@dental/shared";
import type { TreatmentPlanRoadmapProps, RoadmapStageData } from "./types.js";
import { buildCanonicalRoadmapStages } from "./buildCanonicalRoadmapStages.js";

export function useTreatmentPlanRoadmap(props: TreatmentPlanRoadmapProps) {
	const {
		tier,
		stages = tier?.stages || [],
		customRoadmapStages,
		planTitle = tier?.title || "Комплексный план стоматологического лечения",
		planNumber = "",
		planId,
		patientId,
		curatingDoctorName = "Лечащий врач",
		patientFullName = "Пациент",
		doctorName,
		patientName,
		displayContractNumber,
	} = props;

	const effectiveDoctorName = doctorName || curatingDoctorName;
	const effectivePatientName = patientName || patientFullName;
	const effectivePlanNumber = displayContractNumber || planNumber;

	const [expandedStageNumbers, setExpandedStageNumbers] = useState<Record<number, boolean>>({
		1: true,
		2: true,
		3: true,
		4: true,
		5: true,
	});

	const [paidStageNumbers, setPaidStageNumbers] = useState<Set<number>>(new Set());

	useEffect(() => {
		const handleEvent = (e: Event) => {
			const detail = (e as CustomEvent)?.detail;
			if (detail?.stageNumber) {
				setPaidStageNumbers((prev) => new Set(prev).add(Number(detail.stageNumber)));
			}
		};
		window.addEventListener("dente-treatment-plans-reload", handleEvent);
		window.addEventListener("dente-payment-completed", handleEvent);
		return () => {
			window.removeEventListener("dente-treatment-plans-reload", handleEvent);
			window.removeEventListener("dente-payment-completed", handleEvent);
		};
	}, []);

	const toggleStage = (stageNum: number) => {
		setExpandedStageNumbers((prev) => ({ ...prev, [stageNum]: !prev[stageNum] }));
	};

	const roadmapStages: RoadmapStageData[] = useMemo(
		() => buildCanonicalRoadmapStages(stages, customRoadmapStages, paidStageNumbers),
		[customRoadmapStages, stages, paidStageNumbers],
	);

	const { grandTotalKopecks, completedTotalKopecks, remainingTotalKopecks, progressPercent } = useMemo(() => {
		const totalKop = roadmapStages.reduce((sum, s) => sum + s.totalKopecks, 0);
		const compKop = roadmapStages.reduce((sum, s) => sum + s.completedKopecks, 0);
		const remKop = Math.max(0, totalKop - compKop);
		const pct = totalKop > 0 ? Math.min(100, Math.round((compKop / totalKop) * 100)) : 0;
		return { grandTotalKopecks: totalKop, completedTotalKopecks: compKop, remainingTotalKopecks: remKop, progressPercent: pct };
	}, [roadmapStages]);

	const taxBreakdown = useMemo(() => {
		const allProcs = roadmapStages.flatMap((s) => s.procedures);
		const taxItems = allProcs.map((p) => ({
			id: p.id,
			code804n: p.code804n,
			name: p.medicalTitleRu,
			serviceName: p.medicalTitleRu,
			taxCode: p.categoryCode,
			priceRub: p.priceRub,
			priceKopecks: p.priceKopecks,
			quantity: p.quantity,
		}));
		return calculatePlanTaxDeductionBreakdown(taxItems);
	}, [roadmapStages]);

	return {
		effectiveDoctorName,
		effectivePatientName,
		effectivePlanNumber,
		expandedStageNumbers,
		paidStageNumbers,
		toggleStage,
		roadmapStages,
		grandTotalKopecks,
		completedTotalKopecks,
		remainingTotalKopecks,
		progressPercent,
		taxBreakdown,
	};
}
