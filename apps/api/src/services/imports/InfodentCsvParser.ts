/**
 * Infodent / Infoclinica / Denta Office CSV & Delimited Exporter Parser.
 *
 * Поддерживает парсинг выгрузок МИС Инфодент, Инфоклиника, Denta Office:
 * - Разделители: ;, ,, \t, |
 * - Автоопределение заголовков, кодировок и сущностей (пациенты, визиты, счета/оплаты, прайс-лист)
 * - Нормализация ФИО, дат рождения (DD.MM.YYYY -> YYYY-MM-DD), телефонов в E.164 (+7XXXXXXXXXX), полов и денежных сумм в копейках.
 */

export interface InfodentPatientRecord {
	externalId: string;
	fullName: string;
	lastName: string;
	firstName: string;
	middleName: string;
	birthDate: string | null;
	phone: string | null;
	secondaryPhone: string | null;
	email: string | null;
	gender: "male" | "female" | "unknown";
	address: string | null;
	notes: string | null;
	discountCard: string | null;
	balanceRub: number | null;
	balanceKopecks: number | null;
	passport: string | null;
	snils: string | null;
	inn: string | null;
	sourceRow: number;
	rawValues: Record<string, string>;
}

export interface InfodentVisitRecord {
	externalId: string;
	patientRef: string;
	doctorRef: string | null;
	doctorName: string | null;
	date: string;
	time: string | null;
	startsAt: string | null;
	endsAt: string | null;
	durationMinutes: number | null;
	status: "scheduled" | "completed" | "cancelled" | "no_show";
	reason: string | null;
	diagnosis: string | null;
	treatment: string | null;
	notes: string | null;
	sourceRow: number;
	rawValues: Record<string, string>;
}

export interface InfodentPaymentItem {
	code: string | null;
	name: string;
	quantity: number;
	priceRub: number;
	priceKopecks: number;
	sumRub: number;
	sumKopecks: number;
}

export interface InfodentPaymentRecord {
	externalId: string;
	patientRef: string;
	amountRub: number;
	amountKopecks: number;
	paidAt: string;
	method: "cash" | "card" | "sbp" | "transfer" | "insurance" | "other";
	note: string | null;
	items: InfodentPaymentItem[];
	sourceRow: number;
	rawValues: Record<string, string>;
}

export interface InfodentPriceItem {
	code: string;
	name: string;
	priceRub: number;
	priceKopecks: number;
	category: string | null;
	unit: string | null;
	sourceRow: number;
	rawValues: Record<string, string>;
}

export interface InfodentCsvParseResult {
	detectedEntity:
		| "patient"
		| "visit"
		| "payment"
		| "pricelist"
		| "mixed"
		| "unknown";
	delimiter: string;
	headers: string[];
	patients: InfodentPatientRecord[];
	visits: InfodentVisitRecord[];
	payments: InfodentPaymentRecord[];
	priceList: InfodentPriceItem[];
	rawRowCount: number;
	parsedRowCount: number;
	warnings: string[];
}

export interface InfodentCsvParserOptions {
	delimiter?: string;
	expectedEntity?: "patient" | "visit" | "payment" | "pricelist" | "auto";
	skipInvalidRows?: boolean;
}

