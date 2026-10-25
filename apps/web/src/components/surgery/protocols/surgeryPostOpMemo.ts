/**
 * surgeryPostOpMemo.ts — Памятка пациенту после удаления зуба для WhatsApp/Telegram (Мандаты 8k, 8d).
 * Строгий полиграфический вид БЕЗ мультяшных эмодзи.
 */

import type { ExtractionComplexity } from "./surgeryExtractionTypes";

export interface PostExtractionMemoParams {
	readonly patientName?: string | undefined;
	readonly toothFdi?: number | undefined;
	readonly doctorName?: string | undefined;
	readonly complexity?: ExtractionComplexity | undefined;
	readonly hasSutures?: boolean | undefined;
	readonly sutureRemovalDays?: number | undefined;
	readonly clinicPhone?: string | undefined;
}

export function buildPostExtractionMemoText(params: PostExtractionMemoParams = {}): string {
	const toothStr = params.toothFdi ? ` (зуб #${params.toothFdi})` : "";
	const greeting = params.patientName ? `Уважаемый(ая) ${params.patientName}!\n\n` : "";
	const docStr = params.doctorName ? `\nЛечащий врач: ${params.doctorName}` : "";
	const phoneStr = params.clinicPhone ? `\nТелефон клиники: ${params.clinicPhone}` : "";
	const suturesStr =
		params.hasSutures || params.complexity === "complex" || params.complexity === "impacted_dystopic"
			? `\n7. ШВЫ: Наложены швы. Снятие швов через ${params.sutureRemovalDays ?? "7-10"} дней. Не трогать швы языком и зубочистками.`
			: "";

	return (
		`${greeting}ПАМЯТКА ПАЦИЕНТУ ПОСЛЕ УДАЛЕНИЯ ЗУБА${toothStr}\n\n` +
		`Для благополучного заживления лунки строго соблюдайте следующие правила:\n\n` +
		`1. МАРЛЕВЫЙ ТАМПОН: Сплюнуть через 20 минут после окончания операции.\n` +
		`2. ХОЛОД: Прикладывать сухой холод к щеке на 15 минут с перерывами 30-40 минут в первые 2-3 часа.\n` +
		`3. НЕ ГРЕТЬ: Категорически запрещено греть щеку, прикладывать компрессы, посещать баню, сауну и принимать горячую ванну 3 дня.\n` +
		`4. НЕ ПОЛОСКАТЬ: Не полоскать полость рта в первые 24 часа, чтобы не вымыть кровяной сгусток из лунки. Не пить через трубочку, не сплевывать активно.\n` +
		`5. ПИТАНИЕ: Прием пищи через 2 часа после операции (когда полностью отойдет анестезия). Исключить твердое, горячее и острое на 3 дня. Жевать на противоположной стороне.\n` +
		`6. ОБЕЗБОЛИВАНИЕ: При болях принять назначенный препарат (Нимесил 1 пакетик или Ибупрофен 400 мг) после еды.` +
		suturesStr +
		`\n\nПри продолжающемся кровотечении, нарастающем отеке или температуре выше 38°C немедленно обратитесь в клинику.` +
		docStr +
		phoneStr
	).trim();
}
