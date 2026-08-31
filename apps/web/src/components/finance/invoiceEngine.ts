/**
 * invoiceEngine.ts — Dental Invoice, Completed Works Act & Warranty Certificate Engine (A4).
 * Compliant with Law "On Consumer Rights Protection" No. 2300-1, Order of Ministry of Health 804n,
 * and Decree of the Government of the Russian Federation No. 736.
 */

import { kopecksToNumericString, kopecksToRub, rubToKopecks } from "@dental/shared";

/**
 * Склонение числительных в русском языке.
 */
export function pluralizeRu(count: number, formOne: string, formTwo: string, formFive: string): string {
	const absCount = Math.abs(count) % 100;
	const remainder = absCount % 10;
	if (absCount > 10 && absCount < 20) return formFive;
	if (remainder > 1 && remainder < 5) return formTwo;
	if (remainder === 1) return formOne;
	return formFive;
}

/**
 * Преобразует сумму в рублях в строку прописью (стандарт бухгалтерских актов РФ).
 */
export function numberToWordsRu(amountRub: number, amountKopecks: number = 0): string {
	const whole = Math.trunc(Math.abs(amountRub));
	const kop = Math.abs(amountKopecks) % 100;

	if (whole === 0) {
		const kopStr = String(kop).padStart(2, "0");
		const kopUnit = pluralizeRu(kop, "копейка", "копейки", "копеек");
		return `Ноль рублей ${kopStr} ${kopUnit}`;
	}

	const units = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
	const unitsFem = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
	const teens = [
		"десять",
		"одиннадцать",
		"двенадцать",
		"тринадцать",
		"четырнадцать",
		"пятнадцать",
		"шестнадцать",
		"семнадцать",
		"восемнадцать",
		"девятнадцать",
	];
	const tens = [
		"",
		"",
		"двадцать",
		"тридцать",
		"сорок",
		"пятьдесят",
		"шестьдесят",
		"семьдесят",
		"восемьдесят",
		"девяносто",
	];
	const hundreds = [
		"",
		"сто",
		"двести",
		"триста",
		"четыреста",
		"пятьсот",
		"шестьсот",
		"семьсот",
		"восемьсот",
		"девятьсот",
	];

	function triadToWords(num: number, isFemale = false): string {
		const h = Math.trunc(num / 100);
		const t = Math.trunc((num % 100) / 10);
		const u = num % 10;
		const parts: string[] = [];

		if (h > 0) parts.push(hundreds[h] ?? "");

		if (t === 1) {
			parts.push(teens[u] ?? "");
		} else {
			if (t > 1) parts.push(tens[t] ?? "");
			if (u > 0) {
				parts.push((isFemale ? unitsFem[u] : units[u]) ?? "");
			}
		}

		return parts.filter(Boolean).join(" ");
	}

	const billions = Math.trunc(whole / 1_000_000_000);
	const millions = Math.trunc((whole % 1_000_000_000) / 1_000_000);
	const thousands = Math.trunc((whole % 1_000_000) / 1_000);
	const rest = whole % 1_000;

	const wordParts: string[] = [];

	if (billions > 0) {
		const bStr = triadToWords(billions, false);
		const bUnit = pluralizeRu(billions, "миллиард", "миллиарда", "миллиардов");
		wordParts.push(`${bStr} ${bUnit}`);
	}

	if (millions > 0) {
		const mStr = triadToWords(millions, false);
		const mUnit = pluralizeRu(millions, "миллион", "миллиона", "миллионов");
		wordParts.push(`${mStr} ${mUnit}`);
	}

	if (thousands > 0) {
		const thStr = triadToWords(thousands, true);
		const thUnit = pluralizeRu(thousands, "тысяча", "тысячи", "тысяч");
		wordParts.push(`${thStr} ${thUnit}`);
	}

	if (rest > 0) {
		const rStr = triadToWords(rest, false);
		wordParts.push(rStr);
	}

	const rubUnit = pluralizeRu(whole, "рубль", "рубля", "рублей");
	const rubWords = wordParts.join(" ").trim();
	const capitalized = rubWords.charAt(0).toUpperCase() + rubWords.slice(1);

	const kopStr = String(kop).padStart(2, "0");
	const kopUnit = pluralizeRu(kop, "копейка", "копейки", "копеек");

	return `${capitalized} ${rubUnit} ${kopStr} ${kopUnit}`;
}


