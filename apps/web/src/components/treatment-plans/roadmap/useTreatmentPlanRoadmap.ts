/**
 * DENTE CRM — Treatment Plan Roadmap Custom Hook
 * (Layer 3: State, Logic & Lifecycle — stages matching, completion status, metrics & tax)
 */

import { useState, useEffect, useMemo } from "react";
import {
	calculatePlanTaxDeductionBreakdown,
	kopecksToRub,
} from "@dental/shared";
import { formatFdiToothName } from "../../portal/patientPortalEngine.js";
import type {
	TreatmentPlanRoadmapProps,
	RoadmapStageData,
	RoadmapStageKind,
	RoadmapProcedureItem,
} from "./types.js";
import {
	translate804nToPatientDescription,
	CANONICAL_ROADMAP_META,
} from "./roadmapPriceHelpers.js";

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
		const handlePlanReload = (e: Event) => {
			const detail = (e as CustomEvent)?.detail;
			if (detail?.stageNumber) {
				setPaidStageNumbers((prev) => new Set(prev).add(Number(detail.stageNumber)));
			}
		};
		const handlePaymentCompleted = (e: Event) => {
			const detail = (e as CustomEvent)?.detail;
			if (detail?.stageNumber) {
				setPaidStageNumbers((prev) => new Set(prev).add(Number(detail.stageNumber)));
			}
		};
		window.addEventListener("dente-treatment-plans-reload", handlePlanReload);
		window.addEventListener("dente-payment-completed", handlePaymentCompleted);
		return () => {
			window.removeEventListener("dente-treatment-plans-reload", handlePlanReload);
			window.removeEventListener("dente-payment-completed", handlePaymentCompleted);
		};
	}, []);

	const toggleStage = (stageNum: number) => {
		setExpandedStageNumbers((prev) => ({ ...prev, [stageNum]: !prev[stageNum] }));
	};

	// Construct 5 Canonical Stages from input data
	const roadmapStages: RoadmapStageData[] = useMemo(() => {
		if (customRoadmapStages && customRoadmapStages.length > 0) {
			return customRoadmapStages.map((st) => {
				const isPaid = st.status === "completed" || Boolean(st.isFullyPaid) || paidStageNumbers.has(st.stageNumber);
				if (isPaid) {
					return {
						...st,
						status: "completed" as const,
						isFullyPaid: true,
						remainingRub: 0,
						remainingKopecks: 0,
						completedKopecks: st.totalKopecks,
						completedRub: st.totalRub,
					};
				}
				return st;
			});
		}

		// Build from standard TreatmentPlanStage[]
		const allItems = stages.flatMap((s) => s.items || []);

		// Buckets for each of the 5 canonical stages
		const stageBuckets: Record<RoadmapStageKind, RoadmapProcedureItem[]> = {
			stage_1_emergency: [],
			stage_2_therapy: [],
			stage_3_surgery: [],
			stage_4_orthopedics: [],
			stage_5_hygiene_checkup: [],
		};

		// Teeth map per stage
		const stageTeethMap: Record<RoadmapStageKind, Set<string>> = {
			stage_1_emergency: new Set(),
			stage_2_therapy: new Set(),
			stage_3_surgery: new Set(),
			stage_4_orthopedics: new Set(),
			stage_5_hygiene_checkup: new Set(),
		};

		for (const it of allItems) {
			const { friendlyTitle, categoryCode, stageKind } = translate804nToPatientDescription(
				it.code804n,
				it.name,
			);

			const toothStr = it.toothNumber ? String(it.toothNumber) : undefined;
			if (toothStr) {
				stageTeethMap[stageKind].add(toothStr);
			}

			const priceKop =
				typeof (it as unknown as { priceKopecks?: number }).priceKopecks === "number"
					? Math.round((it as unknown as { priceKopecks: number }).priceKopecks)
					: Math.round((it.priceRub || 0) * 100);

			stageBuckets[stageKind].push({
				id: it.id,
				code804n: it.code804n,
				medicalTitleRu: it.name,
				patientFriendlyTitleRu: friendlyTitle,
				toothNumber: it.toothNumber,
				toothFdi: toothStr ? formatFdiToothName(toothStr) : undefined,
				priceRub: it.priceRub || 0,
				priceKopecks: priceKop,
				quantity: it.quantity || 1,
				isCompleted: Boolean(
					(it as unknown as { isCompleted?: boolean }).isCompleted ||
					(it as unknown as { status?: string }).status === "completed" ||
					(it as unknown as { planStatus?: string }).planStatus === "completed",
				),
				categoryCode,
			});
		}

		const stageKindsOrder: RoadmapStageKind[] = [
			"stage_1_emergency",
			"stage_2_therapy",
			"stage_3_surgery",
			"stage_4_orthopedics",
			"stage_5_hygiene_checkup",
		];

		return stageKindsOrder.map((kind) => {
			const meta = CANONICAL_ROADMAP_META[kind];
			const procs = stageBuckets[kind];
			const totalKop = procs.reduce((sum, p) => sum + p.priceKopecks * p.quantity, 0);
			const completedKop = procs
				.filter((p) => p.isCompleted)
				.reduce((sum, p) => sum + p.priceKopecks * p.quantity, 0);

			let status: "completed" | "in_progress" | "planned" = "planned";
			if (procs.length > 0 && procs.every((p) => p.isCompleted)) {
				status = "completed";
			} else if (totalKop > 0 && completedKop >= totalKop) {
				status = "completed";
			} else if (completedKop > 0 || procs.some((p) => p.isCompleted)) {
				status = "in_progress";
			}

			// Проверяем статус в исходных stages плана
			const matchingInputStage = stages.find(
				(s) =>
					(s.stageKind as string) === (kind as string) ||
					s.stageNumber === meta.stageNumber,
			);
			const isFullyPaid =
				matchingInputStage?.status === "completed" ||
				Boolean((matchingInputStage as { isFullyPaid?: boolean })?.isFullyPaid) ||
				paidStageNumbers.has(meta.stageNumber);

			if (isFullyPaid) {
				status = "completed";
			}

			const remainingKop = status === "completed" ? 0 : Math.max(0, totalKop - completedKop);
			const effectiveCompletedKop = status === "completed" ? totalKop : completedKop;

			// Estimated visits: at least 1 visit per 3 procedures or 1
			const estimatedVisits = Math.max(1, Math.ceil(procs.length / 2));

			return {
				stageNumber: meta.stageNumber,
				stageKind: kind,
				titleRu: meta.titleRu,
				subtitleRu: meta.subtitleRu,
				patientGoalRu: meta.patientGoalRu,
				timelineRu: meta.timelineRu,
				preparationRu: meta.preparationRu,
				warrantyRu: meta.warrantyRu,
				status,
				teethFdiList: Array.from(stageTeethMap[kind]),
				procedures: procs,
				totalRub: kopecksToRub(totalKop),
				totalKopecks: totalKop,
				completedRub: kopecksToRub(effectiveCompletedKop),
				completedKopecks: effectiveCompletedKop,
				remainingRub: kopecksToRub(remainingKop),
				remainingKopecks: remainingKop,
				estimatedVisitsCount: estimatedVisits,
				isFullyPaid: status === "completed",
			};
		});
	}, [customRoadmapStages, stages, paidStageNumbers]);

	// Global Metrics
	const { grandTotalKopecks, completedTotalKopecks, remainingTotalKopecks, progressPercent } = useMemo(() => {
		const totalKop = roadmapStages.reduce((sum, s) => sum + s.totalKopecks, 0);
		const compKop = roadmapStages.reduce((sum, s) => sum + s.completedKopecks, 0);
		const remKop = Math.max(0, totalKop - compKop);
		const pct = totalKop > 0 ? Math.min(100, Math.round((compKop / totalKop) * 100)) : 0;

		return {
			grandTotalKopecks: totalKop,
			completedTotalKopecks: compKop,
			remainingTotalKopecks: remKop,
			progressPercent: pct,
		};
	}, [roadmapStages]);

	// 13% Tax Deduction Calculation via @dental/shared
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
