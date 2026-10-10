/**
 * escPosReceiptBuilder.ts — ESC/POS binary command buffers (CP866, 2D QR codes) and printable HTML
 * builders for 54-FZ fiscal receipts, appointment tickets, and Sberbank POS bank slips.
 */

import {
	buildEscPosAppointmentTicketBuffer,
	encodeCp866,
} from "@dental/shared";
import { KktLanPrinterService } from "../kktLanPrinter.js";
import type {
	EscPosAppointmentTicketPayload,
	FiscalReceiptPrintPayload,
	HardwarePrinterConfig,
} from "./types.js";

/**
 * Encodes Unicode/UTF-8 string into Russian DOS Code Page 866 (CP866) binary buffer.
 * Required for thermal POS receipt printers (АТОЛ, Штрих, Xprinter, Rongta, POS-58/80).
 */
export function encodeCp866Text(text: string): Uint8Array {
	return encodeCp866(text);
}

/**
 * Builds Doctor Appointment / Patient Queue Slip thermal ticket with CP866 encoding.
 */
export function buildEscPosAppointmentTicketCommandBuffer(
	ticket: EscPosAppointmentTicketPayload,
): Uint8Array {
	return buildEscPosAppointmentTicketBuffer(ticket);
}

/**
 * Generates native ESC/POS QR-code command sequence (Model 2, Error Correction M, module size 4).
 */
export function buildEscPosQrCodeCommandBuffer(payload: string): Uint8Array {
	const bytes: number[] = [];
	const qrData = new TextEncoder().encode(payload);
	const pL = (qrData.length + 3) & 0xff;
	const pH = ((qrData.length + 3) >> 8) & 0xff;

	// 1. Function 165: Select QR Model 2 (GS ( k pL pH cn fn n1 n2)
	bytes.push(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);

	// 2. Function 167: Set QR Module Size = 4 (dots per module)
	bytes.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x04);

	// 3. Function 169: Set Error Correction Level = M (15%)
	bytes.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31);

	// 4. Function 180: Store QR Data in Symbol Storage Area
	bytes.push(0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30);
	for (let i = 0; i < qrData.length; i++) {
		bytes.push(qrData[i]!);
	}

	// 5. Function 181: Print the QR Symbol
	bytes.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);

	return new Uint8Array(bytes);
}

/**
 * Builds standard binary ESC/POS command buffer for 54-FZ fiscal receipt:
 * CP866 encoding, formatting, bold headings, totals, and native 2D QR-code.
 */
