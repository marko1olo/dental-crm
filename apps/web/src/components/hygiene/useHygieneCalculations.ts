/**
 * @dental/web/components/hygiene/useHygieneCalculations.ts
 *
 * Клинический хук расчета стоматологических индексов:
 * - OHI-S Грина-Вермиллиона
 * - Федорова-Володкиной (дети)
 * - PMA Парма (гингивит)
 * - Silness-Löe (налет)
 */

import { useState, useMemo, useCallback } from "react";
import {
	calculateFedorovVolodkinaScore,
	calculatePmaScore,
} from "@dental/shared";
import {
	createIdealOhiSTeethScores,
	computeCanonicalOhiS,
} from "./hygieneCatalogData";
import {
	SILNESS_LOE_TEETH,
	type SilnessSurface,
} from "./HygieneSilnessLoeTab";
import {
	FEDOROV_TEETH,
	PMA_INDEX_TEETH,
} from "./HygienePediatricAndPmaTabs";

export function useHygieneCalculations() {
	// OHI-S состояние (6 канонических зубов)
	const [ohisTeeth, setOhisTeeth] = useState<Record<number, { debris: number; calculus: number }>>(createIdealOhiSTeethScores);
	const ohisResult = useMemo(() => computeCanonicalOhiS(ohisTeeth), [ohisTeeth]);

	// Федорова-Володкиной (6 нижних фронтальных зубов 43..33)
	const [fedorovScores, setFedorovScores] = useState<Record<number, number>>({
		43: 1, 42: 1, 41: 1, 31: 1, 32: 1, 33: 1,
	});
	const fedorovResult = useMemo(() => {
		const assessments = FEDOROV_TEETH.map((t) => ({ toothNumber: t, fedorovScore: fedorovScores[t] ?? 1 }));
		return calculateFedorovVolodkinaScore(assessments);
	}, [fedorovScores]);

	// РМА Парма (6 зубов)
	const [pmaScores, setPmaScores] = useState<Record<number, number>>({
		16: 0, 11: 0, 26: 0, 36: 0, 31: 0, 46: 0,
	});
	const pmaResult = useMemo(() => {
		const assessments = PMA_INDEX_TEETH.map((t) => ({ toothNumber: t, pmaScore: pmaScores[t] ?? 0 }));
		return calculatePmaScore(assessments);
	}, [pmaScores]);

	// Silness-Löe (6 ключевых зубов, 4 поверхности)
	const [silnessScores, setSilnessScores] = useState<Record<number, Record<SilnessSurface, number>>>({
		16: { vestibular: 0, oral: 0, mesial: 0, distal: 0 },
		12: { vestibular: 0, oral: 0, mesial: 0, distal: 0 },
		24: { vestibular: 0, oral: 0, mesial: 0, distal: 0 },
		36: { vestibular: 0, oral: 0, mesial: 0, distal: 0 },
		32: { vestibular: 0, oral: 0, mesial: 0, distal: 0 },
		44: { vestibular: 0, oral: 0, mesial: 0, distal: 0 },
	});
	const silnessResult = useMemo(() => {
		let totalScore = 0;
		for (const t of SILNESS_LOE_TEETH) {
			const s = silnessScores[t] ?? { vestibular: 0, oral: 0, mesial: 0, distal: 0 };
			const toothAvg = (s.vestibular + s.oral + s.mesial + s.distal) / 4;
			totalScore += toothAvg;
		}
		const avg = Math.round((totalScore / SILNESS_LOE_TEETH.length) * 10) / 10;
		let evaluation: "excellent" | "good" | "moderate" | "poor" = "excellent";
		let ratingText = "Отличная гигиена (налет отсутствует)";
		let badgeClass = "border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300";

		if (avg === 0) {
			evaluation = "excellent";
			ratingText = "Отличная гигиена (налет отсутствует)";
		} else if (avg <= 0.9) {
			evaluation = "good";
			ratingText = "Хорошая гигиена (тонкая пленка)";
			badgeClass = "border-teal-500/30 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300";
		} else if (avg <= 1.9) {
			evaluation = "moderate";
			ratingText = "Удовлетворительная (умеренный налет)";
			badgeClass = "border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300";
		} else {
			evaluation = "poor";
			ratingText = "Плохая гигиена (обильные отложения)";
			badgeClass = "border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300";
		}
		return { score: avg, ratingText, evaluation, badgeClass, isOptimal: avg === 0 };
	}, [silnessScores]);

	const handleSetIdealOhis = useCallback(() => {
		setOhisTeeth(createIdealOhiSTeethScores());
	}, []);

	const handleSetIdealFedorov = useCallback(() => {
		setFedorovScores({ 43: 1, 42: 1, 41: 1, 31: 1, 32: 1, 33: 1 });
	}, []);

	const handleSetIdealPma = useCallback(() => {
		setPmaScores({ 16: 0, 11: 0, 26: 0, 36: 0, 31: 0, 46: 0 });
	}, []);

	const handleSetIdealSilness = useCallback(() => {
		setSilnessScores({
			16: { vestibular: 0, oral: 0, mesial: 0, distal: 0 },
			12: { vestibular: 0, oral: 0, mesial: 0, distal: 0 },
			24: { vestibular: 0, oral: 0, mesial: 0, distal: 0 },
			36: { vestibular: 0, oral: 0, mesial: 0, distal: 0 },
			32: { vestibular: 0, oral: 0, mesial: 0, distal: 0 },
			44: { vestibular: 0, oral: 0, mesial: 0, distal: 0 },
		});
	}, []);

	return {
		ohisTeeth,
		setOhisTeeth,
		ohisResult,
		handleSetIdealOhis,
		fedorovScores,
		setFedorovScores,
		fedorovResult,
		handleSetIdealFedorov,
		pmaScores,
		setPmaScores,
		pmaResult,
		handleSetIdealPma,
		silnessScores,
		setSilnessScores,
		silnessResult,
		handleSetIdealSilness,
	};
}
