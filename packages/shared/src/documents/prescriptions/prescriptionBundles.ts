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
				latinName: "Rp.: Sol. Chlorhexidini bigluconatis 0.05% - 100 ml",
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
				latinName: "Rp.: Sol. Chlorhexidini bigluconatis 0.12% - 300 ml",
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
		items.push({
			id: `bundle-${bundle.id}-nimesulide`,
			latinName: bundle.items[0]!.latinName,
			tradeName: bundle.items[0]!.tradeName,
			form: bundle.items[0]!.form,
			dosage: bundle.items[0]!.dosage,
			quantity: bundle.items[0]!.quantity,
			dispenseLatin: bundle.items[0]!.dispenseLatin,
			signaRussian: bundle.items[0]!.signaRussian,
			category: bundle.items[0]!.category,
		});

		if (useAlt && bundle.alternativeItems?.[0]) {
			items.push({
				id: `bundle-${bundle.id}-ciprolet`,
				latinName: bundle.alternativeItems[0].latinName,
				tradeName: bundle.alternativeItems[0].tradeName,
				form: bundle.alternativeItems[0].form,
				dosage: bundle.alternativeItems[0].dosage,
				quantity: bundle.alternativeItems[0].quantity,
				dispenseLatin: bundle.alternativeItems[0].dispenseLatin,
				signaRussian: bundle.alternativeItems[0].signaRussian,
				category: bundle.alternativeItems[0].category,
			});
		} else {
			items.push({
				id: `bundle-${bundle.id}-amoxiclav`,
				latinName: bundle.items[1]!.latinName,
				tradeName: bundle.items[1]!.tradeName,
				form: bundle.items[1]!.form,
				dosage: bundle.items[1]!.dosage,
				quantity: bundle.items[1]!.quantity,
				dispenseLatin: bundle.items[1]!.dispenseLatin,
				signaRussian: bundle.items[1]!.signaRussian,
				category: bundle.items[1]!.category,
			});
		}

		items.push({
			id: `bundle-${bundle.id}-chlorhexidine`,
			latinName: bundle.items[2]!.latinName,
			tradeName: bundle.items[2]!.tradeName,
			form: bundle.items[2]!.form,
			dosage: bundle.items[2]!.dosage,
			quantity: bundle.items[2]!.quantity,
			dispenseLatin: bundle.items[2]!.dispenseLatin,
			signaRussian: bundle.items[2]!.signaRussian,
			category: bundle.items[2]!.category,
		});
	} else if (bundle.id === "endo-pain") {
		if (useAlt && bundle.alternativeItems?.[0]) {
			items.push({
				id: `bundle-${bundle.id}-ibuprofen`,
				latinName: bundle.alternativeItems[0].latinName,
				tradeName: bundle.alternativeItems[0].tradeName,
				form: bundle.alternativeItems[0].form,
				dosage: bundle.alternativeItems[0].dosage,
				quantity: bundle.alternativeItems[0].quantity,
				dispenseLatin: bundle.alternativeItems[0].dispenseLatin,
				signaRussian: bundle.alternativeItems[0].signaRussian,
				category: bundle.alternativeItems[0].category,
			});
		} else {
			items.push({
				id: `bundle-${bundle.id}-ketorolac`,
				latinName: bundle.items[0]!.latinName,
				tradeName: bundle.items[0]!.tradeName,
				form: bundle.items[0]!.form,
				dosage: bundle.items[0]!.dosage,
				quantity: bundle.items[0]!.quantity,
				dispenseLatin: bundle.items[0]!.dispenseLatin,
				signaRussian: bundle.items[0]!.signaRussian,
				category: bundle.items[0]!.category,
			});
		}

		items.push({
			id: `bundle-${bundle.id}-drotaverine`,
			latinName: bundle.items[1]!.latinName,
			tradeName: bundle.items[1]!.tradeName,
			form: bundle.items[1]!.form,
			dosage: bundle.items[1]!.dosage,
			quantity: bundle.items[1]!.quantity,
			dispenseLatin: bundle.items[1]!.dispenseLatin,
			signaRussian: bundle.items[1]!.signaRussian,
			category: bundle.items[1]!.category,
		});
	} else if (bundle.id === "perio") {
		items.push({
			id: `bundle-${bundle.id}-metrogyl`,
			latinName: bundle.items[0]!.latinName,
			tradeName: bundle.items[0]!.tradeName,
			form: bundle.items[0]!.form,
			dosage: bundle.items[0]!.dosage,
			quantity: bundle.items[0]!.quantity,
			dispenseLatin: bundle.items[0]!.dispenseLatin,
			signaRussian: bundle.items[0]!.signaRussian,
			category: bundle.items[0]!.category,
		});

		if (useAlt && bundle.alternativeItems?.[0]) {
			items.push({
				id: `bundle-${bundle.id}-stomatophyt`,
				latinName: bundle.alternativeItems[0].latinName,
				tradeName: bundle.alternativeItems[0].tradeName,
				form: bundle.alternativeItems[0].form,
				dosage: bundle.alternativeItems[0].dosage,
				quantity: bundle.alternativeItems[0].quantity,
				dispenseLatin: bundle.alternativeItems[0].dispenseLatin,
				signaRussian: bundle.alternativeItems[0].signaRussian,
				category: bundle.alternativeItems[0].category,
			});
		} else {
			items.push({
				id: `bundle-${bundle.id}-chlorhexidine`,
				latinName: bundle.items[1]!.latinName,
				tradeName: bundle.items[1]!.tradeName,
				form: bundle.items[1]!.form,
				dosage: bundle.items[1]!.dosage,
				quantity: bundle.items[1]!.quantity,
				dispenseLatin: bundle.items[1]!.dispenseLatin,
				signaRussian: bundle.items[1]!.signaRussian,
				category: bundle.items[1]!.category,
			});
		}
	} else if (bundle.id === "antihistamine") {
		if (useAlt && bundle.alternativeItems?.[0]) {
			items.push({
				id: `bundle-${bundle.id}-suprastin`,
				latinName: bundle.alternativeItems[0].latinName,
				tradeName: bundle.alternativeItems[0].tradeName,
				form: bundle.alternativeItems[0].form,
				dosage: bundle.alternativeItems[0].dosage,
				quantity: bundle.alternativeItems[0].quantity,
				dispenseLatin: bundle.alternativeItems[0].dispenseLatin,
				signaRussian: bundle.alternativeItems[0].signaRussian,
				category: bundle.alternativeItems[0].category,
			});
		} else {
			items.push({
				id: `bundle-${bundle.id}-loratadine`,
				latinName: bundle.items[0]!.latinName,
				tradeName: bundle.items[0]!.tradeName,
				form: bundle.items[0]!.form,
				dosage: bundle.items[0]!.dosage,
				quantity: bundle.items[0]!.quantity,
				dispenseLatin: bundle.items[0]!.dispenseLatin,
				signaRussian: bundle.items[0]!.signaRussian,
				category: bundle.items[0]!.category,
			});
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