export function buildEscPosFiscalReceiptCommandBuffer(
	payload: FiscalReceiptPrintPayload,
	config: HardwarePrinterConfig,
	helpers?: {
		encode?: (text: string) => Uint8Array;
		buildQr?: (qrPayload: string) => Uint8Array;
	},
): Uint8Array {
	const buffer: number[] = [];
	const encodeFn = helpers?.encode ?? encodeCp866Text;
	const buildQrFn = helpers?.buildQr ?? buildEscPosQrCodeCommandBuffer;

	const appendBytes = (arr: number[] | Uint8Array) => {
		for (let i = 0; i < arr.length; i++) {
			buffer.push(arr[i]!);
		}
	};

	const appendText = (text: string) => {
		const encoded = encodeFn(text);
		appendBytes(encoded);
	};

	const appendLine = (text = "") => {
		appendText(`${text}\n`);
	};

	// 1. Initialize Printer (ESC @)
	appendBytes([0x1b, 0x40]);

	// 2. Select Code Page CP866 (ESC t 17)
	appendBytes([0x1b, 0x74, 0x11]);

	// 3. Center Align (ESC a 1)
	appendBytes([0x1b, 0x61, 0x01]);

	// 4. Double Height Bold Header
	appendBytes([0x1b, 0x21, 0x20]); // Double height
	appendLine("ООО «ДЕНТЕ СТОМАТОЛОГИЯ»");
	appendBytes([0x1b, 0x21, 0x00]); // Normal

	appendLine("г. Москва, Ломоносовский пр-т, 24");
	if (payload.cashierInn) {
		appendLine(`ИНН: ${payload.cashierInn}`);
	}
	appendLine("Лицензия: № ЛО41-01137-77/00368421");
	appendLine("--------------------------------");

	// Operation Title
	appendBytes([0x1b, 0x45, 0x01]); // Bold ON
	if (payload.operationType === "income_return") {
		appendLine("КАССОВЫЙ ЧЕК / ВОЗВРАТ ПРИХОДА");
	} else {
		appendLine("КАССОВЫЙ ЧЕК / ПРИХОД");
	}
	appendBytes([0x1b, 0x45, 0x00]); // Bold OFF

	const now = new Date();
	const dateFormatted = `${now.toLocaleDateString("ru-RU")} ${now.toLocaleTimeString("ru-RU")}`;
	appendLine(`Дата: ${dateFormatted}`);
	appendLine(`Кассир: ${payload.cashierFullName}`);
	if (payload.customerContact) {
		appendLine(`Покупатель: ${payload.customerContact}`);
	}
	appendLine("--------------------------------");

	// 5. Left Align (ESC a 0) for line items
	appendBytes([0x1b, 0x61, 0x00]);

	payload.items.forEach((item, index) => {
		appendLine(`${index + 1}. ${item.name}`);
		if (item.medicalServiceCode804n) {
			appendLine(`   Код услуги: ${item.medicalServiceCode804n}`);
		}
		if (item.markingCode) {
			appendLine(`   [М] DataMatrix: ${item.markingCode.slice(0, 16)}...`);
		}

		const qtyStr = `${item.quantity} шт. x ${item.priceRub.toFixed(2)}`;
		const totalStr = `${item.amountRub.toFixed(2)} ₽`;
		const padSpaces = Math.max(1, 32 - (qtyStr.length + totalStr.length));
		appendLine(`${qtyStr}${" ".repeat(padSpaces)}${totalStr}`);
	});

	appendLine("--------------------------------");

	// 6. Right Align & Bold Totals
	appendBytes([0x1b, 0x61, 0x02]); // Right align
	appendBytes([0x1b, 0x21, 0x30]); // Double width & height
	appendLine(`ИТОГ: ${payload.totalRub.toFixed(2)} ₽`);
	appendBytes([0x1b, 0x21, 0x00]); // Normal

	appendBytes([0x1b, 0x61, 0x00]); // Left align
	if (payload.electronicRub && payload.electronicRub > 0) {
		appendLine(`БЕЗНАЛИЧНЫМИ (КАРТА): ${payload.electronicRub.toFixed(2)} ₽`);
	}
	if (payload.cashRub && payload.cashRub > 0) {
		appendLine(`НАЛИЧНЫМИ: ${payload.cashRub.toFixed(2)} ₽`);
	}
	if (payload.sbpRub && payload.sbpRub > 0) {
		appendLine(`СБП QR (0.7%): ${payload.sbpRub.toFixed(2)} ₽`);
	}
	if (payload.prepaidRub && payload.prepaidRub > 0) {
		appendLine(`ПРЕДОПЛАТА (ДЕПОЗИТ): ${payload.prepaidRub.toFixed(2)} ₽`);
	}

	appendLine("СНО: УСН Доходы (0% НДС, Без НДС)");
	appendLine("--------------------------------");

	// 7. Fiscal details & 2D QR Code
	const fnSerial = "9960440302145896";
	const fiscalDocNum =
		typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function"
			? String(10000 + (crypto.getRandomValues(new Uint32Array(1))[0]! % 90000))
			: String(Date.now() % 100000);
	const fiscalSign = KktLanPrinterService.computeFiscalSign(
		fnSerial,
		fiscalDocNum,
		now,
		payload.totalRub,
	);

	const qrPayload = KktLanPrinterService.generate54FzQrString({
		issuedAt: now,
		totalRub: payload.totalRub,
		fnSerial,
		fiscalDocNum,
		fiscalSign,
		operationType: payload.operationType,
	});

	appendLine(`ФН: ${fnSerial}`);
	appendLine(`ФД: ${fiscalDocNum}   ФПД: ${fiscalSign}`);
	appendLine("Сайт ФНС: www.nalog.gov.ru");

	// 8. ESC/POS 2D QR Code (GS ( k commands)
	appendBytes(buildQrFn(qrPayload));

	// 9. Center & Final Greeting
	appendBytes([0x1b, 0x61, 0x01]);
	appendLine("Спасибо за доверие!");
	appendLine("Здоровья вашим зубам!");

	// 10. Feed 4 lines & Auto Cut (GS V 0)
	appendBytes([0x1b, 0x64, 0x04]);
	if (config.autoCut) {
		appendBytes([0x1d, 0x56, 0x00]);
	}

	return new Uint8Array(buffer);
}

/**
 * Generates a self-contained 58mm / 80mm printable HTML document for thermal POS printers.
 */
