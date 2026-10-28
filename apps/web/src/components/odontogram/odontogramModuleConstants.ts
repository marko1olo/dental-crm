import type { ToothState, ToothData } from "./ToothChart";
import {
	ALL_ADULT_TEETH_NUMBERS,
	PEDIATRIC_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
	createDefaultAdultTeethData,
} from "./ToothChart";
import type { PanelSubject } from "../../lib/panelStateText";
import { DEMO_SHOWCASE_TEETH } from "../treatment-plans/treatmentPlanStagesEngine";
import {
	CLINICAL_SERVICE_BUNDLES,
	type ClinicalServiceBundle,
} from "../visit/clinicalServiceBundles";
import {
	generateSoapFromOdontogramFinding,
	generateSoapFromOdontogramStates,
} from "../../lib/clinicalProtocols";

import { useVisitStore } from "../../store/visitStore";
import { toVisitToothUiState } from "../visit/useVisitEmkToothSync";

export function getClinicalBundleForToothState(
	state: ToothState,
	toothNumber?: number,
): ClinicalServiceBundle | null {
	if (state === "Caries") {
		return CLINICAL_SERVICE_BUNDLES.find((b) => b.id === "caries") ?? null;
	}
	if (state === "Defective_Restoration") {
		return (
			CLINICAL_SERVICE_BUNDLES.find((b) => b.id === "defective_restoration") ??
			CLINICAL_SERVICE_BUNDLES.find((b) => b.id === "caries") ??
			null
		);
	}
	if (state === "Calculus") {
		return (
			CLINICAL_SERVICE_BUNDLES.find((b) => b.id === "hygiene") ??
			CLINICAL_SERVICE_BUNDLES.find((b) => b.id === "caries") ??
			null
		);
	}
	if (
		state === "Periodontitis" ||
		state === "Periodontitis_Mild" ||
		state === "Periodontitis_Moderate" ||
		state === "Periodontitis_Severe"
	) {
		return (
			CLINICAL_SERVICE_BUNDLES.find((b) => b.id === "periodontitis") ??
			CLINICAL_SERVICE_BUNDLES.find((b) => b.id === "endo_1") ??
			null
		);
	}
	if (state === "Pulpitis") {
		const isMolar =
			toothNumber !== undefined &&
			[16, 17, 18, 26, 27, 28, 36, 37, 38, 46, 47, 48].includes(toothNumber);
		if (isMolar) {
			const mBundle = CLINICAL_SERVICE_BUNDLES.find((b) => b.id === "endo_3");
			if (mBundle) return mBundle;
		}
		return CLINICAL_SERVICE_BUNDLES.find((b) => b.id === "endo_1") ?? null;
	}
	if (
		state === "Missing" ||
		state === "Root" ||
		state === "Extracted"
	) {
		return (
			CLINICAL_SERVICE_BUNDLES.find((b) => b.id === "surgery_extraction") ?? null
		);
	}
	if (state === "Veneer") {
		return (
			CLINICAL_SERVICE_BUNDLES.find((b) => b.id === "veneer") ??
			CLINICAL_SERVICE_BUNDLES.find((b) => b.id === "crown") ??
			null
		);
	}
	if (state === "Inlay") {
		return (
			CLINICAL_SERVICE_BUNDLES.find((b) => b.id === "inlay") ??
			CLINICAL_SERVICE_BUNDLES.find((b) => b.id === "crown") ??
			null
		);
	}
	if (
		state === "Crown" ||
		state === "Bridge" ||
		state === "Bridge_Abutment" ||
		state === "Planned_Crown"
	) {
		return CLINICAL_SERVICE_BUNDLES.find((b) => b.id === "crown") ?? null;
	}
	return null;
}

