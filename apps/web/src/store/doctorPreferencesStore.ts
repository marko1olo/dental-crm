import { create } from "zustand";
import {
	safeLocalStorageGetJson,
	safeLocalStorageSetJson,
} from "../lib/safeLocalStorage";
import {
	ADHESIVE_OPTIONS,
	ANESTHETIC_OPTIONS,
	COMPOSITE_OPTIONS,
	ETCHANT_OPTIONS,
	ISOLATION_OPTIONS,
} from "../components/settings/doctorClinicalPreferencesConstants";

export {
	ADHESIVE_OPTIONS,
	ANESTHETIC_OPTIONS,
	COMPOSITE_OPTIONS,
	ETCHANT_OPTIONS,
	ISOLATION_OPTIONS,
};

export type AnestheticKey =
	| "articaine_100k"
	| "articaine_200k"
	| "septanest_100k"
	| "ubistesin_forte"
	| "articaine_binergia"
	| "scandonest_mepivacaine_3"
	| "mepivastesin_3"
	| "lidocaine_2"
	| "topical_lidoxor";

export type IsolationType =
	| "cofferdam"
	| "cofferdam_sanctuary"
	| "cofferdam_tor_vm"
	| "cofferdam_nic_tone"
	| "cofferdam_ksk_dentech"
	| "optidam"
	| "liquid_dam"
	| "optragate"
	| "cotton_rolls";

export type CompositeMaterial =
	| "filtek_ultimate"
	| "estelite_asteria"
	| "gradia_direct"
	| "harmonize"
	| "charisma_classic"
	| "ceram_x_sphere_tec"
	| "brilliant_everglow"
	| "tetric_n_ceram"
	| "omnichroma"
	| "esthet_x_hd"
	| "grandio_admira"
	| "enamel_plus_hri"
	| "clearfil_majesty_es2"
	| "spectrum_tph3"
	| "dentlight"
	| "sdr_plus_bulk_fill";

export type AdhesiveSystem =
	| "optibond_fl"
	| "clearfil_se_bond_2"
	| "single_bond_universal"
	| "single_bond_2"
	| "prime_and_bond_universal"
	| "g_premio_bond"
	| "optibond_universal"
	| "gluma_2bond"
	| "tokuyama_universal_bond"
	| "futurabond_u"
	| "adhese_universal"
	| "all_bond_universal";

export type EtchantGel =
	| "ultra_etch"
	| "scotchbond_etch"
	| "total_etch"
	| "travis_vladmiva";

export type OdontogramNotation = "fdi" | "universal" | "palmer";

export type DefaultDentition = "adult" | "pediatric" | "mixed";

export type DoctorSpecialtyKey =
	| "therapist"
	| "surgeon"
	| "orthopedist"
	| "orthodontist"
	| "pediatric"
	| "universal";

export interface ClinicalMaterialOption<TKey extends string = string> {
	readonly id: TKey;
	readonly key: TKey;
	readonly name: string;
	readonly title: string;
	readonly manufacturer: string;
	readonly description: string;
	readonly popularityRank: number;
	readonly isFavoriteDefault: boolean;
	readonly category?: string;
	readonly generation?: string;
	readonly badge?: string;
	readonly hasAdrenaline?: boolean;
}

export interface FavoriteMedicationOption {
	readonly id: string;
	readonly tradeName: string;
	readonly mnn: string;
	readonly category:
		| "antibiotic"
		| "nsaid"
		| "antiseptic"
		| "antihistamine"
		| "dental_gel"
		| "hemostatic";
	readonly categoryLabel: string;
	readonly dosage: string;
	readonly signa: string;
	readonly rpLatin: string;
}