// Алиасы колонок пациентов Инфодент/Инфоклиника
const PATIENT_HEADER_ALIASES = {
	externalId: [
		"nkart",
		"nomkart",
		"nomerkarty",
		"номеркарты",
		"номер_карты",
		"код",
		"kod",
		"id",
		"idpac",
		"npac",
		"код_пациента",
		"кодпациента",
		"kart",
		"karta",
	],
	fullName: [
		"fio",
		"фио",
		"fam_io",
		"pacient",
		"пациент",
		"клиент",
		"полноеимя",
		"полное_имя",
		"fullname",
		"name",
	],
	lastName: ["fam", "familia", "familiya", "фамилия", "surname", "lastname"],
	firstName: ["im", "imya", "имя", "firstname", "first_name"],
	middleName: [
		"ot",
		"otch",
		"otchestvo",
		"отчество",
		"middlename",
		"patronymic",
	],
	birthDate: [
		"drojd",
		"ddr",
		"datar",
		"datarojd",
		"datarojdeniya",
		"датарождения",
		"дата_рождения",
		"др",
		"д.р.",
		"birth",
		"birthday",
		"birthdate",
	],
	phone: [
		"tel",
		"telef",
		"telefon",
		"телефон",
		"моб",
		"мобильный",
		"мобтелефон",
		"сотовый",
		"phone",
		"mobile",
		"mobtel",
	],
	secondaryPhone: [
		"tel2",
		"teldom",
		"telrab",
		"доптелефон",
		"доп_телефон",
		"домашний",
		"рабочий",
		"второйтелефон",
	],
	email: ["email", "e-mail", "почта", "элпочта", "эл_почта", "epochta"],
	gender: ["pol", "пол", "sex", "gender"],
	address: [
		"adres",
		"adr",
		"адрес",
		"адреспроживания",
		"адрес_проживания",
		"address",
	],
	notes: [
		"prim",
		"primech",
		"primechanie",
		"примечание",
		"коммент",
		"комментарий",
		"notes",
		"zamet",
	],
	discountCard: [
		"skidka",
		"скидка",
		"картаскидки",
		"дисконт",
		"discount",
		"procent",
	],
	balance: ["balans", "баланс", "dolg", "долг", "balance"],
	passport: ["pasport", "паспорт", "passport", "doc"],
	snils: ["snils", "снилс"],
	inn: ["inn", "инн"],
};

// Алиасы колонок визитов Инфодент/Инфоклиника
const VISIT_HEADER_ALIASES = {
	externalId: ["kod", "id", "idpriem", "номер", "номер_приема", "id_visit"],
	patientRef: [
		"nkart",
		"nomkart",
		"idpac",
		"kodpac",
		"pacient",
		"пациент",
		"номеркарты",
	],
	doctorRef: [
		"kodvracha",
		"idvrach",
		"vrach_id",
		"doctor_id",
		"код_врача",
		"табельный",
	],
	doctorName: ["vrach", "врач", "doctor", "специалист", "фио_врача"],
	date: ["data", "datapriem", "datapriema", "дата", "дата_приема", "date"],
	time: ["vremya", "время", "time", "nachalo", "начало"],
	duration: ["dlit", "длительность", "минут", "duration"],
	status: ["status", "статус", "sostoyanie", "состояние"],
	reason: ["povod", "повод", "prichina", "причина", "жалобы", "цель"],
	diagnosis: ["diagnoz", "диагноз", "mkb", "мкб", "diagnosis"],
	treatment: ["lechenie", "лечение", "usluga", "услуга", "treatment"],
	notes: ["prim", "primech", "примечание", "комментарий", "notes"],
};

// Алиасы колонок оплат/счетов Инфодент/Инфоклиника
const PAYMENT_HEADER_ALIASES = {
	externalId: ["kod", "id", "nom", "номер", "id_check", "номер_счета"],
	patientRef: [
		"nkart",
		"nomkart",
		"idpac",
		"kodpac",
		"npac",
		"пациент",
		"номеркарты",
	],
	amount: [
		"summa",
		"сумма",
		"sum",
		"cena",
		"цена",
		"itogo",
		"итого",
		"koplate",
		"оплачено",
		"amount",
	],
	paidAt: [
		"data",
		"datopl",
		"dataopl",
		"dataoplaty",
		"дата",
		"дата_оплаты",
		"date",
	],
	method: [
		"vid",
		"vidopl",
		"sposob",
		"тип_оплаты",
		"способ_оплаты",
		"вид_оплаты",
		"kassa",
		"касса",
	],
	note: ["prim", "primech", "примечание", "назначение", "комментарий"],
	serviceName: ["usluga", "услуга", "naimenovanie", "наименование", "работа"],
};

// Алиасы колонок прайс-листа Инфодент/Инфоклиника
const PRICELIST_HEADER_ALIASES = {
	code: ["artikul", "артикул", "kod", "код", "id", "code", "номер"],
	name: [
		"naimenovanie",
		"наименование",
		"usluga",
		"услуга",
		"nazvanie",
		"название",
		"name",
		"title",
	],
	price: [
		"cena",
		"цена",
		"stoimost",
		"стоимость",
		"price",
		"tarif",
		"тариф",
		"сумма",
	],
	category: [
		"kategoriya",
		"категория",
		"razdel",
		"раздел",
		"gruppa",
		"группа",
		"otdel",
		"отделение",
	],
	unit: ["ed", "ед", "edizm", "ед_изм", "unit", "штука"],
};

