/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Statutory Form T-13 Timesheet Engine (Госкомстат РФ № 1)
 *
 * Implements:
 * 1. Unified Form No. T-13 ("Табель учета рабочего времени", Постановление Госкомстата РФ от 05.01.2004 № 1).
 * 2. Statutory Russian attendance/absence codes (Я, Н, РВ, С, В, ОТ, Б, ДО, ПР, etc.).
 * 3. Daily shift accounting (1..31 days) with dual code/hours cells (e.g. Я / 6.0, С / 2.0).
 * 4. Half-month and full-month aggregations (days, regular hours, overtime, night hours, weekend hours, absences).
 * 5. Form T-13 CSV / TSV export with UTF-8 BOM for 1C:ZUP and Excel interoperability.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const TIMESHEET_STATUTORY_CODES = {
    Я: {
        letterCode: "Я",
        digitalCode: "01",
        descriptionRu: "Продолжительность работы в дневное время",
        isWorkTime: true,
        isPaidAbsence: false,
    },
    Н: {
        letterCode: "Н",
        digitalCode: "02",
        descriptionRu: "Работа в ночное время (22:00–06:00)",
        isWorkTime: true,
        isPaidAbsence: false,
    },
    РВ: {
        letterCode: "РВ",
        digitalCode: "03",
        descriptionRu: "Работа в выходные и нерабочие праздничные дни",
        isWorkTime: true,
        isPaidAbsence: false,
    },
    С: {
        letterCode: "С",
        digitalCode: "04",
        descriptionRu: "Сверхурочная работа",
        isWorkTime: true,
        isPaidAbsence: false,
    },
    В: {
        letterCode: "В",
        digitalCode: "26",
        descriptionRu: "Выходные дни и нерабочие праздничные дни",
        isWorkTime: false,
        isPaidAbsence: false,
    },
    ОТ: {
        letterCode: "ОТ",
        digitalCode: "09",
        descriptionRu: "Ежегодный основной оплачиваемый отпуск",
        isWorkTime: false,
        isPaidAbsence: true,
    },
    ОД: {
        letterCode: "ОД",
        digitalCode: "10",
        descriptionRu: "Ежегодный дополнительный оплачиваемый отпуск",
        isWorkTime: false,
        isPaidAbsence: true,
    },
    У: {
        letterCode: "У",
        digitalCode: "11",
        descriptionRu: "Учебный отпуск с сохранением заработной платы",
        isWorkTime: false,
        isPaidAbsence: true,
    },
    Б: {
        letterCode: "Б",
        digitalCode: "19",
        descriptionRu: "Временная нетрудоспособность (больничный лист)",
        isWorkTime: false,
        isPaidAbsence: true,
    },
    Т: {
        letterCode: "Т",
        digitalCode: "20",
        descriptionRu: "Временная нетрудоспособность без назначения пособия",
        isWorkTime: false,
        isPaidAbsence: false,
    },
    ДО: {
        letterCode: "ДО",
        digitalCode: "16",
        descriptionRu: "Отпуск без сохранения заработной платы",
        isWorkTime: false,
        isPaidAbsence: false,
    },
    ПР: {
        letterCode: "ПР",
        digitalCode: "24",
        descriptionRu: "Прогул (отсутствие на работе без уважительных причин)",
        isWorkTime: false,
        isPaidAbsence: false,
    },
    К: {
        letterCode: "К",
        digitalCode: "06",
        descriptionRu: "Служебная командировка",
        isWorkTime: true,
        isPaidAbsence: true,
    },
    ПК: {
        letterCode: "ПК",
        digitalCode: "07",
        descriptionRu: "Повышение квалификации с отрывом от работы",
        isWorkTime: false,
        isPaidAbsence: true,
    },
};
/**
 * Calculates number of days in a given year and month (1-indexed).
 */
export function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}
/**
 * Aggregates a range of days into period summary totals.
 */
export function aggregateTimesheetDays(days, startDay, endDay) {
    let daysWorked = 0;
    let regularHoursWorked = 0;
    let nightHoursWorked = 0;
    let overtimeHoursWorked = 0;
    let weekendHoursWorked = 0;
    let vacationDays = 0;
    let sickLeaveDays = 0;
    let unpaidLeaveDays = 0;
    let weekendDays = 0;
    let absenceDaysTotal = 0;
    for (let d = startDay; d <= endDay; d++) {
        const rec = days.find((item) => item.dayNumber === d);
        if (!rec)
            continue;
        const codeMeta = TIMESHEET_STATUTORY_CODES[rec.primaryCode] ?? TIMESHEET_STATUTORY_CODES.В;
        if (codeMeta.isWorkTime) {
            daysWorked += 1;
            if (rec.primaryCode === "Я") {
                regularHoursWorked += rec.primaryHours;
            }
            else if (rec.primaryCode === "Н") {
                nightHoursWorked += rec.primaryHours;
            }
            else if (rec.primaryCode === "РВ") {
                weekendHoursWorked += rec.primaryHours;
            }
            else if (rec.primaryCode === "С") {
                overtimeHoursWorked += rec.primaryHours;
            }
            else {
                regularHoursWorked += rec.primaryHours;
            }
        }
        else {
            absenceDaysTotal += 1;
            if (rec.primaryCode === "В") {
                weekendDays += 1;
            }
            else if (rec.primaryCode === "ОТ" || rec.primaryCode === "ОД") {
                vacationDays += 1;
            }
            else if (rec.primaryCode === "Б" || rec.primaryCode === "Т") {
                sickLeaveDays += 1;
            }
            else if (rec.primaryCode === "ДО") {
                unpaidLeaveDays += 1;
            }
        }
        // Process secondary hours if present (e.g. Overtime or Night shift on top of normal shift)
        if (rec.secondaryCode && rec.secondaryHours && rec.secondaryHours > 0) {
            if (rec.secondaryCode === "С") {
                overtimeHoursWorked += rec.secondaryHours;
            }
            else if (rec.secondaryCode === "Н") {
                nightHoursWorked += rec.secondaryHours;
            }
            else if (rec.secondaryCode === "РВ") {
                weekendHoursWorked += rec.secondaryHours;
            }
            else {
                regularHoursWorked += rec.secondaryHours;
            }
        }
    }
    const totalHoursWorked = regularHoursWorked + nightHoursWorked + overtimeHoursWorked + weekendHoursWorked;
    return {
        daysWorked,
        regularHoursWorked: Number(regularHoursWorked.toFixed(1)),
        nightHoursWorked: Number(nightHoursWorked.toFixed(1)),
        overtimeHoursWorked: Number(overtimeHoursWorked.toFixed(1)),
        weekendHoursWorked: Number(weekendHoursWorked.toFixed(1)),
        totalHoursWorked: Number(totalHoursWorked.toFixed(1)),
        vacationDays,
        sickLeaveDays,
        unpaidLeaveDays,
        weekendDays,
        absenceDaysTotal,
    };
}
/**
 * Computes full Form T-13 timesheet for an employee.
 */