export interface DoctorPreferences {
	defaultVisitDuration: 15 | 30 | 45 | 60 | 90 | 120;
	favoriteAnesthetic: AnestheticKey;
	defaultIsolation: IsolationType;
	defaultComposite: CompositeMaterial;
	defaultAdhesive: AdhesiveSystem;
	defaultEtchant: EtchantGel;
	odontogramNotation: OdontogramNotation;
	defaultDentition: DefaultDentition;
	enableSlotEndSound: boolean;
	enableOnlineBookingSound: boolean;
	quickProtocolIds: string[];
	// Smart clinical assistants (persisted, zero modals)
	autoMkb10: boolean;
	somaticWarnings: boolean;
	instantPhotoProtocol: boolean;
	voiceDictationActive: boolean;
	specialty: DoctorSpecialtyKey;
	// Form 107-1/u favorite prescription medications
	favoriteMedicationIds: string[];
}

export const DEFAULT_DOCTOR_PREFERENCES: DoctorPreferences = {
	defaultVisitDuration: 30,
	favoriteAnesthetic: "articaine_100k",
	defaultIsolation: "cofferdam",
	defaultComposite: "estelite_asteria",
	defaultAdhesive: "optibond_fl",
	defaultEtchant: "ultra_etch",
	odontogramNotation: "fdi",
	defaultDentition: "adult",
	enableSlotEndSound: true,
	enableOnlineBookingSound: true,
	quickProtocolIds: [
		"caries_medium_k02_1",
		"pulpitis_acute_k04_0",
		"extraction_simple_k08_1",
		"implant_installation_k08_1",
		"bone_graft_sinus_k08_2",
		"prophy_hygiene_k05_0",
	],
	autoMkb10: true,
	somaticWarnings: true,
	instantPhotoProtocol: true,
	voiceDictationActive: true,
	specialty: "therapist",
	favoriteMedicationIds: [
		"amoxiclav_875_125",
		"nimesil_100",
		"chlorhexidine_005",
		"holisal_gel",
	],
};

export const DURATION_PRESETS = [15, 30, 45, 60, 90, 120] as const;

export const ODONTOGRAM_NOTATIONS: readonly {
	key: OdontogramNotation;
	title: string;
	description: string;
	sample: string;
}[] = [
	{
		key: "fdi",
		title: "FDI (Двухцифровая международная)",
		description: "Стандарт Минздрава РФ и ВОЗ (квадрант + номер зуба)",
		sample: "11, 26, 36, 48",
	},
	{
		key: "universal",
		title: "Универсальная (США)",
		description: "Сквозная нумерация зубов от 1 до 32",
		sample: "1..32",
	},
	{
		key: "palmer",
		title: "Система Палмера",
		description: "Квадрантная сеточная запись (1–8 от центра)",
		sample: "┘8, └6, ┐1",
	},
];