export class InfodentCsvParser {
	/**
	 * Главный метод парсинга CSV контента Инфодент
	 */
	public static parse(
		csvContent: string,
		options: InfodentCsvParserOptions = {},
	): InfodentCsvParseResult {
		const warnings: string[] = [];
		const trimmedContent = csvContent.trim();
		if (!trimmedContent) {
			return {
				detectedEntity: "unknown",
				delimiter: ";",
				headers: [],
				patients: [],
				visits: [],
				payments: [],
				priceList: [],
				rawRowCount: 0,
				parsedRowCount: 0,
				warnings: ["CSV контент пуст."],
			};
		}

		const delimiter =
			options.delimiter || InfodentCsvParser.detectDelimiter(trimmedContent);
		const rows = InfodentCsvParser.parseCsvRows(trimmedContent, delimiter);
		if (!rows.length) {
			return {
				detectedEntity: "unknown",
				delimiter,
				headers: [],
				patients: [],
				visits: [],
				payments: [],
				priceList: [],
				rawRowCount: 0,
				parsedRowCount: 0,
				warnings: ["Не удалось выделить строки таблицы."],
			};
		}

		// Ищем строку заголовка (пропускаем преамбулу отчета, если она есть)
		const { headerIndex, headers } = InfodentCsvParser.findHeaderRow(rows);
		const dataRows = rows.slice(headerIndex + 1);

		const entityKind =
			options.expectedEntity && options.expectedEntity !== "auto"
				? options.expectedEntity
				: InfodentCsvParser.detectEntityKind(headers);

		const patients: InfodentPatientRecord[] = [];
		const visits: InfodentVisitRecord[] = [];
		const payments: InfodentPaymentRecord[] = [];
		const priceList: InfodentPriceItem[] = [];

		if (entityKind === "patient" || entityKind === "unknown") {
			const parsed = InfodentCsvParser.extractPatients(
				headers,
				dataRows,
				headerIndex + 2,
				warnings,
			);
			patients.push(...parsed);
		}
		if (entityKind === "visit") {
			const parsed = InfodentCsvParser.extractVisits(
				headers,
				dataRows,
				headerIndex + 2,
				warnings,
			);
			visits.push(...parsed);
		}
		if (entityKind === "payment") {
			const parsed = InfodentCsvParser.extractPayments(
				headers,
				dataRows,
				headerIndex + 2,
				warnings,
			);
			payments.push(...parsed);
		}
		if (entityKind === "pricelist") {
			const parsed = InfodentCsvParser.extractPriceList(
				headers,
				dataRows,
				headerIndex + 2,
				warnings,
			);
			priceList.push(...parsed);
		}

		const parsedRowCount =
			patients.length + visits.length + payments.length + priceList.length;

		return {
			detectedEntity: entityKind,
			delimiter,
			headers,
			patients,
			visits,
			payments,
			priceList,
			rawRowCount: dataRows.length,
			parsedRowCount,
			warnings,
		};
	}

	/**
	 * Быстрый парсер только пациентов
	 */
	public static parsePatients(
		csvContent: string,
		options?: InfodentCsvParserOptions,
	): InfodentPatientRecord[] {
		const result = InfodentCsvParser.parse(csvContent, {
			...options,
			expectedEntity: "patient",
		});
		return result.patients;
	}

	/**
	 * Быстрый парсер визитов
	 */
	public static parseVisits(
		csvContent: string,
		options?: InfodentCsvParserOptions,
	): InfodentVisitRecord[] {
		const result = InfodentCsvParser.parse(csvContent, {
			...options,
			expectedEntity: "visit",
		});
		return result.visits;
	}

	/**
	 * Быстрый парсер оплат
	 */
	public static parsePayments(
		csvContent: string,
		options?: InfodentCsvParserOptions,
	): InfodentPaymentRecord[] {
		const result = InfodentCsvParser.parse(csvContent, {
			...options,
			expectedEntity: "payment",
		});
		return result.payments;
	}

