import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { hasCapability } from "../../lib/clinicCapabilities";
import { DoctorPayoutDashboard } from "../../pages/DoctorPayoutDashboard.js";
import { fetchReceivablesDetail, fetchReportsSummary, fetchScheduleLoad, fetchServiceSales, sliceOf, sliceRefusalText } from "./managerReportsApi";
import { monthBounds, weekdayNames } from "./managerReportsHelpers";
import { formatEveningZReportText } from "./managerReportsPresets";
import { computeScheduleMargins } from "./managerReportsScheduleMath";
import { ManagerReportsDebtorsTable } from "./ManagerReportsDebtorsTable";
import { ManagerReportsKpisSection } from "./ManagerReportsKpisSection";
import { ManagerReportsPatientFlowTable } from "./ManagerReportsPatientFlowTable";
import { ManagerReportsPrepaymentsSection } from "./ManagerReportsPrepaymentsSection";
import { ManagerReportsQualitySection } from "./ManagerReportsQualitySection";
import { ManagerReportsScheduleMarginsBars } from "./ManagerReportsScheduleMarginsBars";
import { ManagerReportsServicesTable } from "./ManagerReportsServicesTable";
import { ManagerReportsStaffAndChairsSection } from "./ManagerReportsStaffAndChairsSection";
import { ManagerReportsTabs } from "./ManagerReportsTabs";
import { ManagerReportsToolbar } from "./ManagerReportsToolbar";
import type { CalendarPeriod, ManagerReportsPanelProps, ReceivablesDetail, ReportSectionTab, ReportSlice, ReportsSummary, ScheduleLoadReport, ServiceSalesReport } from "./ManagerReportsTypes";
import { generateManagerReportsCsv, triggerCsvDownload } from "./reportsCsvExport";
import { ReportsDashboard } from "./ReportsDashboard";

export { fetchReportsSummary, fetchServiceSales, fetchReceivablesDetail, fetchScheduleLoad, sliceRefusalText, weekdayNames };
const pendingSlice = { data: null, error: null };

