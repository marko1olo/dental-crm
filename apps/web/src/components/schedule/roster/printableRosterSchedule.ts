/**
 * DENTE Dental CRM — Printable Shift Roster Schedule (A4 Landscape)
 * Simple schedule of doctor shifts by days of the week per Mandates 8e, 8n
 */

import {
	type CabinetDefinition,
	CLINIC_CABINETS_CATALOG,
} from "./doctorShiftRosterPresets";
import type { DoctorShift } from "./doctorShiftRosterEngine";

/**
 * Generate official printable HTML schedule (A4 Landscape)
 */
export function generatePrintableRosterHtml(
	shifts: DoctorShift[],
	weekStartIso: string,
	weekEndIso: string,
	clinicName = 'ООО "Денте Клиник"',
	cabinets: CabinetDefinition[] = CLINIC_CABINETS_CATALOG,
): string {
	const activeShifts = shifts.filter(
		(s) => s.dateIso >= weekStartIso && s.dateIso <= weekEndIso && s.status !== "cancelled",
	);

	// Generate list of days in week
	const days: string[] = [];
	const cur = new Date(weekStartIso);
	const end = new Date(weekEndIso);
	while (cur <= end) {
		const dayStr = cur.toISOString().split("T")[0];
		if (dayStr) days.push(dayStr);
		cur.setDate(cur.getDate() + 1);
	}

	const dayNamesRu = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

	let cabinetRowsHtml = "";
	for (const cab of cabinets) {
		for (const chair of cab.chairs) {
			let cellsHtml = "";
			for (const dayIso of days) {
				const dayShifts = activeShifts.filter(
					(s) => s.chairId === chair.id && s.dateIso === dayIso,
				);

				let shiftContent = '<div style="color: #94a3b8; font-size: 11px;">—</div>';
				if (dayShifts.length > 0) {
					shiftContent = dayShifts
						.map((s) => {
							const asst = s.assistantName
								? `<br/><span style="color:#0f766e; font-size:10px;">Асст: ${s.assistantName}</span>`
								: "";
							return `<div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:4px; padding:3px 4px; margin-bottom:2px; font-size:11px; text-align:left;">
								<strong>${s.startTime}–${s.endTime}</strong><br/>
								<span>${s.doctorName}</span>
								${asst}
							</div>`;
						})
						.join("");
				}

				cellsHtml += `<td style="border: 1px solid #cbd5e1; padding: 4px; vertical-align: top; width: 13%;">${shiftContent}</td>`;
			}

			cabinetRowsHtml += `<tr>
				<td style="border: 1px solid #cbd5e1; padding: 6px; font-size: 12px; font-weight: 600; background: #f8fafc;">
					${cab.name}<br/>
					<span style="font-size: 10px; font-weight: normal; color: #64748b;">${chair.name}</span>
				</td>
				${cellsHtml}
			</tr>`;
		}
	}

	const headerDaysHtml = days
		.map((d) => {
			const dateObj = new Date(d);
			const dayOfWeek = dayNamesRu[dateObj.getDay()];
			const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
			const bg = isWeekend ? "#fef2f2" : "#f1f5f9";
			const color = isWeekend ? "#dc2626" : "#0f172a";
			return `<th style="border: 1px solid #cbd5e1; padding: 6px; background: ${bg}; color: ${color}; font-size: 12px; text-align: center;">
				${dayOfWeek}, ${d.substring(8, 10)}.${d.substring(5, 7)}
			</th>`;
		})
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>График сменности врачей — ${clinicName}</title>
	<style>
		@page { size: A4 landscape; margin: 10mm; }
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; color: #0f172a; }
		table { width: 100%; border-collapse: collapse; margin-top: 10px; }
		.header-block { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0f172a; padding-bottom: 8px; }
		.title { font-size: 16px; font-weight: bold; }
		.subtitle { font-size: 12px; color: #475569; margin-top: 3px; }
		.footer-block { display: flex; justify-content: space-between; margin-top: 25px; font-size: 12px; }
	</style>
</head>
<body>
	<div class="header-block">
		<div>
			<div class="title">УТВЕРЖДАЮ: ГРАФИК СМЕННОСТИ И РАСПИСАНИЯ ВРАЧЕЙ</div>
			<div class="subtitle">${clinicName} | Период: с ${weekStartIso} по ${weekEndIso} (33-часовая рабочая неделя)</div>
		</div>
		<div style="text-align: right; font-size: 11px;">
			Главный врач: _________________ (подпись / печать)<br/>
			Дата утверждения: "${new Date().toLocaleDateString("ru-RU")}"
		</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="border: 1px solid #cbd5e1; padding: 6px; background: #e2e8f0; font-size: 12px; width: 15%;">Кабинет / Кресло</th>
				${headerDaysHtml}
			</tr>
		</thead>
		<tbody>
			${cabinetRowsHtml}
		</tbody>
	</table>

	<div class="footer-block">
		<div>Ответственный за составление графика: Старшая медсестра / Зав. отделением _________________</div>
		<div>Страница 1 из 1</div>
	</div>
</body>
</html>`;
}
