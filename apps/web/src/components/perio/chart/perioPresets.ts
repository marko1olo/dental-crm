import {
	calculateClinicalAttachmentLevel,
	generateComprehensivePerio043Text,
	isFurcationEligibleTooth,
	PERIO_SITE_KEYS,
	type PerioChartSummary,
	type PerioToothRecord,
} from "@dental/shared";
import {
	PERIO_PATHOLOGY_PRESETS,
	type PerioPathologyPreset,
} from "../../../lib/clinicalProtocols043";
import { useVisitStore } from "../../../store/visitStore";
import { showToast } from "../../GlobalToast";
import {
	applyGingivitisPreset,
	applyHealthyPeriodontiumPreset,
	applyPeriodontitisMildPreset,
	applyPeriodontitisModeratePreset,
	applyPeriodontitisSeverePreset,
	PERIO_EXPRESS_PRESETS,
	type PerioExpressPresetId,
} from "../perioMath";

export interface PresetApplyResult {
	updatedTeeth: PerioToothRecord[];
	protocolText: string;
	title: string;
	service?: {
		code: string;
		name: string;
		price: number;
		category: string;
	} | undefined;
}

/**
 * Applies 1-Click Express Preset (Norm, Pro-Hygiene, Gingivitis, Mild/Moderate/Severe Periodontitis)
 */
export function applyExpressPerioPreset(
	teeth: PerioToothRecord[],
	presetId: PerioExpressPresetId,
): PresetApplyResult {
	let updatedTeeth: PerioToothRecord[] = teeth;
	let protocolText = "";

	switch (presetId) {
		case "perio_norm_express":
			updatedTeeth = applyHealthyPeriodontiumPreset(teeth);
			protocolText = PERIO_EXPRESS_PRESETS.perio_norm_express.defaultProtocolRu;
			break;
		case "pro_hygiene_express":
			updatedTeeth = applyHealthyPeriodontiumPreset(teeth);
			protocolText = PERIO_EXPRESS_PRESETS.pro_hygiene_express.defaultProtocolRu;
			break;
		case "gingivitis_express":
			updatedTeeth = applyGingivitisPreset(teeth);
			protocolText = PERIO_EXPRESS_PRESETS.gingivitis_express.defaultProtocolRu;
			break;
		case "periodontitis_mild_express":
			updatedTeeth = applyPeriodontitisMildPreset(teeth);
			protocolText =
				PERIO_EXPRESS_PRESETS.periodontitis_mild_express.defaultProtocolRu;
			break;
		case "periodontitis_moderate_express":
			updatedTeeth = applyPeriodontitisModeratePreset(teeth);
			protocolText =
				PERIO_EXPRESS_PRESETS.periodontitis_moderate_express.defaultProtocolRu;
			break;
		case "periodontitis_severe_express":
			updatedTeeth = applyPeriodontitisSeverePreset(teeth);
			protocolText =
				PERIO_EXPRESS_PRESETS.periodontitis_severe_express.defaultProtocolRu;
			break;
	}

	const presetInfo = PERIO_EXPRESS_PRESETS[presetId];
	const title = presetInfo?.titleRu ?? presetId;

	let service: PresetApplyResult["service"];
	if (presetId === "pro_hygiene_express") {
		service = {
			code: "A16.07.051",
			name: "Профгигиена полости рта: УЗ-скейлинг над- и поддесневых отложений + Air-Flow порошком на основе глицина + полировка абразивной пастой Detartrine + глубокое фторирование эмали Bifluorid 12",
			price: 5500,
			category: "hygiene",
		};
	}

	return {
		updatedTeeth,
		protocolText,
		title,
		service,
	};
}

/**
 * Applies Therapist Pathology Preset
 */
