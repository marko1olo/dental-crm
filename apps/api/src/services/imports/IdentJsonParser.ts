/**
 * IDENT / StomX JSON Export & API Integration Parser.
 *
 * Модульный парсер JSON-структур экспорта МИС IDENT:
 * - Пациенты (patients / clients / kartoteka)
 * - Расписание, приемы и визиты (appointments / visits / priemy / schedule)
 * - Чеки, счета, оплаты и оказанные услуги (invoices / payments / bills / checks)
 * - Прейскурант и справочник услуг (pricelist / services / price_items)
 *
 * Поддерживает форматы:
 * 1. Комплексный объект со свойствами коллекций `{ patients: [...], appointments: [...], ... }`
 * 2. Массив сущностей с дискриминатором вида `[ { type: "patient", data: {...} }, ... ]`
 * 3. Прямой массив объектов сущностей `[ { id: 1, fullName: "..." }, ... ]`
 */

export interface IdentPatientRecord {
	id: string;
	code: string | null;
	cardNumber: string | null;
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
	comment: string | null;
	notes: string | null;
	discountPercent: number | null;
	balanceRub: number | null;
	balanceKopecks: number | null;
	source: string | null;
	tags: string[];
	firstVisitDate: string | null;
	rawObject: Record<string, unknown>;
}

export interface IdentVisitRecord {
	id: string;
	patientId: string;
	doctorId: string | null;
	doctorName: string | null;
	doctorSpecialty: string | null;
	date: string;
	time: string | null;
	startDateTime: string | null;
	endDateTime: string | null;
	durationMinutes: number | null;
	status: "scheduled" | "completed" | "cancelled" | "no_show";
	complaint: string | null;
	anamnesis: string | null;
	diagnosis: string | null;
	treatment: string | null;
	comment: string | null;
	notes: string | null;
	cabinet: string | null;
	rawObject: Record<string, unknown>;
}

export interface IdentInvoiceServiceItem {
	id: string | null;
	code: string | null;
	title: string;
	quantity: number;
	priceRub: number;
	priceKopecks: number;
	discountRub: number | null;
	totalRub: number;
	totalKopecks: number;
	tooth: string | null;
	doctorId: string | null;
}

export interface IdentInvoiceRecord {
	id: string;
	patientId: string;
	appointmentId: string | null;
	date: string;
	amountRub: number;
	amountKopecks: number;
	paidRub: number;
	paidKopecks: number;
	discountRub: number | null;
	status: "issued" | "paid" | "partially_paid" | "void";
	method: "cash" | "card" | "sbp" | "transfer" | "deposit" | "insurance";
	note: string | null;
	services: IdentInvoiceServiceItem[];
	rawObject: Record<string, unknown>;
}

export interface IdentPriceItem {
	id: string;
	code: string | null;
	article: string | null;
	title: string;
	category: string | null;
	categoryPath: string | null;
	priceRub: number;
	priceKopecks: number;
	costRub: number | null;
	costKopecks: number | null;
	unit: string | null;
	isActive: boolean;
	rawObject: Record<string, unknown>;
}

export interface IdentDocumentMetadata {
	clinicName: string | null;
	generatedAt: string | null;
	version: string | null;
	format: string;
}

export interface IdentJsonParseResult {
	metadata: IdentDocumentMetadata;
	patients: IdentPatientRecord[];
	visits: IdentVisitRecord[];
	invoices: IdentInvoiceRecord[];
	priceList: IdentPriceItem[];
	totalRecords: number;
	warnings: string[];
}

export class IdentJsonParser {
	/**
	 * Проверка, является ли строка или объект валидным IDENT JSON
	 */
	public static isIdentJson(input: unknown): boolean {
		if (!input) return false;
		if (typeof input === "string") {
			const trimmed = input.trim();
			if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return false;
			try {
				const parsed = JSON.parse(trimmed);
				return IdentJsonParser.isIdentJson(parsed);
			} catch {
				return false;
			}
		}

		if (typeof input === "object" && input !== null) {
			if (Array.isArray(input)) {
				if (input.length === 0) return false;
				const first = input[0];
				if (typeof first === "object" && first !== null) {
					return Boolean(
						"fio" in first ||
							"fullName" in first ||
							"pacient" in first ||
							"cardNumber" in first ||
							"kod" in first ||
							"nkart" in first ||
							"priem" in first ||
							"appointment" in first ||
							"oplata" in first,
					);
				}
				return false;
			}

			const keys = Object.keys(input);
			return keys.some((k) =>
				/^(patients|pacienty|appointments|priemy|visits|invoices|payments|oplaty|pricelist|services|price_items)$/i.test(
					k,
				),
			);
		}

		return false;
	}

