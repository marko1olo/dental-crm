/**
 * implantFinanceBridge.ts — интеграция КЛКТ с кассой, финансовым актом и сметой лечения.
 * Mandate 8b: Модульность.
 * Mandate 8e: Doctor Autonomy.
 * Mandate 8n: Суверенитет соло-врача (1-клик биллинг, ноль бюрократии).
 */

import type { TreatmentPlanItem } from "../../treatment-plans/types";
import { showToast } from "../../GlobalToast";
import { useVisitStore } from "../../../store/visitStore";
import { useDocumentStore } from "../../../store/documentStore";
import {
	type AddCbctToFinanceParams,
	type AddCbctSurgicalToFinanceParams,
	type SurgicalFinanceExportResult,
	STATUTORY_CBCT_804N,
	DEFAULT_IMPLANT_PRICES_RUB,
	getImplantBrandTitle,
} from "./implantBridgeTypes";
import { savePersistedCustomPlanItem } from "./implantPlanBuilder";

/**
 * 1. Добавление услуги КЛКТ (A06.07.012) в финансовый акт визита (1-клик):
 */
export function addCbctServiceToVisitFinanceAct(params: AddCbctToFinanceParams = {}): {
	code: string;
	title: string;
	priceRub: number;
} {
	const priceRub = params.priceRub ?? STATUTORY_CBCT_804N.basePriceRub;
	const toothCode = params.toothFdi ? String(params.toothFdi) : undefined;
	const toothSuffix = toothCode ? ` (область зуба #${toothCode})` : "";
	const serviceRecord = {
		code: STATUTORY_CBCT_804N.code804n,
		title: `${STATUTORY_CBCT_804N.statutoryTitle804n}${toothSuffix}`,
		priceRub,
	};

	try {
		const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
		if (typeof setVisitNoteForm === "function") {
			setVisitNoteForm((prev) => {
				const line = `[${STATUTORY_CBCT_804N.code804n}] ${STATUTORY_CBCT_804N.statutoryTitle804n}${toothSuffix} — ${priceRub.toLocaleString("ru-RU")} ₽`;
				const prevPlan = (prev.treatmentPlan || "").trim();
				return { ...prev, treatmentPlan: prevPlan ? `${prevPlan}\n${line}` : line };
			});
		}
	} catch { /* ignore */ }

	try {
		const docState = useDocumentStore.getState();
		if (docState && typeof docState.setCompletedActServicesSummary === "function") {
			const actLine = `${STATUTORY_CBCT_804N.code804n} ${STATUTORY_CBCT_804N.statutoryTitle804n}${toothSuffix} — ${priceRub.toLocaleString("ru-RU")} ₽`;
			const prevSummary = (docState.completedActServicesSummary || "").trim();
			docState.setCompletedActServicesSummary(prevSummary ? `${prevSummary}\n${actLine}` : actLine);
			const currentTotal = Number.parseFloat((docState.completedActTotalRub || "0").replace(/[^\d.-]/g, "")) || 0;
			docState.setCompletedActTotalRub(String(currentTotal + priceRub));
		}
	} catch { /* ignore */ }

	if (typeof window !== "undefined") {
		try {
			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: {
						toothNumber: params.toothFdi,
						toothCode,
						services: [
							{
								code: STATUTORY_CBCT_804N.code804n,
								title: `${STATUTORY_CBCT_804N.statutoryTitle804n}${toothSuffix}`,
								price: priceRub,
								priceRub,
								quantity: 1,
								toothCode,
								category: "radiology",
							},
						],
						source: "cbct_studio",
					},
				}),
			);
		} catch {
			// ignore
		}
	}

	return serviceRecord;
}

/**
 * 2. Добавление услуги КЛКТ (A06.07.012) в смету плана лечения (1-клик):
 */
