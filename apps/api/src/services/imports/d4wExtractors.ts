/**
 * Record extraction logic from Dental4Windows XML tree nodes.
 */
import { D4wXmlTokenizer, type XmlNode } from "./d4wXmlTokenizer.js";
import { Dental4WindowsXmlParser } from "./d4wParser.js";
import type {
  D4WAppointmentRecord,
  D4WInvoiceRecord,
  D4WInvoiceItem,
  D4WPatientRecord,
  D4WPriceItem
} from "./d4wParser.js";

export class D4wExtractors {
	public static extractPatients(
		root: XmlNode,
		warnings: string[],
	): D4WPatientRecord[] {
		const patientNodes = D4wXmlTokenizer.findNodes(root, [
			"patient",
			"patients",
			"patientrecord",
			"pat",
		]);
		const results: D4WPatientRecord[] = [];

		patientNodes.forEach((node, index) => {
			const values = D4wXmlTokenizer.nodeToFlatMap(node);

			const externalId =
				values["patientid"] ||
				values["patid"] ||
				values["id"] ||
				values["cardnumber"] ||
				values["cardno"] ||
				`d4w-pat-${index + 1}`;

			const cardNumber =
				values["cardnumber"] ||
				values["cardno"] ||
				values["chartnumber"] ||
				values["filenumber"] ||
				null;

			const lastName =
				values["lastname"] ||
				values["surname"] ||
				values["familiya"] ||
				"";
			const firstName =
				values["firstname"] ||
				values["givenname"] ||
				values["imya"] ||
				"";
			const middleName =
				values["middlename"] ||
				values["initial"] ||
				values["otchestvo"] ||
				"";

			let fullName =
				values["fullname"] ||
				values["patientname"] ||
				values["name"] ||
				"";
			if (!fullName) {
				fullName = [lastName, firstName, middleName]
					.filter(Boolean)
					.join(" ");
			} else if (!lastName || !firstName) {
				const parts = fullName.split(/\s+/);
				if (!lastName && parts[0])
					values["extractedLastName"] = parts[0];
				if (!firstName && parts[1])
					values["extractedFirstName"] = parts[1];
			}

			if (!fullName && !values["mobilephone"] && !values["phone"]) {
				return; // Пропускаем пустые узлы-контейнеры
			}

			const rawDob =
				values["dob"] ||
				values["birthdate"] ||
				values["dateofbirth"] ||
				values["birthdateformatted"] ||
				null;
			const birthDate = Dental4WindowsXmlParser.normalizeDate(rawDob);

			const phone = Dental4WindowsXmlParser.normalizePhone(
				values["mobilephone"] ||
					values["mobile"] ||
					values["cellphone"] ||
					values["phone"] ||
					values["contactnumber"],
			);

			const secondaryPhone = Dental4WindowsXmlParser.normalizePhone(
				values["secondaryphone"] ||
					values["altphone"] ||
					values["homephone"] ||
					values["workphone"],
			);

			const email =
				values["email"] ||
				values["emailaddress"] ||
				values["email1"] ||
				null;

			const gender = Dental4WindowsXmlParser.normalizeGender(
				values["gender"] || values["sex"],
			);

			const addressParts = [
				values["address"],
				values["address1"],
				values["address2"],
				values["street"],
				values["suburb"] || values["city"],
				values["postcode"] || values["zip"],
			].filter(Boolean);
			const address = addressParts.length ? addressParts.join(", ") : null;

			const notes =
				values["notes"] ||
				values["comment"] ||
				values["generalnotes"] ||
				null;
			const medicalAlerts =
				values["medicalalerts"] ||
				values["alerts"] ||
				values["allergies"] ||
				null;

			const rawBalance =
				values["balance"] ||
				values["accountbalance"] ||
				values["totalowing"] ||
				null;
			const balanceKopecks =
				Dental4WindowsXmlParser.parseKopecks(rawBalance);
			const balanceRub =
				balanceKopecks !== null ? Math.round(balanceKopecks) / 100 : null;

			results.push({
				externalId,
				cardNumber,
				fullName: fullName || "Не указано",
				lastName: lastName || (fullName.split(/\s+/)[0] ?? ""),
				firstName: firstName || (fullName.split(/\s+/)[1] ?? ""),
				middleName:
					middleName || (fullName.split(/\s+/).slice(2).join(" ") ?? ""),
				birthDate,
				phone,
				secondaryPhone,
				email,
				gender,
				address,
				notes,
				medicalAlerts,
				balanceRub,
				balanceKopecks,
				rawValues: values,
			});
		});

		return results;
	}

