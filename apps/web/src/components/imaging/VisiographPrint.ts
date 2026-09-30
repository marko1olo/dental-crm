/**
 * VisiographPrint.ts
 *
 * Safe sanitized print window for Visiograph AI clinical analysis report.
 */

import { escapeHtml } from "./VisiographReportViewer";
import type { XrayScan } from "./VisiographScanHelpers";

export function printAiScanReport(scan: XrayScan): void {
	if (!scan?.aiReport || typeof window === "undefined") return;
	const win = window.open("", "_blank");
	if (!win) return;

	win.document.write(`
      <html><head><title>Отчёт · Рентген-анализ ИИ</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;max-width:700px;margin:0 auto}
      h1{font-size:18px;border-bottom:2px solid #333;padding-bottom:8px}
      pre{white-space:pre-wrap;font-family:inherit;font-size:14px;line-height:1.6}</style>
      </head><body>
      <h1>Рентген-анализ 2D-снимка (ИИ)</h1>
      <p style="color:#666;font-size:12px">Дата: ${escapeHtml(new Date(scan.capturedAt).toLocaleDateString("ru-RU"))}</p>
      <pre>${escapeHtml(scan.aiReport)}</pre>
      </body></html>
    `);
	win.document.close();
	win.print();
}
