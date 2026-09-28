import { create } from "zustand";
import {
	safeLocalStorageGetJson,
	safeLocalStorageSetJson,
} from "../lib/safeLocalStorage";
import {
	fetchDoctorPreferencesFromApi,
	saveDoctorPreferencesToApi,
} from "../api/doctorPreferencesApi";
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

export type DentalNeedleType =
	| "septoject_30g_short"
	| "septoject_27g_long"
	| "septoject_30g_extra_short"
	| "dispoject_30g_short";

export interface DentalNeedleOption {
	readonly id: DentalNeedleType;
	readonly key: DentalNeedleType;
	readonly name: string;
	readonly title: string;
	readonly manufacturer: string;
	readonly description: string;
	readonly gauge: string;
	readonly length: string;
	readonly badge: string;
	readonly recommendedSpecialty: string;
	readonly isFavoriteDefault?: boolean;
}

export const DENTAL_NEEDLE_OPTIONS: readonly DentalNeedleOption[] = [
	{
		id: "septoject_30g_short",
		key: "septoject_30g_short",
		name: "Septoject 30G короткие (0.3 × 21–25 мм)",
		title: "Septoject 30G короткие",
		manufacturer: "Septodont (Франция)",
		description: "Стандарт для инфильтрационной анестезии, атравматичный срез, щадящий укол",
		gauge: "30G (0.3 мм)",
		length: "21–25 мм",
		badge: "#1 Инфильтрация",
		recommendedSpecialty: "Терапия, ортопедия, пародонтология",
		isFavoriteDefault: true,
	},
	{
		id: "septoject_27g_long",
		key: "septoject_27g_long",
		name: "Septoject 27G длинные (0.4 × 35–38 мм)",
		title: "Septoject 27G длинные",
		manufacturer: "Septodont (Франция)",
		description: "Проводниковая (мандибулярная и торусальная) анестезия, хирургические вмешательства",
		gauge: "27G (0.4 мм)",
		length: "35–38 мм",
		badge: "#2 Проводниковая (Хирургия)",
		recommendedSpecialty: "Хирургия, имплантология, удаление 8-х зубов",
		isFavoriteDefault: false,
	},
	{
		id: "septoject_30g_extra_short",
		key: "septoject_30g_extra_short",
		name: "Septoject XL 30G ультракороткие (10–12 мм)",
		title: "Septoject XL 30G ультракороткие",
		manufacturer: "Septodont (Франция)",
		description: "Интралигаментарная, интрасептальная анестезия и детский приём (минимальная травма)",
		gauge: "30G (0.3 мм)",
		length: "10–12 мм",
		badge: "Интралигаментарная / Детство",
		recommendedSpecialty: "Детская стоматология, интралигаментарная анестезия",
		isFavoriteDefault: false,
	},
	{
		id: "dispoject_30g_short",
		key: "dispoject_30g_short",
		name: "Dispoject 30G короткие (0.3 × 25 мм)",
		title: "Dispoject 30G короткие",
		manufacturer: "Dispoject / Citoject",
		description: "Силиконизированные карпульные иглы для рутинной инфильтрации",
		gauge: "30G (0.3 мм)",
		length: "25 мм",
		badge: "Эконом стандарт",
		recommendedSpecialty: "Универсальный терапевтический приём",
		isFavoriteDefault: false,
	},
];

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
	| "periodontist"
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
	readonly maxDailyDose?: string | undefined;
	readonly maxDurationDays?: number | undefined;
	readonly overdoseWarning?: string | undefined;
}

export interface DoctorPreferences {
	defaultVisitDuration: 15 | 30 | 45 | 60 | 90 | 120;
	favoriteAnesthetic: AnestheticKey;
	favoriteNeedleType?: DentalNeedleType;
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
	// Specialty favorite materials (90% CIS/RF market catalog)
	favoriteImplantSystem?: string;
	favoriteBoneMaterial?: string;
	favoriteEndoFile?: string;
	favoriteEndoSealer?: string;
	favoriteBracketSystem?: string;
	favoriteProsthoImpression?: string;
	favoriteProsthoCement?: string;
}