	/**
	 * Извлечение записей на прием / визитов
	 */
	public static extractAppointments(
		root: XmlNode,
		warnings: string[],
	): D4WAppointmentRecord[] {
		const apptNodes = D4wXmlTokenizer.findNodes(root, [
			"appointment",
			"appointments",
			"appt",
			"visit",
			"visits",
		]);
		const results: D4WAppointmentRecord[] = [];

		apptNodes.forEach((node, index) => {
			const values = D4wXmlTokenizer.nodeToFlatMap(node);

			const externalId =
				values["appointmentid"] ||
				values["apptid"] ||
				values["id"] ||
				values["visitid"] ||
				`d4w-appt-${index + 1}`;

			const patientRef =
				values["patientid"] ||
				values["patid"] ||
				values["cardnumber"] ||
				values["patientref"] ||
				`patient-unknown-${index + 1}`;

			const providerRef =
				values["providerid"] ||
				values["doctorid"] ||
				values["dentistid"] ||
				null;
			const doctorName =
				values["doctorname"] ||
				values["providername"] ||
				values["dentist"] ||
				values["provider"] ||
				null;

			const rawDate =
				values["date"] ||
				values["apptdate"] ||
				values["appointmentdate"] ||
				null;
			const date =
				Dental4WindowsXmlParser.normalizeDate(rawDate) ||
				new Date().toISOString().slice(0, 10);

			const startTime =
				values["starttime"] ||
				values["time"] ||
				values["appttime"] ||
				null;
			const endTime = values["endtime"] || null;
			const durationMinutes =
				Number.parseInt(
					values["duration"] ||
						values["durationminutes"] ||
						values["length"] ||
						"0",
					10,
				) || null;

			let startsAt: string | null = null;
			let endsAt: string | null = null;
			if (date && startTime) {
				const timeMatch = startTime.match(/(\d{1,2})[:.](\d{2})/);
				if (timeMatch) {
					const hh = (timeMatch[1] ?? "00").padStart(2, "0");
					const mm = (timeMatch[2] ?? "00").padStart(2, "0");
					startsAt = `${date}T${hh}:${mm}:00Z`;
					if (durationMinutes) {
						const totalM =
							Number.parseInt(hh, 10) * 60 +
							Number.parseInt(mm, 10) +
							durationMinutes;
						const endH = String(Math.floor(totalM / 60) % 24).padStart(
							2,
							"0",
						);
						const endM = String(totalM % 60).padStart(2, "0");
						endsAt = `${date}T${endH}:${endM}:00Z`;
					}
				}
			}

			const rawStatus = (
				values["status"] ||
				values["apptstatus"] ||
				values["state"] ||
				""
			).toLowerCase();
			let status: D4WAppointmentRecord["status"] = "completed";
			if (/sched|booked|plan|заплан|предвар/i.test(rawStatus))
				status = "scheduled";
			else if (/cancel|отмен|deleted/i.test(rawStatus))
				status = "cancelled";
			else if (/noshow|no-show|неявк|didnotattend/i.test(rawStatus))
				status = "no_show";

			results.push({
				externalId,
				patientRef,
				providerRef,
				doctorName,
				date,
				startTime,
				endTime,
				startsAt,
				endsAt,
				durationMinutes,
				status,
				description:
					values["description"] ||
					values["reason"] ||
					values["treatment"] ||
					null,
				notes: values["notes"] || values["comment"] || null,
				room: values["room"] || values["chair"] || null,
				rawValues: values,
			});
		});

		return results;
	}

