/**
 * ============================================================================
 * USE SANPIN SCHEDULE SYNC LOGIC (DOMAIN HOOK)
 * Связка расписания клиники и фактических приёмов с журналами СанПиН:
 * - Вычисление загрузки по профилям (терапия, хирургия, ортопедия);
 * - Расчет крафт-пакетов, циклов автоклава и расхода материалов под каждое кресло;
 * - Ретроспективная генерация журналов ПСО (366/у) и автоклава (257/у);
 * - Экспорт сводной ведомости стерилизации в CSV (RFC 4180 с UTF-8 BOM).
 * ============================================================================
 */

import {
	generateRetrospectiveAutoclaveRecordsFromDailyLoad,
	generateRetrospectiveKraftPackagesFromDailyLoad,
	generateRetrospectivePsoRecordsFromDailyLoad,
	mapScheduleAppointmentsToSanpinDailyLoad,
	type Appointment,
	type Dashboard,
	type Form257Record,
	type KraftPackageRecord,
	type PsoJournalRecord,
	type SanpinAppointmentSource,
	type SanpinDailyLoad,
	type SanpinScheduleDailyLoadReport,
	type SanpinSyncOptions,
} from "@dental/shared";
import { useCallback, useMemo, useState } from "react";
import { showToast } from "../../components/GlobalToast";

export interface UseSanpinScheduleSyncLogicProps {
	readonly dashboard?: Dashboard | null | undefined;
	readonly users?: readonly { id: string; specialty?: string }[] | undefined;
	readonly chairs?: readonly { id: string; name: string }[] | undefined;
	readonly appointments?: readonly (Appointment | SanpinAppointmentSource)[] | undefined;
	readonly defaultStartDate?: string | undefined;
	readonly defaultEndDate?: string | undefined;
	readonly defaultAutoclaveCapacity?: number | undefined;
	readonly onSavePsoRecords?: ((records: PsoJournalRecord[]) => void) | undefined;
	readonly onSaveAutoclaveRecords?: ((records: Form257Record[]) => void) | undefined;
	readonly onSaveKraftPackages?: ((records: KraftPackageRecord[]) => void) | undefined;
}

export type DateRangePreset = "today" | "yesterday" | "this_week" | "this_month" | "last_month" | "custom";

export function getDateRangeFromPreset(preset: DateRangePreset): { startDate: string; endDate: string } {
	const now = new Date();
	const todayIso = now.toISOString().slice(0, 10);

	if (preset === "today") {
		return { startDate: todayIso, endDate: todayIso };
	}

	if (preset === "yesterday") {
		const yest = new Date(now);
		yest.setUTCDate(yest.getUTCDate() - 1);
		const yestIso = yest.toISOString().slice(0, 10);
		return { startDate: yestIso, endDate: yestIso };
	}

	if (preset === "this_week") {
		const monday = new Date(now);
		const day = monday.getUTCDay() || 7; // 1=Пн..7=Вс
		monday.setUTCDate(monday.getUTCDate() - day + 1);
		const sunday = new Date(monday);
		sunday.setUTCDate(sunday.getUTCDate() + 6);
		return {
			startDate: monday.toISOString().slice(0, 10),
			endDate: sunday.toISOString().slice(0, 10),
		};
	}

	if (preset === "this_month") {
		const firstDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
		const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
		return {
			startDate: firstDay.toISOString().slice(0, 10),
			endDate: lastDay.toISOString().slice(0, 10),
		};
	}

	if (preset === "last_month") {
		const firstDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
		const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
		return {
			startDate: firstDay.toISOString().slice(0, 10),
			endDate: lastDay.toISOString().slice(0, 10),
		};
	}

	return { startDate: todayIso, endDate: todayIso };
}

/**
 * Экспорт отчета о загрузке расписания и расходе стерилизационных материалов в CSV (RFC 4180 с UTF-8 BOM).
 */