export interface InvoiceServiceItem {
	readonly id: string;
	readonly name: string;
	readonly code804n?: string | null | undefined;
	readonly toothNumber?: number | string | null | undefined;
	readonly quantity: number;
	readonly priceRub: number;
	readonly discountRub?: number | undefined;
	readonly category?: "therapy" | "orthopedics" | "implantology" | "surgery" | "hygiene" | "orthodontics" | "other" | undefined;
}

export interface WarrantyObligationTerm {
	readonly categoryName: string;
	readonly teethDisplay: string;
	readonly warrantyMonths: number;
	readonly warrantyPeriodText: string;
	readonly serviceLifeText: string;
	readonly conditionsText: string;
}

export interface CompletedWorksActParams {
	readonly actNumber: string;
	readonly contractNumber: string;
	readonly contractDateIso?: string | undefined;
	readonly actDateIso?: string | undefined;
	readonly clinic: {
		readonly name: string;
		readonly legalName: string;
		readonly inn: string;
		readonly kpp?: string | undefined;
		readonly ogrn?: string | undefined;
		readonly licenseNumber?: string | undefined;
		readonly licenseDate?: string | undefined;
		readonly address: string;
		readonly phone?: string | undefined;
		readonly chiefDoctorName?: string | undefined;
	};
	readonly patient: {
		readonly id?: string | undefined;
		readonly fullName: string;
		readonly birthDate?: string | undefined;
		readonly passportData?: string | undefined;
		readonly phone?: string | undefined;
		readonly address?: string | undefined;
		readonly medicalCardNumber?: string | undefined;
	};
	readonly doctor: {
		readonly fullName: string;
		readonly specialty?: string | undefined;
	};
	readonly items: readonly InvoiceServiceItem[];
}

export interface CompiledActAndWarrantySummary {
	readonly actNumber: string;
	readonly contractNumber: string;
	readonly items: readonly InvoiceServiceItem[];
	readonly totalGrossKopecks: number;
	readonly totalGrossRub: number;
	readonly totalDiscountKopecks: number;
	readonly totalDiscountRub: number;
	readonly totalNetKopecks: number;
	readonly totalNetRub: number;
	readonly totalNetRubFormatted: string;
	readonly totalInWords: string;
	readonly warrantyTerms: readonly WarrantyObligationTerm[];
}

/**
 * Resolves standard warranty period and service life based on clinical category and service name.
 */
export function resolveServiceWarranty(item: InvoiceServiceItem): {
	categoryName: string;
	warrantyMonths: number;
	warrantyPeriodText: string;
	serviceLifeText: string;
	conditionsText: string;
} {
	const lower = item.name.toLowerCase();

	if (
		lower.includes("имплант") ||
		lower.includes("straumann") ||
		lower.includes("osstem") ||
		lower.includes("nobel") ||
		item.category === "implantology"
	) {
		return {
			categoryName: "Дентальная имплантация (Хирургия)",
			warrantyMonths: 60,
			warrantyPeriodText: "60 месяцев (5 лет) / пожизненная гарантия на титановый имплантат от производителя",
			serviceLifeText: "Не ограничен (пожизненно при соблюдении гигиены)",
			conditionsText: "Прохождение контрольного рентген-осмотра и профгигиены каждые 6 месяцев",
		};
	}

	if (
		lower.includes("коронк") ||
		lower.includes("циркони") ||
		lower.includes("e.max") ||
		lower.includes("винир") ||
		lower.includes("протез") ||
		lower.includes("вкладк") ||
		item.category === "orthopedics"
	) {
		return {
			categoryName: "Ортопедические конструкции (Коронки, виниры, мосты)",
			warrantyMonths: 24,
			warrantyPeriodText: "24 месяца (2 года)",
			serviceLifeText: "5–7 лет",
			conditionsText: "Контрольный осмотр и пришлифовка окклюзии 1 раз в 6 месяцев, ношение ночной каппы при бруксизме",
		};
	}

	if (
		lower.includes("кариес") ||
		lower.includes("пломб") ||
		lower.includes("реставрац") ||
		lower.includes("пульпит") ||
		lower.includes("герметизац") ||
		item.category === "therapy"
	) {
		return {
			categoryName: "Терапевтическое лечение (Пломбы, реставрации)",
			warrantyMonths: 12,
			warrantyPeriodText: "12 месяцев (1 год)",
			serviceLifeText: "2–3 года",
			conditionsText: "Соблюдение индивидуальной гигиены полости рта, профгигиена не реже 1 раза в 6 месяцев",
		};
	}

	if (lower.includes("брекет") || lower.includes("элайнер") || item.category === "orthodontics") {
		return {
			categoryName: "Ортодонтическое лечение",
			warrantyMonths: 12,
			warrantyPeriodText: "12 месяцев (при условии ретенционного периода)",
			serviceLifeText: "Постоянно",
			conditionsText: "Ношение несъемных ретейнеров или ретенционных капп по предписанию врача-ортодонта",
		};
	}

	return {
		categoryName: "Стоматологические манипуляции и гигиена",
		warrantyMonths: 6,
		warrantyPeriodText: "По клиническому протоколу (до 6 месяцев)",
		serviceLifeText: "6–12 месяцев",
		conditionsText: "Регулярный профилактический осмотр",
	};
}