	/**
	 * Главный метод парсинга IDENT JSON
	 */
	public static parse(input: string | unknown): IdentJsonParseResult {
		const warnings: string[] = [];
		let data: unknown;

		if (typeof input === "string") {
			const trimmed = input.trim();
			if (!trimmed) {
				return {
					metadata: {
						clinicName: null,
						generatedAt: null,
						version: null,
						format: "ident_json_v1",
					},
					patients: [],
					visits: [],
					invoices: [],
					priceList: [],
					totalRecords: 0,
					warnings: ["JSON контент пуст."],
				};
			}
			try {
				data = JSON.parse(trimmed);
			} catch (error) {
				warnings.push(
					`Синтаксическая ошибка JSON: ${error instanceof Error ? error.message : String(error)}`,
				);
				return {
					metadata: {
						clinicName: null,
						generatedAt: null,
						version: null,
						format: "ident_json_v1",
					},
					patients: [],
					visits: [],
					invoices: [],
					priceList: [],
					totalRecords: 0,
					warnings,
				};
			}
		} else {
			data = input;
		}

		const metadata: IdentDocumentMetadata = {
			clinicName: null,
			generatedAt: null,
			version: null,
			format: "ident_json_v1",
		};

		const patients: IdentPatientRecord[] = [];
		const visits: IdentVisitRecord[] = [];
		const invoices: IdentInvoiceRecord[] = [];
		const priceList: IdentPriceItem[] = [];

		if (typeof data === "object" && data !== null) {
			if (Array.isArray(data)) {
				// Обработка массива записей
				data.forEach((item, idx) => {
					if (typeof item !== "object" || item === null) return;
					const obj = item as Record<string, unknown>;
					const type = String(
						obj["type"] ||
							obj["entity"] ||
							obj["entityType"] ||
							obj["kind"] ||
							"",
					).toLowerCase();

					if (
						type.includes("patient") ||
						type.includes("пациент") ||
						type.includes("client")
					) {
						const subData = (obj["data"] ??
							obj) as Record<string, unknown>;
						patients.push(
							IdentJsonParser.mapPatientObject(subData, idx + 1),
						);
					} else if (
						type.includes("visit") ||
						type.includes("appointment") ||
						type.includes("прием")
					) {
						const subData = (obj["data"] ??
							obj) as Record<string, unknown>;
						visits.push(
							IdentJsonParser.mapVisitObject(subData, idx + 1),
						);
					} else if (
						type.includes("invoice") ||
						type.includes("payment") ||
						type.includes("оплат")
					) {
						const subData = (obj["data"] ??
							obj) as Record<string, unknown>;
						invoices.push(
							IdentJsonParser.mapInvoiceObject(subData, idx + 1),
						);
					} else if (
						type.includes("price") ||
						type.includes("service") ||
						type.includes("услуг")
					) {
						const subData = (obj["data"] ??
							obj) as Record<string, unknown>;
						priceList.push(
							IdentJsonParser.mapPriceObject(subData, idx + 1),
						);
					} else {
						// Эвристика по полям объекта
						if (
							"fio" in obj ||
							"fullName" in obj ||
							"cardNumber" in obj ||
							"birthDate" in obj
						) {
							patients.push(
								IdentJsonParser.mapPatientObject(obj, idx + 1),
							);
						} else if (
							"startDateTime" in obj ||
							"doctorId" in obj ||
							"datapriema" in obj
						) {
							visits.push(
								IdentJsonParser.mapVisitObject(obj, idx + 1),
							);
						} else if (
							"amount" in obj ||
							"summa" in obj ||
							"paidAmount" in obj
						) {
							invoices.push(
								IdentJsonParser.mapInvoiceObject(obj, idx + 1),
							);
						} else if (
							"price" in obj ||
							"cena" in obj ||
							"article" in obj
						) {
							priceList.push(
								IdentJsonParser.mapPriceObject(obj, idx + 1),
							);
						}
					}
				});
			} else {
				// Объект верхнего уровня с полями коллекций
				const root = data as Record<string, unknown>;
				if (root["clinic"] || root["clinicName"]) {
					metadata.clinicName = String(
						root["clinic"] || root["clinicName"],
					);
				}
				if (root["generatedAt"] || root["exportDate"] || root["date"]) {
					metadata.generatedAt = String(
						root["generatedAt"] ||
							root["exportDate"] ||
							root["date"],
					);
				}
				if (root["version"]) {
					metadata.version = String(root["version"]);
				}

				// Пациенты
				const rawPatients =
					root["patients"] ??
					root["pacienty"] ??
					root["clients"] ??
					root["kartoteka"];
				if (Array.isArray(rawPatients)) {
					rawPatients.forEach((p, idx) => {
						if (typeof p === "object" && p !== null) {
							patients.push(
								IdentJsonParser.mapPatientObject(
									p as Record<string, unknown>,
									idx + 1,
								),
							);
						}
					});
				}

				// Визиты / Приемы
				const rawVisits =
					root["appointments"] ??
					root["priemy"] ??
					root["visits"] ??
					root["schedule"];
				if (Array.isArray(rawVisits)) {
					rawVisits.forEach((v, idx) => {
						if (typeof v === "object" && v !== null) {
							visits.push(
								IdentJsonParser.mapVisitObject(
									v as Record<string, unknown>,
									idx + 1,
								),
							);
						}
					});
				}

				// Счета и оплаты
				const rawInvoices =
					root["invoices"] ??
					root["payments"] ??
					root["oplaty"] ??
					root["bills"] ??
					root["checks"];
				if (Array.isArray(rawInvoices)) {
					rawInvoices.forEach((inv, idx) => {
						if (typeof inv === "object" && inv !== null) {
							invoices.push(
								IdentJsonParser.mapInvoiceObject(
									inv as Record<string, unknown>,
									idx + 1,
								),
							);
						}
					});
				}

				// Прейскурант
				const rawPrices =
					root["pricelist"] ??
					root["services"] ??
					root["price_items"] ??
					root["uslugi"];
				if (Array.isArray(rawPrices)) {
					rawPrices.forEach((pr, idx) => {
						if (typeof pr === "object" && pr !== null) {
							priceList.push(
								IdentJsonParser.mapPriceObject(
									pr as Record<string, unknown>,
									idx + 1,
								),
							);
						}
					});
				}
			}
		}

		const totalRecords =
			patients.length +
			visits.length +
			invoices.length +
			priceList.length;

		return {
			metadata,
			patients,
			visits,
			invoices,
			priceList,
			totalRecords,
			warnings,
		};
	}

