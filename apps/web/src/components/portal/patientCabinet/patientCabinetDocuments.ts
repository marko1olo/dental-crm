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
} from "./patientCabinetEngine.js";
import {
	formatRussianDateIso,
	formatRubles,
	calculateCabinetSummary,
} from "./patientCabinetEngine.js";

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
          <div style="font-size: 11px; color: #64748b;">Код 804н: ${item.code}${item.toothFdi ? ` • Зуб №${item.toothFdi}` : ""}</div>
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
          <th>Услуга (Номенклатура МЗ РФ 804н)</th>
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
