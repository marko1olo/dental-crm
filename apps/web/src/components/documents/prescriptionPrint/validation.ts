import type {
	PrescriptionPrescribedDrug,
	PrescriptionForm107Input,
	PrescriptionValidationResult,
} from "./types";

export function validatePrescriptionItemStrict(
	item: PrescriptionPrescribedDrug,
	index: number = 0,
): PrescriptionValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];
	const prefix = `Препарат №${index + 1} (${item.mnnLatin || item.mnnRu || "без названия"}):`;

	const latin = (item.mnnLatin || "").trim();
	if (!latin) {
		errors.push(`${prefix} отсутствует МНН на латинском языке.`);
	} else if (!/^[A-Za-z0-9\s.,'()/%+-]+$/.test(latin)) {
		errors.push(`${prefix} латинское МНН содержит недопустимые нелатинские символы.`);
	}

	const dosage = (item.dosage || "").trim();
	if (!dosage) {
		errors.push(`${prefix} дозировка не может быть пустой (Приказ Минздрава № 1094н).`);
	}

	const dispense = (item.formAndDispenseLatin || "").trim();
	if (!dispense) {
		errors.push(`${prefix} отсутствует указание формы и отпуска (D.t.d.).`);
	} else if (!/^D\.?\s*t\.?\s*d\.?/i.test(dispense)) {
		warnings.push(`${prefix} рекомендуется использовать каноническую формулу 'D.t.d. N...'`);
	}

	const signa = (item.signaRu || "").trim();
	if (!signa) {
		errors.push(`${prefix} способ применения (Signa) не может быть пустым.`);
	} else {
		const vague = [
			/по\s+схеме/i, /по\s+назначению/i, /по\s+указанию/i,
			/как\s+обычно/i, /^известно$/i, /^внутреннее$/i,
			/^наружное$/i, /употреблять\s+по\s+указанию/i,
		];
		for (const pattern of vague) {
			if (pattern.test(signa)) {
				errors.push(
					`${prefix} запрещена неопределенная формулировка «${signa}». Приказ № 1094н требует точного указания разовой дозы, кратности и длительности приёма.`,
				);
				break;
			}
		}
	}

	return { isValid: errors.length === 0, errors, warnings };
}

export function validateForm107PrescriptionInput(
	input: PrescriptionForm107Input,
): PrescriptionValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!input.seriesNumber?.trim()) {
		errors.push("Серия и номер рецепта обязательны.");
	}
	if (!input.patient?.fullName?.trim()) {
		errors.push("ФИО пациента обязательно для оформления рецепта.");
	}
	if (!input.doctor?.fullName?.trim()) {
		errors.push("ФИО лечащего врача обязательно.");
	}

	if (!input.medications || input.medications.length === 0) {
		errors.push("В рецепте должен быть указан хотя бы один лекарственный препарат.");
	} else if (input.medications.length > 3) {
		errors.push("На одном бланке 107-1/у разрешается выписывать не более 3 препаратов (Приказ 1094н).");
	} else {
		input.medications.forEach((med, idx) => {
			const res = validatePrescriptionItemStrict(med, idx);
			errors.push(...res.errors);
			warnings.push(...res.warnings);
		});
	}

	return { isValid: errors.length === 0, errors, warnings };
}