	public static parsePatients(input: string | unknown): IdentPatientRecord[] {
		return IdentJsonParser.parse(input).patients;
	}

	public static parseVisits(input: string | unknown): IdentVisitRecord[] {
		return IdentJsonParser.parse(input).visits;
	}

	public static parseInvoices(input: string | unknown): IdentInvoiceRecord[] {
		return IdentJsonParser.parse(input).invoices;
	}

	public static parsePriceList(input: string | unknown): IdentPriceItem[] {
		return IdentJsonParser.parse(input).priceList;
	}

	/**
	 * Маппинг объекта пациента IDENT
	 */
	private static mapPatientObject(
		obj: Record<string, unknown>,
		index: number,
	): IdentPatientRecord {
		const id = String(
			obj["id"] ||
				obj["kod"] ||
				obj["code"] ||
				obj["patientId"] ||
				obj["patient_id"] ||
				`ident-pat-${index}`,
		);
		const code = obj["code"] ? String(obj["code"]) : null;
		const cardNumber = String(
			obj["cardNumber"] ||
				obj["card_number"] ||
				obj["nkart"] ||
				obj["nomkart"] ||
				obj["chartNo"] ||
				"",
		).trim() || null;

		let fullName = String(
			obj["fullName"] ||
				obj["fio"] ||
				obj["name"] ||
				obj["pacient"] ||
				obj["full_name"] ||
				"",
		).trim();
		let lastName = String(
			obj["lastName"] ||
				obj["surname"] ||
				obj["familiya"] ||
				obj["last_name"] ||
				"",
		).trim();
		let firstName = String(
			obj["firstName"] ||
				obj["name"] ||
				obj["imya"] ||
				obj["first_name"] ||
				"",
		).trim();
		let middleName = String(
			obj["middleName"] ||
				obj["patronymic"] ||
				obj["otchestvo"] ||
				obj["middle_name"] ||
				"",
		).trim();

		if (!fullName && (lastName || firstName)) {
			fullName = [lastName, firstName, middleName]
				.filter(Boolean)
				.join(" ");
		} else if (fullName && (!lastName || !firstName)) {
			const parts = fullName.split(/\s+/);
			lastName = parts[0] ?? "";
			firstName = parts[1] ?? "";
			middleName = parts.slice(2).join(" ");
		}

		const birthDate = IdentJsonParser.normalizeDate(
			(obj["birthDate"] ??
				obj["birthday"] ??
				obj["birth_date"] ??
				obj["drojd"] ??
				obj["dr"]) as string,
		);

		const phone = IdentJsonParser.normalizePhone(
			(obj["phone"] ??
				obj["mobile"] ??
				obj["cellPhone"] ??
				obj["tel"] ??
				obj["telefon"]) as string,
		);

		const secondaryPhone = IdentJsonParser.normalizePhone(
			(obj["secondaryPhone"] ??
				obj["phoneSecondary"] ??
				obj["homePhone"] ??
				obj["tel2"]) as string,
		);

		const email = obj["email"] ? String(obj["email"]).trim() : null;
		const gender = IdentJsonParser.normalizeGender(
			(obj["gender"] ?? obj["sex"] ?? obj["pol"]) as string,
		);
		const address = obj["address"] ? String(obj["address"]).trim() : null;
		const comment = obj["comment"] ? String(obj["comment"]).trim() : null;
		const notes = obj["notes"] ? String(obj["notes"]).trim() : null;

		const discountPercent =
			typeof obj["discountPercent"] === "number"
				? obj["discountPercent"]
				: typeof obj["discount"] === "number"
					? obj["discount"]
					: null;

		const rawBalance = (obj["balance"] ??
			obj["accountBalance"] ??
			obj["balans"] ??
			obj["dolg"]) as string | number;
		const balanceKopecks = IdentJsonParser.parseKopecks(rawBalance);
		const balanceRub =
			balanceKopecks !== null ? Math.round(balanceKopecks) / 100 : null;

		const source = obj["source"] ? String(obj["source"]).trim() : null;
		const tags: string[] = [];
		if (Array.isArray(obj["tags"])) {
			obj["tags"].forEach((t) => tags.push(String(t)));
		} else if (typeof obj["tags"] === "string") {
			tags.push(...obj["tags"].split(",").map((s) => s.trim()));
		}

		const firstVisitDate = IdentJsonParser.normalizeDate(
			obj["firstVisitDate"] as string,
		);

		return {
			id,
			code,
			cardNumber,
			fullName: fullName || "Не указано",
			lastName,
			firstName,
			middleName,
			birthDate,
			phone,
			secondaryPhone,
			email,
			gender,
			address,
			comment,
			notes,
			discountPercent,
			balanceRub,
			balanceKopecks,
			source,
			tags,
			firstVisitDate,
			rawObject: obj,
		};
	}

