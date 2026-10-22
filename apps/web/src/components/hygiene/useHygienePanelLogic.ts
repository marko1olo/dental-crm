/**
 * useHygienePanelLogic.ts — Инкапсуляция клинической логики экспресс-расчета гигиенических индексов.
 * (Layer 3 Hook по Mandate 8b, < 180 строк).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	calculateCombinedHygieneReport,
	calculateFedorovVolodkinaScore,
	calculatePhpScore,
	calculateSilnessLoeScore,
	createHealthyHygieneAssessment,
	deriveHygieneFromPerioTeeth,
	type CombinedHygieneReport,
	type ExtendedToothAssessment,
	type HygieneToothAssessment,
	type PerioToothRecord,
} from "@dental/shared";
import { useHygieneOhiSHistory } from "./useHygieneOhiSHistory";
import { useHygieneExpressActions } from "./useHygieneExpressActions";

export type ActiveHygieneIndexTab =
	| "ohi-s"
	| "silness-loe"
	| "fedorov-volodkina"
	| "php";

export interface UseHygienePanelLogicParams {
	readonly perioTeeth?: readonly PerioToothRecord[] | undefined;
	readonly onChange?: ((report: CombinedHygieneReport) => void) | undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly readOnly?: boolean | undefined;
	readonly patientId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly previousOhiS?:
		| { ohi_s: number; debris?: number; calculus?: number; date?: string }
		| number
		| null
		| undefined;
}

export function useHygienePanelLogic({
	perioTeeth,
	onChange,
	onInsertToProtocol,
	readOnly = false,
	patientId,
	visitId,
	doctorName,
	previousOhiS,
}: UseHygienePanelLogicParams) {
	const [assessments, setAssessments] = useState<
		Record<number, ExtendedToothAssessment>
	>(() => {
		if (perioTeeth && perioTeeth.length > 0) {
			const derived = deriveHygieneFromPerioTeeth(perioTeeth);
			const enriched: Record<number, ExtendedToothAssessment> = {};
			for (const [k, v] of Object.entries(derived)) {
				const num = Number(k);
				const d = v.debrisScore ?? 0;
				enriched[num] = {
					...v,
					silnessScore: d,
					fedorovScore: d === 0 ? 1 : Math.min(5, d + 1),
					phpScore: Math.min(5, Math.round(d * 1.67)),
				};
			}
			return enriched;
		}
		const healthy = createHealthyHygieneAssessment();
		const enrichedHealthy: Record<number, ExtendedToothAssessment> = {};
		for (const [k, v] of Object.entries(healthy)) {
			const num = Number(k);
			enrichedHealthy[num] = {
				...valToExtended(v),
				silnessScore: 0,
				fedorovScore: 1,
				phpScore: 0,
			};
		}
		return enrichedHealthy;
	});

	const [activeTab, setActiveTab] = useState<ActiveHygieneIndexTab>("ohi-s");
	const [isBottomSheetOpen, setIsBottomSheetOpen] = useState<boolean>(false);

	const report: CombinedHygieneReport = useMemo(() => {
		return calculateCombinedHygieneReport(assessments);
	}, [assessments]);

	const silnessResult = useMemo(
		() => calculateSilnessLoeScore(assessments),
		[assessments],
	);
	const fedorovResult = useMemo(
		() => calculateFedorovVolodkinaScore(assessments),
		[assessments],
	);
	const phpResult = useMemo(() => calculatePhpScore(assessments), [assessments]);

	const history = useHygieneOhiSHistory(
		patientId,
		previousOhiS,
		report.ohiS.totalScore,
	);

	useEffect(() => {
		if (onChange) {
			onChange(report);
		}
	}, [report, onChange]);

	const updateToothScore = useCallback(
		(
			toothNumber: number,
			field:
				| "debrisScore"
				| "calculusScore"
				| "pmaScore"
				| "kpiScore"
				| "silnessScore"
				| "fedorovScore"
				| "phpScore"
				| "isMissing",
			value: number | boolean,
		) => {
			if (readOnly) return;
			setAssessments((prev) => {
				const current = prev[toothNumber] ?? { toothNumber };
				if (field === "isMissing") {
					return {
						...prev,
						[toothNumber]: { ...current, isMissing: Boolean(value) },
					};
				}
				const numVal = typeof value === "number" ? value : 0;
				let debrisScore = current.debrisScore;
				let calculusScore = current.calculusScore;
				let pmaScore = current.pmaScore;
				let kpiScore = current.kpiScore;
				let silnessScore = current.silnessScore;
				let fedorovScore = current.fedorovScore;
				let phpScore = current.phpScore;

				if (field === "debrisScore") {
					debrisScore = numVal;
					silnessScore = numVal;
					fedorovScore = numVal === 0 ? 1 : Math.min(5, numVal + 1);
					phpScore = Math.min(5, Math.round(numVal * 1.67));
				} else if (field === "calculusScore") {
					calculusScore = numVal;
				} else if (field === "pmaScore") {
					pmaScore = numVal;
				} else if (field === "kpiScore") {
					kpiScore = numVal;
				} else if (field === "silnessScore") {
					silnessScore = numVal;
					debrisScore = numVal;
					fedorovScore = numVal === 0 ? 1 : Math.min(5, numVal + 1);
					phpScore = Math.min(5, Math.round(numVal * 1.67));
				} else if (field === "fedorovScore") {
					fedorovScore = numVal;
					const mappedDebris = numVal === 1 ? 0 : Math.min(3, numVal - 1);
					debrisScore = mappedDebris;
					silnessScore = mappedDebris;
					phpScore = Math.min(5, Math.round(mappedDebris * 1.67));
				} else if (field === "phpScore") {
					phpScore = numVal;
					const mappedDebris =
						numVal === 0 ? 0 : numVal <= 2 ? 1 : numVal <= 4 ? 2 : 3;
					debrisScore = mappedDebris;
					silnessScore = mappedDebris;
					fedorovScore = mappedDebris === 0 ? 1 : mappedDebris + 1;
				}

				return {
					...prev,
					[toothNumber]: {
						...current,
						debrisScore,
						calculusScore,
						pmaScore,
						kpiScore,
						silnessScore,
						fedorovScore,
						phpScore,
					},
				};
			});
		},
		[readOnly],
	);

	const actions = useHygieneExpressActions({
		readOnly,
		report,
		silnessResult,
		fedorovResult,
		phpResult,
		assessments,
		setAssessments,
		perioTeeth,
		onInsertToProtocol,
		visitId,
		doctorName,
	});

	return {
		assessments,
		activeTab,
		setActiveTab,
		isBottomSheetOpen,
		setIsBottomSheetOpen,
		report,
		silnessResult,
		fedorovResult,
		phpResult,
		comparisonText: history.comparisonText,
		previousScoreNum: history.previousScoreNum,
		previousDate: history.previousDate,
		updateToothScore,
		...actions,
	};
}

function valToExtended(item: HygieneToothAssessment): ExtendedToothAssessment {
	return {
		...item,
		silnessScore: item.debrisScore ?? 0,
		fedorovScore:
			(item.debrisScore ?? 0) === 0
				? 1
				: Math.min(5, (item.debrisScore ?? 0) + 1),
		phpScore: Math.min(5, Math.round((item.debrisScore ?? 0) * 1.67)),
	};
}
