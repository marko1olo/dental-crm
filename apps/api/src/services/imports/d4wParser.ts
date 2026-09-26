/**
 * Dental4Windows (D4W) XML Export Parser.
 *
 * Модульный парсер структуры XML-экспортов из Dental4Windows:
 * - Пациенты (Patients / Patient)
 * - Записи на прием / визиты (Appointments / Appointment / Visits)
 * - Счета, транзакции и оплаты (Invoices / Invoice / Transactions / Payments)
 * - Каталог услуг / прайс-лист (Items / Item / PriceList / Services)
 *
 * Работает без тяжелых внешних зависимостей через надежный DOM/XML токенизатор,
 * корректно обрабатывает CDATA, сущности (&amp;, &lt;, &gt;, &quot;), пространства имен и самозакрывающиеся теги.
 */

import { normalizeDate, parseKopecks, rublesToKopecks } from "@dental/shared";

export interface D4WPatientRecord {
	externalId: string;
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
	notes: string | null;
	medicalAlerts: string | null;
	balanceRub: number | null;
	balanceKopecks: number | null;
	rawValues: Record<string, string>;
}

export interface D4WAppointmentRecord {
	externalId: string;
	patientRef: string;
	providerRef: string | null;
	doctorName: string | null;
	date: string;
	startTime: string | null;
	endTime: string | null;
	startsAt: string | null;
	endsAt: string | null;
	durationMinutes: number | null;
	status: "scheduled" | "completed" | "cancelled" | "no_show";
	description: string | null;
	notes: string | null;
	room: string | null;
	rawValues: Record<string, string>;
}

export interface D4WInvoiceItem {
	itemCode: string | null;
	description: string;
	tooth: string | null;
	surface: string | null;
	feeRub: number;
	feeKopecks: number;
	quantity: number;
}

export interface D4WInvoiceItem {
  itemCode: string | null;
  description: string;
  tooth: string | null;
  surface: string | null;
  feeRub: number;
  feeKopecks: number;
  quantity: number;
}

export interface D4WInvoiceRecord {
	externalId: string;
	patientRef: string;
	invoiceNumber: string | null;
	date: string;
	totalRub: number;
	totalKopecks: number;
	paidRub: number;
	paidKopecks: number;
	paymentMethod: "cash" | "card" | "sbp" | "transfer" | "insurance" | "other";
	items: D4WInvoiceItem[];
	rawValues: Record<string, string>;
}

export interface D4WPriceItem {
	itemCode: string;
	description: string;
	feeRub: number;
	feeKopecks: number;
	category: string | null;
	isActive: boolean;
	rawValues: Record<string, string>;
}

export interface D4WDocumentMetadata {
	generatedAt: string | null;
	clinicName: string | null;
	exportVersion: string | null;
	rootTag: string;
}

export interface D4WXmlParseResult {
	metadata: D4WDocumentMetadata;
	patients: D4WPatientRecord[];
	appointments: D4WAppointmentRecord[];
	invoices: D4WInvoiceRecord[];
	priceList: D4WPriceItem[];
	totalRecords: number;
	warnings: string[];
}

export interface D4WParserOptions {
	clinicTimeZoneOffsetHours?: number;
}

import { D4wXmlTokenizer, type XmlNode } from "./d4wXmlTokenizer.js";
import { D4wExtractors } from "./d4wExtractors.js";

export class Dental4WindowsXmlParser {
	/**
	 * Проверка, является ли строка XML экспортом Dental4Windows
	 */
	public static isD4wXml(input: string): boolean {
		const trimmed = input.trim();
		if (!trimmed.startsWith("<") && !trimmed.startsWith("<?xml"))
			return false;
		return (
			/dental\s*4\s*windows|d4w/i.test(trimmed) ||
			/<(?:dental4windows|d4wexport|d4w|patientlist|patients|appointmentlist|appointments|invoicelist|invoices)/i.test(
				trimmed,
			)
		);
	}

	/**
	 * Главный метод парсинга XML контента Dental4Windows
	 */
	public static parse(
		xmlString: string,
		options: D4WParserOptions = {},
	): D4WXmlParseResult {
		const warnings: string[] = [];
		const trimmed = xmlString.trim();

		if (!trimmed) {
			return {
				metadata: {
					generatedAt: null,
					clinicName: null,
					exportVersion: null,
					rootTag: "",
				},
				patients: [],
				appointments: [],
				invoices: [],
				priceList: [],
				totalRecords: 0,
				warnings: ["XML контент пуст."],
			};
		}

		let rootNode: XmlNode;
		try {
			rootNode = D4wXmlTokenizer.parseXmlTree(trimmed);
		} catch (error) {
			warnings.push(
				`Ошибка разбора структуры XML: ${error instanceof Error ? error.message : String(error)}`,
			);
			return {
				metadata: {
					generatedAt: null,
					clinicName: null,
					exportVersion: null,
					rootTag: "",
				},
				patients: [],
				appointments: [],
				invoices: [],
				priceList: [],
				totalRecords: 0,
				warnings,
			};
		}

		const metadata: D4WDocumentMetadata = {
			rootTag: rootNode.name,
			generatedAt:
				D4wXmlTokenizer.findFirstText(rootNode, [
					"generatedat",
					"exportdate",
					"date",
					"timestamp",
				]) || null,
			clinicName:
				D4wXmlTokenizer.findFirstText(rootNode, [
					"clinicname",
					"clinic",
					"practice",
					"practicename",
				]) || null,
			exportVersion:
				rootNode.attributes["version"] ||
				D4wXmlTokenizer.findFirstText(rootNode, [
					"version",
					"d4wversion",
				]) ||
				null,
		};

		const patients = D4wExtractors.extractPatients(rootNode, warnings);
		const appointments = D4wExtractors.extractAppointments(
			rootNode,
			warnings,
		);
		const invoices = D4wExtractors.extractInvoices(
			rootNode,
			warnings,
		);
		const priceList = D4wExtractors.extractPriceList(
			rootNode,
			warnings,
		);

		const totalRecords =
			patients.length +
			appointments.length +
			invoices.length +
			priceList.length;

		return {
			metadata,
			patients,
			appointments,
			invoices,
			priceList,
			totalRecords,
			warnings,
		};
	}

	public static parsePatients(xmlString: string): D4WPatientRecord[] {
		return Dental4WindowsXmlParser.parse(xmlString).patients;
	}

	public static parseAppointments(xmlString: string): D4WAppointmentRecord[] {
		return Dental4WindowsXmlParser.parse(xmlString).appointments;
	}

	public static parseInvoices(xmlString: string): D4WInvoiceRecord[] {
		return Dental4WindowsXmlParser.parse(xmlString).invoices;
	}

	public static parsePriceList(xmlString: string): D4WPriceItem[] {
		return Dental4WindowsXmlParser.parse(xmlString).priceList;
	}

	public static toDentePatientCsv(patients: D4WPatientRecord[]): string {
		const header = "ФИО;Телефон;Дата рождения;Комментарий";
		const lines = patients.map((p) => {
			const notes = [
				p.notes,
				p.medicalAlerts ? `Аллергии/Анамнез: ${p.medicalAlerts}` : null,
				p.cardNumber ? `Карта: ${p.cardNumber}` : null,
				p.address ? `Адрес: ${p.address}` : null,
				p.balanceRub !== null ? `Баланс: ${p.balanceRub} руб.` : null,
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
		return normalizeDate(value);
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

export { Dental4WindowsXmlParser as D4wParser };