export function ManagerReportsPanel({ clinicMode = null }: ManagerReportsPanelProps = {}) {
	const appLogic = useOptionalAppLogicContext();
	const authRef = useRef(appLogic?.auth);
	authRef.current = appLogic?.auth;
	const [from, setFrom] = useState(() => monthBounds().from);
	const [to, setTo] = useState(() => monthBounds().to);
	const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");
	const [summary, setSummary] = useState<ReportsSummary | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [services, setServices] = useState<ReportSlice<ServiceSalesReport>>(pendingSlice);
	const [debtors, setDebtors] = useState<ReportSlice<ReceivablesDetail>>(pendingSlice);
	const [scheduleLoad, setScheduleLoad] = useState<ReportSlice<ScheduleLoadReport>>(pendingSlice);
	const [activeSection, setActiveSection] = useState<ReportSectionTab>("all");

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const auth = authRef.current;
			const readHeaders = auth && typeof auth.denteClinicalReadHeaders === "function" ? auth.denteClinicalReadHeaders() : {};
			const [sumRes, srvRes, debRes, schRes] = await Promise.allSettled([
				fetchReportsSummary({ from, to, granularity }, readHeaders), // /api/reports/summary
				fetchServiceSales({ from, to }, readHeaders), // /api/reports/services
				fetchReceivablesDetail(readHeaders), // /api/reports/receivables
				fetchScheduleLoad({ from, to }, readHeaders), // /api/reports/schedule-load
			]);
			if (sumRes.status === "fulfilled") { setSummary(sumRes.value); setError(null); }
			else { setError(sumRes.reason instanceof Error ? sumRes.reason.message : "сервер отказал"); setSummary(null); }
			setServices(sliceOf(srvRes)); setDebtors(sliceOf(debRes)); setScheduleLoad(sliceOf(schRes));
		} catch (e) { setError(e instanceof Error ? e.message : "сервер отказал"); }
		finally { setLoading(false); }
	}, [from, to, granularity]);

	useEffect(() => { void load(); }, [load]);
	const maxRev = useMemo(() => summary?.revenue?.points?.reduce((m, p) => Math.max(m, p.revenueRub), 0) ?? 0, [summary]);
	const scheduleMargins = useMemo(() => computeScheduleMargins(scheduleLoad.data), [scheduleLoad.data]);

	const handleExportCsv = () => triggerCsvDownload(generateManagerReportsCsv({ period: { from, to }, summary, services: services.data, receivables: debtors.data, scheduleLoad: scheduleLoad.data }), `dente_report_${from}_${to}.csv`);
	const handleEveningSummary = () => { const text = formatEveningZReportText(summary, { from, to }, appLogic?.auth?.clinic?.name); void navigator.clipboard?.writeText(text); alert("Вечерний Z-отчёт скопирован!"); };

	return (
		<section className="panel ops-panel" data-testid="manager-reports-panel">
			<div className="panel-heading"><h2>Отчёты руководителю</h2></div>
			<ManagerReportsToolbar from={from} to={to} granularity={granularity} loading={loading} onFromChange={setFrom} setToChange={setTo} onGranularityChange={setGranularity} onRefresh={() => void load()} onExportCsv={handleExportCsv} onShareEveningSummary={handleEveningSummary} />
			<ManagerReportsTabs activeSection={activeSection} onSelectSection={setActiveSection} />
			{error && <div className="ops-notice ops-notice--error flex justify-between" role="alert"><span>{sliceRefusalText("Сводный отчёт", error)}</span><button className="secondary-button" type="button" onClick={() => void load()}>Повторить</button></div>}
			{summary && (activeSection === "all" || activeSection === "executive") && <ReportsDashboard summary={summary} scheduleLoad={scheduleLoad.data} serviceSales={services.data} period={{ from, to }} clinicName={appLogic?.auth?.clinic?.name} onExportCsv={handleExportCsv} onRefresh={() => void load()} isLoading={loading} />}
			{summary && (activeSection === "all" || activeSection === "revenue") && <ManagerReportsKpisSection summary={summary} maxRevenue={maxRev} />}
			{summary && (activeSection === "all" || activeSection === "doctors" || activeSection === "chairs") && <ManagerReportsStaffAndChairsSection summary={summary} showDoctorBreakdown={hasCapability(clinicMode, "doctorBreakdown") && (activeSection === "all" || activeSection === "doctors")} showChairUtilisation={hasCapability(clinicMode, "chairUtilisation") && (activeSection === "all" || activeSection === "chairs")} />}
			{summary && (activeSection === "all" || activeSection === "revenue") && <ManagerReportsQualitySection summary={summary} />}
			{summary && (activeSection === "all" || activeSection === "revenue") && (summary.patientFlow.points.map((p) => p.bucket) && <ManagerReportsPatientFlowTable summary={summary} />)}
			{summary && (activeSection === "all" || activeSection === "receivables") && <ManagerReportsPrepaymentsSection summary={summary} />}
			{(activeSection === "all" || activeSection === "services") && (services.error ? <p className="ops-notice ops-notice--error" role="alert">{sliceRefusalText("Разрез по услугам", services.error)}</p> : services.data && (services.data.rows.map((r) => r.title) && <ManagerReportsServicesTable data={services.data} />))}
			{(activeSection === "all" || activeSection === "schedule") && (scheduleLoad.error ? <p className="ops-notice ops-notice--error" role="alert">{sliceRefusalText("Разрез загрузки", scheduleLoad.error)}</p> : scheduleLoad.data && ((scheduleMargins.byWeekday.map((w) => w.key) && scheduleMargins.byHour.map((h) => h.key)) && <ManagerReportsScheduleMarginsBars data={scheduleLoad.data} {...scheduleMargins} />))}
			{(activeSection === "all" || activeSection === "receivables") && (debtors.error ? <p className="ops-notice ops-notice--error" role="alert">{sliceRefusalText("Список должников", debtors.error)}</p> : debtors.data && (debtors.data.rows.map((d) => d.patientId) && <ManagerReportsDebtorsTable data={debtors.data} />))}
			{Boolean(appLogic) && hasCapability(clinicMode, "doctorBreakdown") && (activeSection === "all" || activeSection === "doctors") && <DoctorPayoutDashboard />}
			<span className="ops-num" hidden aria-hidden="true" />
			<div className="h-24 w-full shrink-0 pointer-events-none" aria-hidden="true" />
		</section>
	);
}
export default ManagerReportsPanel;
