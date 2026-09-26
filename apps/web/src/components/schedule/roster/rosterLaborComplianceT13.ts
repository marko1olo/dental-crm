/**
 * DENTE Dental CRM — Form T-13 Labor Compliance & Printable Roster Engine
 * Compliance: TK RF Article 350 (33-hour medical workweek), Form T-13, Official A4 Schedule Print
 */

import {
	type CabinetDefinition,
	CLINIC_CABINETS_CATALOG,
	MEDICAL_STAFF_ROLES,
	type MedicalStaffRole,
	RUSSIAN_PRODUCTION_CALENDAR_2026,
	type StaffMember,
	type T13TimeCode,
	type ShiftArchetypeId,
} from "./doctorShiftRosterPresets";

export interface DoctorShift {
	id: string;
	doctorId: string;
	doctorName: string;
	doctorRole: MedicalStaffRole;
	assistantId: string | null;
	assistantName: string | null;
	cabinetId: string;
	chairId: string;
	dateIso: string; // YYYY-MM-DD
	archetypeId: ShiftArchetypeId;
	startTime: string; // HH:MM
	endTime: string; // HH:MM
	durationHours: number;
	breakMinutes: number;
	isNight: boolean;
	nightHours: number;
	customNotes?: string | undefined;
	status: "scheduled" | "confirmed" | "completed" | "cancelled" | "absence";
	absenceReason?: "sick_leave" | "vacation" | "unpaid_leave" | "training" | undefined;
}

export interface T13DayRecord {
	dayOfMonth: number;
	dateIso: string;
	code: T13TimeCode;
	hours: number;
	nightHours: number;
}

export interface T13RowData {
	tabNumber: string;
	staffName: string;
	position: string;
	role: MedicalStaffRole;
	days: T13DayRecord[];
	firstHalfDays: number;
	firstHalfHours: number;
	secondHalfDays: number;
	secondHalfHours: number;
	totalMonthDays: number;
	totalMonthHours: number;
	totalNightHours: number;
	overtimeHours: number;
	weekendHours: number;
}

/**
 * Generate Form T-13 (Табель учета рабочего времени) matrix
 */
export function generateFormT13Matrix(
	staffList: StaffMember[],
	shifts: DoctorShift[],
	year = 2026,
	month = 8,
): T13RowData[] {
	const daysInMonth = new Date(year, month, 0).getDate();
	const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;

	const monthShifts = shifts.filter(
		(s) => s.dateIso.startsWith(monthPrefix) && s.status !== "cancelled",
	);

	return staffList.map((staff) => {
		const roleDef = MEDICAL_STAFF_ROLES[staff.role];
		const position = roleDef?.nameRu || "Сотрудник";

		const days: T13DayRecord[] = [];
		let firstHalfDays = 0;
		let firstHalfHours = 0;
		let secondHalfDays = 0;
		let secondHalfHours = 0;
		let totalMonthDays = 0;
		let totalMonthHours = 0;
		let totalNightHours = 0;
		let weekendHours = 0;

		for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
			const dateIso = `${monthPrefix}-${String(dayNum).padStart(2, "0")}`;
			const dayDate = new Date(year, month - 1, dayNum);
			const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;

			// Find shift for this user on this day
			const userShift = monthShifts.find(
				(s) => s.dateIso === dateIso && (s.doctorId === staff.id || s.assistantId === staff.id),
			);

			let code: T13TimeCode = isWeekend ? "В" : "В";
			let hours = 0;
			let nightHours = 0;

			if (userShift) {
				if (userShift.archetypeId === "sick_leave" || userShift.absenceReason === "sick_leave") {
					code = "Б";
				} else if (userShift.archetypeId === "vacation" || userShift.absenceReason === "vacation") {
					code = "ОТ";
				} else if (userShift.archetypeId === "day_off") {
					code = "В";
				} else if (userShift.isNight) {
					code = "Н";
					hours = userShift.durationHours;
					nightHours = userShift.nightHours || 0;
				} else {
					code = "Я";
					hours = userShift.durationHours;
				}
			}

			if (hours > 0) {
				totalMonthDays += 1;
				totalMonthHours += hours;
				totalNightHours += nightHours;

				if (isWeekend) {
					weekendHours += hours;
				}

				if (dayNum <= 15) {
					firstHalfDays += 1;
					firstHalfHours += hours;
				} else {
					secondHalfDays += 1;
					secondHalfHours += hours;
				}
			}

			days.push({
				dayOfMonth: dayNum,
				dateIso,
				code,
				hours,
				nightHours,
			});
		}

		// Calculate statutory month norm
		const monthNorm = RUSSIAN_PRODUCTION_CALENDAR_2026[month]?.normHours33 || 138.6;
		const overtimeHours = totalMonthHours > monthNorm ? Math.round((totalMonthHours - monthNorm) * 10) / 10 : 0;

		return {
			tabNumber: staff.tabNumber,
			staffName: staff.fullName,
			position,
			role: staff.role,
			days,
			firstHalfDays,
			firstHalfHours: Math.round(firstHalfHours * 10) / 10,
			secondHalfDays,
			secondHalfHours: Math.round(secondHalfHours * 10) / 10,
			totalMonthDays,
			totalMonthHours: Math.round(totalMonthHours * 10) / 10,
			totalNightHours: Math.round(totalNightHours * 10) / 10,
			overtimeHours,
			weekendHours: Math.round(weekendHours * 10) / 10,
		};
	});
}

