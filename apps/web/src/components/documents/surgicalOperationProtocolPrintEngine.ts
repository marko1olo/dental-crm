/**
 * surgicalOperationProtocolPrintEngine.ts
 *
 * Движок печати протокола хирургического вмешательства и дентальной имплантации
 * для амбулаторной стоматологической карты (Форма 043/у).
 *
 * Стандарты и регламенты:
 * - Приказ Минздрава РФ № 1051н, Приказ Минздрава РФ № 804н, Форма № 043/у.
 * - Мандат 8e (Автономия врача): печать в любой момент со штампом «ЧЕРНОВИК» или «ПОДПИСАНО ВРАЧОМ».
 * - Мандат 8i (Стоматология у кресла): чистые амбулаторные формуляры без больничного блоата.
 * - Мандат 8k (Friction-Killer): мгновенная печать в 1 клик.
 * - Мандат 8d (Святость бланков, грех № 7): ноль эмодзи, строгая векторная и шрифтовая типографика.
 */

export interface SurgicalOperationProtocolPrintOptions {
	patient: {
		fullName?: string | null | undefined;
		birthDate?: string | null | undefined;
		phone?: string | null | undefined;
		cardNumber?: string | null | undefined;
		gender?: string | null | undefined;
		snils?: string | null | undefined;
		address?: string | null | undefined;
	} | null | undefined;
	clinic?: {
		legalName?: string | null | undefined;
		clinicName?: string | null | undefined;
		fullName?: string | null | undefined;
		address?: string | null | undefined;
		actualAddress?: string | null | undefined;
		inn?: string | null | undefined;
		ogrn?: string | null | undefined;
		licenseNumber?: string | null | undefined;
		phone?: string | null | undefined;
	} | null | undefined;
	doctorFullName?: string | null | undefined;
	assistantFullName?: string | null | undefined;
	operationDate?: string | null | undefined;
	operationType?: string | null | undefined;
	toothNumber?: string | number | null | undefined;
	diagnosis?: string | null | undefined;
	mkb10?: string | null | undefined;
	anesthesia?: {
		type?: string | null | undefined;
		drug?: string | null | undefined;
		volumeMl?: number | string | null | undefined;
		vasoconstrictor?: string | null | undefined;
	} | null | undefined;
	protocolText?: string | null | undefined;
	surgeryDetails?: {
		implantBrand?: string | null | undefined;
		implantModel?: string | null | undefined;
		diameterMm?: number | string | null | undefined;
		lengthMm?: number | string | null | undefined;
		torqueNcm?: number | string | null | undefined;
		isq?: number | string | null | undefined;
		capType?: "fdm" | "plug" | string | null | undefined;
		lotNumber?: string | null | undefined;
		boneGraft?: string | null | undefined;
		membrane?: string | null | undefined;
		sutureMaterial?: string | null | undefined;
		hemostasis?: string | null | undefined;
		complications?: string | null | undefined;
	} | null | undefined;
	isSignedByDoctor?: boolean | undefined;
}

