import { generatePrescriptionSeriesNumber } from "../../utils/idGenerators.js";
import type {
	Form107_1uPayload,
	PrescriptionDoctorUkep,
	PrescriptionDrugItem,
} from "./types.js";

/** ═══════════════════════════════════════════════════════════════════════════
 * 1-КЛИК КАНОНИЧЕСКИЕ РЕЦЕПТУРНЫЕ ПАКЕТЫ НАЗНАЧЕНИЙ (ПРИКАЗ МЗ РФ № 1094н)
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface DentalPrescriptionBundleDrugItem {
	readonly drugId: string;
	readonly tradeName: string;
	readonly latinName: string;
	readonly form: string;
	readonly dosage: string;
	readonly quantity: string;
	readonly dispenseLatin: string;
	readonly signaRussian: string;
	readonly category: "nsaid" | "antibiotic" | "controlled_pku" | "antihistamine" | "antiseptic" | "corticosteroid" | "hemostatic" | "gastroprotective" | "preferential_somatic" | "other";
	readonly isAlternativeOption?: boolean;
	readonly alternativeCondition?: string;
}

export interface DentalPrescriptionExpressBundle {
	readonly id: string;
	readonly testId: string;
	readonly titleRu: string;
	readonly badgeRu: string;
	readonly clinicalIndicationRu: string;
	readonly descriptionRu: string;
	readonly defaultValidityDays: "15" | "30" | "60" | "365";
	readonly defaultDrugIds: readonly string[];
	readonly alternativeDrugIds?: readonly string[];
	readonly items: readonly DentalPrescriptionBundleDrugItem[];
	readonly alternativeItems?: readonly DentalPrescriptionBundleDrugItem[];
}

export const DENTAL_PRESCRIPTION_EXPRESS_BUNDLES: readonly DentalPrescriptionExpressBundle[] = [
	{
		id: "surgical",
		testId: "rx-bundle-surgical",
		titleRu: "Постэкстракционный / Хирургический комплекс",
		badgeRu: "Хирургия",
		clinicalIndicationRu: "После удаления зуба, цистэктомии, дентальной имплантации или синус-лифтинга",
		descriptionRu: "Нимесулид 100 мг №10 + Амоксиклав 625 мг №14 (или Ципролет 500 мг при аллергии на пенициллин) + Хлоргексидин 0.05% 100 мл",
		defaultValidityDays: "60",
		defaultDrugIds: ["nimesulide_100", "amoxiclav_625", "chlorhexidine_005"],
		alternativeDrugIds: ["ciprolet_500"],
		items: [
			{
				drugId: "nimesulide_100",
				tradeName: "Нимесулид 100 мг",
				latinName: "Rp.: Nimesulidi 100 mg",
				form: "таблетки / гранулы для приготовления суспензии",
				dosage: "100 мг",
				quantity: "N. 10",
				dispenseLatin: "D.t.d. N 10 in tab.",
				signaRussian: "S. Внутрь по 1 таб. 2 раза в день после еды при болях до 3-5 дней.",
				category: "nsaid",
			},
			{
				drugId: "amoxiclav_625",
				tradeName: "Амоксиклав 625 мг",
				latinName: "Rp.: Amoxicillini 500 mg + Acidi clavulanici 125 mg",
				form: "таблетки, покрытые пленочной оболочкой",
				dosage: "625 мг",
				quantity: "N. 14",
				dispenseLatin: "D.t.d. N 14 in tab.",
				signaRussian: "S. Внутрь по 1 таб. 2 раза в день 7 дней.",
				category: "antibiotic",
			},
			{
				drugId: "chlorhexidine_005",
				tradeName: "Хлоргексидин 0.05%",
				latinName: "Rp.: Sol. Chlorhexidini bigluconatis 0.05% 100 ml",
				form: "раствор для местного применения 0.05%",
				dosage: "0.05%",
				quantity: "1 флакон (100 мл)",
				dispenseLatin: "D.t.d. N 1 in flac.",
				signaRussian: "S. Ротовые ванночки 3-4 раза в день после еды без активного полоскания.",
				category: "antiseptic",
			},
		],
		alternativeItems: [
			{
				drugId: "ciprolet_500",
				tradeName: "Ципролет 500 мг",
				latinName: "Rp.: Ciprofloxacini 500 mg",
				form: "таблетки, покрытые пленочной оболочкой",
				dosage: "500 мг",
				quantity: "N. 10",
				dispenseLatin: "D.t.d. N 10 in tab.",
				signaRussian: "S. Внутрь по 1 таб. 2 раза в день 5-7 дней при аллергии на пенициллин.",
				category: "antibiotic",
				isAlternativeOption: true,
				alternativeCondition: "При аллергии на пенициллин",
			},
		],
	},
	{
		id: "endo-pain",
		testId: "rx-bundle-endo-pain",
		titleRu: "Купирование острой боли / Эндодонтия",
		badgeRu: "Эндодонтия",
		clinicalIndicationRu: "Острый пульпит, апикальный периодонтит, выраженная постпломбировочная болезненность",
		descriptionRu: "Кеторолак 10 мг №10 (или Ибупрофен 400 мг №10) + Дротаверин 40 мг №20",
		defaultValidityDays: "60",
		defaultDrugIds: ["ketorolac_10", "drotaverine_40"],
		alternativeDrugIds: ["ibuprofen_400"],
		items: [
			{
				drugId: "ketorolac_10",
				tradeName: "Кеторолак 10 мг",
				latinName: "Rp.: Ketorolaci 10 mg",
				form: "таблетки, покрытые пленочной оболочкой",
				dosage: "10 мг",
				quantity: "N. 10",
				dispenseLatin: "D.t.d. N 10 in tab.",
				signaRussian: "S. Внутрь по 1 таб. при острой боли, не более 4 таб./сут.",
				category: "nsaid",
			},
			{
				drugId: "drotaverine_40",
				tradeName: "Дротаверин 40 мг",
				latinName: "Rp.: Drotaverini 40 mg",
				form: "таблетки",
				dosage: "40 мг",
				quantity: "N. 20",
				dispenseLatin: "D.t.d. N 20 in tab.",
				signaRussian: "S. Внутрь по 1 таб. 2 раза в день как спазмолитик.",
				category: "other",
			},
		],
		alternativeItems: [
			{
				drugId: "ibuprofen_400",
				tradeName: "Ибупрофен 400 мг",
				latinName: "Rp.: Ibuprofeni 400 mg",
				form: "таблетки, покрытые пленочной оболочкой",
				dosage: "400 мг",
				quantity: "N. 10",
				dispenseLatin: "D.t.d. N 10 in tab.",
				signaRussian: "S. Внутрь по 1 таб. 2-3 раза в день при умеренной боли.",
				category: "nsaid",
				isAlternativeOption: true,
				alternativeCondition: "При умеренной боли или непереносимости кеторолака",
			},
		],
	},
	{
		id: "perio",
		testId: "rx-bundle-perio",
		titleRu: "Пародонтологический / Противовоспалительный",
		badgeRu: "Пародонтология",
		clinicalIndicationRu: "Обострение хронического пародонтита, гингивит, кюретаж пародонтальных карманов",
		descriptionRu: "Метрогил Дента гель 20 г + Хлоргексидин 0.12% (или Стоматофит 100 мл)",
		defaultValidityDays: "60",
		defaultDrugIds: ["metrogyl_denta", "chlorhexidine_012"],
		alternativeDrugIds: ["stomatophyt_100"],
		items: [
			{
				drugId: "metrogyl_denta",
				tradeName: "Метрогил Дента гель 20 г",
				latinName: "Rp.: Gel. 'Metrogyl Denta' 20.0",
				form: "гель стоматологический",
				dosage: "20 г",
				quantity: "1 туба (20 г)",
				dispenseLatin: "D.t.d. N 1 in tuba",
				signaRussian: "S. Аппликации на десны 2 раза в день 7-10 дней.",
				category: "antiseptic",
			},
			{
				drugId: "chlorhexidine_012",
				tradeName: "Хлоргексидин 0.12%",
				latinName: "Rp.: Sol. Chlorhexidini bigluconatis 0.12% 300 ml",
				form: "раствор для полоскания полости рта 0.12%",
				dosage: "0.12%",
				quantity: "1 флакон (300 мл)",
				dispenseLatin: "D.t.d. N 1 in flac.",
				signaRussian: "S. Полоскание 2-3 раза в день 1 минута.",
				category: "antiseptic",
			},
		],
		alternativeItems: [
			{
				drugId: "stomatophyt_100",
				tradeName: "Стоматофит 100 мл",
				latinName: "Rp.: Extracti 'Stomatophyt' 100 ml",
				form: "экстракт для приготовления раствора",
				dosage: "100 мл",
				quantity: "1 флакон (100 мл)",
				dispenseLatin: "D.t.d. N 1 in flac.",
				signaRussian: "S. Полоскание: 7.5 мл на 1/4 стакана теплой воды 2-3 раза в день 1 минуту.",
				category: "antiseptic",
				isAlternativeOption: true,
				alternativeCondition: "Растительный фитокомплекс при аллергии на синтетические антисептики",
			},
		],
	},
	{
		id: "antihistamine",
		testId: "rx-bundle-antihistamine",
		titleRu: "Премедикация при отеке / Антигистаминный",
		badgeRu: "Противоотечный",
		clinicalIndicationRu: "Профилактика и купирование реактивного отека мягких тканей лица после операций",
		descriptionRu: "Лоратадин 10 мг №10 (или Супрастин 25 мг №10)",
		defaultValidityDays: "60",
		defaultDrugIds: ["loratadine_10"],
		alternativeDrugIds: ["suprastin_25"],
		items: [
			{
				drugId: "loratadine_10",
				tradeName: "Лоратадин 10 мг",
				latinName: "Rp.: Loratadini 10 mg",
				form: "таблетки",
				dosage: "10 мг",
				quantity: "N. 10",
				dispenseLatin: "D.t.d. N 10 in tab.",
				signaRussian: "S. Внутрь по 1 таб. 1 раз в сутки на ночь 5 дней.",
				category: "antihistamine",
			},
		],
		alternativeItems: [
			{
				drugId: "suprastin_25",
				tradeName: "Супрастин 25 мг",
				latinName: "Rp.: Tab. Chloropyramini 25 mg",
				form: "таблетки",
				dosage: "25 мг",
				quantity: "N. 10",
				dispenseLatin: "D.t.d. N 10 in tab.",
				signaRussian: "S. Внутрь по 1 таб. (25 мг) на ночь 5 дней.",
				category: "antihistamine",
				isAlternativeOption: true,
				alternativeCondition: "При выраженном зуде или потребности в легкой вечерней седации",
			},
		],
	},
];

export function getDentalPrescriptionExpressBundle(bundleId: string): DentalPrescriptionExpressBundle | undefined {
	return DENTAL_PRESCRIPTION_EXPRESS_BUNDLES.find((b) => b.id === bundleId || b.testId === bundleId);
}

function mapBundleDrugItem(
	item: DentalPrescriptionBundleDrugItem,
	customId: string,
): PrescriptionDrugItem {
	return {
		id: customId,
		latinName: item.latinName,
		tradeName: item.tradeName,
		form: item.form,
		dosage: item.dosage,
		quantity: item.quantity,
		dispenseLatin: item.dispenseLatin,
		signaRussian: item.signaRussian,
		category: item.category,
	};
}

export function createPrescriptionDrugItemsFromBundle(
	bundleId: string,
	options?: {
		readonly useAlternative?: boolean | undefined;
		readonly penicillinAllergy?: boolean | undefined;
	} | undefined,
): PrescriptionDrugItem[] {
	const bundle = getDentalPrescriptionExpressBundle(bundleId);
	if (!bundle) return [];

	const items: PrescriptionDrugItem[] = [];
	const useAlt = options?.useAlternative || options?.penicillinAllergy;

	if (bundle.id === "surgical") {
		const item0 = bundle.items[0];
		if (item0) items.push(mapBundleDrugItem(item0, `bundle-${bundle.id}-nimesulide`));

		const alt0 = bundle.alternativeItems?.[0];
		if (useAlt && alt0) {
			items.push(mapBundleDrugItem(alt0, `bundle-${bundle.id}-ciprolet`));
		} else {
			const item1 = bundle.items[1];
			if (item1) items.push(mapBundleDrugItem(item1, `bundle-${bundle.id}-amoxiclav`));
		}

		const item2 = bundle.items[2];
		if (item2) items.push(mapBundleDrugItem(item2, `bundle-${bundle.id}-chlorhexidine`));
	} else if (bundle.id === "endo-pain") {
		const alt0 = bundle.alternativeItems?.[0];
		if (useAlt && alt0) {
			items.push(mapBundleDrugItem(alt0, `bundle-${bundle.id}-ibuprofen`));
		} else {
			const item0 = bundle.items[0];
			if (item0) items.push(mapBundleDrugItem(item0, `bundle-${bundle.id}-ketorolac`));
		}

		const item1 = bundle.items[1];
		if (item1) items.push(mapBundleDrugItem(item1, `bundle-${bundle.id}-drotaverine`));
	} else if (bundle.id === "perio") {
		const item0 = bundle.items[0];
		if (item0) items.push(mapBundleDrugItem(item0, `bundle-${bundle.id}-metrogyl`));

		const alt0 = bundle.alternativeItems?.[0];
		if (useAlt && alt0) {
			items.push(mapBundleDrugItem(alt0, `bundle-${bundle.id}-stomatophyt`));
		} else {
			const item1 = bundle.items[1];
			if (item1) items.push(mapBundleDrugItem(item1, `bundle-${bundle.id}-chlorhexidine`));
		}
	} else if (bundle.id === "antihistamine") {
		const alt0 = bundle.alternativeItems?.[0];
		if (useAlt && alt0) {
			items.push(mapBundleDrugItem(alt0, `bundle-${bundle.id}-suprastin`));
		} else {
			const item0 = bundle.items[0];
			if (item0) items.push(mapBundleDrugItem(item0, `bundle-${bundle.id}-loratadine`));
		}
	}

	return items;
}

export function generatePrescriptionPayloadFromBundle(
	bundleId: string,
	options: {
		readonly clinic: {
			readonly fullName: string;
			readonly address?: string | null;
			readonly phone?: string | null;
			readonly ogrn?: string | null;
			readonly inn?: string | null;
			readonly medicalLicenseNumber?: string | null;
		};
		readonly patient: {
			readonly fullName: string;
			readonly birthDate: string;
			readonly medicalCardNumber: string;
			readonly address?: string | null;
		};
		readonly doctor: {
			readonly fullName: string;
			readonly specialty?: string | null;
			readonly snils?: string | null;
		};
		readonly diagnosisIcd10?: string | null | undefined;
		readonly customSeriesNumber?: string | undefined;
		readonly validityDays?: "15" | "30" | "60" | "365" | undefined;
		readonly isChronicSpecialCare?: boolean | undefined;
		readonly chronicPeriodicity?: string | null | undefined;
		readonly ukepSignature?: PrescriptionDoctorUkep | null | undefined;
		readonly withStampAndSignature?: boolean | undefined;
		readonly useAlternative?: boolean | undefined;
		readonly penicillinAllergy?: boolean | undefined;
	},
): Form107_1uPayload {
	const bundle = getDentalPrescriptionExpressBundle(bundleId);
	const items = createPrescriptionDrugItemsFromBundle(bundleId, {
		useAlternative: options.useAlternative,
		penicillinAllergy: options.penicillinAllergy,
	});

	const seriesNum = generatePrescriptionSeriesNumber("РЕЦ", {
		customSeriesNumber: options.customSeriesNumber,
		seedKey: `${options.patient.medicalCardNumber}:${options.patient.fullName}`,
	});

	return {
		formNumber: "107-1/у",
		clinicLegalName: options.clinic.fullName,
		clinicAddress: options.clinic.address || null,
		clinicPhone: options.clinic.phone || null,
		clinicOgrn: options.clinic.ogrn || null,
		clinicInn: options.clinic.inn || null,
		medicalLicenseNumber: options.clinic.medicalLicenseNumber || null,
		prescriptionSeriesNumber: seriesNum,
		prescriptionDate: new Date().toISOString().slice(0, 10),
		patientFullName: options.patient.fullName,
		patientBirthDate: options.patient.birthDate,
		medicalCardNumber: options.patient.medicalCardNumber,
		doctorFullName: options.doctor.fullName,
		doctorSpecialty: options.doctor.specialty || "Врач-стоматолог",
		validityDays: options.validityDays || bundle?.defaultValidityDays || "60",
		isChronicSpecialCare: options.isChronicSpecialCare || false,
		chronicPeriodicity: options.chronicPeriodicity || null,
		items,
		diagnosisIcd10Code: options.diagnosisIcd10 || "K08.1",
		ukepSignature: options.ukepSignature || null,
		withStampAndSignature: options.withStampAndSignature ?? true,
	};
}