export function calculateEmployeeTimesheetT13(input) {
    const totalDays = getDaysInMonth(input.year, input.month);
    // Ensure all days 1..totalDays exist in array
    const fullDays = [];
    for (let d = 1; d <= totalDays; d++) {
        const existing = input.days.find((item) => item.dayNumber === d);
        if (existing) {
            fullDays.push(existing);
        }
        else {
            // Default to Weekend (В) if not specified
            fullDays.push({
                dayNumber: d,
                primaryCode: "В",
                primaryHours: 0,
            });
        }
    }
    const firstHalfSummary = aggregateTimesheetDays(fullDays, 1, Math.min(15, totalDays));
    const secondHalfSummary = aggregateTimesheetDays(fullDays, 16, totalDays);
    const monthTotalSummary = aggregateTimesheetDays(fullDays, 1, totalDays);
    return {
        employeeId: input.employeeId,
        employeeTabNumber: input.employeeTabNumber,
        employeeFullName: input.employeeFullName,
        positionRu: input.positionRu,
        departmentRu: input.departmentRu,
        year: input.year,
        month: input.month,
        daysInMonth: totalDays,
        dailyRecords: fullDays,
        firstHalfSummary,
        secondHalfSummary,
        monthTotalSummary,
    };
}
/**
 * Generates official Russian Form T-13 CSV file string with UTF-8 BOM.
 */
export function generateTimesheetT13Csv(results, clinicName = "ООО «Денте Стоматология»", year = new Date().getFullYear(), month = new Date().getMonth() + 1) {
    const daysInMonth = getDaysInMonth(year, month);
    const monthNameRu = new Date(year, month - 1, 1).toLocaleDateString("ru-RU", {
        month: "long",
        year: "numeric",
    });
    let csv = `\uFEFFУнифицированная форма № Т-13;Утверждена Постановлением Госкомстата России от 05.01.2004 № 1\n`;
    csv += `Организация:;"${clinicName}";Период:;"${monthNameRu}"\n\n`;
    // Header row 1 (Day columns 1..15, I половина, 16..31, II половина, Итого)
    let header = `№ п/п;Табельный номер;ФИО работника;Должность;`;
    for (let d = 1; d <= 15; d++) {
        header += `${d};`;
    }
    header += `I пол. (дней);I пол. (часов);`;
    for (let d = 16; d <= daysInMonth; d++) {
        header += `${d};`;
    }
    header += `II пол. (дней);II пол. (часов);Всего дней;Всего часов;Сверхурочные;Ночные;Выходные/праздн.;Больничный (дней);Отпуск (дней)\n`;
    csv += header;
    results.forEach((emp, index) => {
        const rowNum = index + 1;
        let codeRow = `${rowNum};${emp.employeeTabNumber};"${emp.employeeFullName}";"${emp.positionRu}";`;
        // Days 1..15
        for (let d = 1; d <= 15; d++) {
            const day = emp.dailyRecords.find((r) => r.dayNumber === d);
            const code = day?.primaryCode ?? "В";
            const hrs = day?.primaryHours && day.primaryHours > 0 ? ` (${day.primaryHours}ч)` : "";
            codeRow += `"${code}${hrs}";`;
        }
        codeRow += `${emp.firstHalfSummary.daysWorked};${emp.firstHalfSummary.totalHoursWorked};`;
        // Days 16..daysInMonth
        for (let d = 16; d <= daysInMonth; d++) {
            const day = emp.dailyRecords.find((r) => r.dayNumber === d);
            const code = day?.primaryCode ?? "В";
            const hrs = day?.primaryHours && day.primaryHours > 0 ? ` (${day.primaryHours}ч)` : "";
            codeRow += `"${code}${hrs}";`;
        }
        const tot = emp.monthTotalSummary;
        codeRow += `${emp.secondHalfSummary.daysWorked};${emp.secondHalfSummary.totalHoursWorked};`;
        codeRow += `${tot.daysWorked};${tot.totalHoursWorked};${tot.overtimeHoursWorked};${tot.nightHoursWorked};${tot.weekendHoursWorked};${tot.sickLeaveDays};${tot.vacationDays}\n`;
        csv += codeRow;
    });
    return csv;
}