	/**
	 * Маппинг объекта визита IDENT
	 */
	private static mapVisitObject(
		obj: Record<string, unknown>,
		index: number,
	): IdentVisitRecord {
		const id = String(
			obj["id"] ||
				obj["appointmentId"] ||
				obj["visitId"] ||
				obj["kod"] ||
				`ident-visit-${index}`,
		);
		const patientId = String(
			obj["patientId"] ||
				obj["patient_id"] ||
				obj["patId"] ||
				obj["nkart"] ||
				`patient-unknown-${index}`,
		);

		const doctorId = obj["doctorId"] ? String(obj["doctorId"]) : null;
		const doctorName = obj["doctorName"]
			? String(obj["doctorName"])
			: obj["doctor"]
				? String(obj["doctor"])
				: obj["vrach"]
					? String(obj["vrach"])
					: null;
		const doctorSpecialty = obj["doctorSpecialty"]
			? String(obj["doctorSpecialty"])
			: null;

		const rawDate = (obj["date"] ??
			obj["datapriema"] ??
			obj["appointmentDate"] ??
			obj["startDate"]) as string;
		const date =
			IdentJsonParser.normalizeDate(rawDate) ||
			new Date().toISOString().slice(0, 10);

		const time = obj["time"]
			? String(obj["time"])
			: obj["vremya"]
				? String(obj["vremya"])
				: null;
		const startDateTime = obj["startDateTime"]
			? String(obj["startDateTime"])
			: obj["startsAt"]
				? String(obj["startsAt"])
				: null;
		const endDateTime = obj["endDateTime"]
			? String(obj["endDateTime"])
			: obj["endsAt"]
				? String(obj["endsAt"])
				: null;

		const durationMinutes =
			typeof obj["durationMinutes"] === "number"
				? obj["durationMinutes"]
				: typeof obj["duration"] === "number"
					? obj["duration"]
					: Number.parseInt(String(obj["duration"] || "0"), 10) || null;

		const rawStatus = String(obj["status"] || obj["state"] || "").toLowerCase();
		let status: IdentVisitRecord["status"] = "completed";
		if (/planned|sched|план|запис|предвар/i.test(rawStatus))
			status = "scheduled";
		else if (/cancelled|cancel|отмен/i.test(rawStatus)) status = "cancelled";
		else if (/no_show|noshow|неявк/i.test(rawStatus)) status = "no_show";

		return {
			id,
			patientId,
			doctorId,
			doctorName,
			doctorSpecialty,
			date,
			time,
			startDateTime,
			endDateTime,
			durationMinutes,
			status,
			complaint: obj["complaint"] ? String(obj["complaint"]) : null,
			anamnesis: obj["anamnesis"] ? String(obj["anamnesis"]) : null,
			diagnosis: obj["diagnosis"]
				? String(obj["diagnosis"])
				: obj["diagnoz"]
					? String(obj["diagnoz"])
					: null,
			treatment: obj["treatment"]
				? String(obj["treatment"])
				: obj["lechenie"]
					? String(obj["lechenie"])
					: null,
			comment: obj["comment"] ? String(obj["comment"]) : null,
			notes: obj["notes"] ? String(obj["notes"]) : null,
			cabinet: obj["cabinet"] ? String(obj["cabinet"]) : null,
			rawObject: obj,
		};
	}

