/**
 * DENTE CRM — A4 Outpatient Document Printer
 *
 * Prints medical cards, treatment plans, consent forms, and acts.
 * Supports silent native desktop printing and isolated browser DOM print layers.
 */

import { isDesktopApp, printDesktopDocumentSilent } from "../../native/desktopBridge.js";
import { isDesktopExecutable } from "../omniPlatformAdapter.js";
import type { A4PrintOptions, UniversalPrintResult } from "./printingTypes.js";

function mountPrintLayer(html: string): HTMLElement {
	const existingLayer = document.getElementById("dente-dynamic-print-layer");
	if (existingLayer) existingLayer.remove();

	const layer = document.createElement("div");
	layer.id = "dente-dynamic-print-layer";
	layer.className = "print-layer";
	layer.innerHTML = html;
	document.body.appendChild(layer);
	return layer;
}

export async function printA4Document(
	content: HTMLElement | string,
	options: A4PrintOptions = {},
): Promise<UniversalPrintResult> {
	if (typeof window === "undefined" || (typeof document === "undefined" && !isDesktopApp() && typeof content !== "string")) {
		return { success: false, method: "browser_dialog", error: "Печать недоступна вне браузера" };
	}

	try {
		options.onBeforePrint?.();
		const htmlContent = typeof content === "string" ? content : content.outerHTML;

		if (isDesktopExecutable() || isDesktopApp() || options.silent) {
			const res = await printDesktopDocumentSilent({
				htmlContent,
				title: options.title,
				printerName: options.printerName,
				silent: options.silent !== false,
			});
			if (res.success) {
				options.onAfterPrint?.();
				return { success: true, method: res.method === "desktop_silent" ? "desktop_silent" : "iframe_silent" };
			}
		}

		if (typeof content === "string") {
			const layer = mountPrintLayer(content);
			window.focus();
			window.print();
			setTimeout(() => {
				layer.remove();
				options.onAfterPrint?.();
			}, options.cleanupDelayMs ?? 1000);
			return { success: true, method: "browser_dialog" };
		}

		const wasLayer = content.classList.contains("print-layer");
		if (!wasLayer) content.classList.add("print-layer");
		window.focus();
		window.print();

		if (!wasLayer) {
			setTimeout(() => {
				content.classList.remove("print-layer");
				options.onAfterPrint?.();
			}, options.cleanupDelayMs ?? 500);
		} else {
			options.onAfterPrint?.();
		}

		return { success: true, method: "browser_dialog" };
	} catch (err) {
		const message = err instanceof Error ? err.message : "Ошибка вывода на печать";
		return { success: false, method: "browser_dialog", error: message };
	}
}
