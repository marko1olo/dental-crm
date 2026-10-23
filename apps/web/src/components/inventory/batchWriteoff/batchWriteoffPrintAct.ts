export function printWriteoffAct(params: {
	actNumber?: string | undefined;
	date?: string | undefined;
	cabinetId?: string | undefined;
	doctorName?: string | undefined;
}) {
	const actNum = params.actNumber || `АКТ-СПИС-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}`;
	const actDate = params.date || new Date().toISOString().slice(0, 10);
	const cabinetId = params.cabinetId || "Кабинет №1";
	const doctorName = params.doctorName || "Дежурный врач";

	const html = `<!DOCTYPE html>
	<html lang="ru"><head><meta charset="utf-8"><title>Акт списания материалов № ${actNum}</title>
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11pt; color: #111; margin: 24px; line-height: 1.35; }
		table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 10pt; }
		th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px; font-weight: 600; text-align: center; }
		td { border: 1px solid #cbd5e1; padding: 6px; }
		.signatures { margin-top: 36px; width: 100%; font-size: 10pt; }
		.signatures td { padding: 10px 0; border: none; }
		@media print { body { margin: 12mm; } }
	</style></head><body>
	<div style="border-bottom: 2px solid #0d9488; padding-bottom: 10px; display: flex; justify-content: space-between;">
		<div>
			<h2 style="margin:0; font-size: 15pt; color: #0f172a;">АКТ СПИСАНИЯ РАСХОДНЫХ МАТЕРИАЛОВ № ${actNum}</h2>
			<div style="font-size: 10pt; color: #64748b; margin-top: 4px;">Дата списания: ${actDate} г. • Кабинет: ${cabinetId}</div>
		</div>
		<div style="text-align: right; font-size: 10pt; color: #64748b;">
			Основание: <strong>Клинический приём / Смена</strong>
		</div>
	</div>

	<div style="margin-top: 12px; font-size: 10pt; color: #334155;">
		Настоящий акт составлен об израсходовании стоматологических расходных материалов и медикаментов при оказании медицинской помощи пациентам.
	</div>

	<table><thead><tr>
		<th style="width: 5%;">№</th>
		<th style="width: 50%; text-align: left;">Наименование списанного материала</th>
		<th style="width: 15%;">Количество</th>
		<th style="width: 30%; text-align: left;">Примечание</th>
	</tr></thead><tbody>
		<tr>
			<td style="text-align: center;">1</td>
			<td><strong>Перчатки смотровые нитриловые / маски</strong></td>
			<td style="text-align: center;">1 комплект</td>
			<td>Расход смены (СанПиН)</td>
		</tr>
		<tr>
			<td style="text-align: center;">2</td>
			<td><strong>Слюноотсосы, нагрудники, валики ватные</strong></td>
			<td style="text-align: center;">1 комплект</td>
			<td>Одноразовые медизделия</td>
		</tr>
		<tr>
			<td style="text-align: center;">3</td>
			<td><strong>Анестетик артикаинового ряда (карпулы 1.8 мл)</strong></td>
			<td style="text-align: center;">По факту приёма</td>
			<td>Местная анестезия</td>
		</tr>
		<tr>
			<td style="text-align: center;">4</td>
			<td><strong>Пломбировочные композиты / адгезивные системы</strong></td>
			<td style="text-align: center;">По протоколу</td>
			<td>Терапевтический приём</td>
		</tr>
	</tbody></table>

	<div style="margin-top: 16px; font-size: 9pt; color: #64748b; background: #f8fafc; padding: 8px; border-radius: 6px;">
		✓ Списание произведено в фоновом режиме по утвержденным нормам расхода (без бюрократических комиссий и задержек приёма).
	</div>

	<table class="signatures"><tr>
		<td style="width: 50%;"><strong>Ответственный сотрудник (Врач / Ассистент):</strong><br><br>_________________ / ${doctorName} /</td>
		<td style="width: 50%;"><strong>Заведующий кабинетом:</strong><br><br>_________________ / _________________ /</td>
	</tr></table></body></html>`;

	const win = window.open("", "_blank");
	if (win) {
		win.document.write(html);
		win.document.close();
		win.focus();
		setTimeout(() => win.print(), 250);
	}
}