export const FAVORITE_MEDICATION_OPTIONS: readonly FavoriteMedicationOption[] = [
	{
		id: "amoxiclav_875_125",
		tradeName: "Амоксиклав (875+125 мг)",
		mnn: "Амоксициллин + Клавулановая кислота",
		category: "antibiotic",
		categoryLabel: "Антибиотик первого выбора",
		dosage: "875/125 мг N. 14",
		signa: "По 1 таблетке 2 раза в день во время еды, 7 дней.",
		rpLatin: "Rp.: Tab. Amoxicillini et Acidi clavulanici 875/125 mg N. 14\nD.S. Внутрь по 1 таблетке 2 раза в день во время еды.",
	},
	{
		id: "nimesil_100",
		tradeName: "Нимесил (100 мг)",
		mnn: "Нимесулид",
		category: "nsaid",
		categoryLabel: "НПВП / Обезболивающее",
		dosage: "100 мг N. 9 пакетики",
		signa: "По 1 пакетику 2 раза в день после еды при болях, 3–5 дней.",
		rpLatin: "Rp.: Nimesulidi 100 mg N. 9 in gran.\nD.S. Внутрь по 1 пакетику 2 раза в день после еды, растворив в 100 мл воды.",
	},
	{
		id: "chlorhexidine_005",
		tradeName: "Хлоргексидин 0.05%",
		mnn: "Хлоргексидина биглюконат",
		category: "antiseptic",
		categoryLabel: "Антисептические ванночки",
		dosage: "0.05% 100 мл",
		signa: "Ротовые ванночки по 1 минуте 3 раза в день после еды, 7 дней (не полоскать активно!).",
		rpLatin: "Rp.: Sol. Chlorhexidini bigluconatis 0.05% - 100 ml\nD.S. Для ротовых ванночек 3 раза в день.",
	},
	{
		id: "cyfran_st",
		tradeName: "Цифран СТ (500+600 мг)",
		mnn: "Ципрофлоксацин + Тинидазол",
		category: "antibiotic",
		categoryLabel: "Антибиотик резерва (анаэробы)",
		dosage: "500/600 мг N. 10",
		signa: "По 1 таблетке 2 раза в день после еды, 5 дней.",
		rpLatin: "Rp.: Tab. 'Cyfran ST' N. 10\nD.S. Внутрь по 1 таблетке 2 раза в день.",
	},
	{
		id: "ibuprofen_400",
		tradeName: "Ибупрофен (Нурофен 400 мг)",
		mnn: "Ибупрофен",
		category: "nsaid",
		categoryLabel: "НПВП / Анальгетик",
		dosage: "400 мг N. 20",
		signa: "По 1 таблетке 2-3 раза в день после еды, не более 1200 мг в сутки.",
		rpLatin: "Rp.: Ibuprofeni 400 mg N. 20 in tab.\nD.S. По 1 таблетке 2-3 раза в день после еды.",
	},
	{
		id: "suprastin_25",
		tradeName: "Супрастин (25 мг)",
		mnn: "Хлоропирамин",
		category: "antihistamine",
		categoryLabel: "Противоотечное / антигистаминное",
		dosage: "25 мг N. 20",
		signa: "По 1 таблетке на ночь во время еды, 3-5 дней для уменьшения отека.",
		rpLatin: "Rp.: Tab. Chloropyramini 25 mg N. 20\nD.S. По 1 таблетке вечером во время еды.",
	},
	{
		id: "holisal_gel",
		tradeName: "Холисал стоматологический гель",
		mnn: "Холина салицилат + Цеталкония хлорид",
		category: "dental_gel",
		categoryLabel: "Обезболивающий гель для десен",
		dosage: "10 г туба",
		signa: "Полоской 1 см наносить на десну 2-3 раза в день за 15 минут до еды.",
		rpLatin: "Rp.: Gel. 'Cholisal' 10.0\nD.S. Наносить на десну 2-3 раза в день.",
	},
	{
		id: "tranexamic_500",
		tradeName: "Транексам (500 мг)",
		mnn: "Транексамовая кислота",
		category: "hemostatic",
		categoryLabel: "Гемостатик (контроль гемостаза)",
		dosage: "500 мг N. 10",
		signa: "По 1 таблетке 3 раза в день при подтекании лунки, 2-3 дня.",
		rpLatin: "Rp.: Acidi tranexamici 500 mg N. 10\nD.S. Внутрь по 1 таблетке 3 раза в день.",
	},
	{
		id: "metrogyl_denta",
		tradeName: "Метрогил Дента гель",
		mnn: "Метронидазол + Хлоргексидин",
		category: "dental_gel",
		categoryLabel: "Пародонтальный антимикробный гель",
		dosage: "20 г туба",
		signa: "Наносить на область десен 2 раза в день после гигиены, 7–10 дней (не смывать).",
		rpLatin: "Rp.: Gel. 'Metrogyl Denta' 20.0\nD.S. Наносить на десну 2 раза в день после чистки зубов.",
	},
	{
		id: "ketorol_express_10",
		tradeName: "Кеторол Экспресс (10 мг)",
		mnn: "Кеторолак",
		category: "nsaid",
		categoryLabel: "Купирование острой боли (SOS)",
		dosage: "10 мг N. 20 таб. дисперг.",
		signa: "По 1 таблетке под язык при интенсивной боли (не более 4 таб. в сутки, не более 3-5 дней).",
		rpLatin: "Rp.: Tab. Ketorolaci 10 mg N. 20\nD.S. Под язык по 1 таблетке при острой боли.",
	},
	{
		id: "azithromycin_500",
		tradeName: "Азитромицин (Сумамед 500 мг)",
		mnn: "Азитромицин",
		category: "antibiotic",
		categoryLabel: "Антибиотик (аллергия на пенициллины)",
		dosage: "500 мг N. 3",
		signa: "По 1 таблетке 1 раз в сутки за 1 час до или через 2 часа после еды, 3 дня.",
		rpLatin: "Rp.: Tab. Azithromycini 500 mg N. 3\nD.S. Внутрь по 1 таблетке 1 раз в день, курс 3 дня.",
	},
];

