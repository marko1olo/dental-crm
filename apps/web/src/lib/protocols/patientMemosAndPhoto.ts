import type { DiaryState } from "./protocolTypes.js";
import { appendRecommendationToSoap } from "./protocolMerge.js";

/** Идентификаторы ключевых послеоперационных памяток пациенту */
export type PostOpMemoId = "surgery_extraction" | "anesthesia_caries" | "endodontics";

/** Структурированная послеоперационная памятка пациенту */
export interface PostOpPatientMemo {
	readonly id: PostOpMemoId;
	readonly title: string;
	readonly shortTitle: string;
	readonly icon: string;
	readonly badge: string;
	readonly category: "surgery" | "therapy" | "endodontics";
	readonly summary: string;
	readonly keyRules: readonly string[];
	readonly urgentTriggers: readonly string[];
}

/** Набор официальных послеоперационных клинических памяток пациенту (0% эмодзи) */
export const POST_OP_PATIENT_MEMOS: readonly PostOpPatientMemo[] = [
	{
		id: "surgery_extraction",
		title: "Памятка пациенту после удаления зуба и хирургических манипуляций",
		shortTitle: "Памятка: Удаление / Хирургия",
		icon: "surgery",
		badge: "Хирургический протокол",
		category: "surgery",
		summary: "Правила послеоперационного ухода за лункой, режим холода, гигиена и приём НПВП.",
		keyRules: [
			"Не полоскать рот и лунку активно в первые 24–48\u00A0часов, чтобы не вымыть кровяной сгусток (основа заживления).",
			"Холод местно: прикладывать сухой холод (лед через полотенце) к щеке на 15\u00A0минут с перерывами 30\u00A0минут в первые 3–4\u00A0часа.",
			"Не греть щеку, исключить горячие ванны, сауны, бани и тяжелые физические нагрузки на 3–5\u00A0дней.",
			"Обезболивание: при возникновении болевого синдрома принять НПВП (Нимесил 100\u00A0мг или Ибупрофен 400\u00A0мг) по 1 таб. после еды.",
			"Щадящая диета: негорячая, мягкая пища; жевать строго на противоположной (неоперированной) стороне 2–3\u00A0дня.",
			"При умеренном промокании слюны кровью — прикусить стерильный марлевый тампон на 15–20\u00A0минут.",
		],
		urgentTriggers: [
			"Непрекращающееся обильное кровотечение из лунки более 1–2 часов.",
			"Повышение температуры тела выше 38.0\u00A0°C.",
			"Нарастающий отек щеки, затрудненное открывание рта или глотание.",
		],
	},
	{
		id: "anesthesia_caries",
		title: "Памятка пациенту после местной анестезии и лечения кариеса",
		shortTitle: "Памятка: Анестезия / Кариес",
		icon: "therapy",
		badge: "Терапевтический протокол",
		category: "therapy",
		summary: "Правила поведения во время действия анестетика, профилактика прикусывания щеки/губы и гарантия на пломбу.",
		keyRules: [
			"Не принимать пищу в течение 2–3\u00A0часов (до полного восстановления чувствительности губ, языка и щеки), чтобы случайно не прикусить мягкие ткани.",
			"Не пить слишком горячий чай, кофе или воду во время действия анестезии во избежание термического ожога слизистой.",
			"Щадящий режим: избегать чрезмерно твердой пищи (орехи, сухари, грильяж) на вылеченный зуб в первые 1–2\u00A0дня.",
			"Окклюзионный контроль: если после отхода анестезии ощущается, что пломба завышает прикус или мешает — обратитесь в клинику для бесплатной быстрой шлифовки.",
			"Гарантийный срок на световую композитную реставрацию составляет 12–24\u00A0месяца (срок службы 24–36\u00A0месяцев) при регулярном профосмотре 1 раз в 6\u00A0месяцев.",
		],
		urgentTriggers: [
			"Онемение не проходит более 6–8 часов после завершения приёма.",
			"Острая самопроизвольная ночная боль в пролеченном зубе.",
			"Аллергическая реакция (кожная сыпь, зуд, отек мягких тканей).",
		],
	},
	{
		id: "endodontics",
		title: "Памятка пациенту после эндодонтического лечения (пломбирования корневых каналов)",
		shortTitle: "Памятка: Эндодонтия / Каналы",
		icon: "endodontics",
		badge: "Эндодонтический протокол",
		category: "endodontics",
		summary: "Информация о естественной постпломбировочной чувствительности до 3–5\u00A0дней и уходе за зубом.",
		keyRules: [
			"Норма ощущений: умеренная ноющая болезненность или чувство «распирания» при накусывании на зуб в течение 2–5\u00A0дней является естественной физиологической нормой после обработки каналов.",
			"Обезболивающая терапия: при выраженном дискомфорте принять НПВП (Нимесил 100\u00A0мг / Ибупрофен 400\u00A0мг / Кеторол) по 1 таб. после еды.",
			"Беречь зуб от перегрузки: не жевать твердую пищу на леченую сторону до окончательного ортопедического/терапевтического восстановления коронки.",
			"Временная пломба: беречь герметичность повязки; при ее частичном сколе или выпадении незамедлительно связаться с клиникой.",
			"Обязательно явиться на плановый контрольный визит для постоянного пломбирования или покрытия коронкой.",
		],
		urgentTriggers: [
			"Резкое пульсирующее нарастание боли, не снимаемое анальгетиками.",
			"Появление припухлости (отека) десны или щеки в области пролеченного зуба.",
			"Повышение температуры тела выше 37.5\u00A0°C.",
		],
	},
];