export function applyTherapistPathologyPreset(
	teeth: PerioToothRecord[],
	presetId: string,
): PresetApplyResult | null {
	const targetPreset: PerioPathologyPreset | undefined =
		PERIO_PATHOLOGY_PRESETS.find((p) => p.id === presetId) ??
		(presetId === "gingivitis_catarrhal"
			? {
					id: "gingivitis_catarrhal",
					label: "Катаральный гингивит (K05.1)",
					badge: "K05.1",
					defaultIcd10: "K05.1",
					statusLocalis:
						"Десна отечна, гиперемирована, валикообразно утолщена, выраженная кровоточивость сосочков при зондировании (BOP > 25%). Глубина зубодесневой бороздки 2–3 мм за счет отека десны (ложные карманы). Зубодесневое прикрепление сохранено, костные карманы отсутствуют. Патологической подвижности зубов нет (подвижность 0). Мягкий зубной налет, локальный наддесневой зубной камень.",
					treatmentDescription:
						"Профессиональная гигиена полости рта (ультразвуковое снятие отложений + Air-Flow). Антисептическая обработка полости рта (хлоргексидин 0.05%). Местная противовоспалительная терапия: аппликации стоматологического геля (Холисал / Метрогил Дента) на десны 2 раза в день в течение 7–10 дней. Обучение гигиене полости рта, индивидуальный подбор средств гигиены.",
				}
			: presetId === "perio_norm_express"
				? {
						id: "perio_norm_express",
						label: "Норма пародонта (физиологическая норма)",
						badge: "Z01.2",
						defaultIcd10: "Z01.2",
						statusLocalis:
							"Пародонт: десна бледно-розовая, плотная, зубодесневая борозда до 2 мм, кровоточивость отсутствует, подвижности зубов нет. Соматически здоров / глубина карманов 1-2 мм / кровоточивость 0 / зубной камень отсутствует / индекс PSR 0 / норма. Зубодесневая бороздка <= 2 мм, десна бледно-розовая плотная, кровоточивости нет (BOP 0%), патологических карманов нет, подвижность 0.",
						treatmentDescription:
							"Профилактический осмотр через 6 месяцев, стандартная индивидуальная гигиена полости рта.",
					}
				: presetId === "hygiene_pro_done_express" ||
					  presetId === "pro_hygiene_express"
					? {
							id: "hygiene_pro_done_express",
							label: "Профгигиена полости рта (A16.07.051)",
							badge: "A16.07.051",
							defaultIcd10: "Z01.2",
							statusLocalis:
								"Профгигиена полости рта: УЗ-скейлинг над- и поддесневых отложений + Air-Flow порошком на основе глицина + полировка абразивной пастой Detartrine + глубокое фторирование эмали Bifluorid 12. Зубные отложения удалены полностью, эмаль гладкая блестящая, десна бледно-розовая плотная, кровоточивости нет (BOP 0%).",
							treatmentDescription:
								"1. Ультразвуковой скейлинг над- и поддесневых отложений Piezon (EMS). 2. Снятие биопленки и налета Air-Flow порошком на основе глицина 25 мкм. 3. Полировка абразивной пастой Detartrine. 4. Обработка хлоргексидином 0.05%. 5. Ремотерапия и фторирование эмали препаратом Bifluorid 12.",
						}
					: undefined);

	if (!targetPreset) return null;

	const updatedTeeth = teeth.map((tooth) => {
		if (tooth.isMissing) return tooth;
		const num = tooth.toothNumber;
		const isLowerAnterior = [31, 32, 41, 42].includes(num);
		const isMolar = [16, 17, 26, 27, 36, 37, 46, 47].includes(num);
		const updated = { ...tooth };

		let depth = 2;
		let hasBop = false;
		let hasCalculus = false;
		let hasPlaque = false;
		let mobility: 0 | 1 | 2 | 3 = 0;
		let furcation: 0 | 1 | 2 | 3 | 4 = 0;

		switch (presetId) {
			case "perio_norm_express":
			case "perio_intact":
			case "hygiene_pro_done_express":
			case "hygiene_airflow_ultrasound":
				depth = 2;
				hasBop = false;
				hasCalculus = false;
				hasPlaque = false;
				mobility = 0;
				furcation = 0;
				break;

			case "gingivitis_catarrhal":
				depth = isLowerAnterior || isMolar ? 3 : 2;
				hasBop = true;
				hasCalculus = isLowerAnterior;
				hasPlaque = true;
				mobility = 0;
				furcation = 0;
				break;

			case "gingivitis_localized":
				depth = isLowerAnterior ? 3 : 2;
				hasBop = isLowerAnterior;
				hasCalculus = isLowerAnterior;
				hasPlaque = isLowerAnterior;
				mobility = 0;
				furcation = 0;
				break;

			case "gingivitis_generalized":
				depth = 3;
				hasBop = true;
				hasCalculus = isLowerAnterior || isMolar;
				hasPlaque = true;
				mobility = 0;
				furcation = 0;
				break;

			case "dental_calculus":
				depth = isLowerAnterior ? 3 : 2;
				hasBop = isLowerAnterior || isMolar;
				hasCalculus = isLowerAnterior || isMolar;
				hasPlaque = true;
				mobility = 0;
				furcation = 0;
				break;

			case "periodontitis_mild":
				depth = isMolar || isLowerAnterior ? 4 : 3;
				hasBop = isMolar || isLowerAnterior;
				hasCalculus = true;
				hasPlaque = true;
				mobility = isLowerAnterior ? 1 : 0;
				furcation = 0;
				break;

			case "periodontitis_moderate":
				depth = isMolar ? 5 : 4;
				hasBop = true;
				hasCalculus = true;
				hasPlaque = true;
				mobility = isLowerAnterior ? 1 : 0;
				furcation = isMolar && isFurcationEligibleTooth(num) ? 1 : 0;
				break;

			case "periodontitis_severe":
				depth = isMolar ? 7 : isLowerAnterior ? 6 : 5;
				hasBop = true;
				hasCalculus = true;
				hasPlaque = true;
				mobility = isLowerAnterior ? 2 : isMolar ? 1 : 0;
				furcation = isMolar && isFurcationEligibleTooth(num) ? 2 : 0;
				break;

			default:
				depth = 2;
				break;
		}

		updated.mobility = mobility;
		updated.furcation = furcation;

		for (const key of PERIO_SITE_KEYS) {
			const site = tooth[key] ?? {
				probingDepthMm: 2,
				gingivalMarginMm: 0,
				bleedingOnProbing: false,
				suppuration: false,
				plaque: false,
				calculus: false,
			};
			const gm =
				presetId === "periodontitis_moderate" ? 1 : site.gingivalMarginMm || 0;
			const calMm = calculateClinicalAttachmentLevel(depth, gm);
			updated[key] = {
				...site,
				probingDepthMm: depth,
				gingivalMarginMm: gm,
				bleedingOnProbing: hasBop,
				calculus: hasCalculus,
				plaque: hasPlaque,
				calMm,
			};
		}
		return updated;
	});

	let protocolText = "";
	if (presetId === "perio_norm_express") {
		protocolText =
			"• Пародонтологический осмотр: Норма пародонта (физиологическая норма, Z01.2).\n" +
			"• Status localis: Пародонт: десна бледно-розовая, плотная, зубодесневая борозда до 2 мм, кровоточивость отсутствует, подвижности зубов нет. Соматически здоров / глубина карманов 1-2 мм / кровоточивость 0 / зубной камень отсутствует / индекс PSR 0 / норма. Зубодесневая бороздка <= 2 мм, десна бледно-розовая плотная, кровоточивости нет (BOP 0%), патологических карманов нет, подвижность 0.\n" +
			"• Диагноз: Здоров / Пародонт интактен (Z01.2).\n" +
			"• Рекомендации: Профилактический осмотр через 6 месяцев, стандартная индивидуальная гигиена полости рта.";
	} else if (presetId === "gingivitis_catarrhal") {
		protocolText =
			"• Пародонтологический осмотр: Хронический катаральный гингивит (K05.1).\n" +
			"• Status localis: Отек десневых сосочков, гиперемия и цианоз маргинального края десны, выраженная кровоточивость при зондировании (BOP+), истинных пародонтальных карманов нет (глубина бороздок до 3 мм за счет отека десны), определяются наддесневые зубные отложения и мягкий зубной налет. Подвижности нет (0 ст.).\n" +
			"• Рекомендованное лечение: Профессиональная гигиена полости рта (УЗ + AirFlow), противовоспалительная терапия, аппликации дентального геля.";
	} else if (presetId === "periodontitis_mild") {
		protocolText =
			"• Пародонтологический осмотр: Хронический генерализованный пародонтит легкой степени тяжести (K05.3, Stage I Grade A).\n" +
			"• Status localis: Десна умеренно гиперемирована, пастозна, с цианотичным оттенком, кровоточивость при зондировании (BOP+), глубина пародонтальных карманов 3-4 мм преимущественно в межзубных промежутках, рецессия десны до 1 мм, умеренные над- и поддесневые зубные отложения, патологическая подвижность зубов отсутствует (0 ст.). На рентгенограмме/КЛКТ: деструкция кортикальной пластинки и вершин межальвеолярных перегородок до 1/3 длины корней.\n" +
			"• Рекомендованное лечение: Профессиональная гигиена полости рта (УЗ Piezon + субгингивальный AirFlow), закрытый кюретаж карманов, антисептическая обработка десны, обучение индивидуальной гигиене.";
	} else if (presetId === "periodontitis_moderate") {
		protocolText =
			"• Пародонтологический осмотр: Хронический генерализованный пародонтит средней степени тяжести (K05.3, Stage II/III Grade B).\n" +
			"• Status localis: Глубина пародонтальных карманов 4-5 мм с серозным экссудатом при зондировании, рецессия десны 1-2 мм, массивный над- и поддесневой зубной камень, патологическая подвижность I ст. На рентгенограмме/КЛКТ: резорбция костной ткани межальвеолярных перегородок от 1/3 до 1/2 длины корней.\n" +
			"• Рекомендованное лечение: Комплексная пародонтальная терапия, поддесневой скейлинг SRP, Vector-терапия, антимикробная обработка карманов, шинирование по показаниям.";
	} else if (
		presetId === "hygiene_pro_done_express" ||
		presetId === "hygiene_airflow_ultrasound" ||
		presetId === "pro_hygiene_express"
	) {
		protocolText =
			"• Профгигиена полости рта: УЗ-скейлинг над- и поддесневых отложений + Air-Flow порошком на основе глицина + полировка абразивной пастой Detartrine + глубокое фторирование эмали Bifluorid 12\n" +
			"• Процедура: Профгигиена полости рта выполнена в полном объеме (A16.07.051).\n" +
			"1. Удаление над- и поддесневых зубных отложений ультразвуковым пьезоэлектрическим скейлером Piezon (EMS).\n" +
			"2. Снятие пигментированного зубного налета и биопленки воздушно-абразивным методом Air-Flow порошком на основе глицина 25 мкм.\n" +
			"3. Полировка всех поверхностей зубов абразивной пастой Detartrine с циркулярными щеточками и резиновыми чашечками, апроксимальные поверхности обработаны штрипсами.\n" +
			"4. Антисептическая медикаментозная обработка слизистой оболочки десны 0.05% раствором хлоргексидина биглюконата.\n" +
			"5. Глубокое фторирование эмали препаратом Bifluorid 12.\n" +
			"• Status localis: Зубные отложения удалены полностью, эмаль гладкая блестящая, десна бледно-розовая, плотная, зубодесневая борозда до 2 мм, кровоточивость отсутствует, подвижности зубов нет.\n" +
			"• Рекомендации: «Белая диета» 2-3 часа, смена зубной щетки, индивидуальный подбор средств гигиены.";
	} else {
		protocolText = `• Пародонтологический осмотр: ${targetPreset.label}\n• Status localis: ${targetPreset.statusLocalis}\n• Рекомендованное лечение: ${targetPreset.treatmentDescription}`;
	}

	let service: PresetApplyResult["service"];
	if (
		presetId === "hygiene_pro_done_express" ||
		presetId === "hygiene_airflow_ultrasound" ||
		presetId === "pro_hygiene_express"
	) {
		service = {
			code: "A16.07.051",
			name: "Профгигиена полости рта: УЗ-скейлинг над- и поддесневых отложений + Air-Flow порошком на основе глицина + полировка абразивной пастой Detartrine + глубокое фторирование эмали Bifluorid 12",
			price: 5500,
			category: "hygiene",
		};
	}

	return {
		updatedTeeth,
		protocolText,
		title: targetPreset.label,
		service,
	};
}