	/**
	 * Извлечение счетов и оплат
	 */
	public static extractInvoices(
		root: XmlNode,
		warnings: string[],
	): D4WInvoiceRecord[] {
		const invoiceNodes = D4wXmlTokenizer.findNodes(root, [
			"invoice",
			"invoices",
			"transaction",
			"transactions",
			"payment",
			"payments",
		]);
		const results: D4WInvoiceRecord[] = [];

		invoiceNodes.forEach((node, index) => {
			const values = D4wXmlTokenizer.nodeToFlatMap(node);

			const externalId =
				values["invoiceid"] ||
				values["transactionid"] ||
				values["id"] ||
				values["invoiceno"] ||
				`d4w-inv-${index + 1}`;

			const patientRef =
				values["patientid"] ||
				values["patid"] ||
				values["cardnumber"] ||
				`patient-unknown-${index + 1}`;

			const invoiceNumber =
				values["invoiceno"] ||
				values["invoicenumber"] ||
				values["receiptno"] ||
				null;

			const rawDate =
				values["date"] ||
				values["invoicedate"] ||
				values["paymentdate"] ||
				null;
			const date =
				Dental4WindowsXmlParser.normalizeDate(rawDate) ||
				new Date().toISOString().slice(0, 10);

			const totalKopecks =
				Dental4WindowsXmlParser.parseKopecks(
					values["totalamount"] ||
						values["total"] ||
						values["amount"] ||
						values["fee"],
				) ?? 0;
			const totalRub = Math.round(totalKopecks) / 100;

			const paidKopecks =
				Dental4WindowsXmlParser.parseKopecks(
					values["paidamount"] || values["paid"] || values["amountpaid"],
				) ?? totalKopecks;
			const paidRub = Math.round(paidKopecks) / 100;

			const rawMethod = (
				values["paymentmethod"] ||
				values["paymenttype"] ||
				values["method"] ||
				values["type"] ||
				""
			).toLowerCase();
			let paymentMethod: D4WInvoiceRecord["paymentMethod"] = "cash";
			if (/card|visa|master|eftpos|pos|терминал|карт/i.test(rawMethod))
				paymentMethod = "card";
			else if (/sbp|qr|сбп/i.test(rawMethod)) paymentMethod = "sbp";
			else if (/direct|transfer|банк|перевод|р\/с/i.test(rawMethod))
				paymentMethod = "transfer";
			else if (/hicaps|insur|страх|дмс|омс/i.test(rawMethod))
				paymentMethod = "insurance";

			// Поиск вложенных позиций (Item / Treatment / Service)
			const itemNodes = D4wXmlTokenizer.findNodes(node, [
				"item",
				"items",
				"treatment",
				"service",
				"lineitem",
			]);
			const items: D4WInvoiceItem[] = [];

			itemNodes.forEach((itemNode) => {
				const itemVals = D4wXmlTokenizer.nodeToFlatMap(itemNode);
				const itemFeeKopecks =
					Dental4WindowsXmlParser.parseKopecks(
						itemVals["fee"] ||
							itemVals["amount"] ||
							itemVals["price"],
					) ?? totalKopecks;

				items.push({
					itemCode:
						itemVals["itemcode"] ||
						itemVals["code"] ||
						itemVals["itemnum"] ||
						null,
					description:
						itemVals["description"] ||
						itemVals["name"] ||
						itemVals["itemname"] ||
						"Услуга D4W",
					tooth: itemVals["tooth"] || itemVals["toothno"] || null,
					surface:
						itemVals["surface"] || itemVals["surfaces"] || null,
					feeKopecks: itemFeeKopecks,
					feeRub: Math.round(itemFeeKopecks) / 100,
					quantity: Number.parseInt(itemVals["qty"] || "1", 10) || 1,
				});
			});

			if (items.length === 0 && totalKopecks > 0) {
				items.push({
					itemCode: null,
					description:
						values["description"] ||
						values["treatment"] ||
						"Лечение Dental4Windows",
					tooth: values["tooth"] || null,
					surface: values["surface"] || null,
					feeKopecks: totalKopecks,
					feeRub: totalRub,
					quantity: 1,
				});
			}

			results.push({
				externalId,
				patientRef,
				invoiceNumber,
				date,
				totalRub,
				totalKopecks,
				paidRub,
				paidKopecks,
				paymentMethod,
				items,
				rawValues: values,
			});
		});

		return results;
	}

	/**
	 * Извлечение каталога услуг / прайс-листа
	 */
	public static extractPriceList(
		root: XmlNode,
		warnings: string[],
	): D4WPriceItem[] {
		const priceNodes = D4wXmlTokenizer.findNodes(root, [
			"item",
			"items",
			"priceitem",
			"service",
			"feeitem",
		]);
		const results: D4WPriceItem[] = [];

		priceNodes.forEach((node, index) => {
			const values = D4wXmlTokenizer.nodeToFlatMap(node);

			const itemCode =
				values["itemcode"] ||
				values["code"] ||
				values["itemnumber"] ||
				`d4w-item-${index + 1}`;
			const description =
				values["description"] ||
				values["name"] ||
				values["itemname"] ||
				values["title"] ||
				"";

			if (!description && !values["fee"]) return;

			const feeKopecks =
				Dental4WindowsXmlParser.parseKopecks(
					values["fee"] ||
						values["price"] ||
						values["amount"] ||
						values["standardfee"],
				) ?? 0;
			const feeRub = Math.round(feeKopecks) / 100;

			results.push({
				itemCode,
				description: description || `Услуга ${itemCode}`,
				feeRub,
				feeKopecks,
				category:
					values["category"] ||
					values["group"] ||
					values["department"] ||
					null,
				isActive:
					values["isactive"] !== "0" && values["active"] !== "false",
				rawValues: values,
			});
		});

		return results;
	}

	/**
	 * Экспорт пациентов D4W в канонический DENTE CSV
	 */
}
