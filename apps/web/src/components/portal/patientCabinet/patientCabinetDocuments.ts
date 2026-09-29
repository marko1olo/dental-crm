/**
 * patientCabinetDocuments.ts
 *
 * Генераторы официальных документов для личного кабинета пациента:
 * - Справка для налогового вычета (Форма КНД 1151156) с разбивкой Код 1 / Код 2
 * - Кассовый чек 54-ФЗ (ФФД 1.2) с номенклатурой услуг 804н и QR-кодом ФНС
 * - QR-код экспресс-чекина на ресепшене
 * - Утилиты печати и скачивания HTML-документов
 */

import { generateQrCodeSvg } from "@dental/shared";
import {
	generateFnsNdflPrintHtml,
	type FnsNdflFiscalReceiptItem,
	type FnsNdflXmlPayload,
} from "../../documents/ndflXml/fnsNdflXmlEngine.js";
import type {
	PatientPersonalCabinetData,
	PatientInvoiceItem,
	PatientAppointment,
	PatientStatutoryConsent,
	GeneratedDocumentSummary,
	PatientPrescriptionItem,
} from "./patientCabinetEngine.js";
import {
	formatRussianDateIso,
	formatRubles,
	calculateCabinetSummary,
} from "./patientCabinetEngine.js";
import { generateExtract043Html } from "./patientExtract043Documents.js";
export {
	formatRussianDateIso,
	formatRubles,
	calculateCabinetSummary,
	generateExtract043Html,
};

// ============================================================================
// STATUTORY TAX DEDUCTION (KND 1151156) & 54-FZ DETAILED RECEIPT GENERATORS
// ============================================================================

export function generatePatientTaxCertificate1151156(
	data: PatientPersonalCabinetData,
	taxYear = 2026,
): string {
	const nameParts = data.fullName.trim().split(/\s+/);
	const family = nameParts[0] || "Пациент";
	const given = nameParts[1] || "Иван";
	const patronymic = nameParts.slice(2).join(" ") || undefined;

	// Filter paid invoices for the given tax year
	const paidInvoices = data.invoices.filter((inv) => {
		if (inv.status !== "paid") return false;
		if (taxYear) {
			const invYear = parseInt(inv.issueDateIso.slice(0, 4), 10);
			return invYear === taxYear;
		}
		return true;
	});

	// Flat map receipts with Code 1 vs Code 2
	const receipts: FnsNdflFiscalReceiptItem[] = [];
	for (const inv of paidInvoices) {
		for (let i = 0; i < inv.items.length; i++) {
			const item = inv.items[i]!;
			const isExpensive =
				item.code.startsWith("A16.07.054") ||
				item.titleRu.toLowerCase().includes("имплант") ||
				item.titleRu.toLowerCase().includes("синус") ||
				item.titleRu.toLowerCase().includes("костн");

			receipts.push({
				id: `rec-${inv.id}-${i}`,
				receiptNumber: inv.fiscalReceiptNumber || `ФД-${inv.invoiceNumber}`,
				fiscalDocumentNumber: inv.fiscalReceiptNumber?.replace(/\D/g, "") || undefined,
				receiptDate: inv.paidAtIso ? inv.paidAtIso.slice(0, 10) : inv.issueDateIso,
				serviceName: `${item.titleRu}${item.toothFdi ? ` (зуб №${item.toothFdi})` : ""}`,
				deductionCode: isExpensive ? "2" : "1",
				amountRub: item.totalRub,
			});
		}
	}

	const payload: FnsNdflXmlPayload = {
		documentNumber: data.cardNumber || "10492",
		documentDate: new Date(),
		taxYear,
		clinic: {
			name: "ООО «Стоматологическая клиника ДЕНТЕ»",
			inn: "7841098765",
			kpp: "784101001",
			ogrn: "1217800012345",
			license: {
				number: "ЛО-78-01-011842",
				date: "2021-06-15",
			},
			phone: "+7 (812) 400-20-20",
			directorName: "Смирнов А. В.",
		},
		payer: {
			fullName: {
				family,
				given,
				patronymic,
			},
			inn: (data as { inn?: string }).inn || "781429810482",
			birthDate: data.birthDate || "1984-05-14",
			identityDocument: {
				docTypeCode: "21",
				seriesAndNumber: "4014 982310",
				issueDate: "2014-06-20",
			},
		},
		patient: {
			kinshipCode: "1", // Налогоплательщик и пациент — одно лицо
		},
		receipts,
	};

	return generateFnsNdflPrintHtml(payload);
}

