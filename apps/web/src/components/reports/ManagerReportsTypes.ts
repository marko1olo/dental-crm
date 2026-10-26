/**
 * Фасад типов для панели отчётов управляющего и экспорта CSV.
 * Декомпозирован на managerReportsDataTypes и managerReportsDetailTypes (Мандат 8b).
 */

export type {
	ReportSectionTab,
	RevenuePoint,
	DoctorRow,
	ChairRow,
	ReminderGroup,
	ReportsSummary,
	CalendarPeriod,
} from "./managerReportsDataTypes";

export type {
	ServiceSalesReport,
	ReceivablesDetail,
	ScheduleLoadReport,
	ReportSlice,
	ManagerReportsPanelProps,
} from "./managerReportsDetailTypes";
