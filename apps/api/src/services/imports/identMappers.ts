/**
 * Entity mapping functions for IDENT / StomX JSON exports.
 */
import { IdentJsonParser } from "./identParser.js";
import type {
  IdentInvoiceRecord,
  IdentInvoiceServiceItem,
  IdentPatientRecord,
  IdentPriceItem,
  IdentVisitRecord
} from "./identParser.js";

export class IdentMappers {
	public static mapPatientObject(
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
	public static mapVisitObject(
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
	public static mapInvoiceObject(
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
	public static mapPriceObject(
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
}