	/**
	 * Маппинг счета / оплаты IDENT
	 */
	private static mapInvoiceObject(
		obj: Record<string, unknown>,
		index: number,
	): IdentInvoiceRecord {
		const id = String(
			obj["id"] ||
				obj["invoiceId"] ||
				obj["checkId"] ||
				obj["paymentId"] ||
				`ident-inv-${index}`,
		);
		const patientId = String(
			obj["patientId"] ||
				obj["patient_id"] ||
				obj["patId"] ||
				`patient-unknown-${index}`,
		);
		const appointmentId = obj["appointmentId"]
			? String(obj["appointmentId"])
			: null;

		const rawDate = (obj["date"] ??
			obj["paidAt"] ??
			obj["invoiceDate"] ??
			obj["data"]) as string;
		const date =
			IdentJsonParser.normalizeDate(rawDate) ||
			new Date().toISOString().slice(0, 10);

		const rawAmount = (obj["amount"] ??
			obj["summa"] ??
			obj["total"] ??
			obj["cost"]) as string | number;
		const amountKopecks = IdentJsonParser.parseKopecks(rawAmount) ?? 0;
		const amountRub = Math.round(amountKopecks) / 100;

		const rawPaid = (obj["paidAmount"] ??
			obj["paid"] ??
			obj["oplatit"]) as string | number;
		const paidKopecks =
			IdentJsonParser.parseKopecks(rawPaid) ?? amountKopecks;
		const paidRub = Math.round(paidKopecks) / 100;

		const rawDiscount = obj["discountAmount"] ?? obj["discount"];
		const discountKopecks = IdentJsonParser.parseKopecks(
			rawDiscount as string | number,
		);
		const discountRub =
			discountKopecks !== null ? Math.round(discountKopecks) / 100 : null;

		const rawStatus = String(obj["status"] || "paid").toLowerCase();
		let status: IdentInvoiceRecord["status"] = "paid";
		if (/part|частич/i.test(rawStatus)) status = "partially_paid";
		else if (/issue|new|выставлен/i.test(rawStatus)) status = "issued";
		else if (/void|cancel|аннулир/i.test(rawStatus)) status = "void";

		const rawMethod = String(
			obj["method"] ||
				obj["paymentMethod"] ||
				obj["paymentType"] ||
				obj["sposob"] ||
				"cash",
		).toLowerCase();
		let method: IdentInvoiceRecord["method"] = "cash";
		if (/card|карт|безнал|terminal/i.test(rawMethod)) method = "card";
		else if (/sbp|qr|сбп/i.test(rawMethod)) method = "sbp";
		else if (/transfer|перевод|расчет/i.test(rawMethod)) method = "transfer";
		else if (/deposit|аванс/i.test(rawMethod)) method = "deposit";
		else if (/insur|страх|дмс|омс/i.test(rawMethod)) method = "insurance";

		const services: IdentInvoiceServiceItem[] = [];
		const rawServices =
			obj["services"] ?? obj["items"] ?? obj["uslugi"] ?? obj["lines"];
		if (Array.isArray(rawServices)) {
			rawServices.forEach((svc, sIdx) => {
				if (typeof svc !== "object" || svc === null) return;
				const sObj = svc as Record<string, unknown>;
				const svcAmountKopecks =
					IdentJsonParser.parseKopecks(
						(sObj["total"] ??
							sObj["summa"] ??
							sObj["price"] ??
							sObj["cena"]) as string | number,
					) ?? amountKopecks;

				services.push({
					id: sObj["id"] ? String(sObj["id"]) : `item-${sIdx + 1}`,
					code: sObj["code"] ? String(sObj["code"]) : null,
					title: String(
						sObj["title"] ||
							sObj["name"] ||
							sObj["usluga"] ||
							"Услуга IDENT",
					),
					quantity: Number(sObj["quantity"] || sObj["count"] || 1),
					priceKopecks:
						IdentJsonParser.parseKopecks(
							(sObj["price"] ?? sObj["cena"]) as string | number,
						) ?? svcAmountKopecks,
					priceRub:
						(IdentJsonParser.parseKopecks(
							(sObj["price"] ?? sObj["cena"]) as string | number,
						) ?? svcAmountKopecks) / 100,
					discountRub: typeof sObj["discount"] === "number"
						? sObj["discount"]
						: null,
					totalKopecks: svcAmountKopecks,
					totalRub: Math.round(svcAmountKopecks) / 100,
					tooth: sObj["tooth"] ? String(sObj["tooth"]) : null,
					doctorId: sObj["doctorId"] ? String(sObj["doctorId"]) : null,
				});
			});
		}

		return {
			id,
			patientId,
			appointmentId,
			date,
			amountRub,
			amountKopecks,
			paidRub,
			paidKopecks,
			discountRub,
			status,
			method,
			note: obj["note"] ? String(obj["note"]) : null,
			services,
			rawObject: obj,
		};
	}