	/**
	 * Быстрый парсер прайс-листа
	 */
	public static parsePriceList(
		csvContent: string,
		options?: InfodentCsvParserOptions,
	): InfodentPriceItem[] {
		const result = InfodentCsvParser.parse(csvContent, {
			...options,
			expectedEntity: "pricelist",
		});
		return result.priceList;
	}

	/**
	 * Определение разделителя CSV (; , \t |)
	 */
	public static detectDelimiter(text: string): string {
		const firstLines = text
			.split(/\r?\n/)
			.slice(0, 10)
			.filter((l) => l.trim().length > 0);
		if (!firstLines.length) return ";";

		const delimiters = [";", ",", "\t", "|"];
		let bestDelimiter = ";";
		let maxScore = -1;

		for (const d of delimiters) {
			let totalCols = 0;
			let lineCount = 0;
			for (const line of firstLines) {
				const cols = line.split(d).length;
				if (cols > 1) {
					totalCols += cols;
					lineCount++;
				}
			}
			if (lineCount > 0) {
				const score = totalCols * (lineCount / firstLines.length);
				if (score > maxScore) {
					maxScore = score;
					bestDelimiter = d;
				}
			}
		}

		return bestDelimiter;
	}

	/**
	 * Поиск строки заголовков с пропуском служебных строк отчета
	 */
	private static findHeaderRow(rows: string[][]): {
		headerIndex: number;
		headers: string[];
	} {
		for (let i = 0; i < Math.min(rows.length, 15); i++) {
			const candidateRow = rows[i];
			if (!candidateRow) continue;
			const normalizedRow = candidateRow.map((c) =>
				InfodentCsvParser.normalizeHeader(c),
			);
			const hasPatientHeader = normalizedRow.some((h) =>
				PATIENT_HEADER_ALIASES.fullName.includes(h),
			);
			const hasVisitHeader = normalizedRow.some((h) =>
				VISIT_HEADER_ALIASES.date.includes(h),
			);
			const hasPaymentHeader = normalizedRow.some((h) =>
				PAYMENT_HEADER_ALIASES.amount.includes(h),
			);
			const hasPriceHeader = normalizedRow.some(
				(h) =>
					PRICELIST_HEADER_ALIASES.name.includes(h) &&
					PRICELIST_HEADER_ALIASES.price.includes(h),
			);

			if (
				hasPatientHeader ||
				hasVisitHeader ||
				hasPaymentHeader ||
				hasPriceHeader
			) {
				return { headerIndex: i, headers: candidateRow.map((c) => c.trim()) };
			}
		}
		// Если сигнатуры не найдены, считаем 0-ю строку заголовком
		const first = rows[0] || [];
		return { headerIndex: 0, headers: first.map((c) => c.trim()) };
	}

	/**
	 * Определение типа сущности по колонкам
	 */
	public static detectEntityKind(
		headers: string[],
	): "patient" | "visit" | "payment" | "pricelist" | "unknown" {
		const normalized = headers.map((h) => InfodentCsvParser.normalizeHeader(h));

		let patientScore = 0;
		let visitScore = 0;
		let paymentScore = 0;
		let priceScore = 0;

		for (const h of normalized) {
			if (PATIENT_HEADER_ALIASES.fullName.includes(h)) patientScore += 4;
			if (PATIENT_HEADER_ALIASES.phone.includes(h)) patientScore += 3;
			if (PATIENT_HEADER_ALIASES.birthDate.includes(h)) patientScore += 3;
			if (PATIENT_HEADER_ALIASES.externalId.includes(h)) patientScore += 1;

			if (VISIT_HEADER_ALIASES.date.includes(h)) visitScore += 3;
			if (VISIT_HEADER_ALIASES.doctorName.includes(h)) visitScore += 3;
			if (VISIT_HEADER_ALIASES.reason.includes(h)) visitScore += 2;
			if (VISIT_HEADER_ALIASES.diagnosis.includes(h)) visitScore += 3;

			if (PAYMENT_HEADER_ALIASES.amount.includes(h)) paymentScore += 4;
			if (PAYMENT_HEADER_ALIASES.paidAt.includes(h)) paymentScore += 3;
			if (PAYMENT_HEADER_ALIASES.method.includes(h)) paymentScore += 2;

			if (PRICELIST_HEADER_ALIASES.price.includes(h)) priceScore += 3;
			if (PRICELIST_HEADER_ALIASES.name.includes(h)) priceScore += 3;
			if (PRICELIST_HEADER_ALIASES.category.includes(h)) priceScore += 2;
		}

		if (
			patientScore > visitScore &&
			patientScore > paymentScore &&
			patientScore > priceScore
		)
			return "patient";
		if (
			visitScore > patientScore &&
			visitScore > paymentScore &&
			visitScore > priceScore
		)
			return "visit";
		if (
			paymentScore > patientScore &&
			paymentScore > visitScore &&
			paymentScore > priceScore
		)
			return "payment";
		if (
			priceScore > patientScore &&
			priceScore > visitScore &&
			priceScore > paymentScore
		)
			return "pricelist";

		return "patient"; // По умолчанию
	}