export function addCbctServiceToTreatmentPlan(params: AddCbctToFinanceParams = {}): TreatmentPlanItem {
	const priceRub = params.priceRub ?? STATUTORY_CBCT_804N.basePriceRub;
	const toothCode = params.toothFdi ? String(params.toothFdi) : undefined;
	const toothSuffix = toothCode ? ` (область зуба #${toothCode})` : "";

	const planItem: TreatmentPlanItem = {
		id: `plan-cbct-${Date.now()}`,
		toothNumber: params.toothFdi,
		code804n: STATUTORY_CBCT_804N.code804n,
		name: `${STATUTORY_CBCT_804N.statutoryTitle804n}${toothSuffix}`,
		category: "Диагностика",
		priceRub,
		unitPriceRub: priceRub,
		discountRub: 0,
		quantity: 1,
		phase: 1,
		stageKind: "stage_1_therapy",
		isAuto: false,
		materials: "Конусно-лучевой компьютерный томограф (КЛКТ)",
		clinicalRationale: "3D-томография челюстно-лицевой области для оценки плотности кости, топографии нижнечелюстного канала / верхнечелюстного синуса и анатомических ориентиров перед имплантацией/вмешательством",
	};

	if (params.patientId) {
		savePersistedCustomPlanItem(params.patientId, planItem);
	}

	try {
		const docState = useDocumentStore.getState();
		if (docState && typeof docState.setTreatmentPlanStages === "function") {
			const currentStages = docState.treatmentPlanStages || "";
			const stageLine = `Диагностика и КЛКТ | ${STATUTORY_CBCT_804N.code804n} ${STATUTORY_CBCT_804N.statutoryTitle804n}${toothSuffix} | 1-й день | 3D-планирование и анатомическая безопасность | ${priceRub}`;

			if (currentStages.includes("Диагностика")) {
				const updatedStages = currentStages.replace(/(Диагностика[^\n|]*\|)([^|]+)(\|[^\n]*)/, (_match, p1, p2, p3) => {
					const cleanP2 = p2.trim();
					return cleanP2.includes(STATUTORY_CBCT_804N.code804n)
						? `${p1} ${cleanP2} ${p3}`
						: `${p1} ${cleanP2}, ${STATUTORY_CBCT_804N.code804n} КЛКТ 3D (${priceRub} ₽) ${p3}`;
				});
				docState.setTreatmentPlanStages(updatedStages);
			} else {
				docState.setTreatmentPlanStages(currentStages ? `${currentStages}\n${stageLine}` : stageLine);
			}

			const currentTotal = Number.parseFloat((docState.treatmentPlanEstimatedTotalRub || "0").replace(/[^\d.-]/g, "")) || 0;
			docState.setTreatmentPlanEstimatedTotalRub(String(currentTotal + priceRub));
		}
	} catch {
		// ignore
	}

	if (typeof window !== "undefined") {
		try {
			window.dispatchEvent(
				new CustomEvent("dente-add-treatment-plan-item", {
					detail: {
						item: planItem,
						toothNumber: params.toothFdi,
						patientId: params.patientId,
					},
				}),
			);
		} catch {
			// ignore
		}
	}

	return planItem;
}

/**
 * 3. Добавление полного хирургического пакета в финансовый наряд визита.
 */