export const DEFAULT_DOCTOR_PREFERENCES: DoctorPreferences = {
	defaultVisitDuration: 30,
	favoriteAnesthetic: "articaine_100k",
	favoriteNeedleType: "septoject_30g_short",
	defaultIsolation: "cofferdam",
	defaultComposite: "estelite_asteria",
	defaultAdhesive: "optibond_fl",
	defaultEtchant: "ultra_etch",
	odontogramNotation: "fdi",
	favoriteImplantSystem: "implant_osstem_tsiii",
	favoriteBoneMaterial: "bone_bio_oss_spongiosa",
	favoriteEndoFile: "endo_protaper_gold",
	favoriteEndoSealer: "sealer_ah_plus",
	favoriteBracketSystem: "damon_q2",
	favoriteProsthoImpression: "silicone_elite_hd_plus",
	favoriteProsthoCement: "cement_relyx_u200",
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
		maxDailyDose: "1750 мг/сут амоксициллина (по 1 таб. 2 раза)",
		maxDurationDays: 14,
		overdoseWarning: "Риск антибиотик-ассоциированной диареи и диспепсии. Принимать строго во время еды.",
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
		maxDailyDose: "200 мг/сут (по 1 пакетику 2 раза)",
		maxDurationDays: 5,
		overdoseWarning: "Гепатотоксичность при превышении дозировки. Противопоказан детям до 12 лет и при язве ЖКТ.",
	},
	{
		id: "nise_100",
		tradeName: "Найз (100 мг)",
		mnn: "Нимесулид",
		category: "nsaid",
		categoryLabel: "НПВП / Обезболивающее",
		dosage: "100 мг N. 20 таб.",
		signa: "По 1 таблетке 2 раза в день после еды при болях, не более 5 дней.",
		rpLatin: "Rp.: Tab. Nimesulidi 100 mg N. 20\nD.S. Внутрь по 1 таблетке 2 раза в день после еды.",
		maxDailyDose: "200 мг/сут (максимум 2 таблетки в день)",
		maxDurationDays: 5,
		overdoseWarning: "Защита ЖКТ: строго после еды. Противопоказан при острой язве и тяжелой печеночной недостаточности.",
	},
	{
		id: "dexalgin_25",
		tradeName: "Дексалгин (25 мг)",
		mnn: "Декскетопрофен",
		category: "nsaid",
		categoryLabel: "НПВП быстрого действия (купирование боли)",
		dosage: "25 мг N. 10 таб.",
		signa: "По 1 таблетке каждые 8 часов при выраженной боли (макс 75 мг/сут, не более 3–5 дней).",
		rpLatin: "Rp.: Tab. Dexketoprofeni 25 mg N. 10\nD.S. Внутрь по 1 таблетке каждые 8 часов при острой боли.",
		maxDailyDose: "75 мг/сут (максимум 3 таблетки в день)",
		maxDurationDays: 5,
		overdoseWarning: "Быстрое анальгезирующее действие. Не превышать суточный лимит 75 мг во избежание гастропатии.",
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
		maxDailyDose: "3–4 ванночки по 10-15 мл",
		maxDurationDays: 10,
		overdoseWarning: "Не полоскать активно после удаления зуба! При курсе >10 дней возможно обратимое потемнение эмали.",
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
		maxDailyDose: "1000 мг ципрофлоксацина + 1200 мг тинидазола",
		maxDurationDays: 7,
		overdoseWarning: "Категорически запрещен алкоголь (дисульфирамоподобный синдром тинидазола). Риск тендинита.",
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
		maxDailyDose: "1200 мг/сут (максимум 3 таблетки по 400 мг)",
		maxDurationDays: 5,
		overdoseWarning: "Не превышать 1200 мг в сутки без назначения врача. Принимать после приема пищи.",
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
		maxDailyDose: "100 мг/сут (по 1 таблетке до 4 раз)",
		maxDurationDays: 7,
		overdoseWarning: "Вызывает сонливость и седацию. Не садиться за руль, не комбинировать со спиртным.",
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
		maxDailyDose: "3–4 аппликации в сутки",
		maxDurationDays: 14,
		overdoseWarning: "Только местное нанесение. Не глотать в больших количествах.",
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
		maxDailyDose: "1500 мг/сут (по 1 таб. 3 раза)",
		maxDurationDays: 4,
		overdoseWarning: "Противопоказан при тромбозах, тромбофлебите и инфаркте в анамнезе.",
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
		maxDailyDose: "2 аппликации в день",
		maxDurationDays: 10,
		overdoseWarning: "После нанесения не принимать пищу и не пить воду в течение 30 минут.",
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
		maxDailyDose: "40 мг/сут (максимум 4 таблетки под язык)",
		maxDurationDays: 5,
		overdoseWarning: "Мощный анальгетик SOS. Строго не более 4 таблеток в сутки! Высокий риск НПВП-гастропатии.",
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
		maxDailyDose: "500 мг/сут (строго 1 таблетка в сутки)",
		maxDurationDays: 3,
		overdoseWarning: "Пролонгированный макролид. Не принимать чаще 1 раза в сутки. Курс ровно 3 дня.",
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

let syncTimer: ReturnType<typeof setTimeout> | null = null;
function triggerSyncToApi(prefs: DoctorPreferences) {
	if (typeof window === "undefined") return;
	if (syncTimer) clearTimeout(syncTimer);
	syncTimer = setTimeout(() => {
		void saveDoctorPreferencesToApi(prefs);
	}, 400);
}

export interface DoctorPreferencesState {
	preferences: DoctorPreferences;
	updatePreferences: (patch: Partial<DoctorPreferences>) => void;
	resetPreferences: () => void;
	applySpecialtyPreset: (specialty: DoctorSpecialtyKey) => void;
	loadServerPreferences: () => Promise<void>;
}

export const useDoctorPreferencesStore = create<DoctorPreferencesState>(
	(set, get) => ({
		preferences: readStoredPreferences(),
		loadServerPreferences: async () => {
			const serverPrefs = await fetchDoctorPreferencesFromApi();
			if (serverPrefs && Object.keys(serverPrefs).length > 0) {
				const merged: DoctorPreferences = {
					...get().preferences,
					...serverPrefs,
				};
				safeLocalStorageSetJson(DOCTOR_PREFS_KEY, merged, true);
				set({ preferences: merged });
			}
		},
		updatePreferences: (patch) => {
			const updated = {
				...get().preferences,
				...patch,
			};
			safeLocalStorageSetJson(DOCTOR_PREFS_KEY, updated, true);
			set({ preferences: updated });
			triggerSyncToApi(updated);
		},
		resetPreferences: () => {
			safeLocalStorageSetJson(
				DOCTOR_PREFS_KEY,
				DEFAULT_DOCTOR_PREFERENCES,
				true,
			);
			set({ preferences: { ...DEFAULT_DOCTOR_PREFERENCES } });
			triggerSyncToApi({ ...DEFAULT_DOCTOR_PREFERENCES });
		},
		applySpecialtyPreset: (specialty: DoctorSpecialtyKey) => {
			let presetPatch: Partial<DoctorPreferences> = { specialty };
			switch (specialty) {
				case "surgeon":
					presetPatch = {
						specialty,
						defaultVisitDuration: 45,
						favoriteAnesthetic: "articaine_100k",
						favoriteNeedleType: "septoject_27g_long",
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
						favoriteNeedleType: "septoject_30g_short",
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
						favoriteNeedleType: "septoject_30g_short",
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
						favoriteNeedleType: "septoject_30g_short",
						defaultIsolation: "optragate",
						favoriteMedicationIds: [
							"nimesil_100",
							"holisal_gel",
						],
					};
					break;
				case "periodontist":
					presetPatch = {
						specialty,
						defaultVisitDuration: 45,
						favoriteAnesthetic: "articaine_200k",
						favoriteNeedleType: "septoject_30g_short",
						defaultIsolation: "optragate",
						favoriteMedicationIds: [
							"chlorhexidine_005",
							"metrogyl_denta",
							"holisal_gel",
							"nise_100",
						],
					};
					break;
				case "pediatric":
					presetPatch = {
						specialty,
						defaultVisitDuration: 30,
						defaultDentition: "pediatric",
						favoriteAnesthetic: "articaine_200k",
						favoriteNeedleType: "septoject_30g_extra_short",
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
						favoriteNeedleType: "septoject_30g_short",
					};
					break;
			}
			const updated = {
				...get().preferences,
				...presetPatch,
			};
			safeLocalStorageSetJson(DOCTOR_PREFS_KEY, updated, true);
			set({ preferences: updated });
			triggerSyncToApi(updated);
		},
	}),
);

if (typeof window !== "undefined") {
	void useDoctorPreferencesStore.getState().loadServerPreferences();
}
