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

import { normalizeDate, parseKopecks, rublesToKopecks } from "@dental/shared";

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

import { IdentMappers } from "./identMappers.js";

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
							IdentMappers.mapPatientObject(subData, idx + 1),
						);
					} else if (
						type.includes("visit") ||
						type.includes("appointment") ||
						type.includes("прием")
					) {
						const subData = (obj["data"] ??
							obj) as Record<string, unknown>;
						visits.push(
							IdentMappers.mapVisitObject(subData, idx + 1),
						);
					} else if (
						type.includes("invoice") ||
						type.includes("payment") ||
						type.includes("оплат")
					) {
						const subData = (obj["data"] ??
							obj) as Record<string, unknown>;
						invoices.push(
							IdentMappers.mapInvoiceObject(subData, idx + 1),
						);
					} else if (
						type.includes("price") ||
						type.includes("service") ||
						type.includes("услуг")
					) {
						const subData = (obj["data"] ??
							obj) as Record<string, unknown>;
						priceList.push(
							IdentMappers.mapPriceObject(subData, idx + 1),
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
								IdentMappers.mapPatientObject(obj, idx + 1),
							);
						} else if (
							"startDateTime" in obj ||
							"doctorId" in obj ||
							"datapriema" in obj
						) {
							visits.push(
								IdentMappers.mapVisitObject(obj, idx + 1),
							);
						} else if (
							"amount" in obj ||
							"summa" in obj ||
							"paidAmount" in obj
						) {
							invoices.push(
								IdentMappers.mapInvoiceObject(obj, idx + 1),
							);
						} else if (
							"price" in obj ||
							"cena" in obj ||
							"article" in obj
						) {
							priceList.push(
								IdentMappers.mapPriceObject(obj, idx + 1),
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
								IdentMappers.mapPatientObject(
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
								IdentMappers.mapVisitObject(
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
								IdentMappers.mapInvoiceObject(
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
								IdentMappers.mapPriceObject(
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
		return normalizeDate(value);
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
		try {
			if (typeof value === "number") {
				return Number.isFinite(value) && !Number.isNaN(value) ? rublesToKopecks(value) : null;
			}
			const cleaned = String(value).replace(/\s+/g, "").replace(",", ".");
			return parseKopecks(cleaned);
		} catch {
			const num = Number.parseFloat(String(value).replace(/\s+/g, "").replace(",", "."));
			return Number.isNaN(num) ? null : Math.round(num * 100);
		}
	}
}


export { IdentJsonParser as IdentParser };
