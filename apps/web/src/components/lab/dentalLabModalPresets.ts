import {
	type ExpressLabPreset,
	EXPRESS_LAB_PRESETS,
	EXPRESS_PRESET_ZIRCONIA_CROWN,
	EXPRESS_PRESET_PFM_DUCERAM,
	EXPRESS_PRESET_PMMA_TEMPORARY,
} from "./labMath";

export const EXPRESS_PRESET_EMAX_CROWN: ExpressLabPreset = {
	id: "emax_crown_express",
	title: "Коронка E.max CAD / Press",
	shortDesc: "Дисиликат лития E.max, цвет VITA A2, зазор 30 мкм, срок 5 раб. дней (22 000 ₽ / 6 500 ₽)",
	constructionType: "single_crown",
	materialId: "emax_lithium_disilicate",
	colorVita: "A2",
	workingDays: 5,
	priceRub: 22000,
	labCostRub: 6500,
	patientPriceRub: 22000,
	patientPriceKopecks: 2200000,
	labCostKopecks: 650000,
	occlusalScheme: "mutually_protected",
	contactTightness: "normal",
	surfaceTexture: "natural_anatomy",
	cementGapMicrons: 30,
	impressionType: "a_silicone",
	badge: "E.max (5 дн.)",
};

export const EXPRESS_PRESET_BRIDGE_ZIRCONIA: ExpressLabPreset = {
	id: "bridge_zirconia_express",
	title: "Мостовидный протез ZrO2",
	shortDesc: "Диоксид циркония Multi-Layer, цвет VITA A2, зазор 30 мкм, срок 7 раб. дней (48 000 ₽ / 15 000 ₽)",
	constructionType: "bridge",
	materialId: "zirconia_multilayer",
	colorVita: "A2",
	workingDays: 7,
	priceRub: 48000,
	labCostRub: 15000,
	patientPriceRub: 48000,
	patientPriceKopecks: 4800000,
	labCostKopecks: 1500000,
	occlusalScheme: "mutually_protected",
	contactTightness: "normal",
	surfaceTexture: "natural_anatomy",
	cementGapMicrons: 30,
	impressionType: "a_silicone",
	badge: "Мост ZrO2 (7 дн.)",
};

export const EXPRESS_PRESET_EMAX_INLAY: ExpressLabPreset = {
	id: "emax_inlay_express",
	title: "Вкладка E.max (Inlay/Onlay)",
	shortDesc: "Дисиликат лития IPS e.max Press, цвет VITA A2, зазор 20 мкм, срок 5 раб. дней (18 000 ₽ / 5 500 ₽)",
	constructionType: "inlay_onlay",
	materialId: "emax_lithium_disilicate",
	colorVita: "A2",
	workingDays: 5,
	priceRub: 18000,
	labCostRub: 5500,
	patientPriceRub: 18000,
	patientPriceKopecks: 1800000,
	labCostKopecks: 550000,
	occlusalScheme: "mutually_protected",
	contactTightness: "normal",
	surfaceTexture: "natural_anatomy",
	cementGapMicrons: 20,
	impressionType: "a_silicone",
	badge: "Вкладка E.max (5 дн.)",
};

export const MODAL_EXPRESS_LAB_PRESETS: readonly ExpressLabPreset[] = [
	EXPRESS_PRESET_ZIRCONIA_CROWN,
	EXPRESS_PRESET_BRIDGE_ZIRCONIA,
	EXPRESS_PRESET_EMAX_INLAY,
	EXPRESS_PRESET_EMAX_CROWN,
	EXPRESS_PRESET_PFM_DUCERAM,
	EXPRESS_PRESET_PMMA_TEMPORARY,
	...EXPRESS_LAB_PRESETS.filter(
		(p) =>
			p.id !== "zirconia_crown_express" &&
			p.id !== "bridge_zirconia_express" &&
			p.id !== "emax_inlay_express" &&
			p.id !== "pfm_duceram_express" &&
			p.id !== "pmma_temporary_express" &&
			p.id !== "emax_crown_express",
	),
];

declare module "./labMath" {
	interface DentalLabOrderModalProps {
		readonly clinicName?: string | undefined;
		readonly clinicPhone?: string | undefined;
		readonly initialTeeth?: readonly (number | string)[] | undefined;
		readonly patientChartNumber?: string | undefined;
		readonly onSaveOrder?: ((order: any) => void) | undefined;
		readonly [key: string]: any;
	}
}

export interface LabOrderMessengerParams {
	clinicName: string;
	clinicPhone?: string | undefined;
	gostOrderNumber: string;
	patientName: string;
	doctorName: string;
	teethOrJaw: string;
	constructionTypeTitle: string;
	materialTitle: string;
	shade: string;
	dueDate: string;
	frameworkTrialDate?: string | undefined;
	ceramicTrialDate?: string | undefined;
	clinicalNotes?: string | undefined;
}

export function buildLabOrderMessengerSummary(params: LabOrderMessengerParams): string {
	const lines: string[] = [
		`Заказ-наряд в зуботехническую лабораторию (клиника «${params.clinicName}»):`,
		`Наряд: ${params.gostOrderNumber}`,
		`Пациент: ${params.patientName}`,
		`Лечащий врач: ${params.doctorName}`,
		`Область: ${params.teethOrJaw}`,
		`Конструкция: ${params.constructionTypeTitle}`,
		`Материал: ${params.materialTitle}`,
		`Цвет: ${params.shade}`,
		`Срок сдачи (Due date): ${params.dueDate}`,
	];

	if (params.frameworkTrialDate && params.frameworkTrialDate.trim()) {
		lines.push(`Примерка каркаса: ${params.frameworkTrialDate.trim()}`);
	}
	if (params.ceramicTrialDate && params.ceramicTrialDate.trim()) {
		lines.push(`Примерка керамики: ${params.ceramicTrialDate.trim()}`);
	}

	const notes = params.clinicalNotes?.trim() || "Без особенностей";
	lines.push(`Особые указания: ${notes}`);
	lines.push(`Курьерская доставка / Связь с клиникой: ${params.clinicPhone?.trim() || "не указан"}.`);

	return lines.join("\n");
}
