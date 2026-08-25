import type { Appointment, Dashboard, TreatmentPlanItem } from "@dental/shared";
import { Calendar, CheckCircle2, Clock, FileSpreadsheet, FileText, Gift, Shield, Stethoscope } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { money } from "../../utils/financeUtils";
import { PatientJourneyTimeline } from "../PatientJourneyTimeline";
import { DmsGuaranteeLetterModal } from "../insurance/DmsGuaranteeLetterModal";
import { DmsInsuranceManagerModal } from "../insurance/dmsManager/DmsInsuranceManagerModal";
import { DmsRegistryExportModal } from "../insurance/DmsRegistryExportModal";
import { LoyaltyProgramModal } from "../loyalty/program/LoyaltyProgramModal";

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
				return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30";
			case "in_progress":
				return "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/30";
			case "cancelled":
				return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30";
			default:
				return "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30";
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
		<div className="p-4 rounded-xl flex flex-col gap-2 bg-[var(--paper-soft)] border border-[var(--line)] transition-colors shadow-sm">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					<Stethoscope className="w-4 h-4 text-[var(--teal)] shrink-0" />
					<span className="font-bold text-sm text-[var(--ink)]">
						{item.snapshotServiceName || "Услуга плана лечения"}
					</span>
				</div>
				<span
					className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${statusColorClass}`}
				>
					{statusLabel}
				</span>
			</div>
			{item.toothCode ? (
				<div className="text-xs text-[var(--muted)]">
					Зуб / область: <strong className="text-[var(--ink)]">{item.toothCode}</strong>
				</div>
			) : null}
			<div className="flex items-center justify-between mt-1 pt-2 border-t border-[var(--line)] text-sm">
				<span className="text-[var(--ink)] font-bold font-mono text-sm">
					{item.unitPriceRub !== undefined && item.unitPriceRub !== null ? money(item.unitPriceRub) : "—"}
				</span>
				{onOpenPlan ? (
					<button
						type="button"
						onClick={() => onOpenPlan(item.id)}
						className="min-h-[44px] px-2 text-[var(--teal)] hover:underline font-bold bg-transparent border-0 cursor-pointer text-xs inline-flex items-center"
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
		<div className="p-4 rounded-xl flex flex-col gap-2 bg-[var(--paper-soft)] border border-[var(--line)] transition-colors shadow-sm">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-1.5 text-sm font-bold text-[var(--ink)]">
					<Calendar className="w-4 h-4 text-[var(--teal)] shrink-0" />
					<span>{formattedDate}</span>
				</div>
				<span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--paper)] text-[var(--ink)] font-bold border border-[var(--line-strong)]">
					{statusLabel}
				</span>
			</div>
			<div className="text-xs text-[var(--muted)]">
				Врач: <strong className="text-[var(--ink)]">{doctorFullName || "Врач не назначен"}</strong>
			</div>
			{appointment.reason ? (
				<div className="text-xs text-[var(--ink)] line-clamp-2">
					{appointment.reason}
				</div>
			) : null}
			{onOpenVisit ? (
				<div className="mt-1 flex justify-end">
					<button
						type="button"
						onClick={() => onOpenVisit(appointment.id)}
						className="min-h-[44px] px-2 text-[var(--teal)] hover:underline font-bold bg-transparent border-0 cursor-pointer text-xs inline-flex items-center"
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
			const [isDmsManagerOpen, setIsDmsManagerOpen] = useState(false);
			const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);

			return (
				<div
					data-testid="patient-workspace-view"
					className="patient-workspace-view flex flex-col gap-4 rounded-2xl bg-[var(--paper)] p-4 md:p-6 text-[var(--ink)] border border-[var(--line)] shadow-sm"
				>
					{/* Clinical Safety & Allergy Red-Flag Emergency Banner */}
					<PatientAllergySafetyBanner
						patientId={patientId}
						patientName={patientName}
						showModalButton={true}
					/>

					<div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
						<div className="flex items-center gap-2">
							<span className="text-base md:text-lg font-black text-[var(--ink)]">
								{patientName || "Карточка пациента"}
							</span>
							<span className="text-xs font-mono font-bold text-[var(--muted)] bg-[var(--paper-soft)] px-2.5 py-1 rounded-lg border border-[var(--line)]">
								{patientId ? `043/у-${patientId.slice(0, 8)}` : "—"}
							</span>
						</div>

						<div className="flex items-center gap-2 flex-wrap">
							<button
								type="button"
								className="min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer border border-[var(--line-strong)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal)] hover:bg-[var(--teal-surface)]"
								onClick={() => setIsLoyaltyModalOpen(true)}
								title="Программа лояльности и бонусы (54-ФЗ)"
								aria-label="Программа лояльности и бонусы (54-ФЗ)"
								data-testid="open-loyalty-program-modal-btn"
							>
								<Gift className="w-4 h-4 inline mr-1.5 text-amber-500" />
								Лояльность (54-ФЗ)
							</button>
							<button
								type="button"
								className="min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer border border-[var(--line-strong)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal)] hover:bg-[var(--teal-surface)]"
								onClick={() => setIsDmsManagerOpen(true)}
								title="Управление полисами ДМС и гарантийными письмами (СОГАЗ, Ингосстрах, РЕСО)"
								aria-label="Управление полисами ДМС и гарантийными письмами (СОГАЗ, Ингосстрах, РЕСО)"
								data-testid="patient-dms-manager-btn"
							>
								<Shield className="w-4 h-4 inline mr-1.5 text-[var(--teal,var(--brand-primary))]" />
								Управление ДМС
							</button>
							<button
								type="button"
								className="min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer border border-[var(--line-strong)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal)] hover:bg-[var(--teal-surface)]"
								onClick={() => setIsDmsRegistryOpen(true)}
								title="Экспорт реестра услуг ДМС"
							>
								<FileSpreadsheet className="w-4 h-4 inline mr-1.5 text-emerald-500" />
								Реестр ДМС
							</button>
							<div className="flex items-center gap-1 bg-[var(--paper-soft)] p-1 rounded-xl border border-[var(--line)] flex-wrap">
								<button
									type="button"
									className={`min-h-[44px] px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
										activeTab === "timeline"
											? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-sm"
											: "bg-transparent text-[var(--muted)] border-transparent hover:text-[var(--ink)]"
									}`}
									onClick={() => setActiveTab("timeline")}
								>
									<Clock className="w-3.5 h-3.5 inline mr-1.5" />
									Лента
								</button>
								<button
									type="button"
									className={`min-h-[44px] px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
										activeTab === "plans"
											? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-sm"
											: "bg-transparent text-[var(--muted)] border-transparent hover:text-[var(--ink)]"
									}`}
									onClick={() => setActiveTab("plans")}
								>
									<FileText className="w-3.5 h-3.5 inline mr-1.5" />
									Планы лечения ({patientPlanItems.length})
								</button>
								<button
									type="button"
									className={`min-h-[44px] px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
										activeTab === "visits"
											? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-sm"
											: "bg-transparent text-[var(--muted)] border-transparent hover:text-[var(--ink)]"
									}`}
									onClick={() => setActiveTab("visits")}
								>
									<Calendar className="w-3.5 h-3.5 inline mr-1.5" />
									Визиты ({patientAppointments.length})
								</button>
							</div>
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

					{/* Loyalty & Gift Certificate Modal */}
					<LoyaltyProgramModal
						isOpen={isLoyaltyModalOpen}
						onClose={() => setIsLoyaltyModalOpen(false)}
						patientId={patientId}
						patientName={patientName || undefined}
						medicalCardNumber={`043/у-${patientId.slice(0, 8)}`}
					/>
				</div>
			);
		},
	);

PatientWorkspaceView.displayName = "PatientWorkspaceView";
