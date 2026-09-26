/**
 * Entity extraction helpers from Infodent CSV rows.
 */
import { InfodentCsvParser } from "./infodentParser.js";
import {
  PATIENT_HEADER_ALIASES,
  VISIT_HEADER_ALIASES,
  PAYMENT_HEADER_ALIASES,
  PRICELIST_HEADER_ALIASES
} from "./infodentAliases.js";
import type {
  InfodentPatientRecord,
  InfodentVisitRecord,
  InfodentPaymentRecord,
  InfodentPaymentItem,
  InfodentPriceItem
} from "./infodentParser.js";

export class InfodentExtractors {
	public static extractPatients(
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
	public static extractVisits(
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
	public static extractPayments(
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
	public static extractPriceList(
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
}