function escapeHtml(str: string | null | undefined): string {
	if (!str) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function formatDateRu(dateStr: string | null | undefined): string {
	if (!dateStr) return "«___» _________ _____ г.";
	try {
		const d = new Date(dateStr);
		if (Number.isNaN(d.getTime())) return escapeHtml(dateStr);
		return (
			d.toLocaleDateString("ru-RU", {
				day: "numeric",
				month: "long",
				year: "numeric",
			}) + " г."
		);
	} catch {
		return escapeHtml(dateStr);
	}
}

/**
 * Генерирует HTML протокола хирургической операции по стандартам Минздрава РФ (Форма 043/у).
 */
export function generateSurgicalOperationProtocolHtml(
	options: SurgicalOperationProtocolPrintOptions,
): string {
	const {
		patient,
		clinic,
		doctorFullName,
		assistantFullName,
		operationDate,
		operationType,
		toothNumber,
		diagnosis,
		mkb10,
		anesthesia,
		protocolText,
		surgeryDetails,
		isSignedByDoctor = false,
	} = options;

	const formattedDate = operationDate
		? formatDateRu(operationDate)
		: new Date().toLocaleDateString("ru-RU", {
				day: "numeric",
				month: "long",
				year: "numeric",
			}) + " г.";

	const clinicName =
		escapeHtml(clinic?.legalName || clinic?.fullName || clinic?.clinicName) ||
		"ООО «Стоматологическая клиника ДЕНТЕ»";
	const clinicAddress =
		escapeHtml(clinic?.actualAddress || clinic?.address) ||
		"г. Москва, ул. Стоматологическая, д. 10";
	const clinicLicense =
		escapeHtml(clinic?.licenseNumber) || "ЛО41-01137-77/00584930";
	const clinicInn = escapeHtml(clinic?.inn) || "7701987654";

	const ptName =
		escapeHtml(patient?.fullName) || "________________________________________";
	const ptBirth = patient?.birthDate
		? formatDateRu(patient.birthDate)
		: "«___» _________ _____ г.";
	const ptCard = escapeHtml(patient?.cardNumber) || "______";
	const doctor = escapeHtml(doctorFullName) || "____________________";
	const assistant = escapeHtml(assistantFullName) || "____________________";

	const opTitle =
		escapeHtml(operationType) ||
		"Хирургическая операция в амбулаторных условиях";
	const toothStr = toothNumber ? `Зуб FDI #${escapeHtml(String(toothNumber))}` : "Область вмешательства";
	const diagStr = escapeHtml(diagnosis) || "Частичное отсутствие зубов (К08.1)";
	const mkbStr = escapeHtml(mkb10) || "K08.1";

	const anesthesiaText = anesthesia
		? `${escapeHtml(anesthesia.type || "Местная инфильтрационная / проводниковая")}: ${escapeHtml(anesthesia.drug || "Артикаин 4% с эпинефрином 1:100 000")} — ${escapeHtml(String(anesthesia.volumeMl || "1.7"))} мл. Аспирационная проба отрицательная.`
		: "Местная анестезия (Артикаин 4% с эпинефрином 1:100 000, 1.7 мл). Аспирационная проба отрицательная.";

	const protocolBody =
		escapeHtml(protocolText) ||
		"Под местной анестезией проведен разрез слизистой оболочки альвеолярного отростка. Сформирован слизисто-надкостничный лоскут. Скелетирована костная ткань. Ложе имплантата сформировано ступенчатыми фрезами с обильной ирригацией охлажденным стерильным физраствором 0.9%. Установлен дентальный имплантат. Первичная механическая стабильность достигнута. Контроль гемостаза. Лоскуты адаптированы и ушиты узловыми швами. Даны рекомендации.";

	// Штамп подписания по Мандату 8e
	const stampHtml = isSignedByDoctor
		? `<div class="stamp-signed">
				<div class="stamp-title">ПОДПИСАНО ВРАЧОМ</div>
				<div class="stamp-sub">${doctor}</div>
				<div class="stamp-date">${formattedDate}</div>
			</div>`
		: `<div class="stamp-draft">
				<div class="stamp-title">ЧЕРНОВИК</div>
				<div class="stamp-sub">МАНДАТ 8E: АВТОНОМИЯ ВРАЧА</div>
				<div class="stamp-sub">ПЕЧАТЬ В ЛЮБОЙ МОМЕНТ</div>
			</div>`;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Протокол операции — ${escapeHtml(patient?.fullName || "Пациент")}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PT Sans", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.45;
      color: #111827;
      background: #ffffff;
      padding: 0;
    }
    .protocol-container {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
      position: relative;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #0d9488;
      padding-bottom: 8px;
      margin-bottom: 14px;
    }
    .clinic-title {
      font-size: 13pt;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .clinic-meta {
      font-size: 8.5pt;
      color: #4b5563;
      line-height: 1.3;
      margin-top: 3px;
    }
    .doc-number {
      text-align: right;
      font-size: 9pt;
      color: #4b5563;
    }
    .doc-number strong {
      font-size: 11pt;
      color: #0f172a;
    }
    h1 {
      font-size: 13pt;
      font-weight: 800;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 12px 0 4px 0;
      color: #0f172a;
    }
    .sub-title {
      text-align: center;
      font-size: 9pt;
      color: #6b7280;
      margin-bottom: 16px;
      text-transform: uppercase;
    }
    .meta-box {
      border: 1px solid #d1d5db;
      border-radius: 4px;
      padding: 10px 12px;
      margin-bottom: 14px;
      background: #f9fafb;
      font-size: 9.5pt;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .meta-row:last-child {
      margin-bottom: 0;
    }
    .meta-label {
      font-weight: 700;
      color: #374151;
      width: 32%;
    }
    .meta-val {
      color: #111827;
      width: 68%;
    }
    .section-title {
      font-size: 10.5pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #0d9488;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 4px;
      margin: 14px 0 8px 0;
      letter-spacing: 0.3px;
    }
    .protocol-text-block {
      white-space: pre-wrap;
      font-size: 10pt;
      line-height: 1.5;
      text-align: justify;
      color: #111827;
      margin-bottom: 14px;
      border-left: 3px solid #0d9488;
      padding-left: 10px;
    }
    .implant-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 14px 0;
      font-size: 9pt;
    }
    .implant-table th, .implant-table td {
      border: 1px solid #d1d5db;
      padding: 5px 8px;
      text-align: left;
    }
    .implant-table th {
      background: #f3f4f6;
      font-weight: 700;
      color: #374151;
    }
    .signatures-block {
      margin-top: 24px;
      padding-top: 14px;
      border-top: 1px solid #d1d5db;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      position: relative;
    }
    .sig-col {
      width: 48%;
      font-size: 9pt;
      line-height: 1.6;
    }
    .sig-line {
      margin-top: 24px;
      border-bottom: 1px solid #111827;
      width: 100%;
      height: 1px;
    }
    .sig-caption {
      font-size: 8pt;
      color: #6b7280;
      text-align: center;
      margin-top: 3px;
    }
    /* Штамп (Мандат 8e) */
    .stamp-draft {
      position: absolute;
      right: 15px;
      bottom: 60px;
      border: 3px dashed #d97706;
      border-radius: 8px;
      padding: 6px 14px;
      text-align: center;
      color: #b45309;
      transform: rotate(-7deg);
      opacity: 0.85;
      pointer-events: none;
    }
    .stamp-signed {
      position: absolute;
      right: 15px;
      bottom: 60px;
      border: 3px double #0d9488;
      border-radius: 8px;
      padding: 6px 14px;
      text-align: center;
      color: #0f766e;
      transform: rotate(-4deg);
      opacity: 0.9;
      pointer-events: none;
    }
    .stamp-title {
      font-size: 11pt;
      font-weight: 900;
      letter-spacing: 1px;
    }
    .stamp-sub {
      font-size: 8pt;
      font-weight: 600;
    }
    .stamp-date {
      font-size: 7.5pt;
      margin-top: 2px;
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
  <div class="protocol-container">
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <div class="clinic-title">${clinicName}</div>
          <div class="clinic-meta">
            ${clinicAddress} · Тел: ${escapeHtml(clinic?.phone || "+7 (495) 123-45-67")}<br/>
            Лицензия: ${clinicLicense} · ИНН: ${clinicInn}
          </div>
        </td>
        <td class="doc-number" style="vertical-align: top;">
          <div>Мед. карта №: <strong>${ptCard}</strong></div>
          <div style="font-size: 8pt; color: #6b7280; margin-top: 2px;">Форма 043/у (Приказ МЗ РФ № 1051н)</div>
          <div style="font-size: 8.5pt; color: #111827; margin-top: 3px;">Дата: <strong>${formattedDate}</strong></div>
        </td>
      </tr>
    </table>

    <h1>Протокол операции</h1>
    <div class="sub-title">${opTitle} · ${toothStr}</div>

    <div class="meta-box">
      <div class="meta-row">
        <span class="meta-label">Ф.И.О. пациента:</span>
        <span class="meta-val"><strong>${ptName}</strong></span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Дата рождения:</span>
        <span class="meta-val">${ptBirth}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Диагноз (МКБ-10):</span>
        <span class="meta-val">${diagStr} [${mkbStr}]</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Оперирующий хирург:</span>
        <span class="meta-val">${doctor}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Ассистент:</span>
        <span class="meta-val">${assistant}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Анестезиологическое пособие:</span>
        <span class="meta-val">${anesthesiaText}</span>
      </div>
    </div>

    <div class="section-title">Ход операции</div>
    <div class="protocol-text-block">${protocolBody}</div>

    ${
		surgeryDetails?.implantBrand
			? `
    <div class="section-title">Параметры установленного имплантата</div>
    <table class="implant-table">
      <thead>
        <tr>
          <th>Система</th>
          <th>Диаметр</th>
          <th>Длина</th>
          <th>Торк (Н·см)</th>
          <th>Стабильность ISQ</th>
          <th>Элемент укрытия</th>
          <th>LOT / Партия</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${escapeHtml(surgeryDetails.implantBrand)} ${escapeHtml(surgeryDetails.implantModel || "")}</strong></td>
          <td>${escapeHtml(String(surgeryDetails.diameterMm || "4.0"))} мм</td>
          <td>${escapeHtml(String(surgeryDetails.lengthMm || "10.0"))} мм</td>
          <td>${escapeHtml(String(surgeryDetails.torqueNcm || "35"))} Н·см</td>
          <td>${escapeHtml(String(surgeryDetails.isq || "72"))}</td>
          <td>${surgeryDetails.capType === "plug" ? "Винт-заглушка (двухэтапный)" : "ФДМ (формирователь десны)"}</td>
          <td>${escapeHtml(surgeryDetails.lotNumber || "—")}</td>
        </tr>
      </tbody>
    </table>
    `
			: ""
	}

    <div class="section-title">Послеоперационные назначения и рекомендации</div>
    <div style="font-size: 9pt; line-height: 1.45; color: #374151; margin-bottom: 14px;">
      1. Холод на область операции местно (по 15 мин с перерывами 20 мин в течение первых 2-3 часов).<br/>
      2. Исключить горячую, грубую, острую пищу, физические нагрузки, тепловые процедуры на 3–5 дней.<br/>
      3. Ротовые ванночки с антисептиком (Хлоргексидин 0.05% / Мирамистин 0.01%) 3-4 раза в день после еды без активного полоскания.<br/>
      4. При болях: НПВС (Ибупрофен 400 мг / Кетопрофен 100 мг / Парацетамол 500 мг) по согласованию с соматическим профилем.<br/>
      5. Явка на контрольный осмотр и снятие швов через 7–10 суток: «___» _________ _____ г.
    </div>

    <div class="signatures-block">
      ${stampHtml}
      <div class="sig-col">
        <div>Врач стоматолог-хирург:</div>
        <div class="sig-line"></div>
        <div class="sig-caption">(подпись / ${doctor})</div>
      </div>
      <div class="sig-col">
        <div>Пациент ознакомлен:</div>
        <div class="sig-line"></div>
        <div class="sig-caption">(подпись / ${ptName})</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Запускает печать хирургического протокола в 1 клик.
 * Использует надежный window.open с fallback через невидимый iframe.
 */
export function printSurgicalOperationProtocol(
	options: SurgicalOperationProtocolPrintOptions,
): void {
	const html = generateSurgicalOperationProtocolHtml(options);

	let printWindow: Window | null = null;
	try {
		printWindow = window.open("", "_blank", "width=920,height=1050");
	} catch (e) {
		console.warn("window.open blocked, using iframe fallback", e);
	}

	if (printWindow && !printWindow.closed) {
		try {
			printWindow.document.open();
			printWindow.document.write(html);
			printWindow.document.close();
			printWindow.focus();
			setTimeout(() => {
				try {
					printWindow?.print();
				} catch (printErr) {
					console.error("Window print trigger failed:", printErr);
				}
			}, 300);
			return;
		} catch (writeErr) {
			console.warn(
				"Error writing to printWindow, trying fallback iframe",
				writeErr,
			);
		}
	}

	// Fallback iframe
	try {
		const existingIframe = document.getElementById(
			"dente-surgical-protocol-print-iframe",
		);
		if (existingIframe) {
			existingIframe.remove();
		}

		const iframe = document.createElement("iframe");
		iframe.id = "dente-surgical-protocol-print-iframe";
		iframe.style.position = "fixed";
		iframe.style.right = "0";
		iframe.style.bottom = "0";
		iframe.style.width = "0";
		iframe.style.height = "0";
		iframe.style.border = "none";
		iframe.style.zIndex = "-999";
		document.body.appendChild(iframe);

		const doc = iframe.contentWindow?.document;
		if (doc) {
			doc.open();
			doc.write(html);
			doc.close();
			iframe.contentWindow?.focus();
			setTimeout(() => {
				try {
					iframe.contentWindow?.print();
				} catch (iframeErr) {
					console.error("Iframe print trigger failed:", iframeErr);
				}
			}, 350);
		}
	} catch (iframeSetupErr) {
		console.error("Iframe fallback print failed:", iframeSetupErr);
		window.print();
	}
}