/**
 * Propagate protocol and services into visit store and global window events
 */
export function dispatchPresetSideEffects(
	result: PresetApplyResult,
	onInsertToProtocol?: (text: string) => void,
): void {
	const { protocolText, service } = result;

	useVisitStore.getState().setVisitNoteForm((prev) => ({
		...prev,
		objectiveStatus: prev.objectiveStatus
			? `${prev.objectiveStatus}\n\n${protocolText}`
			: protocolText,
	}));

	if (typeof window !== "undefined") {
		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					soap: protocolText,
					mode: "smart_append",
				},
			}),
		);

		if (service) {
			window.dispatchEvent(
				new CustomEvent("dente-add-estimate-service", {
					detail: service,
				}),
			);
		}
	}

	if (onInsertToProtocol) {
		onInsertToProtocol(protocolText);
	}

	if (typeof navigator !== "undefined" && navigator.clipboard) {
		void navigator.clipboard.writeText(protocolText);
	}

	showToast(
		`Статус зафиксирован: «${result.title}». Протокол перенесён в дневник 043/у.`,
		"success",
		4500,
	);
}

/**
 * Generates comprehensive Form 043/u text
 */
export function generatePerioProtocolText(
	teeth: PerioToothRecord[],
	summary: PerioChartSummary,
	doctorName?: string,
): string {
	return generateComprehensivePerio043Text(teeth, summary, {
		doctorName: doctorName ?? undefined,
		patientAgeYears: 45,
	});
}
