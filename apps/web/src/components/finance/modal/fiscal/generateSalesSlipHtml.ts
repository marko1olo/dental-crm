import type { TreatmentPlanItem } from "../../../treatment-plans/types";
import { numberToWordsRu } from "../../invoiceEngine";

export interface SalesSlipHtmlParams {
	readonly docNum: string;
	readonly nowStr: string;
	readonly clinicName: string;
	readonly patientName: string;
	readonly patientPhone: string;
	readonly cashierFullName: string;
	readonly totalSumRub: number;
	readonly items: readonly TreatmentPlanItem[];
}

export function generateSalesSlipHtml(p: SalesSlipHtmlParams): string {
	const wholeRub = Math.floor(p.totalSumRub);
	const kop = Math.round((p.totalSumRub - wholeRub) * 100);
	const wordsRu = numberToWordsRu(wholeRub, kop);

	const rowsHtml = p.items
		.map((it, idx) => {
			const qty = it.quantity || 1;
			const lineTotal = Math.max(0, it.priceRub * qty - (it.discountRub || 0));
			return `<tr>
				<td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">${idx + 1}</td>
				<td style="border: 1px solid #cbd5e1; padding: 6px 8px;">
					<strong>${it.name}</strong>
					${it.toothNumber ? `<br><small style="color: #64748b;">Зуб FDI: ${it.toothNumber}</small>` : ""}
					${it.code804n ? `<br><small style="color: #64748b;">Код услуги: ${it.code804n}</small>` : ""}
				</td>
				<td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">${qty}</td>
				<td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; font-family: monospace;">${it.priceRub.toFixed(2)} ₽</td>
				<td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; font-family: monospace;">${(it.discountRub || 0).toFixed(2)} ₽</td>
				<td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; font-family: monospace; font-weight: bold;">${lineTotal.toFixed(2)} ₽</td>
			</tr>`;
		})
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Товарный чек № ${p.docNum}</title>
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 12px; color: #0f172a; margin: 20px; line-height: 1.4; }
		.header { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; }
		.title { font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px; }
		.non-fiscal-warning { font-size: 10.5px; font-weight: bold; color: #475569; text-transform: uppercase; margin-bottom: 6px; }
		.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11.5px; margin-top: 6px; }
		table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 11.5px; }
		th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px; font-weight: 700; text-align: left; }
		.total-section { margin-top: 14px; padding: 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; }
		.total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: 800; }
		.signatures { display: flex; justify-content: space-between; margin-top: 36px; padding-top: 10px; }
		.sig-box { width: 45%; border-top: 1px dashed #64748b; padding-top: 6px; font-size: 11px; }
		@media print { body { margin: 0; } }
	</style>
</head>
<body>
	<div class="header">
		<div class="title">ТОВАРНЫЙ ЧЕК № ${p.docNum}</div>
		<div class="non-fiscal-warning">НЕ ЯВЛЯЕТСЯ ФИСКАЛЬНЫМ ДОКУМЕНТОМ • ДЕТАЛИЗАЦИЯ УСЛУГ</div>
		<div class="meta-grid">
			<div>
				<div><strong>Организация:</strong> ${p.clinicName}</div>
				<div><strong>Лицензия:</strong> ЛО41-01137-77/00368421</div>
			</div>
			<div>
				<div><strong>Дата и время:</strong> ${p.nowStr}</div>
				<div><strong>Покупатель (пациент):</strong> ${p.patientName}</div>
				<div><strong>Телефон:</strong> ${p.patientPhone}</div>
			</div>
		</div>
	</div>
	<table>
		<thead><tr><th style="width: 32px; text-align: center;">№</th><th>Наименование работы (услуги)</th><th style="width: 50px; text-align: center;">Кол-во</th><th style="width: 90px; text-align: right;">Цена</th><th style="width: 80px; text-align: right;">Скидка</th><th style="width: 95px; text-align: right;">Сумма</th></tr></thead>
		<tbody>${rowsHtml}</tbody>
	</table>
	<div class="total-section">
		<div class="total-row"><span>ИТОГО К ОПЛАТЕ:</span><span>${p.totalSumRub.toFixed(2)} ₽</span></div>
		<div style="font-size: 11px; margin-top: 4px; color: #334155;">Сумма прописью: <em>${wordsRu}</em></div>
		<div style="font-size: 11px; margin-top: 4px; color: #334155;">Форма расчета: <strong>Безналичный расчет / Без фискализации</strong></div>
	</div>
	<div class="signatures">
		<div class="sig-box">Кассир: _________________ / ${p.cashierFullName}<br><small style="color: #64748b;">М.П.</small></div>
		<div class="sig-box">Покупатель: _________________ / ${p.patientName}<br><small style="color: #64748b;">Претензий не имею</small></div>
	</div>
	<script>window.onload = function() { try { window.focus(); window.print(); } catch (e) {} };</script>
</body>
</html>`;
}
