/**
 * clinicalSoapValidation.ts
 * Validation of SOAP presets and material deduction receipt generation.
 */

import type { ClinicalSoapPreset } from "./clinicalSoapTypes.js";

export function calculatePresetMaterialsCost(preset: ClinicalSoapPreset): number {
	const materials = preset.materialsToDeduct ?? [];
	return materials.reduce((sum, m) => {
		const cost = m.unitCostRub ?? 0;
		return sum + Math.round(cost * m.quantity * 100) / 100;
	}, 0);
}

export function generateMaterialsDeductionReceipt(
	preset: ClinicalSoapPreset,
	targetTooth?: number | null,
): string {
	const tooth = targetTooth ?? preset.defaultTooth;
	const toothStr = tooth ? ` (Зуб FDI #${tooth})` : "";
	const header = `ВЕДОМОСТЬ СПИСАНИЯ МАТЕРИАЛОВ ПО ПРОТОКОЛУ «${preset.title}»${toothStr}`;
	const divider = "─".repeat(header.length);

	const lines = (preset.materialsToDeduct ?? []).map((m, idx) => {
		const priceStr = m.unitCostRub ? ` [${m.unitCostRub} ₽/${m.unit}]` : "";
		return `${idx + 1}. ${m.name}: ${m.quantity} ${m.unit}${priceStr}`;
	});

	const totalCost = calculatePresetMaterialsCost(preset);
	const footer = `Нормативная себестоимость материалов: ${totalCost.toLocaleString("ru-RU")} ₽`;

	return [header, divider, ...lines, divider, footer].join("\n");
}

export function validateSoapPreset(preset: ClinicalSoapPreset): {
	readonly isValid: boolean;
	readonly errors: readonly string[];
} {
	const errors: string[] = [];

	if (!preset.id || preset.id.trim().length === 0) errors.push("ID пресета не может быть пустым");
	if (!preset.title || preset.title.trim().length < 3) errors.push("Название пресета должно содержать не менее 3 символов");
	if (!/^[A-Z][0-9]{2}(\.[0-9]{1,3})?$/.test(preset.icd10)) errors.push(`Некорректный код МКБ-10: ${preset.icd10}`);
	if (!preset.complaint || preset.complaint.trim().length < 10) errors.push("Жалобы должны содержать развернутый клинический текст");
	if (!preset.anamnesis || preset.anamnesis.trim().length < 10) errors.push("Анамнез должен содержать развернутый клинический текст");
	if (!preset.statusLocalis || preset.statusLocalis.trim().length < 10) errors.push("Осмотр и зубная формула должны содержать объективное описание осмотра");
	if (!preset.treatmentDescription || preset.treatmentDescription.trim().length < 15) errors.push("Протокол лечения должен содержать описание вмешательства");
	if (preset.service804n && !/^[AB]\d{2}\.\d{2,3}\.\d{2,3}(?:\.\d{2,3})?$/i.test(preset.service804n.code804n)) {
		errors.push(`Некорректный код номенклатуры 804н: ${preset.service804n.code804n}`);
	}
	if (preset.materialsToDeduct) {
		for (const m of preset.materialsToDeduct) {
			if (!m.name || m.name.trim().length === 0) errors.push("Наименование материала не может быть пустым");
			if (!Number.isFinite(m.quantity) || m.quantity <= 0) errors.push(`Количество материала «${m.name}» должно быть положительным числом`);
		}
	}

	return { isValid: errors.length === 0, errors };
}