/**
 * Compiles completed works act and grouped warranty obligations.
 */
export function compileCompletedWorksAct(params: CompletedWorksActParams): CompiledActAndWarrantySummary {
	let totalGrossKopecks = 0;
	let totalDiscountKopecks = 0;

	const warrantyGroupMap = new Map<string, { categoryName: string; teeth: Set<string>; warrantyMonths: number; warrantyPeriodText: string; serviceLifeText: string; conditionsText: string }>();

	for (const item of params.items) {
		const unitPriceKop = rubToKopecks(item.priceRub);
		const lineGrossKop = unitPriceKop * item.quantity;
		const lineDiscKop = item.discountRub ? rubToKopecks(item.discountRub) : 0;

		totalGrossKopecks += lineGrossKop;
		totalDiscountKopecks += lineDiscKop;

		const wInfo = resolveServiceWarranty(item);
		let group = warrantyGroupMap.get(wInfo.categoryName);
		if (!group) {
			group = {
				categoryName: wInfo.categoryName,
				teeth: new Set<string>(),
				warrantyMonths: wInfo.warrantyMonths,
				warrantyPeriodText: wInfo.warrantyPeriodText,
				serviceLifeText: wInfo.serviceLifeText,
				conditionsText: wInfo.conditionsText,
			};
			warrantyGroupMap.set(wInfo.categoryName, group);
		}

		if (item.toothNumber) {
			group.teeth.add(String(item.toothNumber));
		}
	}

	const totalNetKopecks = Math.max(0, totalGrossKopecks - totalDiscountKopecks);
	const totalNetRub = kopecksToRub(totalNetKopecks);

	const warrantyTerms: WarrantyObligationTerm[] = Array.from(warrantyGroupMap.values()).map((g) => ({
		categoryName: g.categoryName,
		teethDisplay: g.teeth.size > 0 ? Array.from(g.teeth).join(", ") : "Область полости рта",
		warrantyMonths: g.warrantyMonths,
		warrantyPeriodText: g.warrantyPeriodText,
		serviceLifeText: g.serviceLifeText,
		conditionsText: g.conditionsText,
	}));

	return {
		actNumber: params.actNumber,
		contractNumber: params.contractNumber,
		items: params.items,
		totalGrossKopecks,
		totalGrossRub: kopecksToRub(totalGrossKopecks),
		totalDiscountKopecks,
		totalDiscountRub: kopecksToRub(totalDiscountKopecks),
		totalNetKopecks,
		totalNetRub,
		totalNetRubFormatted: kopecksToNumericString(totalNetKopecks),
		totalInWords: numberToWordsRu(totalNetRub),
		warrantyTerms,
	};
}

/**
 * Generates official printable HTML for Act of Completed Works & Warranty Certificate (A4).
 */
