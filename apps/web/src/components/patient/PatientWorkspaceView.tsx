import type { Appointment, Dashboard, TreatmentPlanItem } from "@dental/shared";
import { Calendar, CheckCircle2, Clock, FileText, Stethoscope } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { money } from "../../utils/financeUtils";
import { PatientJourneyTimeline } from "../PatientJourneyTimeline";

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
				return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
			case "in_progress":
				return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800";
			case "cancelled":
				return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
			default:
				return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
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
		<div className="p-3 rounded-lg border flex flex-col gap-1.5 bg-[var(--paper-soft,#f8fafc)] border-[var(--line,#e2e8f0)] dark:bg-slate-800/60 dark:border-slate-700">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<Stethoscope className="w-4 h-4 text-[var(--teal,#0d9488)]" />
					<span className="font-semibold text-xs text-[var(--ink,#1e293b)] dark:text-slate-100">
						{item.snapshotServiceName || "Услуга плана лечения"}
					</span>
				</div>
				<span
					className={`text-[10px] px-2 py-0.5 rounded border font-medium ${statusColorClass}`}
				>
					{statusLabel}
				</span>
			</div>
			{item.toothCode ? (
				<div className="text-[11px] text-[var(--muted,#64748b)]">
					Зуб / область: <strong>{item.toothCode}</strong>
				</div>
			) : null}
			<div className="flex items-center justify-between mt-1 pt-1 border-t border-[var(--line,#e2e8f0)] dark:border-slate-700/60 text-[11px]">
				<span className="text-[var(--muted,#64748b)] font-mono">
					{item.unitPriceRub !== undefined && item.unitPriceRub !== null ? money(item.unitPriceRub) : "—"}
				</span>
				{onOpenPlan ? (
					<button
						type="button"
						onClick={() => onOpenPlan(item.id)}
						className="text-[var(--teal,#0d9488)] hover:underline font-semibold bg-transparent border-0 cursor-pointer p-0 text-[11px]"
					>
						Открыть план
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
		<div className="p-3 rounded-lg border flex flex-col gap-1 bg-[var(--paper-soft,#f8fafc)] border-[var(--line,#e2e8f0)] dark:bg-slate-800/60 dark:border-slate-700">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink,#1e293b)] dark:text-slate-100">
					<Calendar className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
					<span>{formattedDate}</span>
				</div>
				<span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
					{statusLabel}
				</span>
			</div>
			<div className="text-[11px] text-[var(--muted,#64748b)]">
				Врач: {doctorFullName || "Врач не назначен"}
			</div>
			{appointment.reason ? (
				<div className="text-[11px] text-[var(--ink,#1e293b)] dark:text-slate-200 line-clamp-2">
					{appointment.reason}
				</div>
			) : null}
			{onOpenVisit ? (
				<div className="mt-1 flex justify-end">
					<button
						type="button"
						onClick={() => onOpenVisit(appointment.id)}
						className="text-[var(--teal,#0d9488)] hover:underline font-semibold bg-transparent border-0 cursor-pointer p-0 text-[11px]"
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

			// Clean listeners on mount / unmount if any
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

			return (
				<div
					data-testid="patient-workspace-view"
					className="patient-workspace-view flex flex-col gap-4 rounded-xl border bg-[var(--paper,#ffffff)] border-[var(--line,#e2e8f0)] p-4 text-[var(--ink,#1e293b)] dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
				>
					<div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line,#e2e8f0)] pb-3 dark:border-slate-800">
						<div className="flex items-center gap-2">
							<span className="text-base font-bold text-[var(--ink,#1e293b)] dark:text-white">
								{patientName || "Карточка пациента"}
							</span>
							<span className="text-xs font-mono text-[var(--muted,#64748b)] bg-[var(--paper-soft,#f8fafc)] px-2 py-0.5 rounded border border-[var(--line,#e2e8f0)] dark:bg-slate-800 dark:border-slate-700">
								{patientId.slice(0, 8)}
							</span>
						</div>

						<div className="flex items-center gap-1.5">
							<button
								type="button"
								className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
									activeTab === "timeline"
										? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]"
										: "bg-transparent text-[var(--muted,#64748b)] border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
								}`}
								onClick={() => setActiveTab("timeline")}
							>
								<Clock className="w-3.5 h-3.5 inline mr-1" />
								Лента
							</button>
							<button
								type="button"
								className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
									activeTab === "plans"
										? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]"
										: "bg-transparent text-[var(--muted,#64748b)] border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
								}`}
								onClick={() => setActiveTab("plans")}
							>
								<FileText className="w-3.5 h-3.5 inline mr-1" />
								Планы лечения ({patientPlanItems.length})
							</button>
							<button
								type="button"
								className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
									activeTab === "visits"
										? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]"
										: "bg-transparent text-[var(--muted,#64748b)] border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
								}`}
								onClick={() => setActiveTab("visits")}
							>
								<Calendar className="w-3.5 h-3.5 inline mr-1" />
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
								<h4 className="text-sm font-semibold m-0">
									Позиции плана лечения ({patientPlanItems.length})
								</h4>
							</div>
							{patientPlanItems.length === 0 ? (
								<div className="p-6 text-center text-xs text-[var(--muted,#64748b)] border border-dashed rounded-lg border-[var(--line,#e2e8f0)] dark:border-slate-800">
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
								<h4 className="text-sm font-semibold m-0">
									История визитов и записей ({patientAppointments.length})
								</h4>
							</div>
							{patientAppointments.length === 0 ? (
								<div className="p-6 text-center text-xs text-[var(--muted,#64748b)] border border-dashed rounded-lg border-[var(--line,#e2e8f0)] dark:border-slate-800">
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
				</div>
			);
		},
	);

PatientWorkspaceView.displayName = "PatientWorkspaceView";