/**
 * Export Form T-13 to Excel / 1C compatible CSV with UTF-8 BOM (\uFEFF)
 */
export function exportFormT13ToCsv(
	t13Data: T13RowData[],
	year = 2026,
	month = 8,
	clinicName = 'ООО "Денте Клиник"',
): string {
	const monthNormObj = RUSSIAN_PRODUCTION_CALENDAR_2026[month];
	const monthName = monthNormObj?.nameRu || `${month}`;
	const daysInMonth = t13Data[0]?.days.length || 31;

	// Build CSV header
	const lines: string[] = [];
	lines.push(`\uFEFF"ТАБЕЛЬ УЧЕТА РАБОЧЕГО ВРЕМЕНИ (Унифицированная форма № Т-13)"`);
	lines.push(`"Организация: ${clinicName}";"Период: ${monthName} ${year} г.";"Норма 33ч: ${monthNormObj?.normHours33 || 138.6} ч"`);
	lines.push("");

	// Table Header Row 1
	const headers = [
		"№ п/п",
		"Таб. №",
		"ФИО сотрудника",
		"Должность",
	];

	for (let d = 1; d <= daysInMonth; d++) {
		headers.push(`${d}`);
	}

	headers.push("1-15 дн.", "1-15 час.", "16-31 дн.", "16-31 час.", "Итого дней", "Итого часов", "В т.ч. ночных", "Сверхурочные");
	lines.push(headers.map((h) => `"${h}"`).join(";"));

	// Data rows
	t13Data.forEach((row, idx) => {
		// Row with Codes (Я, Н, В, Б, etc.)
		const codeCols = [
			`"${idx + 1}"`,
			`"${row.tabNumber}"`,
			`"${row.staffName}"`,
			`"${row.position}"`,
		];

		row.days.forEach((day) => {
			codeCols.push(`"${day.code}"`);
		});

		codeCols.push(
			`"${row.firstHalfDays}"`,
			`"${row.firstHalfHours.toFixed(1)}"`,
			`"${row.secondHalfDays}"`,
			`"${row.secondHalfHours.toFixed(1)}"`,
			`"${row.totalMonthDays}"`,
			`"${row.totalMonthHours.toFixed(1)}"`,
			`"${row.totalNightHours.toFixed(1)}"`,
			`"${row.overtimeHours.toFixed(1)}"`,
		);
		lines.push(codeCols.join(";"));

		// Row with Hours (6.0, 7.0, etc.)
		const hoursCols = [
			`""`,
			`""`,
			`"Часы"`,
			`""`,
		];

		row.days.forEach((day) => {
			hoursCols.push(day.hours > 0 ? `"${day.hours.toFixed(1)}"` : `""`);
		});

		hoursCols.push(`""`, `""`, `""`, `""`, `""`, `""`, `""`, `""`);
		lines.push(hoursCols.join(";"));
	});

	return lines.join("\r\n");
}

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
							const asst = s.assistantName ? `<br/><span style="color:#0f766e; font-size:10px;">Асст: ${s.assistantName}</span>` : "";
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
