import type { Appointment, Dashboard, TreatmentPlanItem } from "@dental/shared";
import { Calendar, CheckCircle2, Clock, FileSpreadsheet, FileText, Shield, Stethoscope } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { money } from "../../utils/financeUtils";
import { PatientJourneyTimeline } from "../PatientJourneyTimeline";
import { DmsGuaranteeLetterModal } from "../insurance/DmsGuaranteeLetterModal";
import { DmsRegistryExportModal } from "../insurance/DmsRegistryExportModal";
import { PatientAllergySafetyBanner } from "./PatientAllergySafetyBanner";

export interface PatientWorkspaceViewProps {
	patientId: string;
	patientName?: string | null;
	dashboard?: Dashboard | null;
	onOpenVisit?: (visitId: string) => void;
	onOpenPlan?: (planId: string) => void;
}

const TreatmentPlanCardItem: React.FC<{
	item: TreatmentPlanItem;
	onOpenPlan?: (planId: string) => void;
}> = React.memo(({ item, onOpenPlan }) => {
	const statusColorClass = useMemo(() => {
		switch (item.status) {
			case "completed":
				return "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200 border border-emerald-500/30";
			case "in_progress":
				return "bg-sky-50 text-sky-800 dark:bg-sky-950/70 dark:text-sky-200 border border-sky-500/30";
			case "cancelled":
				return "bg-rose-50 text-rose-800 dark:bg-rose-950/70 dark:text-rose-200 border border-rose-500/30";
			default:
				return "bg-amber-50 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-500/30";
		}
	}, [item.status]);

	const statusLabel = useMemo(() => {
		switch (item.status) {
			case "completed":
				return "Выполнено";
			case "in_progress":
				return "В работе";
			case "cancelled":
				return "Отменено";
			default:
				return "Запланировано";
		}
	}, [item.status]);

	return (
		<div className="p-4 rounded-xl flex flex-col gap-2 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border border-[var(--line,#e2e8f0)] dark:border-slate-700 transition-colors shadow-sm">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					<Stethoscope className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
					<span className="font-semibold text-xs text-[var(--ink,#1e293b)] dark:text-slate-100">
						{item.snapshotServiceName || "Услуга плана лечения"}
					</span>
				</div>
				<span
					className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${statusColorClass}`}
				>
					{statusLabel}
				</span>
			</div>
			{item.toothCode ? (
				<div className="text-[11px] text-[var(--muted,#64748b)] dark:text-slate-400">
					Зуб / область: <strong className="text-[var(--ink,#1e293b)] dark:text-slate-200">{item.toothCode}</strong>
				</div>
			) : null}
			<div className="flex items-center justify-between mt-1 pt-2 border-t border-[var(--line,#e2e8f0)] dark:border-slate-700/80 text-xs">
				<span className="text-[var(--ink,#1e293b)] dark:text-slate-200 font-bold font-mono">
					{item.unitPriceRub !== undefined && item.unitPriceRub !== null ? money(item.unitPriceRub) : "—"}
				</span>
				{onOpenPlan ? (
					<button
						type="button"
						onClick={() => onOpenPlan(item.id)}
						className="min-h-[44px] px-2 text-teal-700 dark:text-teal-300 hover:underline font-bold bg-transparent border-0 cursor-pointer text-xs inline-flex items-center"
					>
						Открыть план &rarr;
					</button>
				) : null}
			</div>
		</div>
	);
});
TreatmentPlanCardItem.displayName = "TreatmentPlanCardItem";

const VisitHistoryCardItem: React.FC<{
	appointment: Appointment;
	doctorFullName?: string | null;
	onOpenVisit?: (visitId: string) => void;
}> = React.memo(({ appointment, doctorFullName, onOpenVisit }) => {
	const formattedDate = useMemo(() => {
		if (!appointment.startsAt) return "Дата не указана";
		const d = new Date(appointment.startsAt);
		if (Number.isNaN(d.getTime())) return "Дата не указана";
		return d.toLocaleString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	}, [appointment.startsAt]);

	const statusLabel = useMemo(() => {
		switch (appointment.status) {
			case "completed":
				return "Завершён";
			case "in_treatment":
				return "Идёт приём";
			case "cancelled":
				return "Отменён";
			case "no_show":
				return "Не явился";
			case "confirmed":
				return "Подтверждён";
			default:
				return "Запланирован";
		}
	}, [appointment.status]);

	return (
		<div className="p-4 rounded-xl flex flex-col gap-2 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border border-[var(--line,#e2e8f0)] dark:border-slate-700 transition-colors shadow-sm">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink,#1e293b)] dark:text-slate-100">
					<Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
					<span>{formattedDate}</span>
				</div>
				<span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold border border-slate-300 dark:border-slate-600">
					{statusLabel}
				</span>
			</div>
			<div className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400">
				Врач: <strong className="text-[var(--ink,#1e293b)] dark:text-slate-200">{doctorFullName || "Врач не назначен"}</strong>
			</div>
			{appointment.reason ? (
				<div className="text-xs text-[var(--ink,#1e293b)] dark:text-slate-300 line-clamp-2">
					{appointment.reason}
				</div>
			) : null}
			{onOpenVisit ? (
				<div className="mt-1 flex justify-end">
					<button
						type="button"
						onClick={() => onOpenVisit(appointment.id)}
						className="min-h-[44px] px-2 text-teal-700 dark:text-teal-300 hover:underline font-bold bg-transparent border-0 cursor-pointer text-xs inline-flex items-center"
					>
						К визиту &rarr;
					</button>
				</div>
			) : null}
		</div>
	);
});
VisitHistoryCardItem.displayName = "VisitHistoryCardItem";

export const PatientWorkspaceView: React.FC<PatientWorkspaceViewProps> =
	React.memo(
		({
			patientId,
			patientName,
			dashboard: propDashboard,
			onOpenVisit,
			onOpenPlan,
		}) => {
			const appLogic = useAppLogicContext();
			const dashboard = propDashboard ?? appLogic?.dashboard;
			const [activeTab, setActiveTab] = useState<"timeline" | "plans" | "visits">(
				"timeline",
			);

			useEffect(() => {
				let isMounted = true;
				const handleCustomRefresh = () => {
					if (isMounted) {
						// State refresh notification if needed
					}
				};

				window.addEventListener(
					"dente-patient-workspace-refresh",
					handleCustomRefresh,
				);
				return () => {
					isMounted = false;
					window.removeEventListener(
						"dente-patient-workspace-refresh",
						handleCustomRefresh,
					);
				};
			}, []);

			const staffMap = useMemo(() => {
				const map = new Map<string, string>();
				for (const s of dashboard?.clinicSettings?.staff ?? []) {
					if (s.id && s.fullName) {
						map.set(s.id, s.fullName);
					}
				}
				return map;
			}, [dashboard?.clinicSettings?.staff]);

			const patientAppointments = useMemo(() => {
				const list = (dashboard?.appointments ?? []).filter(
					(a) => a.patientId === patientId,
				);
				return list.sort(
					(a, b) =>
						new Date(b.startsAt ?? 0).getTime() -
						new Date(a.startsAt ?? 0).getTime(),
				);
			}, [dashboard?.appointments, patientId]);

			const patientPlanItems = useMemo(() => {
				return (dashboard?.treatmentPlanItems ?? []).filter(
					(item) => item.patientId === patientId,
				);
			}, [dashboard?.treatmentPlanItems, patientId]);

			const handleOpenVisitCallback = useCallback(
				(visitId: string) => {
					if (onOpenVisit) {
						onOpenVisit(visitId);
					} else {
						window.location.hash = `/patients/${patientId}/visit/${visitId}`;
					}
				},
				[onOpenVisit, patientId],
			);

			const handleOpenPlanCallback = useCallback(
				(planId: string) => {
					if (onOpenPlan) {
						onOpenPlan(planId);
					} else {
						window.location.hash = "#documents";
					}
				},
				[onOpenPlan],
			);

			const [isDmsLetterOpen, setIsDmsLetterOpen] = useState(false);
			const [isDmsRegistryOpen, setIsDmsRegistryOpen] = useState(false);

			return (
				<div
					data-testid="patient-workspace-view"
					className="patient-workspace-view flex flex-col gap-4 rounded-2xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 p-4 md:p-6 text-[var(--ink,#1e293b)] dark:text-slate-100 border border-[var(--line,#e2e8f0)] dark:border-slate-800 shadow-sm"
				>
					{/* Clinical Safety & Allergy Red-Flag Emergency Banner */}
					<PatientAllergySafetyBanner
						patientId={patientId}
						patientName={patientName}
						showModalButton={true}
					/>

					<div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line,#e2e8f0)] pb-4 dark:border-slate-800">
						<div className="flex items-center gap-2">
							<span className="text-base md:text-lg font-black text-[var(--ink,#1e293b)] dark:text-white">
								{patientName || "Карточка пациента"}
							</span>
							<span className="text-xs font-mono text-[var(--muted,#64748b)] bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 px-2 py-0.5 rounded border border-[var(--line,#e2e8f0)] dark:border-slate-700">
								{patientId ? patientId.slice(0, 8) : "—"}
							</span>
						</div>

						<div className="flex items-center gap-1.5 flex-wrap">
							<button
								type="button"
								className="min-h-[44px] px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer border border-sky-500/30 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50"
								onClick={() => setIsDmsLetterOpen(true)}
								title="Гарантийное письмо ДМС"
							>
								<Shield className="w-3.5 h-3.5 inline mr-1.5" />
								Полис / ГП ДМС
							</button>
							<button
								type="button"
								className="min-h-[44px] px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer border border-teal-500/30 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50"
								onClick={() => setIsDmsRegistryOpen(true)}
								title="Экспорт реестра услуг ДМС"
							>
								<FileSpreadsheet className="w-3.5 h-3.5 inline mr-1.5" />
								Реестр ДМС
							</button>
							<button
								type="button"
								className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
									activeTab === "timeline"
										? "bg-teal-600 text-white border-teal-600 shadow-sm"
										: "bg-transparent text-[var(--muted,#64748b)] dark:text-slate-300 border-transparent hover:bg-[var(--paper-soft,#f8fafc)] dark:hover:bg-slate-800"
								}`}
								onClick={() => setActiveTab("timeline")}
							>
								<Clock className="w-3.5 h-3.5 inline mr-1.5" />
								Лента
							</button>
							<button
								type="button"
								className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
									activeTab === "plans"
										? "bg-teal-600 text-white border-teal-600 shadow-sm"
										: "bg-transparent text-[var(--muted,#64748b)] dark:text-slate-300 border-transparent hover:bg-[var(--paper-soft,#f8fafc)] dark:hover:bg-slate-800"
								}`}
								onClick={() => setActiveTab("plans")}
							>
								<FileText className="w-3.5 h-3.5 inline mr-1.5" />
								Планы лечения ({patientPlanItems.length})
							</button>
							<button
								type="button"
								className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
									activeTab === "visits"
										? "bg-teal-600 text-white border-teal-600 shadow-sm"
										: "bg-transparent text-[var(--muted,#64748b)] dark:text-slate-300 border-transparent hover:bg-[var(--paper-soft,#f8fafc)] dark:hover:bg-slate-800"
								}`}
								onClick={() => setActiveTab("visits")}
							>
								<Calendar className="w-3.5 h-3.5 inline mr-1.5" />
								Визиты ({patientAppointments.length})
							</button>
						</div>
					</div>

					{activeTab === "timeline" && (
						<PatientJourneyTimeline
							patientId={patientId}
							dashboard={dashboard}
						/>
					)}

					{activeTab === "plans" && (
						<div className="flex flex-col gap-3">
							<div className="flex items-center justify-between">
								<h4 className="text-sm font-bold text-[var(--ink,#1e293b)] dark:text-white m-0">
									Позиции плана лечения ({patientPlanItems.length})
								</h4>
							</div>
							{patientPlanItems.length === 0 ? (
								<div className="p-8 text-center text-xs text-[var(--muted,#64748b)] dark:text-slate-400 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/60 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800">
									Планы лечения для пациента пока не составлены.
								</div>
							) : (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									{patientPlanItems.map((item) => (
										<TreatmentPlanCardItem
											key={item.id}
											item={item}
											onOpenPlan={handleOpenPlanCallback}
										/>
									))}
								</div>
							)}
						</div>
					)}

					{activeTab === "visits" && (
						<div className="flex flex-col gap-3">
							<div className="flex items-center justify-between">
								<h4 className="text-sm font-bold text-[var(--ink,#1e293b)] dark:text-white m-0">
									История визитов и записей ({patientAppointments.length})
								</h4>
							</div>
							{patientAppointments.length === 0 ? (
								<div className="p-8 text-center text-xs text-[var(--muted,#64748b)] dark:text-slate-400 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/60 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800">
									История приёмов пациента пуста.
								</div>
							) : (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									{patientAppointments.map((appt) => (
										<VisitHistoryCardItem
											key={appt.id}
											appointment={appt}
											doctorFullName={
												appt.doctorUserId
													? staffMap.get(appt.doctorUserId) ?? null
													: null
											}
											onOpenVisit={handleOpenVisitCallback}
										/>
									))}
								</div>
							)}
						</div>
					)}

					{/* DMS Guarantee Letter Modal */}
					<DmsGuaranteeLetterModal
						isOpen={isDmsLetterOpen}
						onClose={() => setIsDmsLetterOpen(false)}
						patient={{
							id: patientId,
							fullName: patientName || "",
						}}
					/>

					{/* DMS Registry Export Modal */}
					<DmsRegistryExportModal
						isOpen={isDmsRegistryOpen}
						onClose={() => setIsDmsRegistryOpen(false)}
					/>
				</div>
			);
		},
	);

PatientWorkspaceView.displayName = "PatientWorkspaceView";
