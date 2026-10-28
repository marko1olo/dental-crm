/**
 * DENTE CRM — Web & Direct Socket Printing Fallbacks
 *
 * Provides WebUSB direct printer connection and raw TCP socket printing (ESC/POS).
 */

import { printDesktopEscPosReceipt } from "../../native/desktopBridge.js";
import { hardwarePrinter } from "../../services/hardware/HardwarePrinter.js";
import { isAndroidNativeApp, isDesktopExecutable, printMobileThermalBinary } from "../omniPlatformAdapter.js";
import type { UniversalPrintResult } from "./printingTypes.js";

export function isWebUsbSupported(): boolean {
	return typeof navigator !== "undefined" && "usb" in navigator && Boolean((navigator as any).usb?.requestDevice);
}

export async function printWebUsbEscPosReceipt(rawBytes: Uint8Array): Promise<{ success: boolean; error?: string }> {
	if (!isWebUsbSupported()) return { success: false, error: "WebUSB API недоступен в данном браузере" };
	try {
		const usb = (navigator as any).usb;
		const device = await usb.requestDevice({ filters: [{ classCode: 7 }] });
		await device.open();
		if (!device.configuration && typeof device.selectConfiguration === "function") {
			await device.selectConfiguration(1);
		}
		let ifaceNumber = 0;
		let outEndpoint = 1;
		const ifaces = device.configuration?.interfaces || [];
		for (const iface of ifaces) {
			const activeAlt = iface.alternate || iface.alternates?.[0];
			const outEp = activeAlt?.endpoints?.find((ep: { direction: string }) => ep.direction === "out");
			if (outEp) {
				ifaceNumber = iface.interfaceNumber ?? 0;
				outEndpoint = outEp.endpointNumber;
				break;
			}
		}
		await device.claimInterface(ifaceNumber);
		await device.transferOut(outEndpoint, rawBytes as unknown as BufferSource);
		try { await device.close(); } catch {}
		return { success: true };
	} catch (err) {
		return { success: false, error: err instanceof Error ? err.message : "Ошибка WebUSB печати" };
	}
}

export async function printDirectEscPosSocket(
	textOrRawPayload: string,
	options: { host?: string; port?: number; printerName?: string; isBase64?: boolean; widthMm?: 58 | 80; cutPaper?: boolean; copies?: number; silent?: boolean } = {},
): Promise<UniversalPrintResult> {
	const widthMm = options.widthMm ?? 80;
	if (isDesktopExecutable()) {
		try {
			const res = await printDesktopEscPosReceipt({
				host: options.host || "127.0.0.1",
				port: options.port || 9100,
				printerName: options.printerName,
				rawEscPosBase64: options.isBase64 ? textOrRawPayload : typeof btoa === "function" ? btoa(textOrRawPayload) : undefined,
				text: options.isBase64 ? undefined : textOrRawPayload,
				silent: options.silent !== false,
				widthMm,
				cutPaper: options.cutPaper !== false,
				copies: options.copies ?? 1,
			});
			if (res.success) return { success: true, method: "desktop_silent" };
		} catch {}
	}

	if (isAndroidNativeApp()) {
		try {
			const bytes = options.isBase64 ? Uint8Array.from(atob(textOrRawPayload), (c) => c.charCodeAt(0)) : new TextEncoder().encode(textOrRawPayload);
			const mobileRes = await printMobileThermalBinary(bytes);
			if (mobileRes.success) return { success: true, method: "mobile_native" };
		} catch {}
	}

	try {
		const html = `<pre style="font-family:monospace;font-size:12px;white-space:pre-wrap;margin:0;padding:12px;">${textOrRawPayload}</pre>`;
		const res = await hardwarePrinter.printHtmlWithPopupFallback(html, { downloadFilename: `receipt_${Date.now()}.html` });
		return { success: res.success, method: res.interfaceUsed === "browser_dialog" ? "browser_dialog" : "iframe_silent" };
	} catch (err) {
		return { success: false, method: "browser_dialog", error: err instanceof Error ? err.message : "Ошибка печати чека" };
	}
}