	/**
	 * Извлечение пациентов из строк таблицы
	 */
	private static extractPatients(
		headers: string[],
		rows: string[][],
		startLineNumber: number,
		warnings: string[],
	): InfodentPatientRecord[] {
		const mapping = InfodentCsvParser.buildColumnMapping(
			headers,
			PATIENT_HEADER_ALIASES,
		);
		const records: InfodentPatientRecord[] = [];

		rows.forEach((row, rowIndex) => {
			const sourceRow = startLineNumber + rowIndex;
			if (row.length === 0 || (row.length === 1 && !row[0]?.trim())) return;

			const rawValues: Record<string, string> = {};
			headers.forEach((h, i) => {
				rawValues[h] = row[i]?.trim() ?? "";
			});

			const getValue = (key: keyof typeof PATIENT_HEADER_ALIASES): string => {
				const colIndex = mapping[key];
				if (colIndex === undefined || colIndex < 0) return "";
				return row[colIndex]?.trim() ?? "";
			};

			const rawFullName = getValue("fullName");
			const rawLastName = getValue("lastName");
			const rawFirstName = getValue("firstName");
			const rawMiddleName = getValue("middleName");

			let fullName = rawFullName;
			let lastName = rawLastName;
			let firstName = rawFirstName;
			let middleName = rawMiddleName;

			if (!fullName && (lastName || firstName)) {
				fullName = [lastName, firstName, middleName]
					.filter(Boolean)
					.join(" ");
			} else if (fullName && (!lastName || !firstName)) {
				const split = InfodentCsvParser.splitFullName(fullName);
				lastName = split.lastName;
				firstName = split.firstName;
				middleName = split.middleName;
			}

			// Если строка пустая и нет ФИО
			if (!fullName && !getValue("phone") && !getValue("externalId")) {
				return;
			}

			const phone = InfodentCsvParser.normalizePhone(getValue("phone"));
			const secondaryPhone = InfodentCsvParser.normalizePhone(
				getValue("secondaryPhone"),
			);
			const birthDate = InfodentCsvParser.normalizeDate(getValue("birthDate"));
			const gender = InfodentCsvParser.normalizeGender(getValue("gender"));
			const balanceKopecks = InfodentCsvParser.parseKopecks(
				getValue("balance"),
			);

			records.push({
				externalId: getValue("externalId") || `infodent-row-${sourceRow}`,
				fullName: fullName || "Не указано",
				lastName: lastName || "",
				firstName: firstName || "",
				middleName: middleName || "",
				birthDate,
				phone,
				secondaryPhone,
				email: getValue("email") || null,
				gender,
				address: getValue("address") || null,
				notes: getValue("notes") || null,
				discountCard: getValue("discountCard") || null,
				balanceRub:
					balanceKopecks !== null
						? Math.round(balanceKopecks) / 100
						: null,
				balanceKopecks,
				passport: getValue("passport") || null,
				snils: getValue("snils") || null,
				inn: getValue("inn") || null,
				sourceRow,
				rawValues,
			});
		});

		return records;
	}