	/**
	 * Маппинг элемента прайс-листа IDENT
	 */
	private static mapPriceObject(
		obj: Record<string, unknown>,
		index: number,
	): IdentPriceItem {
		const id = String(
			obj["id"] ||
				obj["code"] ||
				obj["article"] ||
				obj["kod"] ||
				`ident-price-${index}`,
		);
		const code = obj["code"] ? String(obj["code"]) : null;
		const article = obj["article"]
			? String(obj["article"])
			: obj["artikul"]
				? String(obj["artikul"])
				: null;
		const title = String(
			obj["title"] ||
				obj["name"] ||
				obj["naimenovanie"] ||
				obj["usluga"] ||
				`Услуга ${id}`,
		);

		const rawPrice = (obj["price"] ??
			obj["cena"] ??
			obj["cost"] ??
			obj["tarif"]) as string | number;
		const priceKopecks = IdentJsonParser.parseKopecks(rawPrice) ?? 0;
		const priceRub = Math.round(priceKopecks) / 100;

		const rawCost = obj["costPrice"] ?? obj["sebestoimost"];
		const costKopecks = IdentJsonParser.parseKopecks(
			rawCost as string | number,
		);
		const costRub =
			costKopecks !== null ? Math.round(costKopecks) / 100 : null;

		const category = obj["category"]
			? String(obj["category"])
			: obj["kategoriya"]
				? String(obj["kategoriya"])
				: null;
		const categoryPath = obj["categoryPath"]
			? String(obj["categoryPath"])
			: null;
		const unit = obj["unit"] ? String(obj["unit"]) : "усл.";
		const isActive = obj["isActive"] !== false && obj["archived"] !== true;

		return {
			id,
			code,
			article,
			title,
			category,
			categoryPath,
			priceRub,
			priceKopecks,
			costRub,
			costKopecks,
			unit,
			isActive,
			rawObject: obj,
		};
	}

