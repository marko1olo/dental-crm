/**
 * personalDataOperatorRequisites.ts
 *
 * Реквизиты оператора персональных данных для информированных согласий (Mandate 8e, 8n).
 */

export interface PersonalDataOperatorProblem {
	field: string;
	label: string;
	hint: string;
}

export interface PersonalDataOperatorReview {
	requiredCount: number;
	problems: PersonalDataOperatorProblem[];
}

export interface PersonalDataOperatorInput {
	legalName: string;
	clinicName: string;
	inn: string;
	address: string;
}

export const CLINIC_REQUISITES_LOCATION = "Настройки → Клиника → Юридический профиль клиники";
export const OPERATOR_INN_LENGTHS = [10, 12] as const;

function digitsOf(value: string): string {
	return String(value ?? "").replace(/[^\d]/g, "");
}

function innProblemHint(inn: string): string | null {
	const digits = digitsOf(inn);
	if (digits.length === 0) {
		return `в профиле клиники не заполнен ИНН — впишите его в «${CLINIC_REQUISITES_LOCATION}»`;
	}
	if (OPERATOR_INN_LENGTHS.includes(digits.length as 10 | 12)) return null;
	return `в профиле клиники ИНН из ${digits.length} цифр, а нужно 10 у организации или 12 у ИП — проверьте его в «${CLINIC_REQUISITES_LOCATION}»`;
}

export function personalDataOperatorRequisitesReview(
	input: PersonalDataOperatorInput,
): PersonalDataOperatorReview {
	const operatorName =
		String(input.legalName ?? "").trim() ||
		String(input.clinicName ?? "").trim();
	const address = String(input.address ?? "").trim();
	const innHint = innProblemHint(input.inn);

	const problems: PersonalDataOperatorProblem[] = [];

	if (operatorName === "") {
		problems.push({
			field: "legalName",
			label: "Оператор",
			hint: `в профиле клиники нет ни юридического названия, ни названия клиники — впишите юридическое название в «${CLINIC_REQUISITES_LOCATION}»`,
		});
	}
	if (innHint) {
		problems.push({ field: "inn", label: "ИНН оператора", hint: innHint });
	}
	if (address === "") {
		problems.push({
			field: "address",
			label: "Адрес оператора",
			hint: `в профиле клиники не заполнен адрес — впишите его в «${CLINIC_REQUISITES_LOCATION}»`,
		});
	}

	return { requiredCount: 3, problems };
}