export function generatePrintableReceiptDocumentHtml(
	payload: FiscalReceiptPrintPayload,
	config: HardwarePrinterConfig,
): string {
	const now = new Date();
	const dateFormatted = `${now.toLocaleDateString("ru-RU")} ${now.toLocaleTimeString("ru-RU")}`;
	const isReturn = payload.operationType === "income_return";
	const fnSerial = "9960440302145896";
	const fiscalDocNum =
		typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function"
			? String(10000 + (crypto.getRandomValues(new Uint32Array(1))[0]! % 90000))
			: String(Date.now() % 100000);
	const fiscalSign = KktLanPrinterService.computeFiscalSign(
		fnSerial,
		fiscalDocNum,
		now,
		payload.totalRub,
	);
	const qrString = KktLanPrinterService.generate54FzQrString({
		issuedAt: now,
		totalRub: payload.totalRub,
		fnSerial,
		fiscalDocNum,
		fiscalSign,
		operationType: payload.operationType,
	});

	const itemsHtml = payload.items
		.map(
			(item, idx) => `
			<div style="margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px dashed #ddd;">
				<div style="font-weight: bold; font-size: 11px;">${idx + 1}. ${item.name}</div>
				${item.medicalServiceCode804n ? `<div style="font-size: 10px; color: #555;">Код услуги: ${item.medicalServiceCode804n}</div>` : ""}
				${item.markingCode ? `<div style="font-size: 10px; color: #555;">[М] DataMatrix: ${item.markingCode.slice(0, 16)}...</div>` : ""}
				<div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 2px;">
					<span>${item.quantity} шт. &times; ${item.priceRub.toFixed(2)} ₽</span>
					<span style="font-weight: bold;">${item.amountRub.toFixed(2)} ₽</span>
				</div>
			</div>
		`,
		)
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<meta name="description" content="Кассовый чек 54-ФЗ">
	<title>Кассовый чек - ${payload.clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"}</title>
	<style>
		@page { size: ${config.paperWidthMm === 80 ? "80mm auto" : "58mm auto"}; margin: 0; }
		* { box-sizing: border-box; }
		body {
			font-family: 'Courier New', Courier, monospace, sans-serif;
			font-size: 11px;
			line-height: 1.3;
			color: #000;
			background: #fff;
			margin: 0;
			padding: 8px;
			width: ${config.paperWidthMm === 80 ? "76mm" : "54mm"};
		}
		.center { text-align: center; }
		.bold { font-weight: bold; }
		.divider { border-top: 1px dashed #000; margin: 6px 0; }
		.flex-between { display: flex; justify-content: space-between; }
		.qr-box { margin: 8px auto; text-align: center; padding: 4px; background: #fafafa; border: 1px solid #ccc; font-size: 9px; word-break: break-all; }
		@media print {
			body { padding: 2mm; width: 100%; }
			.no-print { display: none; }
		}
	</style>
</head>
<body>
	<div class="center bold" style="font-size: 13px;">${payload.clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"}</div>
	<div class="center" style="font-size: 10px;">г. Москва, Ломоносовский пр-т, 24</div>
	${payload.cashierInn ? `<div class="center" style="font-size: 10px;">ИНН: ${payload.cashierInn}</div>` : ""}
	<div class="center" style="font-size: 10px;">Лицензия: № ЛО41-01137-77/00368421</div>
	<div class="divider"></div>
	<div class="center bold" style="font-size: 12px;">
		${isReturn ? "КАССОВЫЙ ЧЕК / ВОЗВРАТ ПРИХОДА" : "КАССОВЫЙ ЧЕК / ПРИХОД"}
	</div>
	<div class="divider"></div>
	<div>Дата: ${dateFormatted}</div>
	<div>Кассир: ${payload.cashierFullName}</div>
	${payload.customerContact ? `<div>Покупатель: ${payload.customerContact}</div>` : ""}
	<div class="divider"></div>
	<div>${itemsHtml}</div>
	<div class="divider"></div>
	<div class="flex-between bold" style="font-size: 14px; margin: 4px 0;">
		<span>ИТОГ:</span>
		<span>${payload.totalRub.toFixed(2)} ₽</span>
	</div>
	${payload.electronicRub && payload.electronicRub > 0 ? `<div class="flex-between"><span>БЕЗНАЛИЧНЫМИ (КАРТА):</span><span>${payload.electronicRub.toFixed(2)} ₽</span></div>` : ""}
	${payload.cashRub && payload.cashRub > 0 ? `<div class="flex-between"><span>НАЛИЧНЫМИ:</span><span>${payload.cashRub.toFixed(2)} ₽</span></div>` : ""}
	${payload.sbpRub && payload.sbpRub > 0 ? `<div class="flex-between"><span>СБП QR (0.7%):</span><span>${payload.sbpRub.toFixed(2)} ₽</span></div>` : ""}
	${payload.prepaidRub && payload.prepaidRub > 0 ? `<div class="flex-between"><span>ПРЕДОПЛАТА (ДЕПОЗИТ):</span><span>${payload.prepaidRub.toFixed(2)} ₽</span></div>` : ""}
	<div class="flex-between" style="font-size: 10px; margin-top: 4px;">
		<span>СНО: УСН Доходы</span>
		<span>Без НДС (0%)</span>
	</div>
	<div class="divider"></div>
	<div style="font-size: 10px;">ФН: ${fnSerial}</div>
	<div style="font-size: 10px;">ФД: ${fiscalDocNum}   ФПД: ${fiscalSign}</div>
	<div style="font-size: 10px;">Сайт ФНС: www.nalog.gov.ru</div>
	<div class="qr-box">
		<div class="bold" style="margin-bottom: 2px;">ПРОВЕРКА ЧЕКА В ФНС:</div>
		<div>${qrString}</div>
	</div>
	<div class="center" style="margin-top: 8px; font-size: 10px;">
		<div>Спасибо за доверие!</div>
		<div>Здоровья вашим зубам!</div>
	</div>
	<script>
		window.onload = function() {
			try {
				window.focus();
				window.print();
			} catch (e) {
				console.warn("[thermal print template] window.print error:", e);
			}
		};
	</script>
</body>
</html>`;
}

/**
 * Builds standard binary ESC/POS command buffer for Sberbank Bank Slip:
 * CP866 encoding, initialization, monospace formatting, feed lines, and auto-cut.
 */
export function buildEscPosBankSlipCommandBuffer(
	slipText: string,
	config: HardwarePrinterConfig,
	encodeFn: (text: string) => Uint8Array = encodeCp866Text,
): Uint8Array {
	const buffer: number[] = [];

	const appendBytes = (arr: number[] | Uint8Array) => {
		for (let i = 0; i < arr.length; i++) {
			buffer.push(arr[i]!);
		}
	};

	const appendText = (text: string) => {
		const encoded = encodeFn(text);
		appendBytes(encoded);
	};

	// 1. Initialize Printer (ESC @)
	appendBytes([0x1b, 0x40]);

	// 2. Select Code Page CP866 (ESC t 17)
	appendBytes([0x1b, 0x74, 0x11]);

	// 3. Left Align (ESC a 0)
	appendBytes([0x1b, 0x61, 0x00]);

	// 4. Append Slip Text with normalized newlines
	const lines = slipText.split(/\r?\n/);
	for (const line of lines) {
		appendText(`${line}\n`);
	}

	// 5. Feed 4 lines (ESC d 4) & Auto-cut if enabled (GS V 0)
	appendBytes([0x1b, 0x64, 0x04]);
	if (config.autoCut) {
		appendBytes([0x1d, 0x56, 0x00]);
	}

	return new Uint8Array(buffer);
}

/**
 * Generates HTML printable document for Sberbank thermal bank slips (58mm / 80mm).
 */
export function generatePrintableBankSlipDocumentHtml(
	slipText: string,
	config: HardwarePrinterConfig,
	clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
): string {
	const escapedSlip = slipText
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Банковский слип - ${clinicName}</title>
	<style>
		@page { size: ${config.paperWidthMm === 80 ? "80mm auto" : "58mm auto"}; margin: 0; }
		* { box-sizing: border-box; }
		body {
			font-family: 'Courier New', Courier, monospace;
			font-size: 11px;
			line-height: 1.25;
			color: #000;
			background: #fff;
			margin: 0;
			padding: 6px;
			width: ${config.paperWidthMm === 80 ? "76mm" : "54mm"};
			white-space: pre-wrap;
			word-break: break-all;
		}
		@media print {
			body { padding: 2mm; width: 100%; }
			.no-print { display: none; }
		}
	</style>
</head>
<body>
<pre style="margin: 0; font-family: inherit; font-size: inherit; white-space: pre-wrap;">${escapedSlip}</pre>
	<script>
		window.onload = function() {
			try {
				window.focus();
				window.print();
			} catch (e) {
				console.warn("[bank slip template] window.print error:", e);
			}
		};
	</script>
</body>
</html>`;
}