	/**
	 * Экспорт пациентов IDENT в канонический DENTE CSV
	 */
	public static toDentePatientCsv(patients: IdentPatientRecord[]): string {
		const header = "ФИО;Телефон;Дата рождения;Комментарий";
		const lines = patients.map((p) => {
			const notes = [
				p.notes,
				p.comment ? `Комментарий: ${p.comment}` : null,
				p.cardNumber ? `Карта: ${p.cardNumber}` : null,
				p.address ? `Адрес: ${p.address}` : null,
				p.discountPercent !== null
					? `Скидка: ${p.discountPercent}%`
					: null,
				p.balanceRub !== null ? `Баланс: ${p.balanceRub} руб.` : null,
				p.tags.length ? `Теги: ${p.tags.join(", ")}` : null,
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

	// ==================== Нормализаторы ====================

	public static normalizePhone(value: string | null | undefined): string | null {
		if (!value) return null;
		const digits = String(value).replace(/\D/g, "");
		if (digits.length === 10) return `+7${digits}`;
		if (digits.length === 11 && digits.startsWith("8"))
			return `+7${digits.slice(1)}`;
		if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
		if (digits.length >= 7 && digits.length <= 15) return `+${digits}`;
		return null;
	}

	public static normalizeDate(value: string | null | undefined): string | null {
		if (!value) return null;
		const str = String(value).trim();

		// ISO 8601
		const iso = str.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
		if (iso) {
			const y = iso[1] ?? "2000";
			const m = (iso[2] ?? "01").padStart(2, "0");
			const d = (iso[3] ?? "01").padStart(2, "0");
			return `${y}-${m}-${d}`;
		}

		// DD.MM.YYYY
		const dmy = str.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
		if (dmy) {
			const d = (dmy[1] ?? "01").padStart(2, "0");
			const m = (dmy[2] ?? "01").padStart(2, "0");
			const y = dmy[3] ?? "2000";
			return `${y}-${m}-${d}`;
		}

		return null;
	}

	public static normalizeGender(
		value: string | null | undefined,
	): "male" | "female" | "unknown" {
		if (!value) return "unknown";
		const str = String(value)
			.trim()
			.toLowerCase();
		if (/^(m|male|муж|м|1)$/i.test(str)) return "male";
		if (/^(f|female|жен|ж|2)$/i.test(str)) return "female";
		return "unknown";
	}

	public static parseKopecks(
		value: string | number | null | undefined,
	): number | null {
		if (value === null || value === undefined || value === "") return null;
		if (typeof value === "number") {
			if (Number.isNaN(value)) return null;
			return Math.round(value * 100);
		}
		const cleaned = String(value)
			.replace(/\s+/g, "")
			.replace(",", ".");
		const num = Number.parseFloat(cleaned);
		if (Number.isNaN(num)) return null;
		return Math.round(num * 100);
	}
}
