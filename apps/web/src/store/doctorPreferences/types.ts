/**
 * doctorPreferences/types.ts — Доменные типы предпочтений врача и клинических пресетов.
 * Мандат 8b: модульность, типизация и ноль микро-шредера.
 */

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
	// Digital signature & facsimile settings (ст. 70 323-ФЗ, Приказ МЗ 947н)
	digitalSignatureMode?: "ukep" | "simple" | "facsimile";
	signatureTitle?: string;
	autoStampEmkOnClose?: boolean;
}

export interface DoctorPreferencesState {
	preferences: DoctorPreferences;
	updatePreferences: (patch: Partial<DoctorPreferences>) => void;
	resetPreferences: () => void;
	applySpecialtyPreset: (specialty: DoctorSpecialtyKey) => void;
	loadServerPreferences: () => Promise<void>;
}