export interface PatientMemoRenderOptions {
	readonly patientFullName?: string | null | undefined;
	readonly patientBirthDate?: string | null | undefined;
	readonly doctorFullName?: string | null | undefined;
	readonly doctorSpecialty?: string | null | undefined;
	readonly clinicName?: string | null | undefined;
	readonly clinicPhone?: string | null | undefined;
	readonly clinicAddress?: string | null | undefined;
	readonly toothNumber?: string | number | null | undefined;
	readonly visitDate?: string | null | undefined;
}

/** Получить структурированную памятку по идентификатору */
export function getPostOpPatientMemo(id: PostOpMemoId | string): PostOpPatientMemo {
	const found = POST_OP_PATIENT_MEMOS.find((m) => m.id === id);
	return found ?? POST_OP_PATIENT_MEMOS[0]!;
}

/** Генерация форматированного текста памятки для мессенджеров и дневника */
export function generatePatientMemoText(
	memoId: PostOpMemoId | string,
	options?: PatientMemoRenderOptions,
): string {
	const memo = getPostOpPatientMemo(memoId);
	const clinic = options?.clinicName || "Стоматологическая клиника «DENTE»";
	const phone = options?.clinicPhone || "+7 (495) 777-88-99";
	const toothStr = options?.toothNumber ? ` (Зуб ${options.toothNumber})` : "";
	const dateStr = options?.visitDate || new Date().toLocaleDateString("ru-RU");

	const lines = [
		`${memo.title.toUpperCase()}${toothStr}`,
		`Дата: ${dateStr} • Клиника: ${clinic}`,
		"",
		"КЛЮЧЕВЫЕ ПРАВИЛА И РЕКОМЕНДАЦИИ:",
		...memo.keyRules.map((r, i) => `${i + 1}. ${r}`),
		"",
		"СРОЧНО СВЯЗАТЬСЯ С КЛИНИКОЙ ПРИ:",
		...memo.urgentTriggers.map((t) => `• ${t}`),
		"",
		`Телефон экстренной связи клиники: ${phone}`,
	];

	return lines.join("\n");
}