export function generateDetailedReceiptHtml(
	invoice: PatientInvoiceItem,
	data: PatientPersonalCabinetData,
): string {
	const clinicName = "ООО «Стоматологическая клиника ДЕНТЕ»";
	const clinicInn = "7841098765";
	const clinicAddress = "г. Санкт-Петербург, Невский пр-т, д. 140, лит. А";
	const receiptNum = invoice.fiscalReceiptNumber || `ФД-${invoice.invoiceNumber}`;
	const formattedDate = formatRussianDateIso(invoice.paidAtIso?.slice(0, 10) || invoice.issueDateIso);
	const qrCodeSvg = generateQrCodeSvg(
		`https://receipt.nalog.ru/v1/check/${invoice.id}?t=${invoice.paidAtIso || invoice.issueDateIso}&s=${invoice.totalAmountRub}&fn=9960440301&i=98241&fp=319841209&n=1`,
		{ size: 140 },
	);

	const itemsHtml = invoice.items
		.map(
			(item, idx) => `
      <tr>
        <td style="padding: 6px 8px; border-bottom: 1px dashed #cbd5e1; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px 8px; border-bottom: 1px dashed #cbd5e1;">
          <div style="font-weight: 700; color: #0f172a;">${item.titleRu}</div>
          <div style="font-size: 11px; color: #64748b;">Код услуги: ${item.code}${item.toothFdi ? ` • Зуб №${item.toothFdi}` : ""}</div>
        </td>
        <td style="padding: 6px 8px; border-bottom: 1px dashed #cbd5e1; text-align: center;">${item.quantity}</td>
        <td style="padding: 6px 8px; border-bottom: 1px dashed #cbd5e1; text-align: right;">${formatRubles(item.priceRub)}</td>
        <td style="padding: 6px 8px; border-bottom: 1px dashed #cbd5e1; text-align: right; font-weight: 700;">${formatRubles(item.totalRub)}</td>
      </tr>`,
		)
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Кассовый чек 54-ФЗ № ${invoice.invoiceNumber} — ${clinicName}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; color: #0f172a; margin: 0; padding: 20px; line-height: 1.4; }
    .receipt-container { max-width: 600px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; padding: 24px; background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 14px; margin-bottom: 14px; }
    .header h2 { margin: 0 0 4px 0; font-size: 16px; font-weight: 800; text-transform: uppercase; }
    .header p { margin: 2px 0; font-size: 12px; color: #64748b; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; font-size: 12px; background: #f8fafc; padding: 12px; border-radius: 8px; }
    .meta-row { display: flex; justify-content: space-between; }
    .meta-label { color: #64748b; }
    .meta-val { font-weight: 700; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
    th { background: #f1f5f9; padding: 8px; text-align: left; font-weight: 700; border-bottom: 1px solid #cbd5e1; }
    .total-box { display: flex; justify-content: space-between; align-items: baseline; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
    .total-title { font-size: 14px; font-weight: 800; color: #166534; }
    .total-amount { font-size: 20px; font-weight: 900; color: #166534; }
    .footer { display: flex; justify-content: space-between; align-items: center; border-top: 2px dashed #94a3b8; padding-top: 14px; font-size: 11px; color: #64748b; }
    .qr-box { text-align: center; }
    @media print {
      body { padding: 0; }
      .receipt-container { border: none; box-shadow: none; padding: 0; max-width: 100%; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <h2>${clinicName}</h2>
      <p>ИНН: ${clinicInn} • СНО: УСН (Доходы) • Лицензия: ЛО-78-01-011842</p>
      <p>${clinicAddress}</p>
      <div style="margin-top: 8px; font-size: 14px; font-weight: 800; color: #0d9488;">
        КАССОВЫЙ ЧЕК / ПРИХОД 54-ФЗ (ФФД 1.2)
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-row"><span class="meta-label">Счет / Чек №:</span><span class="meta-val">${receiptNum}</span></div>
      <div class="meta-row"><span class="meta-label">Дата расчета:</span><span class="meta-val">${formattedDate}</span></div>
      <div class="meta-row"><span class="meta-label">Пациент:</span><span class="meta-val">${data.fullName}</span></div>
      <div class="meta-row"><span class="meta-label">Медкарта №:</span><span class="meta-val">${data.cardNumber}</span></div>
      <div class="meta-row"><span class="meta-label">Кассир / Врач:</span><span class="meta-val">${data.curatingDoctor}</span></div>
      <div class="meta-row"><span class="meta-label">Способ оплаты:</span><span class="meta-val">${invoice.paymentMethod === "sbp" ? "СБП (Безналичные)" : "Банковская карта"}</span></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 24px; text-align: center;">№</th>
          <th>Наименование медицинской услуги</th>
          <th style="width: 40px; text-align: center;">Кол</th>
          <th style="width: 80px; text-align: right;">Цена</th>
          <th style="width: 90px; text-align: right;">Сумма</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="total-box">
      <div class="total-title">ИТОГО К ОПЛАТЕ (Без НДС, ст. 149 НК РФ):</div>
      <div class="total-amount">${formatRubles(invoice.totalAmountRub)}</div>
    </div>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; font-size: 11px; color: #475569;">
      <strong>Гарантия качества DENTE:</strong> На все терапевтические реставрации действует гарантия 1–2 года, на ортопедические конструкции — 2–5 лет, на дентальные имплантаты — пожизненно.
    </div>

    <div class="footer">
      <div>
        <div>ЗН ККТ: 05481900010924</div>
        <div>ФН №: 9960440301984210</div>
        <div>ФД №: ${receiptNum.replace(/\D/g, "") || "98241"} &bull; ФПД: 3198412095</div>
        <div>Сайт ФНС: <a href="https://nalog.gov.ru" target="_blank">nalog.gov.ru</a></div>
      </div>

      <div class="qr-box">
        <div style="display: flex; justify-content: center;">${qrCodeSvg}</div>
        <div style="font-size: 9px; margin-top: 2px;">Проверка в ФНС</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function downloadHtmlFile(htmlContent: string, fileName: string): void {
	if (typeof window === "undefined" || typeof document === "undefined") {
		return;
	}
	try {
		const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = fileName;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		setTimeout(() => URL.revokeObjectURL(url), 5000);
	} catch (e) {
		console.error("Failed to download HTML file:", e);
	}
}

export function openPrintWindow(htmlContent: string): void {
	if (typeof window === "undefined") return;
	try {
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(htmlContent);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 300);
		}
	} catch (e) {
		console.error("Failed to open print window:", e);
	}
}

export function downloadPatientTaxCertificate1151156(
	data: PatientPersonalCabinetData,
	taxYear = 2026,
): void {
	const html = generatePatientTaxCertificate1151156(data, taxYear);
	const sanitizedName = data.fullName.replace(/\s+/g, "_");
	downloadHtmlFile(html, `Spravka_FNS_KND_1151156_${sanitizedName}_${taxYear}.html`);
}

export function downloadDetailedReceipt(
	invoice: PatientInvoiceItem,
	data: PatientPersonalCabinetData,
): void {
	const html = generateDetailedReceiptHtml(invoice, data);
	downloadHtmlFile(html, `Chek_54FZ_${invoice.invoiceNumber}.html`);
}

export interface ReceptionCheckinQrResult {
	readonly qrPayload: string;
	readonly qrCodeSvg: string;
	readonly patientId: string;
	readonly cardNumber: string;
	readonly fullName: string;
	readonly nextAppointment?: PatientAppointment | undefined;
	readonly receptionInstructionsRu: string;
}

export function generateReceptionCheckinQrPayload(
	data: PatientPersonalCabinetData,
): ReceptionCheckinQrResult {
	const summary = calculateCabinetSummary(data);
	const nextAppt = summary.nextAppointment;
	const payload = `DENTE:CHECKIN:v1|pid=${data.patientId}|card=${data.cardNumber}|phone=${data.phone}|appt=${nextAppt?.id ?? "none"}|ts=${Date.now()}`;
	const qrCodeSvg = generateQrCodeSvg(payload, {
		size: 260,
		margin: 2,
		colorDark: "#000000",
		colorLight: "#ffffff",
	});

	return {
		qrPayload: payload,
		qrCodeSvg,
		patientId: data.patientId,
		cardNumber: data.cardNumber,
		fullName: data.fullName,
		nextAppointment: nextAppt,
		receptionInstructionsRu: "Покажите данный QR-код администратору клиники или поднесите к 2D-сканеру на стойке ресепшена для мгновенной регистрации прибытия на прием.",
	};
}

// ============================================================================
// COMPLETED WORKS ACT (АКТ ВЫПОЛНЕННЫХ РАБОТ МЗ РФ 804Н / 54-ФЗ)
// ============================================================================

export function generateCompletedWorksActHtml(
	invoice: PatientInvoiceItem,
	data: PatientPersonalCabinetData,
): string {
	const clinicName = "ООО «Стоматологическая клиника ДЕНТЕ»";
	const clinicInn = "7841098765";
	const clinicAddress = "г. Санкт-Петербург, Невский пр-т, д. 140, лит. А";
	const clinicLicense = "ЛО-78-01-011842 от 15.06.2021";
	const actNumber = `АКТ-${invoice.invoiceNumber.replace(/^[^\d]*/, "") || invoice.id.slice(-6).toUpperCase()}`;
	const actDate = formatRussianDateIso(invoice.paidAtIso?.slice(0, 10) || invoice.issueDateIso);
	const doctor = data.curatingDoctor || "Д-р Смирнов А. В.";
	const fiscalReceipt = invoice.fiscalReceiptNumber || `ФД-${invoice.invoiceNumber}`;

	const itemsHtml = invoice.items
		.map(
			(item, idx) => `
      <tr>
        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 11px;">${item.code}</td>
        <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">
          <strong>${item.titleRu}</strong>
          ${item.toothFdi ? `<span style="color: #64748b; font-size: 11px;"> &bull; Зуб №${item.toothFdi}</span>` : ""}
        </td>
        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">${item.quantity}</td>
        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">${formatRubles(item.priceRub)}</td>
        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: 700;">${formatRubles(item.totalRub)}</td>
      </tr>`,
		)
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Акт выполненных работ ${actNumber} — ${clinicName}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; color: #0f172a; margin: 0; padding: 20px; line-height: 1.5; }
    .act-container { max-width: 750px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; padding: 28px; background: #ffffff; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .header h1 { margin: 0 0 4px 0; font-size: 16px; font-weight: 800; text-transform: uppercase; }
    .header p { margin: 2px 0; font-size: 11px; color: #475569; }
    .notice { background: #f8fafc; border-left: 3px solid #0d9488; padding: 8px 12px; margin-bottom: 16px; font-size: 11px; color: #334155; }
    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
    .meta-table td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; }
    .meta-table td.label { color: #64748b; width: 30%; }
    .meta-table td.value { font-weight: 600; color: #0f172a; }
    table.services { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
    table.services th { background: #f8fafc; padding: 8px; text-align: left; font-weight: 700; border: 1px solid #cbd5e1; }
    .total-box { display: flex; justify-content: space-between; align-items: baseline; background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; }
    .total-title { font-size: 13px; font-weight: 700; color: #166534; }
    .total-val { font-size: 16px; font-weight: 800; color: #166534; }
    .legal-statement { font-size: 11px; color: #334155; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; margin-bottom: 20px; background: #fbfcfe; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px; padding-top: 16px; border-top: 1px dashed #cbd5e1; font-size: 11px; }
    .sig-col strong { display: block; margin-bottom: 8px; font-size: 12px; }
    .sig-line { margin-top: 32px; border-bottom: 1px solid #334155; }
    .stamp-box { margin-top: 8px; color: #64748b; font-size: 10px; }
    @media print {
      body { padding: 0; }
      .act-container { border: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="act-container">
    <div class="header">
      <h1>${clinicName}</h1>
      <p>ИНН ${clinicInn} &bull; Лицензия ${clinicLicense} &bull; ${clinicAddress}</p>
      <h2 style="font-size: 14px; margin: 10px 0 0; color: #0d9488;">
        АКТ ВЫПОЛНЕННЫХ РАБОТ (ОКАЗАННЫХ УСЛУГ) № ${actNumber}
      </h2>
      <p style="font-weight: 600; color: #0f172a;">от ${actDate} г.</p>
    </div>

    <div class="notice">
      Настоящий Акт составлен в соответствии со ст. 720 ГК РФ и Постановлением Правительства РФ от 11.05.2023 № 736. Акт подтверждает факт надлежащего оказания стоматологических услуг, отсутствие претензий по качеству и сверку с фискальными чеками.
    </div>

    <table class="meta-table">
      <tr>
        <td class="label">Пациент (Заказчик):</td>
        <td class="value">${data.fullName}</td>
      </tr>
      <tr>
        <td class="label">Номер медицинской карты:</td>
        <td class="value">${data.cardNumber}</td>
      </tr>
      <tr>
        <td class="label">Лечащий врач:</td>
        <td class="value">${doctor}</td>
      </tr>
      <tr>
        <td class="label">Счет на оплату:</td>
        <td class="value">${invoice.invoiceNumber} от ${formatRussianDateIso(invoice.issueDateIso)}</td>
      </tr>
      <tr>
        <td class="label">Фискальный чек 54-ФЗ:</td>
        <td class="value">${fiscalReceipt}</td>
      </tr>
    </table>

    <table class="services">
      <thead>
        <tr>
          <th style="width: 28px; text-align: center;">№</th>
          <th style="width: 90px;">Код услуги</th>
          <th>Наименование медицинской услуги</th>
          <th style="width: 45px; text-align: center;">Кол</th>
          <th style="width: 85px; text-align: right;">Цена</th>
          <th style="width: 95px; text-align: right;">Стоимость</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="total-box">
      <div class="total-title">ИТОГО ВЫПОЛНЕНО И ОПЛАЧЕНО (Без НДС, ст. 149 НК РФ):</div>
      <div class="total-val">${formatRubles(invoice.totalAmountRub)}</div>
    </div>

    <div class="legal-statement">
      Медицинские услуги оказаны Исполнителем надлежащим образом, в полном объеме, в установленные сроки и в соответствии с порядками и клиническими рекомендациями Минздрава РФ. Заказчик (Пациент) подтверждает приемку оказанных услуг и отсутствие претензий по их объему, качеству и стоимости. Рекомендации лечащего врача получены в полном объеме.
    </div>

    <div class="signatures">
      <div class="sig-col">
        <strong>Исполнитель:</strong>
        <div>Врач: ${doctor}</div>
        <div class="sig-line"></div>
        <div class="stamp-box">М.П. ООО «Стоматологическая клиника ДЕНТЕ»</div>
      </div>
      <div class="sig-col">
        <strong>Заказчик (Пациент):</strong>
        <div>${data.fullName}</div>
        <div class="sig-line"></div>
        <div class="stamp-box">Подпись пациента / законного представителя</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function downloadCompletedWorksAct(
	invoice: PatientInvoiceItem,
	data: PatientPersonalCabinetData,
): void {
	const html = generateCompletedWorksActHtml(invoice, data);
	downloadHtmlFile(html, `Akt_${invoice.invoiceNumber}.html`);
}

// ============================================================================
// STATUTORY CONSENT & DOCUMENT SNAPSHOT PRINTABLE VIEWERS
// ============================================================================

export function generateConsentPrintHtml(
	consent: PatientStatutoryConsent,
	data: PatientPersonalCabinetData,
): string {
	const clinicName = "ООО «Стоматологическая клиника ДЕНТЕ»";
	const clinicInn = "7841098765";
	const clinicLicense = "ЛО-78-01-011842 от 15.06.2021";
	const clinicAddress = "г. Санкт-Петербург, Невский пр-т, д. 140, лит. А";
	const isSigned = consent.status === "signed";
	const signedDate = consent.signedAtIso
		? formatRussianDateIso(consent.signedAtIso.slice(0, 10))
		: formatRussianDateIso(new Date().toISOString().slice(0, 10));

	const paragraphs = (consent.fullTextContent || consent.summaryTextRu || "")
		.split("\n\n")
		.filter((p) => p.trim().length > 0)
		.map((p) => `<p style="margin-bottom: 10px; text-align: justify;">${p.replace(/\n/g, "<br/>")}</p>`)
		.join("");

	const pepStampHtml = isSigned && consent.signatureAudit
		? `
    <div style="margin-top: 24px; border: 2px solid #0d9488; border-radius: 8px; padding: 14px 18px; background: #f0fdfa; font-size: 11px;">
      <div style="font-weight: 800; color: #0f766e; font-size: 12px; margin-bottom: 6px; text-transform: uppercase;">
        ДОКУМЕНТ ПОДПИСАН ПРОСТОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ (63-ФЗ)
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; color: #134e4a;">
        <div><strong>Владелец подписи:</strong> ${data.fullName}</div>
        <div><strong>Телефон верификации:</strong> ${consent.signatureAudit.phone}</div>
        <div><strong>Способ подписания:</strong> SMS/OTP код подтверждения</div>
        <div><strong>Дата и время:</strong> ${new Date(consent.signatureAudit.timestamp).toLocaleString("ru-RU")}</div>
      </div>
      <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #5eead4; font-family: monospace; font-size: 10px; color: #0f766e; word-break: break-all;">
        <strong>Хеш целостности SHA-256:</strong> ${consent.signatureAudit.integrityHash}
      </div>
    </div>`
		: `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 36px; padding-top: 16px; border-top: 1px dashed #cbd5e1; font-size: 11px;">
      <div>
        <strong>Пациент (Заказчик):</strong>
        <div style="margin-top: 4px;">${data.fullName}</div>
        <div style="margin-top: 32px; border-bottom: 1px solid #334155;"></div>
        <div style="font-size: 10px; color: #64748b; margin-top: 4px;">(Подпись / расшифровка)</div>
      </div>
      <div>
        <strong>Врач:</strong>
        <div style="margin-top: 4px;">${data.curatingDoctor}</div>
        <div style="margin-top: 32px; border-bottom: 1px solid #334155;"></div>
        <div style="font-size: 10px; color: #64748b; margin-top: 4px;">(Подпись врача / М.П.)</div>
      </div>
    </div>`;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>${consent.titleRu} — ${data.fullName}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; color: #0f172a; margin: 0; padding: 20px; line-height: 1.5; }
    .consent-container { max-width: 750px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; padding: 28px; background: #ffffff; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .header h1 { margin: 0 0 4px 0; font-size: 15px; font-weight: 800; text-transform: uppercase; }
    .header p { margin: 2px 0; font-size: 11px; color: #475569; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 11px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .content-box { margin: 16px 0; font-size: 11.5px; }
    @media print {
      body { padding: 0; }
      .consent-container { border: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="consent-container">
    <div class="header">
      <h1>${clinicName}</h1>
      <p>ИНН ${clinicInn} &bull; Лицензия ${clinicLicense} &bull; ${clinicAddress}</p>
      <h2 style="font-size: 14px; margin: 10px 0 4px; color: #0d9488;">${consent.titleRu}</h2>
      <p style="font-weight: 600; color: #475569;">Правовая основа: ${consent.statutoryBasis} &bull; Код: ${consent.code}</p>
    </div>

    <div class="meta-box">
      <div class="meta-grid">
        <div><strong>Пациент:</strong> ${data.fullName}</div>
        <div><strong>Медицинская карта:</strong> ${data.cardNumber}</div>
        <div><strong>Лечащий врач:</strong> ${data.curatingDoctor}</div>
        <div><strong>Дата:</strong> ${signedDate}</div>
      </div>
    </div>

    <div class="content-box">
      ${paragraphs}
    </div>

    ${pepStampHtml}
  </div>
</body>
</html>`;
}

export function generateDocumentSnapshotHtml(
	doc: GeneratedDocumentSummary,
	data: PatientPersonalCabinetData,
): string {
	if (doc.kind === "medical_card_extract_043" || doc.kind.includes("043")) {
		return generateExtract043Html(doc, data);
	}
	const clinicName = "ООО «Стоматологическая клиника ДЕНТЕ»";
	const clinicInn = "7841098765";
	const clinicLicense = "ЛО-78-01-011842 от 15.06.2021";
	const clinicAddress = "г. Санкт-Петербург, Невский пр-т, д. 140, лит. А";
	const docDate = formatRussianDateIso(doc.dateIso);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>${doc.title} — ${clinicName}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; color: #0f172a; margin: 0; padding: 20px; line-height: 1.5; }
    .doc-container { max-width: 750px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; padding: 28px; background: #ffffff; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .header h1 { margin: 0 0 4px 0; font-size: 16px; font-weight: 800; text-transform: uppercase; }
    .header p { margin: 2px 0; font-size: 11px; color: #475569; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px; font-size: 12px; }
    .meta-row { display: flex; justify-content: space-between; padding: 3px 0; }
    .body-box { padding: 16px 0; font-size: 12px; line-height: 1.6; }
    .stamp-box { margin-top: 24px; border: 1px dashed #cbd5e1; padding: 12px; border-radius: 6px; background: #fafafa; font-size: 11px; }
    @media print {
      body { padding: 0; }
      .doc-container { border: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="doc-container">
    <div class="header">
      <h1>${clinicName}</h1>
      <p>ИНН ${clinicInn} &bull; Лицензия ${clinicLicense} &bull; ${clinicAddress}</p>
      <h2 style="font-size: 14px; margin: 10px 0 0; color: #0d9488;">${doc.title}</h2>
      <p style="font-weight: 600; color: #0f172a;">от ${docDate} г.</p>
    </div>

    <div class="meta-box">
      <div class="meta-row"><span>Пациент:</span><strong>${data.fullName}</strong></div>
      <div class="meta-row"><span>Медицинская карта:</span><strong>${data.cardNumber}</strong></div>
      <div class="meta-row"><span>Лечащий врач:</span><strong>${data.curatingDoctor}</strong></div>
      ${doc.documentNumber ? `<div class="meta-row"><span>Номер документа:</span><strong>${doc.documentNumber}</strong></div>` : ""}
      ${doc.totalAmountRub !== undefined ? `<div class="meta-row"><span>Сумма:</span><strong>${formatRubles(doc.totalAmountRub)}</strong></div>` : ""}
    </div>

    <div class="body-box">
      <p>Официальный медицинский документ сформирован и выдан в автоматизированной информационной системе стоматологической клиники DENTE в соответствии с требованиями законодательства РФ в сфере охраны здоровья (323-ФЗ) и Правилами предоставления платных медицинских услуг (ПП РФ № 736).</p>
      <p>Электронная архивная копия документа зарегистрирована в защищенном реестре клиники со статусом «${doc.status === "issued" ? "Выдан и действителен" : "Черновик"}».</p>
    </div>

    ${doc.sha256 ? `
    <div class="stamp-box">
      <div><strong>Цифровой отпечаток архивной копии (SHA-256):</strong></div>
      <div style="font-family: monospace; font-size: 10px; color: #0d9488; margin-top: 4px;">${doc.sha256}</div>
      <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Целостность и неизменность документа подтверждены криптографическим аудитом.</div>
    </div>` : ""}

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 36px; padding-top: 16px; border-top: 1px dashed #cbd5e1; font-size: 11px;">
      <div>
        <strong>От медицинской организации:</strong>
        <div style="margin-top: 4px;">Врач / Руководитель: ${data.curatingDoctor}</div>
        <div style="margin-top: 28px; border-bottom: 1px solid #334155;"></div>
        <div style="font-size: 10px; color: #64748b; margin-top: 4px;">М.П. ООО «Стоматологическая клиника ДЕНТЕ»</div>
      </div>
      <div>
        <strong>Пациент / Заказчик:</strong>
        <div style="margin-top: 4px;">${data.fullName}</div>
        <div style="margin-top: 28px; border-bottom: 1px solid #334155;"></div>
        <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Подпись пациента</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export { generatePrescription107PrintHtml } from "./patientPrescriptionDocuments.js";

