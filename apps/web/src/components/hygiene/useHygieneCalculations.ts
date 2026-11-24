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
		let count = 0;
		for (const t of SILNESS_LOE_TEETH) {
			const s = silnessScores[t];
			if (s) {
				const toothAvg = (s.vestibular + s.oral + s.mesial + s.distal) / 4;
				totalScore += toothAvg;
				count++;
			}
		}
		const avg = count > 0 ? Math.round((totalScore / count) * 10) / 10 : 0;
		let evaluation: "excellent" | "good" | "moderate" | "poor" = "excellent";
		let ratingText = "Отличная гигиена (налет отсутствует)";
		let badgeClass = "bg-[var(--success-soft,rgba(16,185,129,0.15))] text-[var(--success,#10b981)] border border-[var(--success,#10b981)]/30";

		if (avg === 0) {
			evaluation = "excellent";
			ratingText = "Отличная гигиена (налет отсутствует)";
		} else if (avg <= 0.9) {
			evaluation = "good";
			ratingText = "Хорошая гигиена (тонкая пленка)";
			badgeClass = "bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30";
		} else if (avg <= 1.9) {
			evaluation = "moderate";
			ratingText = "Удовлетворительная (умеренный налет)";
			badgeClass = "bg-[var(--warning-soft,rgba(245,158,11,0.2))] text-[var(--warning,#d97706)] border border-[var(--warning,#d97706)]/30";
		} else {
			evaluation = "poor";
			ratingText = "Плохая гигиена (обильные отложения)";
			badgeClass = "bg-[var(--danger-soft,rgba(225,29,72,0.15))] text-[var(--danger,#e11d48)] border border-[var(--danger,#e11d48)]/40";
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