/** Неразрушающее добавление памятки в поле рекомендаций дневника */
export function appendPatientMemoToSoap(
	diary: DiaryState,
	memoId: PostOpMemoId | string,
): DiaryState {
	const memo = getPostOpPatientMemo(memoId);
	const snippet = `Выдана «${memo.title}». Пациент ознакомлен с правилами послеоперационного режима и ухода.`;
	return appendRecommendationToSoap(diary, snippet);
}

/** Генерация печатной HTML-страницы А4/А5 памятки пациенту для быстрой печати в 1 клик */
export function renderPatientMemoPrintHtml(
	memoId: PostOpMemoId | string,
	options?: PatientMemoRenderOptions,
): string {
	const memo = getPostOpPatientMemo(memoId);
	const clinic = options?.clinicName || "Стоматологическая клиника «DENTE» (ООО «ДЕНТЕ МЕДИКАЛ ГРУПП»)";
	const phone = options?.clinicPhone || "+7 (495) 777-88-99";
	const address = options?.clinicAddress || "119048, г. Москва, ул. Стоматологическая, д. 24, корп. 1";
	const patient = options?.patientFullName || "________________________________________";
	const doctor = options?.doctorFullName || "Врач-стоматолог";
	const specialty = options?.doctorSpecialty || "Стоматолог-терапевт / хирург";
	const toothStr = options?.toothNumber ? `Зуб ${options.toothNumber}` : "Область вмешательства";
	const dateStr = options?.visitDate || new Date().toLocaleDateString("ru-RU");

	return `<div class="patient-memo-sheet" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; background: #ffffff; padding: 24px; max-width: 210mm; margin: 0 auto; line-height: 1.45; font-size: 12px;">
	<div style="border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
		<div>
			<div style="font-size: 15px; font-weight: 900; text-transform: uppercase; color: #0f172a; letter-spacing: normal; word-break: normal; overflow-wrap: break-word; hyphens: none;">${clinic}</div>
			<div style="font-size: 11px; font-weight: 600; color: #475569; margin-top: 2px;">${address} • Тел: ${phone}</div>
		</div>
		<div style="text-align: right; font-size: 11px; shrink: 0;">
			<div style="font-weight: 800; color: #0f766e;">${memo.badge}</div>
			<div style="color: #64748b; margin-top: 2px;">Дата выдачи: <strong>${dateStr}</strong></div>
		</div>
	</div>

	<div style="text-align: center; margin-bottom: 14px; padding: 8px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
		<h1 style="font-size: 14px; font-weight: 900; text-transform: uppercase; margin: 0; color: #0f172a;">
			${memo.title}
		</h1>
		<div style="font-size: 11px; color: #64748b; margin-top: 3px;">
			${memo.summary}
		</div>
	</div>

	<table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px; border: 1px solid #cbd5e1; page-break-inside: avoid; break-inside: avoid;">
		<tbody>
			<tr style="border-bottom: 1px solid #cbd5e1;">
				<td style="padding: 5px 8px; font-weight: 700; background: #f8fafc; width: 20%; border-right: 1px solid #cbd5e1;">Пациент:</td>
				<td style="padding: 5px 8px; font-weight: 700; color: #0f172a; width: 45%; border-right: 1px solid #cbd5e1;">${patient}</td>
				<td style="padding: 5px 8px; font-weight: 700; background: #f8fafc; width: 15%; border-right: 1px solid #cbd5e1;">Зона:</td>
				<td style="padding: 5px 8px; font-weight: 700; color: #0f766e; width: 20%;">${toothStr}</td>
			</tr>
			<tr>
				<td style="padding: 5px 8px; font-weight: 700; background: #f8fafc; border-right: 1px solid #cbd5e1;">Лечащий врач:</td>
				<td style="padding: 5px 8px; font-weight: 600; border-right: 1px solid #cbd5e1;" colspan="3">${doctor} (${specialty})</td>
			</tr>
		</tbody>
	</table>

	<div style="margin-bottom: 14px; page-break-inside: avoid; break-inside: avoid;">
		<div style="font-size: 12px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin-bottom: 8px; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px;">
			Обязательные правила и рекомендации по уходу:
		</div>
		<div style="display: flex; flex-direction: column; gap: 6px;">
			${memo.keyRules
				.map(
					(rule, idx) => `
			<div style="display: flex; align-items: flex-start; gap: 8px; background: #f8fafc; padding: 6px 10px; border-radius: 6px; border-left: 3px solid #0f766e;">
				<span style="font-weight: 800; color: #0f766e; font-size: 11px;">${idx + 1}.</span>
				<span style="font-size: 11px; color: #1e293b; line-height: 1.4;">${rule}</span>
			</div>`,
				)
				.join("")}
		</div>
	</div>

	<div style="margin-bottom: 16px; padding: 10px 12px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; page-break-inside: avoid; break-inside: avoid;">
		<div style="font-size: 11px; font-weight: 900; color: #9f1239; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
			<span>СРОЧНО СВЯЗАТЬСЯ С КЛИНИКОЙ (${phone}) ПРИ:</span>
		</div>
		<ul style="margin: 0; padding-left: 18px; font-size: 11px; color: #881337; line-height: 1.4;">
			${memo.urgentTriggers.map((t) => `<li>${t}</li>`).join("")}
		</ul>
	</div>

	<div style="margin-top: 20px; padding-top: 12px; border-top: 1.5px solid #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; page-break-inside: avoid; break-inside: avoid;">
		<div>
			<div style="font-weight: 700; color: #0f172a;">Памятку получил(а), рекомендации понятны:</div>
			<div style="margin-top: 20px;">_________________________ / ${patient}</div>
			<div style="font-size: 9px; color: #64748b; margin-top: 2px;">(подпись пациента)</div>
		</div>

		<div style="width: 60px; height: 60px; border: 1.5px dashed #94a3b8; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase;">
			<span>М.П.</span>
		</div>

		<div style="text-align: right;">
			<div style="font-weight: 700; color: #0f172a;">Врач-стоматолог:</div>
			<div style="margin-top: 20px;">_________________________ / ${doctor}</div>
			<div style="font-size: 9px; color: #64748b; margin-top: 2px;">(подпись и личная печать)</div>
		</div>
	</div>
</div>`;
}