export function addCbctSurgicalToVisitFinance(params: AddCbctSurgicalToFinanceParams): SurgicalFinanceExportResult {
	const brandTitle = getImplantBrandTitle(params.implantSpec.brand);
	const diamStr = params.implantSpec.diameterMm.toFixed(1);
	const lenStr = params.implantSpec.lengthMm.toFixed(1);
	const toothCode = String(params.toothFdi);
	const toothSuffix = ` (область зуба #${toothCode})`;

	const implantPrice = DEFAULT_IMPLANT_PRICES_RUB[params.implantSpec.brand] ?? 26000;
	const cbctPrice = STATUTORY_CBCT_804N.basePriceRub;
	const abutmentPrice = 5500;

	const services: Array<{ code: string; title: string; priceRub: number }> = [
		{
			code: STATUTORY_CBCT_804N.code804n,
			title: `${STATUTORY_CBCT_804N.statutoryTitle804n}${toothSuffix}`,
			priceRub: cbctPrice,
		},
		{
			code: "A16.07.054.001",
			title: `Внутрикостная дентальная имплантация: ${brandTitle} (Ø${diamStr} × ${lenStr} мм)${toothSuffix}`,
			priceRub: implantPrice,
		},
	];

	const isMaxillaSinus = params.toothFdi >= 14 && params.toothFdi <= 27;
	const h = typeof params.ridgeHeightMm === "number" ? params.ridgeHeightMm : null;
	const w = typeof params.ridgeWidthMm === "number" ? params.ridgeWidthMm : null;

	if (isMaxillaSinus && h !== null && h < 5.0) {
		services.push(
			{ code: "A16.07.041.001", title: `Открытый синус-лифтинг с латеральным костным окном${toothSuffix}`, priceRub: 32000 },
			{ code: "A16.07.041", title: `Костная пластика: биоматериал Geistlich Bio-Oss (1.0 г)${toothSuffix}`, priceRub: 18000 },
		);
	} else if (isMaxillaSinus && h !== null && h < 10.0) {
		services.push(
			{ code: "A16.07.041.002", title: `Закрытый транскрестальный синус-лифтинг${toothSuffix}`, priceRub: 18000 },
			{ code: "A16.07.041", title: `Костная пластика: биоматериал Geistlich Bio-Oss (0.5 см³)${toothSuffix}`, priceRub: 15000 },
		);
	} else if (w !== null && w < 5.5) {
		services.push({ code: "A16.07.041", title: `Направленная костная регенерация (НКР) альвеолярного гребня Bio-Oss${toothSuffix}`, priceRub: 16000 });
	}

	services.push({
		code: "A16.07.054.002",
		title: `Установка титанового формирователя десны Healing Abutment${toothSuffix}`,
		priceRub: abutmentPrice,
	});

	const totalRub = services.reduce((acc, s) => acc + s.priceRub, 0);

	try {
		const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
		if (typeof setVisitNoteForm === "function") {
			setVisitNoteForm((prev) => {
				const lines = services.map((s) => `[${s.code}] ${s.title} — ${s.priceRub.toLocaleString("ru-RU")} ₽`).join("\n");
				const prevPlan = (prev.treatmentPlan || "").trim();
				return { ...prev, treatmentPlan: prevPlan ? `${prevPlan}\n${lines}` : lines };
			});
		}
	} catch { /* ignore */ }

	try {
		const docState = useDocumentStore.getState();
		if (docState && typeof docState.setCompletedActServicesSummary === "function") {
			const actLines = services.map((s) => `${s.code} ${s.title} — ${s.priceRub.toLocaleString("ru-RU")} ₽`).join("\n");
			const prevSummary = (docState.completedActServicesSummary || "").trim();
			docState.setCompletedActServicesSummary(prevSummary ? `${prevSummary}\n${actLines}` : actLines);
			const currentTotal = Number.parseFloat((docState.completedActTotalRub || "0").replace(/[^\d.-]/g, "")) || 0;
			docState.setCompletedActTotalRub(String(currentTotal + totalRub));
		}
	} catch { /* ignore */ }

	if (typeof window !== "undefined") {
		try {
			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: {
						toothNumber: params.toothFdi, toothCode, source: "cbct_studio_surgery",
						services: services.map((s) => ({
							code: s.code, title: s.title, price: s.priceRub, priceRub: s.priceRub, quantity: 1, toothCode, category: "surgery",
						})),
					},
				}),
			);
		} catch { /* ignore */ }
	}

	if (typeof window !== "undefined") {
		try {
			const setToothState = useVisitStore.getState().setToothState;
			if (typeof setToothState === "function") {
				setToothState(toothCode, "planned");
			}
			window.dispatchEvent(
				new CustomEvent("dente-update-tooth-state", {
					detail: {
						toothNumber: params.toothFdi,
						toothCode,
						state: "Implant",
						brand: params.implantSpec.brand,
						diameterMm: params.implantSpec.diameterMm,
						lengthMm: params.implantSpec.lengthMm,
					},
				}),
			);
		} catch { /* ignore */ }
	}

	showToast(
		`Операция имплантации #${params.toothFdi} (${brandTitle}) и костная пластика (${totalRub.toLocaleString("ru-RU")} ₽) добавлены в смету визита!`,
		"success",
		5000,
	);
	return { services, totalRub };
}

/**
 * 4. Комбинированное добавление услуги КЛКТ (A06.07.012) в 1 клик
 * одновременно в финансовый акт визита И в смету плана лечения (Мандаты 8e, 8n).
 */
export function addCbctToFinanceAndPlan(params: AddCbctToFinanceParams = {}): {
	actService: { code: string; title: string; priceRub: number };
	planItem: TreatmentPlanItem;
} {
	const actService = addCbctServiceToVisitFinanceAct(params);
	const planItem = addCbctServiceToTreatmentPlan(params);

	showToast(
		`Услуга КЛКТ [${STATUTORY_CBCT_804N.code804n}] (${actService.priceRub.toLocaleString("ru-RU")} ₽) добавлена в финансовый акт и смету плана лечения!`,
		"success",
		4500,
	);

	return { actService, planItem };
}
