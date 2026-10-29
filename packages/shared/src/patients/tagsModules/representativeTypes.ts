import { z } from "zod";

export const REPRESENTATIVE_TYPES = [
	"mother", "father", "parent", "guardian", "curator", "adoptive_parent",
	"authorized_representative", "husband", "wife", "son", "daughter",
	"brother", "sister", "other",
] as const;

export const STOMX_REPRESENTATIVE_TYPES = REPRESENTATIVE_TYPES;
export const representativeTypeSchema = z.enum(REPRESENTATIVE_TYPES);
export const stomxRepresentativeTypeSchema = representativeTypeSchema;
export type RepresentativeType = z.infer<typeof representativeTypeSchema>;
export type StomxRepresentativeType = RepresentativeType;

export interface RepresentativeTypeMeta {
	readonly id?: number;
	readonly code: RepresentativeType;
	readonly nameRu: string;
	readonly isLegalRepresentative: boolean;
	readonly canAccessFamilyDeposit: boolean;
}

export type StomxRepresentativeTypeMeta = RepresentativeTypeMeta;

export const REPRESENTATIVE_CATALOG: readonly RepresentativeTypeMeta[] = [
	{ id: 6, code: "mother", nameRu: "Мать", isLegalRepresentative: true, canAccessFamilyDeposit: true },
	{ id: 5, code: "father", nameRu: "Отец", isLegalRepresentative: true, canAccessFamilyDeposit: true },
	{ id: 1, code: "parent", nameRu: "Родитель", isLegalRepresentative: true, canAccessFamilyDeposit: true },
	{ id: 2, code: "guardian", nameRu: "Опекун", isLegalRepresentative: true, canAccessFamilyDeposit: true },
	{ code: "curator", nameRu: "Попечитель", isLegalRepresentative: true, canAccessFamilyDeposit: true },
	{ code: "adoptive_parent", nameRu: "Усыновитель", isLegalRepresentative: true, canAccessFamilyDeposit: true },
	{ code: "authorized_representative", nameRu: "Представитель по доверенности", isLegalRepresentative: true, canAccessFamilyDeposit: false },
	{ id: 3, code: "husband", nameRu: "Муж", isLegalRepresentative: false, canAccessFamilyDeposit: true },
	{ id: 4, code: "wife", nameRu: "Жена", isLegalRepresentative: false, canAccessFamilyDeposit: true },
	{ id: 8, code: "son", nameRu: "Сын", isLegalRepresentative: false, canAccessFamilyDeposit: false },
	{ id: 7, code: "daughter", nameRu: "Дочь", isLegalRepresentative: false, canAccessFamilyDeposit: false },
	{ id: 10, code: "brother", nameRu: "Брат", isLegalRepresentative: false, canAccessFamilyDeposit: false },
	{ id: 9, code: "sister", nameRu: "Сестра", isLegalRepresentative: false, canAccessFamilyDeposit: false },
	{ code: "other", nameRu: "Другой родственник", isLegalRepresentative: false, canAccessFamilyDeposit: false },
];

export const DENTE_REPRESENTATIVE_RELATIONSHIP_CATALOG = REPRESENTATIVE_CATALOG;
export const REPRESENTATIVE_RELATIONSHIP_CATALOG = REPRESENTATIVE_CATALOG;
/** @deprecated Mandate 8ap: Sovereign DENTE catalog is DENTE_REPRESENTATIVE_RELATIONSHIP_CATALOG */
export const STOMX_REPRESENTATIVE_CATALOG = REPRESENTATIVE_CATALOG;

export const REPRESENTATIVE_BY_CODE = Object.freeze(
	Object.fromEntries(
		REPRESENTATIVE_CATALOG.map((item) => [item.code, item]),
	) as Record<RepresentativeType, RepresentativeTypeMeta>,
);

export const STOMX_REPRESENTATIVE_BY_CODE = REPRESENTATIVE_BY_CODE;

export function isStatutoryLegalRepresentative(code: RepresentativeType): boolean {
	return REPRESENTATIVE_BY_CODE[code]?.isLegalRepresentative ?? false;
}

export type RepresentativeRelationshipType = RepresentativeType;
export type RepresentativeRelationshipMeta = RepresentativeTypeMeta;