const DOCTOR_PREFS_KEY = "dente_doctor_preferences_v1";

function readStoredPreferences(): DoctorPreferences {
	const stored = safeLocalStorageGetJson<Partial<DoctorPreferences>>(
		DOCTOR_PREFS_KEY,
		{},
	);
	return {
		...DEFAULT_DOCTOR_PREFERENCES,
		...stored,
	};
}

export interface DoctorPreferencesState {
	preferences: DoctorPreferences;
	updatePreferences: (patch: Partial<DoctorPreferences>) => void;
	resetPreferences: () => void;
	applySpecialtyPreset: (specialty: DoctorSpecialtyKey) => void;
}

export const useDoctorPreferencesStore = create<DoctorPreferencesState>(
	(set, get) => ({
		preferences: readStoredPreferences(),
		updatePreferences: (patch) => {
			const updated = {
				...get().preferences,
				...patch,
			};
			safeLocalStorageSetJson(DOCTOR_PREFS_KEY, updated, true);
			set({ preferences: updated });
		},
		resetPreferences: () => {
			safeLocalStorageSetJson(
				DOCTOR_PREFS_KEY,
				DEFAULT_DOCTOR_PREFERENCES,
				true,
			);
			set({ preferences: { ...DEFAULT_DOCTOR_PREFERENCES } });
		},
		applySpecialtyPreset: (specialty: DoctorSpecialtyKey) => {
			let presetPatch: Partial<DoctorPreferences> = { specialty };
			switch (specialty) {
				case "surgeon":
					presetPatch = {
						specialty,
						defaultVisitDuration: 45,
						favoriteAnesthetic: "articaine_100k",
						defaultIsolation: "cofferdam",
						favoriteMedicationIds: [
							"amoxiclav_875_125",
							"nimesil_100",
							"chlorhexidine_005",
							"suprastin_25",
							"tranexamic_500",
						],
					};
					break;
				case "therapist":
					presetPatch = {
						specialty,
						defaultVisitDuration: 60,
						favoriteAnesthetic: "articaine_200k",
						defaultIsolation: "cofferdam",
						defaultComposite: "estelite_asteria",
						defaultAdhesive: "optibond_fl",
						defaultEtchant: "ultra_etch",
						favoriteMedicationIds: [
							"nimesil_100",
							"chlorhexidine_005",
							"holisal_gel",
						],
					};
					break;
				case "orthopedist":
					presetPatch = {
						specialty,
						defaultVisitDuration: 60,
						favoriteAnesthetic: "articaine_200k",
						defaultIsolation: "optragate",
						favoriteMedicationIds: [
							"nimesil_100",
							"chlorhexidine_005",
							"holisal_gel",
						],
					};
					break;
				case "orthodontist":
					presetPatch = {
						specialty,
						defaultVisitDuration: 30,
						defaultDentition: "mixed",
						defaultIsolation: "optragate",
						favoriteMedicationIds: [
							"nimesil_100",
							"holisal_gel",
						],
					};
					break;
				case "pediatric":
					presetPatch = {
						specialty,
						defaultVisitDuration: 30,
						defaultDentition: "pediatric",
						favoriteAnesthetic: "articaine_200k",
						defaultIsolation: "optragate",
						favoriteMedicationIds: [
							"ibuprofen_400",
							"chlorhexidine_005",
							"holisal_gel",
						],
					};
					break;
				case "universal":
				default:
					presetPatch = {
						specialty: "universal",
						defaultVisitDuration: 30,
					};
					break;
			}
			const updated = {
				...get().preferences,
				...presetPatch,
			};
			safeLocalStorageSetJson(DOCTOR_PREFS_KEY, updated, true);
			set({ preferences: updated });
		},
	}),
);
