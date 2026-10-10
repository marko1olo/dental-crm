import { useCallback, useEffect } from "react";
import { useAppStore } from "../../../store/appStore";
import { useVisitStore } from "../../../store/visitStore";
import type { CopilotContext, CopilotNudge } from "./types";

interface UseCopilotContextBuilderParams {
	setNudges: React.Dispatch<React.SetStateAction<CopilotNudge[]>>;
}

export function useCopilotContextBuilder({
	setNudges,
}: UseCopilotContextBuilderParams) {
	const activeTooth = useAppStore((s) => s.activeTooth);
	const visitToothStateByCode = useVisitStore((s) => s.visitToothStateByCode);
	const visitAiDiagnosesByCode = useVisitStore((s) => s.visitAiDiagnosesByCode);

	// Proactive clinical nudge generation based on active tooth & pathology
	useEffect(() => {
		if (!activeTooth) return;

		const toothCode = String(activeTooth);
		const diag = visitAiDiagnosesByCode?.[toothCode] || "";
		const state = visitToothStateByCode?.[toothCode] || "treatment";
		const lowerDiag = diag.toLowerCase();

		const nudgeId = `nudge_tooth_${toothCode}`;

		if (
			lowerDiag.includes("пульпит") ||
			lowerDiag.includes("k04.0") ||
			lowerDiag.includes("pulpitis") ||
			state === "treatment"
		) {
			const pulpitisNudge: CopilotNudge = {
				id: nudgeId,
				kind: "clinical_tooth_protocol",
				created_at: new Date().toISOString(),
				payload: {
					tooth: activeTooth,
					title: `Клинический протокол: Зуб #${activeTooth} (Пульпит K04.0)`,
					icd10: "K04.0",
					anesthesia: "Артикаин 1:100 000 (1.7 мл)",
					description:
						"Рекомендован эндодонтический протокол (NaOCl 2.5% + EDTA 17% + Metapex) и анестезия Sol. Ultracaini DS Forte (Артикаин 1:100 000). Заполнить дневник приёма в 1 клик?",
					actionPrompt: `Заполни дневник приёма для зуба #${activeTooth} по протоколу эндодонтического лечения пульпита K04.0 с анестезией Артикаин 1:100 000.`,
					form043: {
						tooth: activeTooth,
						diagnosis: `K04.0 Пульпит зуба #${activeTooth}`,
						complaint: `Острая самопроизвольная пульсирующая боль в зубе #${activeTooth}, усиливающаяся в ночное время и от температурных раздражителей.`,
						anamnesis: `Боль появилась 2 дня назад. Ранее зуб лечен по поводу глубокого кариеса.`,
						objectiveStatus: `На окклюзионной поверхности зуба #${activeTooth} глубокая кариозная полость, сообщающаяся с полостью зуба. Зондирование вскрытого рога пульпы резко болезненно. Термометрия (+). Перкуссия слабо болезненна (+).`,
						treatmentPlan: `Проводниковая и инфильтрационная анестезия Sol. Ultracaini DS Forte (Артикаин 1:100 000) 1.7 мл. Препарирование полости, раскрытие полости зуба, экстирпация пульпы. Медикаментозная обработка 2.5% NaOCl + 17% EDTA. Временная обтурация гидроксидом кальция (Metapex), герметичная повязка.`,
					},
				},
			};

			setNudges((prev) => {
				if (prev.some((n) => n.id === nudgeId)) return prev;
				return [
					pulpitisNudge,
					...prev.filter((n) => n.kind !== "clinical_tooth_protocol"),
				];
			});
		} else if (
			lowerDiag.includes("кариес") ||
			lowerDiag.includes("k02") ||
			state === "watch"
		) {
			const cariesNudge: CopilotNudge = {
				id: nudgeId,
				kind: "clinical_tooth_protocol",
				created_at: new Date().toISOString(),
				payload: {
					tooth: activeTooth,
					title: `Клинический протокол: Зуб #${activeTooth} (Кариес K02.1)`,
					icd10: "K02.1",
					anesthesia: "Артикаин 1:200 000 (1.7 мл)",
					description:
						"Рекомендован протокол прямой композитной реставрации (OptiBond FL + Filtek Ultimate) и анестезия Sol. Ultracaini DS (1:200 000). Заполнить дневник приёма в 1 клик?",
					actionPrompt: `Заполни дневник приёма для зуба #${activeTooth} по протоколу лечения кариеса дентина K02.1.`,
					form043: {
						tooth: activeTooth,
						diagnosis: `K02.1 Кариес дентина зуба #${activeTooth}`,
						complaint: `Кратковременные боли от холодного и сладкого в зубе #${activeTooth}, быстро проходящие после устранения раздражителя.`,
						anamnesis: `Полость обнаружена пациентом 1 месяц назад при гигиенической чистке зубов.`,
						objectiveStatus: `Кариозная полость средней глубины в пределах плащевого дентина. Зондирование по эмалево-дентинной границе чувствительно. Термометрия кратковременно положительна. Перкуссия безболезненна.`,
						treatmentPlan: `Инфильтрационная анестезия Sol. Ultracaini DS (1:200 000) 1.7 мл. Препарирование кариозной полости, медикаментозная обработка 2% хлоргексидином. Адгезивный протокол OptiBond FL, послойная реставрация Filtek Ultimate (A2/A3). Шлифовка, полировка.`,
					},
				},
			};

			setNudges((prev) => {
				if (prev.some((n) => n.id === nudgeId)) return prev;
				return [
					cariesNudge,
					...prev.filter((n) => n.kind !== "clinical_tooth_protocol"),
				];
			});
		}
	}, [activeTooth, visitToothStateByCode, visitAiDiagnosesByCode, setNudges]);

	const buildClinicalContext = useCallback((): CopilotContext => {
		const toothCode = activeTooth ? String(activeTooth) : undefined;
		const diagnosis = toothCode
			? visitAiDiagnosesByCode?.[toothCode]
			: undefined;
		return {
			activeTooth,
			diagnosis,
			icd10: diagnosis?.includes("K04")
				? "K04.0"
				: diagnosis?.includes("K02")
					? "K02.1"
					: undefined,
		};
	}, [activeTooth, visitAiDiagnosesByCode]);

	return {
		activeTooth,
		visitToothStateByCode,
		visitAiDiagnosesByCode,
		buildClinicalContext,
	};
}
