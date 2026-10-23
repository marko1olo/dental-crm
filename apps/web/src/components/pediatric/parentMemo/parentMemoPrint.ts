import { showToast } from "../../GlobalToast";

export interface PrintParentMemoOptions {
	readonly patientName: string;
	readonly memoText: string;
	readonly clinicName: string;
	readonly doctorName: string;
}

export function printParentMemo({
	patientName,
	memoText,
	clinicName,
	doctorName,
}: PrintParentMemoOptions): void {
	const printWindow = window.open("", "_blank");
	if (!printWindow) {
		showToast("Разрешите всплывающие окна в браузере для печати памятки", "error");
		return;
	}

	const dateStr = new Date().toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});

	printWindow.document.write(`
		<!DOCTYPE html>
		<html lang="ru">
		<head>
			<meta charset="UTF-8">
			<title>Памятка родителям — ${patientName}</title>
			<style>
				@page { size: A4 portrait; margin: 10mm; }
				* { box-sizing: border-box; }
				body {
					margin: 0; padding: 16px;
					font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
					color: #0f172a; line-height: 1.5; font-size: 13px;
				}
				.header { border-bottom: 2px solid #0d9488; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid; break-inside: avoid; }
				.clinic { font-size: 16px; font-weight: 800; color: #0d9488; text-transform: uppercase; }
				.title { font-size: 20px; font-weight: 900; margin: 0 0 4px 0; color: #0f172a; }
				.content { white-space: pre-wrap; font-family: inherit; font-size: 13px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; page-break-inside: avoid; break-inside: avoid; }
				.footer { margin-top: 24px; padding-top: 12px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; font-weight: 600; page-break-inside: avoid; break-inside: avoid; }
			</style>
		</head>
		<body>
			<div class="header">
				<div>
					<div class="clinic">${clinicName}</div>
					<h1 class="title">Памятка родителям юного пациента</h1>
					<div style="font-size: 14px; font-weight: bold; color: #334155;">Пациент: ${patientName}</div>
				</div>
				<div style="text-align: right; font-size: 12px; color: #64748b;">Дата: ${dateStr}</div>
			</div>
			<div class="content">${memoText}</div>
			<div class="footer">
				<div>Лечащий врач: ${doctorName}</div>
				<div>Телефон клиники для экстренной связи: +7 (495) 123-45-67</div>
			</div>
			<script>
				window.onload = function() {
					setTimeout(function() { window.print(); window.close(); }, 250);
				};
			</script>
		</body>
		</html>
	`);
	printWindow.document.close();
}