	/**
	 * Извлечение визитов
	 */
	private static extractVisits(
		headers: string[],
		rows: string[][],
		startLineNumber: number,
		warnings: string[],
	): InfodentVisitRecord[] {
		const mapping = InfodentCsvParser.buildColumnMapping(
			headers,
			VISIT_HEADER_ALIASES,
		);
		const records: InfodentVisitRecord[] = [];

		rows.forEach((row, rowIndex) => {
			const sourceRow = startLineNumber + rowIndex;
			if (row.length === 0 || (row.length === 1 && !row[0]?.trim())) return;

			const rawValues: Record<string, string> = {};
			headers.forEach((h, i) => {
				rawValues[h] = row[i]?.trim() ?? "";
			});

			const getValue = (key: keyof typeof VISIT_HEADER_ALIASES): string => {
				const colIndex = mapping[key];
				if (colIndex === undefined || colIndex < 0) return "";
				return row[colIndex]?.trim() ?? "";
			};

			const date =
				InfodentCsvParser.normalizeDate(getValue("date")) ||
				new Date().toISOString().slice(0, 10);
			const time = getValue("time") || null;
			let startsAt: string | null = null;
			let endsAt: string | null = null;
			const durationMinutes =
				Number.parseInt(getValue("duration"), 10) || null;

			if (date && time) {
				try {
					const timeMatch = time.match(/(\d{1,2})[:.](\d{2})/);
					if (timeMatch) {
						const hh = (timeMatch[1] ?? "00").padStart(2, "0");
						const mm = (timeMatch[2] ?? "00").padStart(2, "0");
						startsAt = `${date}T${hh}:${mm}:00Z`;
						if (durationMinutes) {
							const endMinTotal =
								Number.parseInt(hh, 10) * 60 +
								Number.parseInt(mm, 10) +
								durationMinutes;
							const endHh = String(
								Math.floor(endMinTotal / 60) % 24,
							).padStart(2, "0");
							const endMm = String(endMinTotal % 60).padStart(2, "0");
							endsAt = `${date}T${endHh}:${endMm}:00Z`;
						}
					}
				} catch {
					// Игнорируем ошибку сборки ISO даты
				}
			}

			const rawStatus = getValue("status").toLowerCase();
			let status: InfodentVisitRecord["status"] = "completed";
			if (/план|запис|предвар|sched/i.test(rawStatus)) status = "scheduled";
			else if (/отмен|cancel/i.test(rawStatus)) status = "cancelled";
			else if (/неявк|не\s*пришел|no\s*show/i.test(rawStatus))
				status = "no_show";

			records.push({
				externalId: getValue("externalId") || `visit-${sourceRow}`,
				patientRef:
					getValue("patientRef") || `patient-unknown-${sourceRow}`,
				doctorRef: getValue("doctorRef") || null,
				doctorName: getValue("doctorName") || null,
				date,
				time,
				startsAt,
				endsAt,
				durationMinutes,
				status,
				reason: getValue("reason") || null,
				diagnosis: getValue("diagnosis") || null,
				treatment: getValue("treatment") || null,
				notes: getValue("notes") || null,
				sourceRow,
				rawValues,
			});
		});

		return records;
	}

	/**
	 * Извлечение оплат
	 */
	private static extractPayments(
		headers: string[],
		rows: string[][],
		startLineNumber: number,
		warnings: string[],
	): InfodentPaymentRecord[] {
		const mapping = InfodentCsvParser.buildColumnMapping(
			headers,
			PAYMENT_HEADER_ALIASES,
		);
		const records: InfodentPaymentRecord[] = [];

		rows.forEach((row, rowIndex) => {
			const sourceRow = startLineNumber + rowIndex;
			if (row.length === 0 || (row.length === 1 && !row[0]?.trim())) return;

			const rawValues: Record<string, string> = {};
			headers.forEach((h, i) => {
				rawValues[h] = row[i]?.trim() ?? "";
			});

			const getValue = (key: keyof typeof PAYMENT_HEADER_ALIASES): string => {
				const colIndex = mapping[key];
				if (colIndex === undefined || colIndex < 0) return "";
				return row[colIndex]?.trim() ?? "";
			};

			const amountKopecks =
				InfodentCsvParser.parseKopecks(getValue("amount")) ?? 0;
			const amountRub = Math.round(amountKopecks) / 100;
			const paidAt =
				InfodentCsvParser.normalizeDate(getValue("paidAt")) ||
				new Date().toISOString().slice(0, 10);

			const rawMethod = getValue("method").toLowerCase();
			let method: InfodentPaymentRecord["method"] = "cash";
			if (/карт|card|безнал|терминал|terminal|pos/i.test(rawMethod))
				method = "card";
			else if (/сбп|sbp|qr|qr-код/i.test(rawMethod)) method = "sbp";
			else if (/р\/с|расчетн|перевод|банк|transfer/i.test(rawMethod))
				method = "transfer";
			else if (/страх|дмс|омс|insur/i.test(rawMethod)) method = "insurance";

			const serviceName = getValue("serviceName");
			const items: InfodentPaymentItem[] = [];
			if (serviceName) {
				items.push({
					code: null,
					name: serviceName,
					quantity: 1,
					priceRub: amountRub,
					priceKopecks: amountKopecks,
					sumRub: amountRub,
					sumKopecks: amountKopecks,
				});
			}

			records.push({
				externalId: getValue("externalId") || `payment-${sourceRow}`,
				patientRef:
					getValue("patientRef") || `patient-unknown-${sourceRow}`,
				amountRub,
				amountKopecks,
				paidAt,
				method,
				note: getValue("note") || null,
				items,
				sourceRow,
				rawValues,
			});
		});

		return records;
	}

