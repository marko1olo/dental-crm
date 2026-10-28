/**
 * DENTE CRM — Thermal Cash Receipt Printer
 *
 * Fast 1-click cash receipt printing (58mm/80mm) with silent native KKT dispatch
 * (ATOL, Shtrikh-M, direct ESC/POS) and browser fallback.
 */

import {
	printDesktopAtol10FiscalReceipt,
	printDesktopEscPosReceipt,
	printDesktopShtrihMFiscalReceipt,
	printDesktopThermalLabel,
	type DesktopFiscalPrintResult,
	type DesktopFiscalReceiptPayload,
} from "../../native/desktopBridge.js";
import type { FiscalReceiptPrintPayload } from "../../services/hardware/hardwareTypes.js";
import { hardwarePrinter } from "../../services/hardware/HardwarePrinter.js";
import { isAndroidNativeApp, isDesktopExecutable, printMobileThermalBinary } from "../omniPlatformAdapter.js";
import type { UniversalPrintResult, UniversalThermalReceiptOptions } from "./printingTypes.js";
import { isWebUsbSupported, printWebUsbEscPosReceipt } from "./browserPrintFallback.js";

function toDesktopPayload(p: FiscalReceiptPrintPayload): DesktopFiscalReceiptPayload {
	return {
		cashierName: p.cashierFullName || "Администратор",
		items: (p.items || []).map((it) => ({
			name: it.name,
			priceRub: it.priceRub,
			quantity: it.quantity,
			vatPercent: it.vatRate === "vat_20" ? 20 : it.vatRate === "vat_10" ? 10 : 0,
		})),
		totalRub: p.totalRub,
		paymentType: p.operationType === "income" ? "card" : p.operationType === "income_return" ? "cash" : "card",
		patientEmailOrPhone: p.customerContact,
	};
}

async function tryDesktopKktPrint(payload: FiscalReceiptPrintPayload, opt: UniversalThermalReceiptOptions): Promise<UniversalPrintResult | null> {
	const dPayload = toDesktopPayload(payload);
	if (opt.protocol === "atol" || (opt.kktHost && opt.kktPort === 16732)) {
		const res: DesktopFiscalPrintResult = await printDesktopAtol10FiscalReceipt({
			host: opt.kktHost || "127.0.0.1",
			port: opt.kktPort || 16732,
			payload: dPayload,
		});
		if (res.success) return { success: true, method: "desktop_silent", ...(res.fiscalSign && { fiscalSign: res.fiscalSign }) };
	}
	if (opt.protocol === "shtrih" || (opt.kktHost && opt.kktPort === 5555)) {
		const res: DesktopFiscalPrintResult = await printDesktopShtrihMFiscalReceipt({
			host: opt.kktHost || "127.0.0.1",
			port: opt.kktPort || 5555,
			payload: dPayload,
		});
		if (res.success) return { success: true, method: "desktop_silent", ...(res.fiscalSign && { fiscalSign: res.fiscalSign }) };
	}
	return null;
}

export async function printThermalReceipt(payload: FiscalReceiptPrintPayload, opt: UniversalThermalReceiptOptions = {}): Promise<UniversalPrintResult> {
	if (!payload || !payload.cashierFullName?.trim() || !Array.isArray(payload.items) || payload.items.length === 0) {
		return { success: false, method: "browser_dialog", error: "Отсутствуют реквизиты кассового чека" };
	}
	if (payload.totalRub <= 0) {
		return { success: true, method: isDesktopExecutable() ? "desktop_silent" : "browser_dialog", fiscalSign: "0000000000", fiscalDocNum: "0" };
	}

	const paperWidth = opt.paperWidthMm ?? 58;

	if (isDesktopExecutable()) {
		try {
			const kktRes = await tryDesktopKktPrint(payload, opt);
			if (kktRes) return kktRes;

			const html = hardwarePrinter.generatePrintableReceiptHtml(payload);
			const labelRes = await printDesktopThermalLabel({
				html,
				widthMm: paperWidth,
				silent: opt.silent !== false,
				printerName: opt.printerName,
				copies: opt.copies ?? 1,
			});
			if (labelRes.success) return { success: true, method: "desktop_silent" };
		} catch {}
	}

	if (isAndroidNativeApp()) {
		try {
			const res = await hardwarePrinter.printFiscalReceipt(payload);
			if (res.success) return { success: true, method: "mobile_native" };
		} catch {}
	}

	if (opt.connection === "usb" && isWebUsbSupported()) {
		try {
			const usbRes = await printWebUsbEscPosReceipt(hardwarePrinter.buildEscPosFiscalReceipt(payload));
			if (usbRes.success) return { success: true, method: "desktop_silent" };
		} catch {}
	}

	try {
		const html = hardwarePrinter.generatePrintableReceiptHtml(payload);
		const res = await hardwarePrinter.printHtmlWithPopupFallback(html, { downloadFilename: `receipt_${Date.now()}.html` });
		return { success: res.success, method: res.interfaceUsed === "browser_dialog" ? "browser_dialog" : "iframe_silent" };
	} catch (err) {
		return { success: false, method: "browser_dialog", error: err instanceof Error ? err.message : "Ошибка печати чека" };
	}
}

export async function printDirectFiscalReceipt(payload: FiscalReceiptPrintPayload, opt: { host?: string; port?: number; protocol?: "atol" | "shtrih" | "escpos"; silent?: boolean } = {}): Promise<UniversalPrintResult> {
	return printThermalReceipt(payload, {
		...(opt.host ? { kktHost: opt.host } : {}),
		...(opt.port ? { kktPort: opt.port } : {}),
		protocol: opt.protocol ?? "atol",
		...(opt.silent !== undefined ? { silent: opt.silent } : {}),
		connection: opt.host ? "lan" : "auto",
	});
}
