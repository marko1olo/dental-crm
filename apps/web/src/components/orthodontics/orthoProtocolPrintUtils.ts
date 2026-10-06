import { showToast } from "../GlobalToast";

export interface PrintOrthoCardParams {
	patientName: string;
	clinicName: string;
	doctorName: string;
	generatedProtocol: string;
}

export function printOrthodonticCard({
	patientName,
	clinicName,
	doctorName,
	generatedProtocol,
}: PrintOrthoCardParams): void {
	try {
		if (typeof window !== "undefined") {
			const printWindow = window.open("", "_blank");
			if (printWindow) {
				printWindow.document.write(
					`<!DOCTYPE html><html><head><title>Ортодонтическая медицинская карта — ${patientName}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:24px;color:#0f172a;line-height:1.5;font-size:13px}h1{font-size:16px;margin:0 0 4px;text-transform:uppercase;font-weight:800}.meta{font-size:11px;color:#64748b;margin-bottom:16px;border-bottom:1px solid #cbd5e1;padding-bottom:8px}.stamp{display:inline-block;padding:4px 10px;border:2px solid #059669;color:#059669;font-weight:800;font-size:11px;text-transform:uppercase;border-radius:4px;margin-bottom:12px}pre{white-space:pre-wrap;font-family:inherit;font-size:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px}.footer{margin-top:24px;font-size:11px;color:#64748b;border-top:1px solid #cbd5e1;padding-top:8px;display:flex;justify-content:space-between}@media print{body{padding:0}}</style></head><body><div class="stamp">ПОДПИСАНО ВРАЧОМ / МЕДИЦИНСКАЯ КАРТА</div><h1>Дневник ортодонтического приёма</h1><div class="meta">Клиника: ${clinicName} · Пациент: ${patientName} · Врач: ${doctorName} · Дата: ${new Date().toLocaleDateString("ru-RU")}</div><pre>${generatedProtocol.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre><div class="footer"><span>Лечащий врач-ортодонт: ${doctorName} ____________</span><span>М.П.</span></div><script>window.onload=function(){window.print();};</script></body></html>`,
				);
				printWindow.document.close();
			} else if (typeof window.print === "function") {
				window.print();
			}
		}
		showToast("Отправлено на печать: Ортодонтическая карта", "info");
	} catch (err) {
		console.warn("Print error:", err);
		if (typeof window !== "undefined" && typeof window.print === "function") {
			window.print();
		}
	}
}

export function copyTextToClipboard(text: string, successMsg = "Скопировано в буфер обмена"): void {
	if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
		navigator.clipboard
			.writeText(text)
			.then(() => {
				showToast(successMsg, "success");
			})
			.catch(() => {
				showToast("Не удалось скопировать", "error");
			});
	} else {
		showToast(successMsg, "info");
	}
}

export interface PrintPatientMemoParams {
	patientName: string;
	clinicName: string;
	doctorName: string;
	clinicPhone: string;
	memoText: string;
}

export function printPatientMemoA4({
	patientName,
	clinicName,
	doctorName,
	clinicPhone,
	memoText,
}: PrintPatientMemoParams): void {
	try {
		if (typeof window !== "undefined") {
			const printWindow = window.open("", "_blank");
			if (printWindow) {
				printWindow.document.write(
					`<!DOCTYPE html><html><head><title>Памятка пациенту — ${patientName}</title><style>@page{size:A4;margin:15mm}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:24px;color:#0f172a;line-height:1.6;font-size:13px}h1{font-size:16px;margin:0 0 6px;text-transform:uppercase;font-weight:800;color:#0f172a}.meta{font-size:11px;color:#64748b;margin-bottom:16px;border-bottom:1px solid #cbd5e1;padding-bottom:8px}.memo-box{white-space:pre-wrap;font-family:inherit;font-size:13px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;line-height:1.7}.footer{margin-top:28px;font-size:11px;color:#64748b;border-top:1px solid #cbd5e1;padding-top:10px;display:flex;justify-content:space-between}@media print{body{padding:0}.memo-box{background:#fff;border:none;padding:0}}</style></head><body><h1>Ортодонтические рекомендации пациенту</h1><div class="meta">Клиника: ${clinicName} · Пациент: ${patientName} · Врач: ${doctorName} · Дата: ${new Date().toLocaleDateString("ru-RU")}</div><div class="memo-box">${memoText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div><div class="footer"><span>Лечащий врач-ортодонт: ${doctorName} ____________</span><span>Тел.: ${clinicPhone || "—"}</span></div><script>window.onload=function(){window.print();};</script></body></html>`,
				);
				printWindow.document.close();
			} else if (typeof window.print === "function") {
				window.print();
			}
		}
		showToast("Памятка пациенту отправлена на печать (A4)", "info");
	} catch (err) {
		console.warn("Print memo error:", err);
		if (typeof window !== "undefined" && typeof window.print === "function") {
			window.print();
		}
	}
}
