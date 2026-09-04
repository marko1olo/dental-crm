import type {
	MdlpCarpuleQueueItem,
	SeniorNurseDisposalActData,
	SeniorNurseDisposalActItem,
} from "./types.js";

// ─── Russian Number to Words Formatter (Сумма прописью) ─────────────────────

const UNITS_MASC = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
const UNITS_FEM = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
const TEENS = [
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
const TENS = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
const HUNDREDS = [
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

function pluralForm(n: number, form1: string, form2: string, form5: string): string {
	const num = Math.abs(n) % 100;
	const n1 = num % 10;
	if (num > 10 && num < 20) return form5;
	if (n1 > 1 && n1 < 5) return form2;
	if (n1 === 1) return form1;
	return form5;
}

function tripletToWords(num: number, isFem = false): string {
	const h = Math.floor(num / 100);
	const t = Math.floor((num % 100) / 10);
	const u = num % 10;
	const words: string[] = [];

	if (h > 0) words.push(HUNDREDS[h]!);
	if (t === 1) {
		words.push(TEENS[u]!);
	} else {
		if (t > 1) words.push(TENS[t]!);
		if (u > 0) {
			words.push(isFem ? UNITS_FEM[u]! : UNITS_MASC[u]!);
		}
	}
	return words.join(" ");
}

/**
 * Converts a numeric amount to Russian words format for financial & inventory acts.
 * Example: 1450.50 -> "Одна тысяча четыреста пятьдесят рублей 50 копеек"
 */
export function amountToRussianWords(amount: number): string {
	if (amount === 0) return "Ноль рублей 00 копеек";

	const integerPart = Math.floor(Math.abs(amount));
	const kopecksPart = Math.round((Math.abs(amount) - integerPart) * 100);

	const billions = Math.floor(integerPart / 1_000_000_000);
	const millions = Math.floor((integerPart % 1_000_000_000) / 1_000_000);
	const thousands = Math.floor((integerPart % 1_000_000) / 1_000);
	const units = integerPart % 1_000;

	const parts: string[] = [];

	if (billions > 0) {
		parts.push(tripletToWords(billions, false));
		parts.push(pluralForm(billions, "миллиард", "миллиарда", "миллиардов"));
	}
	if (millions > 0) {
		parts.push(tripletToWords(millions, false));
		parts.push(pluralForm(millions, "миллион", "миллиона", "миллионов"));
	}
	if (thousands > 0) {
		parts.push(tripletToWords(thousands, true));
		parts.push(pluralForm(thousands, "тысяча", "тысячи", "тысяч"));
	}
	if (units > 0 || parts.length === 0) {
		parts.push(tripletToWords(units, false));
	}

	const rublesWord = pluralForm(integerPart, "рубль", "рубля", "рублей");
	const kopecksWord = pluralForm(kopecksPart, "копейка", "копейки", "копеек");

	const rawRubText = parts.filter(Boolean).join(" ").trim();
	const capitalized = rawRubText.charAt(0).toUpperCase() + rawRubText.slice(1);

	return `${capitalized} ${rublesWord} ${String(kopecksPart).padStart(2, "0")} ${kopecksWord}`;
}

export { amountToRussianWords as mdlpAmountToRussianWords };

/**
 * Converts integer quantity of items to Russian words format.
 * Example: 12 -> "Двенадцать карпул"
 */
export function carpulesQuantityToRussianWords(qty: number, unit = "карпула"): string {
	if (qty === 0) return "0 (ноль) единиц";
	const isFem = unit.endsWith("а") || unit.endsWith("я");
	const text = tripletToWords(qty, isFem).trim();
	const capitalized = text.charAt(0).toUpperCase() + text.slice(1);
	const unitWord = pluralForm(qty, unit, `${unit.slice(0, -1)}ы`, `${unit.slice(0, -1)}`);
	return `${qty} (${capitalized}) ${unitWord}`;
}

export { carpulesQuantityToRussianWords as quantityToRussianWords };

// ─── Format Senior Nurse Act Data Helper ────────────────────────────────────

export function formatSeniorNurseDisposalActData(options: {
	actNumber?: string | undefined;
	actDate?: string | undefined;
	organizationName?: string | undefined;
	organizationInn?: string | undefined;
	organizationAddress?: string | undefined;
	departmentName?: string | undefined;
	cabinetName?: string | undefined;
	seniorNurseName?: string | undefined;
	chiefDoctorName?: string | undefined;
	dentistName?: string | undefined;
	crptReceiptNumber?: string | undefined;
	notes?: string | undefined;
	isSingleSigner?: boolean | undefined;
	requireCommission?: boolean | undefined;
	items: readonly MdlpCarpuleQueueItem[];
}): SeniorNurseDisposalActData {
	const now = new Date();
	const actNumber =
		options.actNumber ??
		`СПИС-${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}-${Math.floor(100 + Math.random() * 900)}`;
	const actDate = options.actDate ?? now.toISOString().slice(0, 10);

	let totalCost = 0;
	const actItems: SeniorNurseDisposalActItem[] = options.items.map((it, idx) => {
		const unitCost = it.costRub ?? 0;
		totalCost += unitCost;

		return {
			itemIndex: idx + 1,
			tradeName: it.drugInfo?.tradeName ?? it.gtin,
			inn: it.drugInfo?.inn ?? "Артикаин / Мепивакаин",
			dosageForm: it.drugInfo?.dosageForm ?? "карпулы 1.7 мл",
			series: it.series ?? "—",
			expirationDate: it.expirationDate ?? "—",
			sgtin: it.sgtin || it.rawBarcode,
			carpulesCount: 1,
			unitCostRub: Number(unitCost.toFixed(2)),
			totalCostRub: Number(unitCost.toFixed(2)),
			patientFullName: it.patientName ?? undefined,
			visitNumber: it.visitId ? `VI-${it.visitId.slice(0, 8).toUpperCase()}` : undefined,
			disposalReasonRu: it.isExpired
				? "Истечение срока годности (утилизация)"
				: "Оказание медицинской помощи (Схема 10560)",
		};
	});

	// В стоматологической клинике списание пустых карпул (медотходы Класса Б)
	// по умолчанию проводится единолично дежурной медсестрой без бюрократической комиссии из 3 человек.
	const useSingleNurse =
		options.isSingleSigner === true ||
		(options.isSingleSigner !== false &&
			options.requireCommission !== true &&
			(!options.chiefDoctorName || !options.dentistName));

	const commission = useSingleNurse
		? [
				{
					role: "senior_nurse" as const,
					roleTitleRu: "МОЛ / Дежурная медсестра",
					fullName: options.seniorNurseName ?? "Иванова Е.В.",
					positionRu: "Медицинская сестра (списание проведено единолично)",
				},
			]
		: [
				{
					role: "senior_nurse" as const,
					roleTitleRu: "Председатель комиссии",
					fullName: options.seniorNurseName ?? "Иванова Е.В.",
					positionRu: "Старшая медицинская сестра",
				},
				{
					role: "chief_doctor" as const,
					roleTitleRu: "Член комиссии",
					fullName: options.chiefDoctorName ?? "Петров А.С.",
					positionRu: "Главный врач клиники",
				},
				{
					role: "dentist" as const,
					roleTitleRu: "Член комиссии (МОЛ)",
					fullName: options.dentistName ?? "Кузнецов М.С.",
					positionRu: "Врач-стоматолог терапевт / хирург",
				},
			];

	return {
		actNumber,
		actDate,
		organizationName: options.organizationName ?? 'ООО "ДЕНТЕ КЛИНИК"',
		organizationInn: options.organizationInn ?? "7701234567",
		organizationAddress: options.organizationAddress ?? "г. Москва, ул. Клиническая, д. 10, стр. 2",
		departmentName: options.departmentName ?? "Стоматологическое отделение",
		cabinetName: options.cabinetName ?? "Кабинет №1 (Терапия / Хирургия)",
		basisRu:
			"Приказ МЗ РФ № 804н, ФЗ № 425-ФЗ, Постановление Правительства РФ № 1556 (Схема МДЛП 10560)",
		schema10560ActionId: 10560,
		crptReceiptNumber: options.crptReceiptNumber,
		commission,
		items: actItems,
		totalQuantityCarpules: actItems.length,
		totalCostRub: Number(totalCost.toFixed(2)),
		totalCostInWordsRu: amountToRussianWords(totalCost),
		totalQuantityInWordsRu: carpulesQuantityToRussianWords(actItems.length, "карпула"),
		notes: options.notes,
		approvedByFullName: useSingleNurse
			? (options.seniorNurseName ?? "Иванова Е.В.")
			: (options.chiefDoctorName ?? "Петров А.С."),
		approvedByPositionRu: useSingleNurse
			? "Старшая медицинская сестра"
			: "Главный врач",
		approvalDate: actDate,
	};
}

// ─── HTML Senior Nurse Act Generator ────────────────────────────────────────

/**
 * Generates an official printable HTML document for the Senior Nurse Medication Write-off Act.
 * Conforms to Russian healthcare inventory audit regulations (Росздравнадзор & МДЛП).
 */
export function generateSeniorNurseDisposalActHtml(actData: SeniorNurseDisposalActData): string {
	const rowsHtml = actData.items
		.map(
			(it) => `
      <tr>
        <td style="text-align: center;">${it.itemIndex}</td>
        <td>
          <strong>${it.tradeName}</strong><br/>
          <span style="font-size: 10px; color: #555;">МНН: ${it.inn}</span>
        </td>
        <td style="font-size: 11px;">${it.dosageForm}</td>
        <td style="text-align: center; font-family: monospace;">${it.series}</td>
        <td style="text-align: center; font-size: 11px;">${it.expirationDate}</td>
        <td style="font-family: monospace; font-size: 10px; word-break: break-all;">${it.sgtin}</td>
        <td style="text-align: center; font-weight: bold;">${it.carpulesCount}</td>
        <td style="text-align: right;">${it.unitCostRub.toFixed(2)}</td>
        <td style="text-align: right; font-weight: bold;">${it.totalCostRub.toFixed(2)}</td>
        <td style="font-size: 10px;">
          ${it.patientFullName ? `Пациент: ${it.patientFullName}` : ""}${
						it.visitNumber ? `<br/>${it.visitNumber}` : ""
					}<br/>
          <em>${it.disposalReasonRu}</em>
        </td>
      </tr>`,
		)
		.join("\n");

	const commissionSignatures = actData.commission
		.map(
			(m) => `
      <div style="margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="width: 45%;">
          <strong>${m.roleTitleRu} (${m.positionRu}):</strong>
        </div>
        <div style="width: 25%; border-bottom: 1px solid #000; text-align: center; font-size: 10px; padding-bottom: 2px;">
          (подпись)
        </div>
        <div style="width: 25%; text-align: right; font-weight: bold;">
          / ${m.fullName} /
        </div>
      </div>`,
		)
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>Акт списания медикаментов № ${actData.actNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 15mm 15mm 15mm;
    }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 12px;
      line-height: 1.35;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
    }
    .header-table {
      width: 100%;
      margin-bottom: 15px;
      border-collapse: collapse;
    }
    .header-table td {
      vertical-align: top;
      padding: 0;
    }
    .approval-block {
      width: 280px;
      text-align: left;
      font-size: 11px;
      border-left: 2px solid transparent;
    }
    h1 {
      font-size: 15px;
      text-align: center;
      text-transform: uppercase;
      margin: 15px 0 5px 0;
      font-weight: bold;
    }
    .subtitle {
      text-align: center;
      font-size: 12px;
      margin-bottom: 15px;
    }
    .metadata-block {
      margin-bottom: 12px;
      font-size: 11.5px;
      line-height: 1.4;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      margin-bottom: 15px;
    }
    table.data-table th, table.data-table td {
      border: 1px solid #000;
      padding: 4px 6px;
      font-size: 11px;
    }
    table.data-table th {
      background-color: #f2f2f2;
      font-weight: bold;
      text-align: center;
    }
    .totals-block {
      margin-top: 10px;
      margin-bottom: 15px;
      font-size: 12px;
      line-height: 1.45;
    }
    .signatures-block {
      margin-top: 25px;
      page-break-inside: avoid;
    }
    .stamp-place {
      margin-top: 15px;
      font-size: 11px;
      font-style: italic;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <!-- Шапка утверждения -->
  <table class="header-table">
    <tr>
      <td style="width: 55%;">
        <strong>${actData.organizationName}</strong><br/>
        <span>ИНН: ${actData.organizationInn}</span><br/>
        <span style="font-size: 10.5px; color: #333;">${actData.organizationAddress}</span><br/>
        <span>Отделение: <u>${actData.departmentName}</u></span><br/>
        ${actData.cabinetName ? `<span>Кабинет / Пост: <u>${actData.cabinetName}</u></span>` : ""}
      </td>
      <td style="width: 45%; text-align: right;">
        <div class="approval-block" style="display: inline-block;">
          <strong>УТВЕРЖДАЮ</strong><br/>
          ${actData.approvedByPositionRu ?? "Главный врач"}<br/>
          ${actData.organizationName}<br/>
          <div style="margin: 12px 0 4px 0; border-bottom: 1px solid #000; width: 180px;">&nbsp;</div>
          / ${actData.approvedByFullName ?? "_______________"} /<br/>
          «____» _______________ 2026 г.<br/>
          <span style="font-size: 9.5px; color: #555;">М.П.</span>
        </div>
      </td>
    </tr>
  </table>

  <!-- Заголовок акта -->
  <h1>АКТ СПИСАНИЯ ЛЕКАРСТВЕННЫХ ПРЕПАРАТОВ И АНЕСТЕТИКОВ № ${actData.actNumber}</h1>
  <div class="subtitle">
    от «${actData.actDate.slice(8, 10)}» ${getMonthNameRu(actData.actDate)} ${actData.actDate.slice(0, 4)} года
  </div>

  <!-- Основание и состав комиссии -->
  <div class="metadata-block">
    <strong>Основание составления акта:</strong> ${actData.basisRu}.<br/>
    <strong>Регистрация в ИС МДЛП (Честный ЗНАК):</strong> Схема ${actData.schema10560ActionId} (Вывод из оборота для оказания медицинской помощи).
    ${actData.crptReceiptNumber ? `<br/><strong>Квитанция ЦРПТ / МДЛП:</strong> ${actData.crptReceiptNumber}` : ""}<br/>
    ${
			actData.commission.length === 1
				? `<strong>Списание произведено единолично:</strong> ${actData.commission[0]?.positionRu} <strong>${actData.commission[0]?.fullName}</strong> (без сбора комиссии по СанПиН 3.3686-21).<br/>`
				: `<strong>Комиссия в составе:</strong>
    <ul style="margin: 4px 0 6px 20px; padding: 0;">
      ${actData.commission.map((m) => `<li>${m.roleTitleRu} — ${m.positionRu} <strong>${m.fullName}</strong></li>`).join("")}
    </ul>`
		}
    произвела осмотр и подтверждает фактический расход и списание следующих карпульных анестетиков и медикаментов:
  </div>

  <!-- Таблица списания -->
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 25px;">№</th>
        <th>Торговое наименование / МНН</th>
        <th style="width: 80px;">Форма</th>
        <th style="width: 65px;">Серия</th>
        <th style="width: 70px;">Годен до</th>
        <th style="width: 140px;">SGTIN (Честный ЗНАК)</th>
        <th style="width: 40px;">Кол-во</th>
        <th style="width: 65px;">Цена, ₽</th>
        <th style="width: 70px;">Сумма, ₽</th>
        <th style="width: 110px;">Пациент / Основание</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
    <tfoot>
      <tr style="font-weight: bold; background-color: #f9f9f9;">
        <td colspan="6" style="text-align: right;">ИТОГО ПО АКТУ:</td>
        <td style="text-align: center;">${actData.totalQuantityCarpules}</td>
        <td></td>
        <td style="text-align: right;">${actData.totalCostRub.toFixed(2)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <!-- Итоговые суммы прописью -->
  <div class="totals-block">
    <div><strong>Всего списано:</strong> ${actData.totalQuantityInWordsRu}.</div>
    <div><strong>На общую сумму:</strong> ${actData.totalCostInWordsRu} (${actData.totalCostRub.toFixed(2)} руб.).</div>
    ${actData.notes ? `<div style="margin-top: 4px;"><strong>Примечание:</strong> ${actData.notes}</div>` : ""}
    <div style="margin-top: 4px; font-size: 11px; color: #333;">
      Все перечисленные медикаменты выведены из системы маркировки Честный ЗНАК (ИС МДЛП) в установленном законом порядке.
    </div>
  </div>

  <!-- Подписи членов комиссии или единоличного исполнителя -->
  <div class="signatures-block">
    <div style="font-weight: bold; margin-bottom: 10px;">${actData.commission.length > 1 ? "Члены комиссии:" : "Списание провел (МОЛ):"}</div>
    ${commissionSignatures}
  </div>

  <div class="stamp-place">
    Акт составлен в 2 (двух) экземплярах: 1-й экз. — в бухгалтерию, 2-й экз. — старшей медицинской сестре.
  </div>
</body>
</html>`;
}

function getMonthNameRu(isoDate: string): string {
	const m = Number.parseInt(isoDate.slice(5, 7), 10);
	const months = [
		"января",
		"февраля",
		"марта",
		"апреля",
		"мая",
		"июня",
		"июля",
		"августа",
		"сентября",
		"октября",
		"ноября",
		"декабря",
	];
	return months[m - 1] ?? "месяца";
}