	/**
	 * Извлечение прайс-листа
	 */
	private static extractPriceList(
		headers: string[],
		rows: string[][],
		startLineNumber: number,
		warnings: string[],
	): InfodentPriceItem[] {
		const mapping = InfodentCsvParser.buildColumnMapping(
			headers,
			PRICELIST_HEADER_ALIASES,
		);
		const records: InfodentPriceItem[] = [];

		rows.forEach((row, rowIndex) => {
			const sourceRow = startLineNumber + rowIndex;
			if (row.length === 0 || (row.length === 1 && !row[0]?.trim())) return;

			const rawValues: Record<string, string> = {};
			headers.forEach((h, i) => {
				rawValues[h] = row[i]?.trim() ?? "";
			});

			const getValue = (key: keyof typeof PRICELIST_HEADER_ALIASES): string => {
				const colIndex = mapping[key];
				if (colIndex === undefined || colIndex < 0) return "";
				return row[colIndex]?.trim() ?? "";
			};

			const name = getValue("name");
			if (!name) return;

			const priceKopecks =
				InfodentCsvParser.parseKopecks(getValue("price")) ?? 0;
			const priceRub = Math.round(priceKopecks) / 100;

			records.push({
				code: getValue("code") || `price-item-${sourceRow}`,
				name,
				priceRub,
				priceKopecks,
				category: getValue("category") || null,
				unit: getValue("unit") || "усл.",
				sourceRow,
				rawValues,
			});
		});

		return records;
	}

	/**
	 * Построение карты соответствия колонок
	 */
	private static buildColumnMapping<T extends Record<string, string[]>>(
		headers: string[],
		aliasMap: T,
	): Record<keyof T, number> {
		const result = {} as Record<keyof T, number>;
		const normalizedHeaders = headers.map((h) =>
			InfodentCsvParser.normalizeHeader(h),
		);

		for (const [targetKey, aliases] of Object.entries(aliasMap)) {
			let foundIdx = -1;
			for (const alias of aliases as string[]) {
				const idx = normalizedHeaders.indexOf(alias);
				if (idx >= 0) {
					foundIdx = idx;
					break;
				}
			}
			// Частичный поиск, если точного совпадения нет
			if (foundIdx === -1) {
				for (const alias of aliases as string[]) {
					const idx = normalizedHeaders.findIndex(
						(h) => h.includes(alias) || alias.includes(h),
					);
					if (idx >= 0) {
						foundIdx = idx;
						break;
					}
				}
			}
			if (foundIdx >= 0) {
				result[targetKey as keyof T] = foundIdx;
			}
		}

		return result;
	}

