import { StaffActionAuditService } from "../../services/audit/staffActionAuditService";

export function localCalendarDateString(date: Date = new Date()): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function calendarDateOfInstant(value: unknown): string | null {
	if (typeof value !== "string" || !value) return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : localCalendarDateString(parsed);
}

export const NIL_UUID = "00000000-0000-0000-0000-000000000000";

export function formatClockTime(value: unknown): string {
	if (typeof value !== "string" || !value) return "";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "";
	return parsed.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export interface PrintEncashmentOptions {
	doctorFullName: string;
	clinicName: string;
	encashmentAmount: number;
	effectiveTotalRub: number;
	cashRub: number;
	cardRub: number;
	sbpRub: number;
	depositRub: number;
	doctorCommissionPct: number;
	estimatedDoctorPayoutRub: number;
}

/**
 * Native A4 Print statement for 54-FZ Encashment & Doctor Shift Cash Reconciliation.
 * Adheres to 0% emoji policy and official accounting standards.
 */
export function printEncashmentStatement(options: PrintEncashmentOptions): void {
	const {
		doctorFullName,
		clinicName,
		encashmentAmount,
		effectiveTotalRub,
		cashRub,
		cardRub,
		sbpRub,
		depositRub,
		doctorCommissionPct,
		estimatedDoctorPayoutRub,
	} = options;

	StaffActionAuditService.logDocumentPrint({
		documentType: "encashment_statement_54fz",
		title: `Ведомость инкассации и сменный отчёт — ${doctorFullName}`,
	});

	const printWin = window.open("", "_blank", "width=800,height=900");
	if (!printWin) {
		window.print();
		return;
	}

	const todayStr = new Date().toLocaleDateString("ru-RU", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	});

	const html = `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Ведомость инкассации 54-ФЗ — ${doctorFullName}</title>
	<style>
		@page { size: A4; margin: 15mm; }
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11pt; color: #0f172a; margin: 0; padding: 12px; }
		.head { text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 8px; margin-bottom: 16px; }
		.head h1 { font-size: 15pt; margin: 0 0 4px 0; color: #0f172a; }
		.head p { font-size: 10pt; color: #64748b; margin: 0; }
		.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #f8fafc; padding: 10px; border-radius: 6px; font-size: 10pt; margin-bottom: 16px; }
		.table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
		.table th, .table td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
		.table th { background: #f1f5f9; font-weight: 600; font-size: 9pt; }
		.table td.num { text-align: right; }
		.total-box { background: #f0fdfa; border: 1px solid #99f6e4; padding: 12px; border-radius: 6px; margin-bottom: 20px; }
		.total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11pt; }
		.total-row.strong { font-size: 13pt; font-weight: bold; border-top: 1px solid #0d9488; padding-top: 6px; color: #0f766e; }
		.signatures { display: flex; justify-content: space-between; margin-top: 40px; font-size: 10pt; }
		.sig-line { width: 220px; border-bottom: 1px solid #475569; margin-top: 30px; }
	</style>
</head>
<body>
	<div class="head">
		<h1>ВЕДОМОСТЬ ИНКАССАЦИИ И КАССОВЫЙ СРЕЗ СМЕНЫ</h1>
		<p>${clinicName} • Регламент 54-ФЗ • Кассовый срез смены</p>
	</div>
	<div class="info-grid">
		<div><strong>Врач / Кассир:</strong> ${doctorFullName}</div>
		<div><strong>Дата:</strong> ${todayStr}</div>
		<div><strong>Статус кассы:</strong> Смена закрыта (Z-отчёт готов)</div>
		<div><strong>Сумма инкассации:</strong> ${encashmentAmount.toLocaleString("ru-RU")} ₽</div>
	</div>
	<h3>Кассовая выручка по типам оплат</h3>
	<table class="table">
		<thead>
			<tr><th>Вид поступления</th><th style="width: 150px; text-align: right;">Сумма</th></tr>
		</thead>
		<tbody>
			<tr><td>Наличные денежные средства</td><td class="num">${cashRub.toLocaleString("ru-RU")} ₽</td></tr>
			<tr><td>Безналичный расчет (Эквайринг/Терминал)</td><td class="num">${cardRub.toLocaleString("ru-RU")} ₽</td></tr>
			<tr><td>Система быстрых платежей (СБП QR)</td><td class="num">${sbpRub.toLocaleString("ru-RU")} ₽</td></tr>
			<tr><td>Списание с лицевого счета / Депозит</td><td class="num">${depositRub.toLocaleString("ru-RU")} ₽</td></tr>
		</tbody>
	</table>
	<div class="total-box">
		<div class="total-row"><span>Итого выручка за смену:</span><span>${effectiveTotalRub.toLocaleString("ru-RU")} ₽</span></div>
		<div class="total-row"><span>Процент вознаграждения врача:</span><span>${doctorCommissionPct}%</span></div>
		<div class="total-row strong"><span>Расчётное вознаграждение к начислению:</span><span>${estimatedDoctorPayoutRub.toLocaleString("ru-RU")} ₽</span></div>
		<div class="total-row strong" style="color: #0369a1; border-top: 1px dashed #0284c7; margin-top: 6px;">
			<span>Передано в сейф клиники (инкассировано):</span>
			<span>${encashmentAmount.toLocaleString("ru-RU")} ₽</span>
		</div>
	</div>
	<div class="signatures">
		<div>
			<div>Сдал (Врач-стоматолог):</div>
			<div class="sig-line"></div>
			<div style="font-size: 9pt; color: #64748b; margin-top: 4px;">${doctorFullName}</div>
		</div>
		<div>
			<div>Принял (Главный бухгалтер / Администратор):</div>
			<div class="sig-line"></div>
			<div style="font-size: 9pt; color: #64748b; margin-top: 4px;">Подпись / ФИО</div>
		</div>
	</div>
</body>
</html>`;

	printWin.document.open();
	printWin.document.write(html);
	printWin.document.close();
	printWin.focus();
	setTimeout(() => {
		printWin.print();
	}, 250);
}
