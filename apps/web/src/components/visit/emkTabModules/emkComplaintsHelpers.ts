import {
	CANONICAL_SOMATIC_HEALTHY_NORM_TEXT,
	isSomaticTextPhysiologicalNorm,
	type SomaticQuickChip,
} from "@dental/shared";
import type { EmkComplaintsNormResult } from "./emkTabTypes";

export const DEFAULT_HEALTHY_COMPLAINT_TEXT =
	"Жалоб на момент осмотра активно не предъявляет (профилактический осмотр).";

export function buildEmkHealthyComplaintsAndAnamnesisPreset(): EmkComplaintsNormResult {
	return {
		complaint: DEFAULT_HEALTHY_COMPLAINT_TEXT,
		anamnesis: CANONICAL_SOMATIC_HEALTHY_NORM_TEXT,
		isHealthyNorm: true,
	};
}

export function applySomaticQuickChipToAnamnesis(
	currentAnamnesis: string,
	chip: SomaticQuickChip,
): string {
	const trimmed = (currentAnamnesis || "").trim();
	const token = chip.category === "allergy" ? `Аллергия: ${chip.label}` : chip.label;

	if (trimmed.toLowerCase().includes(chip.label.toLowerCase())) {
		const parts = trimmed
			.split(/[.;]\s*/)
			.map((p) => p.trim())
			.filter(
				(p) =>
					p.length > 0 &&
					!p.toLowerCase().includes(chip.label.toLowerCase()),
			);
		return parts.length > 0
			? `${parts.join(". ")}.`
			: CANONICAL_SOMATIC_HEALTHY_NORM_TEXT;
	}

	if (!trimmed || isSomaticTextPhysiologicalNorm(trimmed)) {
		return `${token}.`;
	}

	const cleanBase = trimmed.endsWith(".") ? trimmed.slice(0, -1) : trimmed;
	return `${cleanBase}. ${token}.`;
}
