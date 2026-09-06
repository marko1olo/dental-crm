/**
 * types.ts — Orthodontic Module Domain Types & Zod Schemas (@dental/shared)
 * 
 * Clinical compliance:
 * - Форма 043/у (Приказ Минздрава РФ № 834н)
 * - Клинические рекомендации СтАР по ортодонтической диагностике и лечению
 * - Номенклатура медицинских услуг 804н
 * - Мандаты 8e (Автономия врача), 8k (CRM != тренажер), 8n (Соло-врач и небольшая клиника)
 */

import { z } from "zod";
import type { AngleClass } from "../diagnostics/photoProtocolEngine.js";

export const bracketSlotSchema = z.enum(["0.018", "0.022"]);
export type BracketSlot = z.infer<typeof bracketSlotSchema>;

export const archwireMaterialSchema = z.enum(["NiTi", "CuNiTi", "SS", "TMA"]);
export type ArchwireMaterial = z.infer<typeof archwireMaterialSchema>;

export const archwireSectionSchema = z.enum([
	".012",
	".014",
	".016",
	".018",
	".020",
	".014x.025",
	".016x.022",
	".016x.025",
	".017x.025",
	".018x.025",
	".019x.025",
	".021x.025",
]);
export type ArchwireSection = z.infer<typeof archwireSectionSchema>;

export const targetArchSchema = z.enum(["upper", "lower", "both"]);
export type TargetArch = z.infer<typeof targetArchSchema>;

export interface AngleClassOption {
	id: AngleClass;
	label: string;
	shortLabel: string;
	desc: string;
}

export interface WorkhorseArchwireOption {
	id: string;
	label: string;
	material: ArchwireMaterial;
	section: ArchwireSection;
	desc: string;
}

export interface BracketSystemOption {
	id: string;
	label: string;
	desc: string;
	category: "brackets" | "aligners" | "removable_plates" | "functional";
}

export interface ArchwireMaterialOption {
	id: ArchwireMaterial;
	label: string;
	desc: string;
	badge: string;
}

export interface ElasticSchemeOption {
	id: string;
	label: string;
	desc: string;
}

export interface ElasticSizeOption {
	id: string;
	label: string;
	strength: string;
}

export interface ClinicalActionOption {
	id: string;
	label: string;
	category: "braces" | "wires" | "plates" | "aligners" | "finishing";
}

export interface AlignerAttachmentPreset {
	id: string;
	label: string;
	shortLabel: string;
	teeth: number[];
	description: string;
}

export interface OrthodonticQuickPreset {
	id: string;
	label: string;
	shortLabel: string;
	systemId: string;
	targetArch: TargetArch;
	wireMaterial?: ArchwireMaterial;
	wireSection?: ArchwireSection;
	actions: string[];
	elasticScheme?: string;
	elasticSize?: string;
	elasticWear?: string;
	powerChainSpan?: string;
	powerChainType?: "short" | "long" | "continuous";
	code804n?: string;
	alignerSetIssued?: { count: number; days: number } | null;
	activeAttachmentPreset?: string | null;
	teeth?: number[];
	notes: string;
	angleClass?: AngleClass;
}

export interface OrthodonticSoapParams {
	patientName?: string;
	dateStr?: string;
	bracketSlot?: BracketSlot;
	bracketSystem: string;
	archwireMaterial?: ArchwireMaterial;
	archwireSection?: ArchwireSection;
	targetArch?: TargetArch;
	elasticScheme?: string;
	elasticSize?: string;
	elasticWear?: string;
	selectedActions?: string[];
	selectedTeeth?: number[];
	powerChainSpan?: string;
	powerChainType?: string;
	code804n?: string;
	notes?: string;
	activeAttachmentPreset?: string | null;
	alignerSetIssued?: { count: number; days: number } | null;
	plateActivationTurns?: number;
	angleClass?: AngleClass;
}
