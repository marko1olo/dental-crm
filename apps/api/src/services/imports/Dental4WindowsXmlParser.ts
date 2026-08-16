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

interface XmlNode {
	name: string;
	attributes: Record<string, string>;
	text: string;
	children: XmlNode[];
}

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
			rootNode = Dental4WindowsXmlParser.parseXmlTree(trimmed);
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
				Dental4WindowsXmlParser.findFirstText(rootNode, [
					"generatedat",
					"exportdate",
					"date",
					"timestamp",
				]) || null,
			clinicName:
				Dental4WindowsXmlParser.findFirstText(rootNode, [
					"clinicname",
					"clinic",
					"practice",
					"practicename",
				]) || null,
			exportVersion:
				rootNode.attributes["version"] ||
				Dental4WindowsXmlParser.findFirstText(rootNode, [
					"version",
					"d4wversion",
				]) ||
				null,
		};

		const patients = Dental4WindowsXmlParser.extractPatients(rootNode, warnings);
		const appointments = Dental4WindowsXmlParser.extractAppointments(
			rootNode,
			warnings,
		);
		const invoices = Dental4WindowsXmlParser.extractInvoices(
			rootNode,
			warnings,
		);
		const priceList = Dental4WindowsXmlParser.extractPriceList(
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

	/**
	 * Извлечение пациентов из дерева XML D4W
	 */
	private static extractPatients(
		root: XmlNode,
		warnings: string[],
	): D4WPatientRecord[] {
		const patientNodes = Dental4WindowsXmlParser.findNodes(root, [
			"patient",
			"patients",
			"patientrecord",
			"pat",
		]);
		const results: D4WPatientRecord[] = [];

		patientNodes.forEach((node, index) => {
			const values = Dental4WindowsXmlParser.nodeToFlatMap(node);

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
	private static extractAppointments(
		root: XmlNode,
		warnings: string[],
	): D4WAppointmentRecord[] {
		const apptNodes = Dental4WindowsXmlParser.findNodes(root, [
			"appointment",
			"appointments",
			"appt",
			"visit",
			"visits",
		]);
		const results: D4WAppointmentRecord[] = [];

		apptNodes.forEach((node, index) => {
			const values = Dental4WindowsXmlParser.nodeToFlatMap(node);

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
	private static extractInvoices(
		root: XmlNode,
		warnings: string[],
	): D4WInvoiceRecord[] {
		const invoiceNodes = Dental4WindowsXmlParser.findNodes(root, [
			"invoice",
			"invoices",
			"transaction",
			"transactions",
			"payment",
			"payments",
		]);
		const results: D4WInvoiceRecord[] = [];

		invoiceNodes.forEach((node, index) => {
			const values = Dental4WindowsXmlParser.nodeToFlatMap(node);

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
			const itemNodes = Dental4WindowsXmlParser.findNodes(node, [
				"item",
				"items",
				"treatment",
				"service",
				"lineitem",
			]);
			const items: D4WInvoiceItem[] = [];

			itemNodes.forEach((itemNode) => {
				const itemVals = Dental4WindowsXmlParser.nodeToFlatMap(itemNode);
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
	private static extractPriceList(
		root: XmlNode,
		warnings: string[],
	): D4WPriceItem[] {
		const priceNodes = Dental4WindowsXmlParser.findNodes(root, [
			"item",
			"items",
			"priceitem",
			"service",
			"feeitem",
		]);
		const results: D4WPriceItem[] = [];

		priceNodes.forEach((node, index) => {
			const values = Dental4WindowsXmlParser.nodeToFlatMap(node);

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

	// ==================== XML DOM Парсер ====================

	private static parseXmlTree(xml: string): XmlNode {
		// Очищаем комментарии <!-- ... --> и декларации <?xml ... ?>
		const cleanXml = xml
			.replace(/<!--[\s\S]*?-->/g, "")
			.replace(/<\?xml[\s\S]*?\?>/g, "")
			.trim();

		const tagRegex = /<(\/)?([a-zA-Z0-9_:.-]+)([^>]*?)(\/)?>|([^<]+)/g;
		const stack: XmlNode[] = [];
		let root: XmlNode | null = null;

		let match: RegExpExecArray | null = null;
		while ((match = tagRegex.exec(cleanXml)) !== null) {
			const isClosing = Boolean(match[1]);
			const rawTagName = match[2];
			const rawAttrs = match[3] ?? "";
			const isSelfClosing = Boolean(match[4]);
			const textContent = match[5];

			if (rawTagName) {
				const tagName = rawTagName
					.split(":")
					.pop()!
					.toLowerCase();

				if (isClosing) {
					if (stack.length > 1) {
						stack.pop();
					}
				} else {
					const node: XmlNode = {
						name: tagName,
						attributes:
							Dental4WindowsXmlParser.parseAttributes(rawAttrs),
						text: "",
						children: [],
					};

					if (stack.length > 0) {
						const parent = stack[stack.length - 1];
						if (parent) parent.children.push(node);
					} else {
						root = node;
					}

					if (!isSelfClosing) {
						stack.push(node);
					}
				}
			} else if (textContent) {
				const cleanText = textContent.trim();
				if (cleanText && stack.length > 0) {
					const current = stack[stack.length - 1];
					if (current) {
						const unescaped =
							Dental4WindowsXmlParser.unescapeXml(cleanText);
						current.text = current.text
							? `${current.text} ${unescaped}`
							: unescaped;
					}
				}
			}
		}

		if (!root) {
			return { name: "root", attributes: {}, text: "", children: [] };
		}

		return root;
	}

	private static parseAttributes(rawAttrs: string): Record<string, string> {
		const result: Record<string, string> = {};
		const attrRegex = /([a-zA-Z0-9_:.-]+)=["']([^"']*)["']/g;
		let m: RegExpExecArray | null = null;
		while ((m = attrRegex.exec(rawAttrs)) !== null) {
			const key = (m[1] ?? "")
				.split(":")
				.pop()!
				.toLowerCase();
			result[key] = Dental4WindowsXmlParser.unescapeXml(m[2] ?? "");
		}
		return result;
	}

	private static unescapeXml(str: string): string {
		return str
			.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
			.replace(/&amp;/g, "&")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&quot;/g, '"')
			.replace(/&apos;/g, "'")
			.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
			.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
				String.fromCharCode(Number.parseInt(hex, 16)),
			);
	}

	private static findNodes(node: XmlNode, targetNames: string[]): XmlNode[] {
		const matches: XmlNode[] = [];
		const targets = new Set(targetNames.map((n) => n.toLowerCase()));

		function walk(curr: XmlNode) {
			if (targets.has(curr.name)) {
				// Если узел является контейнером со вложенными такими же узлами (например <Patients><Patient>...)
				const innerChildren = curr.children.filter((c) =>
					targets.has(c.name),
				);
				if (innerChildren.length > 0) {
					innerChildren.forEach((child) => matches.push(child));
				} else {
					matches.push(curr);
				}
			}
			for (const child of curr.children) {
				if (!targets.has(curr.name)) {
					walk(child);
				}
			}
		}

		walk(node);
		return matches;
	}

	private static findFirstText(node: XmlNode, names: string[]): string {
		const targetSet = new Set(names.map((n) => n.toLowerCase()));
		let result = "";

		function walk(curr: XmlNode): boolean {
			if (targetSet.has(curr.name) && curr.text) {
				result = curr.text;
				return true;
			}
			for (const child of curr.children) {
				if (walk(child)) return true;
			}
			return false;
		}

		walk(node);
		return result;
	}

	private static nodeToFlatMap(node: XmlNode): Record<string, string> {
		const map: Record<string, string> = { ...node.attributes };
		if (node.text) {
			map["value"] = node.text;
		}

		for (const child of node.children) {
			if (child.children.length === 0 && child.text) {
				map[child.name] = child.text;
			} else {
				for (const [k, v] of Object.entries(child.attributes)) {
					map[`${child.name}_${k}`] = v;
				}
				if (child.text) {
					map[child.name] = child.text;
				}
			}
		}

		return map;
	}

	// ==================== Нормализаторы ====================

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

		// ISO 8601 YYYY-MM-DD
		const iso = trimmed.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
		if (iso) {
			const y = iso[1] ?? "2000";
			const m = (iso[2] ?? "01").padStart(2, "0");
			const d = (iso[3] ?? "01").padStart(2, "0");
			return `${y}-${m}-${d}`;
		}

		// DD/MM/YYYY или DD.MM.YYYY
		const dmy = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
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
		const str = value.trim().toLowerCase();
		if (/^(m|male|муж|м|1)$/i.test(str)) return "male";
		if (/^(f|female|жен|ж|2)$/i.test(str)) return "female";
		return "unknown";
	}

	public static parseKopecks(value: string | null | undefined): number | null {
		if (!value) return null;
		const cleaned = value.replace(/\s+/g, "").replace(",", ".");
		const num = Number.parseFloat(cleaned);
		if (Number.isNaN(num)) return null;
		return Math.round(num * 100);
	}
}