export function exportSanpinDailyLoadReportToCsv(report: SanpinScheduleDailyLoadReport): string {
	const headers = [
		"Дата",
		"День недели",
		"Рабочий день",
		"Всего пациентов",
		"Терапия (пац.)",
		"Хирургия (пац.)",
		"Ортопедия (пац.)",
		"Базовые смотровые лотки (шт.)",
		"Наборы боров (шт.)",
		"Наконечники (шт.)",
		"Хирургические лотки (шт.)",
		"Щипцы (шт.)",
		"Элеваторы (шт.)",
		"Шприцы (шт.)",
		"Ортопедические лотки (шт.)",
		"Слепочные ложки (компл.)",
		"Всего инструментов (шт.)",
		"Крафт-пакеты (всего шт.)",
		"Пакеты 75х150 мм",
		"Пакеты 100х200 мм",
		"Пакеты 150х250 мм",
		"Пакеты 200х300 мм",
		"Циклов автоклава (134°C)",
		"Минимум проб ПСО (1% СанПиН)",
		"Химических индикаторов 5 кл. (шт.)",
		"Раствор дезсредства (л)",
	];

	const escapeCsv = (val: unknown): string => {
		if (val === null || val === undefined) return '""';
		const str = String(val).replace(/"/g, '""');
		return `"${str}"`;
	};

	const rows = report.dailyLoads.map((d) => [
		escapeCsv(d.date),
		escapeCsv(d.dayOfWeekRu),
		escapeCsv(d.isWorkingDay ? "ДА" : "НЕТ"),
		escapeCsv(d.totalPatientsCount),
		escapeCsv(d.therapyPatientsCount),
		escapeCsv(d.surgeryPatientsCount),
		escapeCsv(d.orthopedicsPatientsCount),
		escapeCsv(d.totalBasicTraysCount),
		escapeCsv(d.totalBurSetsCount),
		escapeCsv(d.totalHandpiecesCount),
		escapeCsv(d.totalSurgicalTraysCount),
		escapeCsv(d.totalForcepsCount),
		escapeCsv(d.totalElevatorsCount),
		escapeCsv(d.totalSyringesCount),
		escapeCsv(d.totalOrthopedicTraysCount),
		escapeCsv(d.totalImpressionTraysCount),
		escapeCsv(d.totalInstrumentsCount),
		escapeCsv(d.totalKraftPackagesCount),
		escapeCsv(d.kraftPackagesBySize.size_75x150),
		escapeCsv(d.kraftPackagesBySize.size_100x200),
		escapeCsv(d.kraftPackagesBySize.size_150x250),
		escapeCsv(d.kraftPackagesBySize.size_200x300),
		escapeCsv(d.totalAutoclaveCyclesCount),
		escapeCsv(d.psoMinSampleRequired),
		escapeCsv(d.totalChemicalIndicatorsCount),
		escapeCsv(d.estimatedDetergentSolutionLiters),
	]);

	// Итоговая строка
	const s = report.summary;
	const summaryRow = [
		escapeCsv("ИТОГО ЗА ПЕРИОД"),
		escapeCsv(`Дней: ${report.totalDays} (активных: ${report.activeWorkingDaysCount})`),
		escapeCsv("—"),
		escapeCsv(s.totalAppointments),
		escapeCsv(s.totalTherapyPatients),
		escapeCsv(s.totalSurgeryPatients),
		escapeCsv(s.totalOrthopedicsPatients),
		escapeCsv(s.totalBasicTrays),
		escapeCsv(s.totalBurSets),
		escapeCsv(s.totalHandpieces),
		escapeCsv(s.totalSurgicalTrays),
		escapeCsv(s.totalForceps),
		escapeCsv(s.totalElevators),
		escapeCsv(s.totalSyringes),
		escapeCsv(s.totalOrthopedicTrays),
		escapeCsv(s.totalImpressionTrays),
		escapeCsv(s.totalInstruments),
		escapeCsv(s.totalKraftPackages),
		escapeCsv("—"),
		escapeCsv("—"),
		escapeCsv("—"),
		escapeCsv("—"),
		escapeCsv(s.totalAutoclaveCycles),
		escapeCsv(s.totalPsoSamplesRequired),
		escapeCsv(s.totalChemicalIndicators),
		escapeCsv("—"),
	];

	const csvBody = [headers.join(";"), ...rows.map((r) => r.join(";")), summaryRow.join(";")].join("\r\n");
	return `\uFEFF${csvBody}`;
}

export function useSanpinScheduleSyncLogic(props: UseSanpinScheduleSyncLogicProps = {}) {
	const initialPreset: DateRangePreset = "this_month";
	const initialRange = useMemo(() => {
		if (props.defaultStartDate && props.defaultEndDate) {
			return { startDate: props.defaultStartDate, endDate: props.defaultEndDate };
		}
		return getDateRangeFromPreset(initialPreset);
	}, [props.defaultStartDate, props.defaultEndDate]);

	const [dateRange, setDateRange] = useState(initialRange);
	const [activePreset, setActivePreset] = useState<DateRangePreset>(initialPreset);
	const [selectedChairId, setSelectedChairId] = useState<string>("all");
	const [selectedDate, setSelectedDate] = useState<string>(initialRange.startDate);
	const [autoclaveCapacity, setAutoclaveCapacity] = useState<number>(props.defaultAutoclaveCapacity ?? 14);

	// Источник визитов: переданные напрямую или из dashboard
	const rawAppointments = useMemo(() => {
		if (props.appointments && props.appointments.length > 0) {
			return props.appointments;
		}
		if (props.dashboard?.appointments && Array.isArray(props.dashboard.appointments)) {
			return props.dashboard.appointments;
		}
		return [];
	}, [props.appointments, props.dashboard?.appointments]);

	// Построение словаря врачей и названий кресел из dashboard / props
	const syncOptions = useMemo<SanpinSyncOptions>(() => {
		const doctorMap: Record<string, string> = {};
		const chairMap: Record<string, string> = {};

		const userList =
			props.users ||
			(props.dashboard as { users?: readonly { id?: string; specialty?: string }[] } | null | undefined)?.users;
		if (userList && Array.isArray(userList)) {
			for (const u of userList) {
				if (u.id && u.specialty) {
					doctorMap[u.id] = String(u.specialty);
				}
			}
		}

		const chairList =
			props.chairs ||
			(props.dashboard as { chairs?: readonly { id?: string; name?: string }[] } | null | undefined)?.chairs;
		if (chairList && Array.isArray(chairList)) {
			for (const ch of chairList) {
				if (ch.id && ch.name) {
					chairMap[ch.id] = ch.name;
				}
			}
		}

		return {
			autoclaveCapacityPacks: autoclaveCapacity,
			doctorSpecialtyMap: doctorMap,
			chairNameMap: chairMap,
		};
	}, [props.users, props.chairs, props.dashboard, autoclaveCapacity]);

	// Расчет сводного отчета нагрузки по дням
	const dailyLoadReport = useMemo(() => {
		return mapScheduleAppointmentsToSanpinDailyLoad(
			rawAppointments as readonly SanpinAppointmentSource[],
			dateRange,
			syncOptions,
		);
	}, [rawAppointments, dateRange, syncOptions]);

	// Выбранный день для детального просмотра
	const activeDayLoad = useMemo<SanpinDailyLoad | null>(() => {
		const found = dailyLoadReport.dailyLoads.find((d) => d.date === selectedDate);
		return found || dailyLoadReport.dailyLoads[0] || null;
	}, [dailyLoadReport, selectedDate]);

	// Переключение пресетов дат
	const handleSelectPreset = useCallback((preset: DateRangePreset) => {
		setActivePreset(preset);
		if (preset !== "custom") {
			const range = getDateRangeFromPreset(preset);
			setDateRange(range);
			setSelectedDate(range.startDate);
		}
	}, []);

	// Ретроспективная генерация записей для выбранного дня или всего диапазона
	const handleGenerateDayJournals = useCallback(
		(targetDay?: SanpinDailyLoad | null) => {
			const day = targetDay || activeDayLoad;
			if (!day || !day.isWorkingDay || day.totalPatientsCount === 0) {
				showToast("⚠️ На выбранную дату нет состоявшихся приёмов пациентов в расписании", "error");
				return;
			}

			const psoRecords = generateRetrospectivePsoRecordsFromDailyLoad(day);
			const autoRecords = generateRetrospectiveAutoclaveRecordsFromDailyLoad(day);
			const kraftPacks = generateRetrospectiveKraftPackagesFromDailyLoad(day);

			if (props.onSavePsoRecords) props.onSavePsoRecords(psoRecords);
			if (props.onSaveAutoclaveRecords) props.onSaveAutoclaveRecords(autoRecords);
			if (props.onSaveKraftPackages) props.onSaveKraftPackages(kraftPacks);

			showToast(
				`🟢 Сформированы записи за ${day.date}: ПСО (${psoRecords.length} партий, ${day.totalInstrumentsCount} изд.), Автоклав (${autoRecords.length} циклов, ${day.totalKraftPackagesCount} крафт-пакетов).`,
				"success",
			);
		},
		[activeDayLoad, props],
	);

	// Экспорт ведомости в CSV
	const handleExportCsv = useCallback(() => {
		const csv = exportSanpinDailyLoadReportToCsv(dailyLoadReport);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `SanPiN_Sterilization_Schedule_Load_${dailyLoadReport.dateRange.startDate}_${dailyLoadReport.dateRange.endDate}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		showToast("Ведомость стерилизационной нагрузки расписания выгружена в CSV (с UTF-8 BOM)", "success");
	}, [dailyLoadReport]);

	return {
		dateRange,
		setDateRange,
		activePreset,
		handleSelectPreset,
		selectedChairId,
		setSelectedChairId,
		selectedDate,
		setSelectedDate,
		autoclaveCapacity,
		setAutoclaveCapacity,
		dailyLoadReport,
		activeDayLoad,
		handleGenerateDayJournals,
		handleExportCsv,
	};
}