	/**
	 * Разбор CSV с учетом кавычек и экранирования
	 */
	public static parseCsvRows(content: string, delimiter: string): string[][] {
		const rows: string[][] = [];
		let currentRow: string[] = [];
		let currentCell = "";
		let inQuotes = false;

		const len = content.length;
		for (let i = 0; i < len; i++) {
			const char = content[i];
			const nextChar = content[i + 1];

			if (inQuotes) {
				if (char === '"') {
					if (nextChar === '"') {
						currentCell += '"';
						i++; // Пропускаем сдвоенную кавычку
					} else {
						inQuotes = false;
					}
				} else {
					currentCell += char;
				}
			} else {
				if (char === '"') {
					inQuotes = true;
				} else if (char === delimiter) {
					currentRow.push(currentCell);
					currentCell = "";
				} else if (char === "\r") {
					if (nextChar === "\n") i++;
					currentRow.push(currentCell);
					rows.push(currentRow);
					currentRow = [];
					currentCell = "";
				} else if (char === "\n") {
					currentRow.push(currentCell);
					rows.push(currentRow);
					currentRow = [];
					currentCell = "";
				} else {
					currentCell += char;
				}
			}
		}

		if (currentCell || currentRow.length > 0) {
			currentRow.push(currentCell);
			rows.push(currentRow);
		}

		return rows;
	}

	/**
	 * Преобразование разобранных пациентов в канонический формат DENTE CSV
	 */
	public static toDentePatientCsv(patients: InfodentPatientRecord[]): string {
		const header = "ФИО;Телефон;Дата рождения;Комментарий";
		const lines = patients.map((p) => {
			const notes = [
				p.notes,
				p.address ? `Адрес: ${p.address}` : null,
				p.discountCard ? `Скидка: ${p.discountCard}` : null,
				p.balanceRub !== null ? `Баланс: ${p.balanceRub} руб.` : null,
				p.passport ? `Паспорт: ${p.passport}` : null,
			]
				.filter(Boolean)
				.join(" | ");

			const phoneStr = p.phone ?? "";
			const birthDateStr = p.birthDate ?? "";
			const escapedNotes = notes.includes(";") ? `"${notes}"` : notes;

			return `${p.fullName};${phoneStr};${birthDateStr};${escapedNotes}`;
		});

		return [header, ...lines].join("\n");
	}

	// Хелперы нормализации
	public static normalizeHeader(value: string): string {
		return value
			.toLowerCase()
			.replace(/[\s_.-]+/g, "")
			.replace(/[^a-zа-яё0-9]/gi, "")
			.trim();
	}

	public static normalizePhone(value: string | null | undefined): string | null {
		if (!value) return null;
		const digits = value.replace(/\D/g, "");
		if (digits.length === 10) return `+7${digits}`;
		if (digits.length === 11 && digits.startsWith("8"))
			return `+7${digits.slice(1)}`;
		if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
		if (digits.length >= 7 && digits.length <= 15) return `+${digits}`;
		return null;
	}

	public static normalizeDate(value: string | null | undefined): string | null {
		if (!value) return null;
		const trimmed = value.trim();

		// DD.MM.YYYY или DD/MM/YYYY или DD-MM-YYYY
		const ruMatch = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
		if (ruMatch) {
			const day = (ruMatch[1] ?? "01").padStart(2, "0");
			const month = (ruMatch[2] ?? "01").padStart(2, "0");
			const year = ruMatch[3] ?? "2000";
			return `${year}-${month}-${day}`;
		}

		// YYYY-MM-DD или YYYY.MM.DD
		const isoMatch = trimmed.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
		if (isoMatch) {
			const year = isoMatch[1] ?? "2000";
			const month = (isoMatch[2] ?? "01").padStart(2, "0");
			const day = (isoMatch[3] ?? "01").padStart(2, "0");
			return `${year}-${month}-${day}`;
		}

		return null;
	}

	public static normalizeGender(
		value: string | null | undefined,
	): "male" | "female" | "unknown" {
		if (!value) return "unknown";
		const str = value.trim().toLowerCase();
		if (/^(m|male|муж|м|1)$/i.test(str)) return "male";
		if (/^(f|female|жен|ж|2)$/i.test(str)) return "female";
		return "unknown";
	}

	public static splitFullName(fullName: string): {
		lastName: string;
		firstName: string;
		middleName: string;
	} {
		const parts = fullName
			.trim()
			.split(/\s+/)
			.filter(Boolean);
		return {
			lastName: parts[0] ?? "",
			firstName: parts[1] ?? "",
			middleName: parts.slice(2).join(" "),
		};
	}

	public static parseKopecks(value: string | null | undefined): number | null {
		if (!value) return null;
		const cleaned = value.replace(/\s+/g, "").replace(",", ".");
		const num = Number.parseFloat(cleaned);
		if (Number.isNaN(num)) return null;
		return Math.round(num * 100);
	}
}
