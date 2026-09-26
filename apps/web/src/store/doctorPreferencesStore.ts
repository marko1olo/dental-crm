import { create } from "zustand";
import {
	safeLocalStorageGetJson,
	safeLocalStorageSetJson,
} from "../lib/safeLocalStorage";

export type AnestheticKey =
	| "articaine_100k"
	| "articaine_200k"
	| "scandonest_mepivacaine_3";

export type IsolationType = "cofferdam" | "optragate" | "cotton_rolls";

export type CompositeMaterial =
	| "filtek_ultimate"
	| "estelite_asteria"
	| "gradia_direct"
	| "ceram_x_sphere_tec";

export type AdhesiveSystem =
	| "optibond_fl"
	| "prime_and_bond_universal"
	| "single_bond_universal";

export type OdontogramNotation = "fdi" | "universal" | "palmer";

export type DefaultDentition = "adult" | "pediatric" | "mixed";

export interface DoctorPreferences {
	defaultVisitDuration: 15 | 30 | 45 | 60 | 90 | 120;
	favoriteAnesthetic: AnestheticKey;
	defaultIsolation: IsolationType;
	defaultComposite: CompositeMaterial;
	defaultAdhesive: AdhesiveSystem;
	odontogramNotation: OdontogramNotation;
	defaultDentition: DefaultDentition;
	enableSlotEndSound: boolean;
	enableOnlineBookingSound: boolean;
	quickProtocolIds: string[];
}

export const DEFAULT_DOCTOR_PREFERENCES: DoctorPreferences = {
	defaultVisitDuration: 30,
	favoriteAnesthetic: "articaine_100k",
	defaultIsolation: "cofferdam",
	defaultComposite: "estelite_asteria",
	defaultAdhesive: "optibond_fl",
	odontogramNotation: "fdi",
	defaultDentition: "adult",
	enableSlotEndSound: true,
	enableOnlineBookingSound: true,
	quickProtocolIds: [
		"caries_medium_k02_1",
		"pulpitis_acute_k04_0",
		"extraction_simple_k08_1",
		"prophy_hygiene_k05_0",
	],
};

export const ANESTHETIC_OPTIONS: readonly {
	key: AnestheticKey;
	title: string;
	badge: string;
	description: string;
	hasAdrenaline: boolean;
}[] = [
	{
		key: "articaine_100k",
		title: "Артикаин 4% + Адреналин 1:100 000",
		badge: "Норма (1:100k)",
		description: "Стандарт обезболивания: глубокая анестезия 1.7 мл, аспирация (-)",
		hasAdrenaline: true,
	},
	{
		key: "articaine_200k",
		title: "Артикаин 4% + Адреналин 1:200 000",
		badge: "Щадящий (1:200k)",
		description: "Сниженная нагрузка на миокард и сосуды",
		hasAdrenaline: true,
	},
	{
		key: "scandonest_mepivacaine_3",
		title: "Мепивакаин / Скандонест 3% (без адреналина)",
		badge: "Без адреналина",
		description: "Препарат выбора для гипертоников, глаукомы, ССЗ и аллергии на сульфиты",
		hasAdrenaline: false,
	},
];

export const ISOLATION_OPTIONS: readonly {
	key: IsolationType;
	title: string;
	description: string;
}[] = [
	{
		key: "cofferdam",
		title: "Коффердам (Sanctuary / Tor VM)",
		description: "Полная изоляция зуба платком и клампом",
	},
	{
		key: "optragate",
		title: "ОптраГейт (Ivoclar)",
		description: "Круговой ретрактор губ и щек",
	},
	{
		key: "cotton_rolls",
		title: "Ватные валики + слюноотсос",
		description: "Базовая барьерная изоляция",
	},
];

export const COMPOSITE_OPTIONS: readonly {
	key: CompositeMaterial;
	title: string;
	manufacturer: string;
}[] = [
	{
		key: "estelite_asteria",
		title: "Estelite Asteria / Sigma Quick",
		manufacturer: "Tokuyama Dental (Япония)",
	},
	{
		key: "filtek_ultimate",
		title: "Filtek Ultimate / Z250",
		manufacturer: "3M ESPE (США)",
	},
	{
		key: "gradia_direct",
		title: "Gradia Direct",
		manufacturer: "GC (Япония)",
	},
	{
		key: "ceram_x_sphere_tec",
		title: "Ceram.X SphereTEC One",
		manufacturer: "Dentsply Sirona (Германия)",
	},
];

export const ADHESIVE_OPTIONS: readonly {
	key: AdhesiveSystem;
	title: string;
	generation: string;
}[] = [
	{
		key: "optibond_fl",
		title: "OptiBond FL (Kerr)",
		generation: "IV поколение (золотой стандарт)",
	},
	{
		key: "prime_and_bond_universal",
		title: "Prime&Bond Universal (Dentsply)",
		generation: "VIII поколение (универсальный)",
	},
	{
		key: "single_bond_universal",
		title: "Single Bond Universal (3M)",
		generation: "VIII поколение (самопротравливающий)",
	},
];

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
	}),
);