/** Клиническое фотоприложение к карте стоматологического пациента (Форма 043/у) */
export interface ClinicalPhotoAttachment {
	readonly id: string;
	readonly toothNumber?: number | undefined;
	readonly photoType: "before" | "after" | "process" | "intraoral_macro" | "face_portrait";
	readonly photoUrl: string;
	readonly description?: string | undefined;
	readonly capturedAtIso?: string | undefined;
}

/** Генерация ведомости фотоприложений («До / После») для формы 043/у */
export function generatePhotoProtocolAttachmentsStatement(
	photos: readonly ClinicalPhotoAttachment[],
): string {
	if (!photos || photos.length === 0) return "";

	const typeLabels: Record<string, string> = {
		before: "Исходная ситуация (До лечения)",
		after: "Финальный результат (После лечения)",
		process: "Этап лечения (Изоляция / Препарирование / Обтурация)",
		intraoral_macro: "Внутриротовой макроснимок",
		face_portrait: "Портретная фотография лица",
	};

	const header = "ВЕДОМОСТЬ ФОТОПРОТОКОЛА И ПРИЛОЖЕНИЙ (Форма 043/у):";
	const lines = photos.map((p, idx) => {
		const toothStr = p.toothNumber ? `Зуб ${p.toothNumber}` : "Общий вид зубного ряда";
		const typeStr = typeLabels[p.photoType] || "Фотоснимок";
		const descStr = p.description ? ` (${p.description})` : "";
		const dateStr = p.capturedAtIso ? ` [${new Date(p.capturedAtIso).toLocaleDateString("ru-RU")}]` : "";
		return `${idx + 1}. [${toothStr}] ${typeStr}${descStr}${dateStr}`;
	});

	return `${header}\n${lines.join("\n")}`;
}
