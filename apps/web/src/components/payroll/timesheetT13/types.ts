import {
	getDaysInMonth,
	type TimesheetDayRecord,
} from "@dental/shared";

export interface TimesheetT13ModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly clinicName?: string | undefined;
	readonly employees?: readonly EmployeeInfo[] | undefined;
}

export interface EmployeeInfo {
	readonly id: string;
	readonly tabNumber: string;
	readonly name: string;
	readonly positionRu: string;
	readonly departmentRu: string;
	readonly defaultShiftHours: number;
}

export type TimesheetRoleFilter = "all" | "doctor" | "assistant" | "admin";

export function staffToEmployeeInfo(staff: readonly any[]): EmployeeInfo[] {
	return staff
		.filter(
			(m) =>
				m &&
				m.active !== false &&
				(m.role === "doctor" ||
					m.role === "assistant" ||
					m.role === "owner" ||
					m.role === "admin" ||
					!m.role),
		)
		.map((m, index) => {
			const isDoctor = m.role === "doctor" || m.role === "owner" || !m.role;
			const isAssistant = m.role === "assistant";

			const spec = Array.isArray(m.specialties) && m.specialties.length > 0 ? String(m.specialties[0]) : "";
			const positionRu = isAssistant
				? "Ассистент врача-стоматолога"
				: m.role === "admin"
				? "Администратор клиники"
				: (spec.includes("orthoped") ? "Врач-стоматолог ортопед"
					: spec.includes("surg") ? "Врач-стоматолог хирург-имплантолог"
					: spec.includes("orthodont") ? "Врач-стоматолог ортодонт"
					: spec === "pediatric" ? "Детский врач-стоматолог"
					: spec === "periodontics" ? "Врач-стоматолог пародонтолог"
					: spec.includes("hyg") ? "Гигиенист стоматологический"
					: spec.includes("general") ? "Врач-стоматолог общей практики"
					: "Врач-стоматолог терапевт");

			const departmentRu = isAssistant
				? "Сестринская служба / ЦСО"
				: m.role === "admin"
				? "Ресепшен и клиентский сервис"
				: (spec.includes("orthoped") ? "Ортопедическое отделение"
					: spec.includes("surg") ? "Хирургическое отделение"
					: spec.includes("orthodont") ? "Ортодонтическое отделение"
					: spec === "pediatric" ? "Детское отделение"
					: "Клиническое отделение");

			// Art. 350 Labor Code RF: 33h week = 6.6h/day for dentists, 39h week = 7.8h/day for assistants, 40h = 8h/day for admins
			const defaultShiftHours = isAssistant ? 7.8 : isDoctor ? 6.6 : 8.0;
			const tabNumber = String(101 + index).padStart(5, "0");

			return {
				id: m.id || `emp-${index + 1}`,
				tabNumber: m.tabNumber || tabNumber,
				name: m.fullName || m.name || `Сотрудник ${index + 1}`,
				positionRu,
				departmentRu,
				defaultShiftHours,
			};
		});
}

export function generateDefaultMonthSchedule(
	year: number,
	month: number,
	defaultHours: number,
): TimesheetDayRecord[] {
	const totalDays = getDaysInMonth(year, month);
	const records: TimesheetDayRecord[] = [];

	for (let d = 1; d <= totalDays; d++) {
		const dayOfWeek = new Date(year, month - 1, d).getDay();
		const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday

		records.push({
			dayNumber: d,
			primaryCode: isWeekend ? "В" : "Я",
			primaryHours: isWeekend ? 0 : defaultHours,
		});
	}

	return records;
}