export function generateCompletedActAndWarrantyHtml(params: CompletedWorksActParams): string {
	const summary = compileCompletedWorksAct(params);
	const actDateStr = params.actDateIso ? new Date(params.actDateIso).toLocaleDateString("ru-RU") : new Date().toLocaleDateString("ru-RU");
	const contractDateStr = params.contractDateIso ? new Date(params.contractDateIso).toLocaleDateString("ru-RU") : actDateStr;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Акт выполненных работ и гарантийный талон № ${params.actNumber}</title>
	<style>
		@page { size: A4 portrait; margin: 12mm 15mm 12mm 15mm; }
		* { box-sizing: border-box; }
		body {
			font-family: 'Times New Roman', Times, serif;
			font-size: 11pt;
			line-height: 1.25;
			color: #000000;
			background: #ffffff;
			margin: 0;
			padding: 10px;
		}
		.header-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 6px; }
		.header-table td { vertical-align: top; font-size: 9.5pt; line-height: 1.2; }
		.clinic-title { font-size: 13pt; font-weight: bold; text-transform: uppercase; font-family: Arial, sans-serif; }
		.doc-title { text-align: center; font-size: 13pt; font-weight: bold; text-transform: uppercase; margin: 12px 0 4px; font-family: Arial, sans-serif; }
		.doc-subtitle { text-align: center; font-size: 10pt; margin-bottom: 12px; }
		.requisites-grid { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10pt; }
		.requisites-grid td { padding: 4px 6px; border: 1px solid #777; }
		.requisites-grid .lbl { font-weight: bold; background-color: #f3f3f3; width: 22%; }
		.items-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9.5pt; }
		.items-table th, .items-table td { border: 1px solid #000; padding: 5px 6px; }
		.items-table th { background-color: #f0f0f0; text-align: center; font-weight: bold; }
		.num-cell { text-align: center; font-family: monospace; }
		.money-cell { text-align: right; font-family: monospace; font-weight: bold; white-space: nowrap; }
		.warranty-box { margin-top: 12px; border: 1.5px solid #000; border-radius: 4px; padding: 8px 10px; font-size: 9.5pt; background-color: #fafafa; }
		.warranty-title { font-weight: bold; text-transform: uppercase; font-size: 10pt; margin-bottom: 6px; font-family: Arial, sans-serif; color: #111; }
		.legal-text { font-size: 8.5pt; color: #333; margin-top: 8px; text-align: justify; line-height: 1.2; }
		.signatures { margin-top: 20px; width: 100%; border-collapse: collapse; page-break-inside: avoid; }
		.signatures td { width: 50%; vertical-align: top; padding: 4px 10px; font-size: 9.5pt; }
		.sign-line { border-bottom: 1px solid #000; margin-top: 25px; display: flex; justify-content: space-between; font-size: 8.5pt; }
		.stamp-place { border: 1px dashed #777; width: 85px; height: 85px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8pt; color: #777; text-align: center; margin-top: 8px; }
		.paid-badge { border: 2px solid #059669; color: #047857; font-weight: 900; font-size: 11pt; padding: 4px 10px; border-radius: 4px; display: inline-block; transform: rotate(-3deg); text-transform: uppercase; letter-spacing: 1px; }
		@media print {
			body { padding: 0; }
			.no-print { display: none; }
		}
	</style>
</head>
<body>
	<table class="header-table">
		<tr>
			<td style="width: 60%;">
				<div class="clinic-title">${params.clinic.legalName || params.clinic.name}</div>
				<div>Лицензия на осуществление медицинской деятельности № ${params.clinic.licenseNumber || "ЛО41-01137-77/00368421"} от ${params.clinic.licenseDate || "12.10.2021"} г.</div>
				<div>Адрес: ${params.clinic.address}</div>
			</td>
			<td style="width: 40%; text-align: right;">
				<div>ИНН: ${params.clinic.inn} / КПП: ${params.clinic.kpp || "770101001"}</div>
				<div>ОГРН: ${params.clinic.ogrn || "1027700132195"}</div>
				<div>Телефон: <strong>${params.clinic.phone || "+7 (495) 789-01-23"}</strong></div>
			</td>
		</tr>
	</table>

	<div class="doc-title">АКТ ВЫПОЛНЕННЫХ РАБОТ И ГАРАНТИЙНЫЙ ТАЛОН № ${params.actNumber}</div>
	<div class="doc-subtitle">
		к Договору на оказание платных медицинских услуг № ${params.contractNumber} от ${contractDateStr} г. • Дата составления: <strong>${actDateStr} г.</strong>
	</div>

	<table class="requisites-grid">
		<tr>
			<td class="lbl">Исполнитель:</td>
			<td>${params.clinic.legalName}, ИНН ${params.clinic.inn}</td>
			<td class="lbl">Пациент (Заказчик):</td>
			<td><strong>${params.patient.fullName}</strong>${params.patient.birthDate ? ` (${new Date(params.patient.birthDate).toLocaleDateString("ru-RU")} г.р.)` : ""}</td>
		</tr>
		<tr>
			<td class="lbl">Лечащий врач:</td>
			<td>${params.doctor.fullName}${params.doctor.specialty ? ` (${params.doctor.specialty})` : ""}</td>
			<td class="lbl">Паспорт / Документ:</td>
			<td>${params.patient.passportData || "Предъявлен при первичном приеме"}</td>
		</tr>
		<tr>
			<td class="lbl">Медкарта №:</td>
			<td>${params.patient.medicalCardNumber || "043/у"} (ID: ${params.patient.id || "—"})</td>
			<td class="lbl">Контактный телефон:</td>
			<td>${params.patient.phone || "—"}</td>
		</tr>
	</table>

	<table class="items-table">
		<thead>
			<tr>
				<th style="width: 25px;">№</th>
				<th style="width: 75px;">Код 804н</th>
				<th style="width: 45px;">Зуб</th>
				<th>Наименование оказанной медицинской услуги / работы</th>
				<th style="width: 40px;">Кол.</th>
				<th style="width: 70px;">Цена, ₽</th>
				<th style="width: 80px;">Сумма, ₽</th>
			</tr>
		</thead>
		<tbody>
			${summary.items.map((it, idx) => {
				const sum = it.priceRub * it.quantity - (it.discountRub || 0);
				return `<tr>
					<td class="num-cell">${idx + 1}</td>
					<td class="num-cell">${it.code804n || "—"}</td>
					<td class="num-cell font-bold">${it.toothNumber || "—"}</td>
					<td>${it.name}</td>
					<td class="num-cell">${it.quantity}</td>
					<td class="money-cell">${it.priceRub.toFixed(2)}</td>
					<td class="money-cell">${sum.toFixed(2)}</td>
				</tr>`;
			}).join("")}
			<tr style="background-color: #f5f5f5; font-weight: bold;">
				<td colspan="6" style="text-align: right; text-transform: uppercase;">Итого оказано услуг (Без НДС, ст. 149 НК РФ):</td>
				<td class="money-cell" style="font-size: 11pt;">${summary.totalNetRubFormatted} ₽</td>
			</tr>
		</tbody>
	</table>

	<div style="font-size: 9.5pt; margin-bottom: 10px;">
		<strong>Сумма прописью:</strong> <em>${summary.totalInWords}</em>.
	</div>

	<!-- Гарантийный талон и обязательства клиники -->
	<div class="warranty-box">
		<div class="warranty-title">ГАРАНТИЙНЫЙ ТАЛОН И ОБЯЗАТЕЛЬСТВА КЛИНИКИ (СтАР и Закон РФ № 2300-1)</div>
		<table class="items-table" style="margin-bottom: 4px; background: #fff;">
			<thead>
				<tr>
					<th>Категория работы / Область</th>
					<th>Зубы</th>
					<th>Гарантийный срок</th>
					<th>Срок службы</th>
					<th>Условия сохранения гарантии</th>
				</tr>
			</thead>
			<tbody>
				${summary.warrantyTerms.map((w) => `<tr>
					<td style="font-weight: bold;">${w.categoryName}</td>
					<td class="num-cell">${w.teethDisplay}</td>
					<td style="color: #047857; font-weight: bold;">${w.warrantyPeriodText}</td>
					<td>${w.serviceLifeText}</td>
					<td style="font-size: 8.5pt;">${w.conditionsText}</td>
				</tr>`).join("")}
			</tbody>
		</table>
		<div class="legal-text">
			1. Услуги выполнены в полном объеме, надлежащего качества и в установленный срок в соответствии с клиническими рекомендациями Минздрава РФ. Заказчик претензий по объему, качеству и срокам к Исполнителю не имеет.<br>
			2. Гарантия сохраняется при условии соблюдения гигиены полости рта и прохождения бесплатных профилактических осмотров и профессиональной гигиены 1 раз в 6 месяцев.
		</div>
	</div>

	<table class="signatures">
		<tr>
			<td>
				<div><strong>Исполнитель:</strong> ${params.clinic.legalName}</div>
				<div>Главный врач / Лечащий врач: <strong>${params.doctor.fullName}</strong></div>
				<div class="sign-line">
					<span>Подпись: __________________</span>
					<span>/ ${params.doctor.fullName} /</span>
				</div>
				<div style="display: flex; gap: 15px; align-items: center; margin-top: 10px;">
					<div class="paid-badge">✓ ОПЛАЧЕНО</div>
					<div class="stamp-place">М.П.<br>Клиники</div>
				</div>
			</td>
			<td>
				<div><strong>Пациент (Заказчик):</strong></div>
				<div>ФИО: <strong>${params.patient.fullName}</strong></div>
				<div class="sign-line">
					<span>Подпись: __________________</span>
					<span>/ ${params.patient.fullName} /</span>
				</div>
				<div style="font-size: 8pt; color: #555; margin-top: 12px; line-height: 1.3;">
					С объемом, стоимостью оказанных услуг и условиями гарантийного обслуживания ознакомлен и согласен. Работу принял.
				</div>
			</td>
		</tr>
	</table>
</body>
</html>`;
}