export function dispatchOdontogramSoapAndBundle(params: {
	targets: number[];
	state: ToothState;
	findings: Array<{ toothNumber: number; state: ToothState; surfaces?: readonly string[] }>;
	patientId: string;
}): void {
	const { targets, state, findings, patientId } = params;
	if (findings.length === 0) return;
	try {
		// 1. Вся зубная формула санирована / интактна (Мандат 8e / 8k)
		if (state === "Healthy" && targets.length >= 28) {
			const sanitizedSoap = {
				diagnosisIcd10: "Z01.2",
				diagnosisTooth: "",
				diagnosisIcd10Label: "Стоматологическое обследование (Здоров / Санирован)",
				anamnesis:
					"Жалоб на момент приёма не предъявляет (профилактический осмотр). Соматически здоров. Аллергологический статус без особенностей.",
				statusLocalis:
					"Прикус физиологический. Зубные ряды интактны, твердые ткани зубов без кариозных поражений. Десна бледно-розовая, плотная, карманов нет. Полость рта санирована.",
				treatmentDescription:
					"Проведён плановый профилактический осмотр, онкоскрининг слизистой оболочки рта. Контролируемая гигиена полости рта, даны индивидуальные рекомендации.",
				recommendations:
					"Индивидуальная гигиена полости рта 2 раза в день. Профилактический осмотр через 6 месяцев.",
			};
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						finding: { toothNumber: 0, state: "Healthy" },
						soap: sanitizedSoap,
						mode: "clean_replace",
						immediate: true,
					},
				}),
			);
		} else {
			const soap =
				findings.length > 1
					? generateSoapFromOdontogramStates(findings)
					: generateSoapFromOdontogramFinding(findings[0]!);
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						finding: findings[0],
						soap,
						mode: "smart_append",
						immediate: true,
					},
				}),
			);
		}

		// 2. Предварительная смета услуг по номенклатуре 804н
		targets.forEach((tNum) => {
			const bundle = getClinicalBundleForToothState(state, tNum);
			if (bundle) {
				window.dispatchEvent(
					new CustomEvent("dente-add-services-to-invoice", {
						detail: {
							bundleId: bundle.id,
							bundleTitle: bundle.title,
							toothNumber: tNum,
							toothCode: String(tNum),
							patientId,
							source: "odontogram_bundle",
							services: bundle.services.map((s, idx) => ({
								id: `srv_${patientId || "pat"}_tooth_${tNum}_${bundle.id}_${s.code804n}_${idx}`,
								code: s.code804n,
								code804n: s.code804n,
								title: s.title,
								price: s.priceRub,
								priceRub: s.priceRub,
								priceKopecks: s.priceKopecks ?? Math.round(s.priceRub * 100),
								unitPriceRub: s.priceRub,
								unitPriceKopecks: s.priceKopecks ?? Math.round(s.priceRub * 100),
								quantity: 1,
								toothCode: String(tNum),
								toothNumber: tNum,
							})),
						},
					}),
				);
			}
		});

		// 2.1. Автоматическая подготовка ортопедического черновика наряда ЗТЛ
		if (state === "Crown" || state === "Bridge" || state === "Veneer" || state === "Inlay") {
			try {
				const draft = {
					toothFdi: targets.join(", "),
					toothNumber: targets.join(", "),
					material: state === "Veneer" ? "crown_emax" : "crown_zirconia",
					colorVita: "A2",
					patientId,
					priceRub: 24000 * targets.length,
					costRub: 7500 * targets.length,
				};
				if (typeof sessionStorage !== "undefined") {
					sessionStorage.setItem("dente_chairside_ortho_order_draft", JSON.stringify(draft));
				}
				if (typeof localStorage !== "undefined") {
					localStorage.setItem("dente_chairside_ortho_order_draft", JSON.stringify(draft));
				}
			} catch {
				// Non-blocking storage fallback
			}
		}

		// 3. Синхронизация с VisitEmbeddedOdontogram и шиной событий
		targets.forEach((tNum) => {
			const toothFinding = findings.find((f) => f.toothNumber === tNum) || {
				toothNumber: tNum,
				state,
			};
			window.dispatchEvent(
				new CustomEvent("dente-update-tooth-state", {
					detail: {
						toothNumber: tNum,
						state,
						surfaces: toothFinding.surfaces ? [...toothFinding.surfaces] : undefined,
					},
				}),
			);
		});

		window.dispatchEvent(
			new CustomEvent("dente-odontogram-update", {
				detail: {
					patientId,
					states: targets.map((tNum) => {
						const f = findings.find((finding) => finding.toothNumber === tNum);
						return {
							toothNumber: tNum,
							state,
							surfaces: f?.surfaces ? [...f.surfaces] : undefined,
						};
					}),
				},
			}),
		);

		// 4. Мгновенное обновление useVisitStore (Tooth records & toothStateByCode)
		try {
			const uiState = toVisitToothUiState(state);
			const store = useVisitStore.getState();
			targets.forEach((tNum) => {
				const code = String(tNum);
				store.setToothState(code, uiState);
				const f = findings.find((finding) => finding.toothNumber === tNum) || {
					toothNumber: tNum,
					state,
				};
				const singleSoap = generateSoapFromOdontogramFinding(f);
				store.setVisitToothRecord(code, {
					toothNumber: tNum,
					state: uiState,
					diagnosis: singleSoap.diagnosisIcd10Label || singleSoap.diagnosisTooth,
					diagnosisIcd10: singleSoap.diagnosisIcd10,
					treatmentPlan: singleSoap.treatmentDescription,
				});
			});
		} catch {
			// fallback in test environment without active store
		}
	} catch {
		// Safe event dispatch fallback
	}
}

/**
 * Состояния зуба, доступные врачу в контекстном меню.
 *
 * Порядок — по частоте записи на приёме: сначала находки, затем
 * выполненные работы, затем план и «здоров».
 *
 * Набор обязан покрывать весь тип ToothState и перечисление
 * toothStateValues на сервере: раньше в меню было шесть состояний из
 * восьми, и «Пломба» с «Имплантат в плане» выставить было нельзя,
 * хотя сервер их принимал и одонтограмма их рисовала.
 */
export const TOOTH_STATE_ACTIONS: ReadonlyArray<{
	state: ToothState;
	label: string;
	className: string;
}> = [
	{
		state: "Healthy",
		label: "Здоров (0)",
		className:
			"bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20",
	},
	{
		state: "Caries",
		label: "Кариес (C)",
		className:
			"bg-rose-500/10 text-rose-900 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20",
	},
	{
		state: "Defective_Restoration",
		label: "Дефект пломбы (Дп)",
		className:
			"bg-rose-500/10 text-rose-900 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20",
	},
	{
		state: "Filled",
		label: "Пломба (П)",
		className:
			"bg-blue-500/10 text-blue-900 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/20",
	},
	{
		state: "Calculus",
		label: "Зубной камень (Зк)",
		className:
			"bg-amber-700/10 text-amber-950 dark:text-amber-300 border-amber-700/30 hover:bg-amber-700/20",
	},
	{
		state: "Pulpitis",
		label: "Пульпит (P)",
		className:
			"bg-rose-500/10 text-rose-900 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20",
	},
	{
		state: "Periodontitis",
		label: "Периодонтит (Pt)",
		className:
			"bg-amber-500/10 text-amber-950 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20",
	},
	{
		state: "Root_Canal_Treated",
		label: "Лечены каналы (Кл)",
		className:
			"bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20",
	},
	{
		state: "Root",
		label: "Корень (R)",
		className:
			"bg-rose-950/20 text-rose-950 dark:text-rose-200 border-rose-800/40 hover:bg-rose-900/30",
	},
	{
		state: "Missing",
		label: "Отсутствует (0)",
		className:
			"bg-slate-500/10 text-slate-900 dark:text-slate-200 border-slate-500/30 hover:bg-slate-500/20",
	},
	{
		state: "Implant",
		label: "Имплантат (Им)",
		className:
			"bg-amber-500/10 text-amber-950 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20",
	},
	{
		state: "Planned_Implant",
		label: "Имплант в плане",
		className:
			"bg-indigo-500/10 text-indigo-950 dark:text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20",
	},
	{
		state: "Crown",
		label: "Коронка (К)",
		className:
			"bg-blue-500/10 text-blue-900 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/20",
	},
	{
		state: "Bridge",
		label: "Искусственный (мост) (И)",
		className:
			"bg-amber-500/10 text-amber-950 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20",
	},
	{
		state: "Veneer",
		label: "Винир (В)",
		className:
			"bg-sky-500/10 text-sky-950 dark:text-sky-300 border-sky-500/30 hover:bg-sky-500/20",
	},
	{
		state: "Inlay",
		label: "Вкладка (ВК)",
		className:
			"bg-sky-500/10 text-sky-950 dark:text-sky-300 border-sky-500/30 hover:bg-sky-500/20",
	},
	{
		state: "Retained",
		label: "Ретинированный (Р)",
		className:
			"bg-purple-500/10 text-purple-950 dark:text-purple-300 border-purple-500/30 hover:bg-purple-500/20",
	},
];

/**
 * Как называется содержимое схемы в трёх её состояниях.
 *
 * Пустоты у формулы своей нет: схема рисует все зубы всегда, и «нет отметок»
 * означает лишь то, что диагнозов пока не ставили. Опасно здесь другое —
 * непрочитанная формула, которая выглядит ровно как формула здорового рта.
 */
export const TEETH_SUBJECT: PanelSubject = {
	notLoadedTitle: "Зубная формула не прочитана",
	accusative: "формулу пациента",
	emptyTitle: "Отметок на зубах пока нет",
	emptyHint: "Нажмите на зуб и выберите состояние — оно попадёт в карту сразу.",
	failureConsequence:
		"Схема ниже показывает зубы БЕЗ отметок — это не значит, что зубы здоровы: диагнозы, пломбы и коронки не прочитаны. Не считайте формулу полной и не печатайте её пациенту, пока она не загрузится.",
};

export function getInitialShowcaseTeeth(pediatricMode?: boolean): ToothData[] {
	const base = pediatricMode
		? [...PEDIATRIC_TOP_TEETH, ...PEDIATRIC_BOTTOM_TEETH].map((toothNumber) => ({
				toothNumber,
				state: "Healthy" as ToothState,
			}))
		: createDefaultAdultTeethData();
	if (pediatricMode) return base;
	return base.map((t) => {
		const demo = DEMO_SHOWCASE_TEETH.find((d) => d.toothNumber === t.toothNumber);
		return demo ? { ...t, ...demo } : t;
	});
}
