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
import { PatientDuplicateAlert } from "../patients/PatientDuplicateAlert";

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
				return "bg-[var(--good-bg,rgba(16,185,129,0.12))] text-[var(--good-fg,#047857)] border border-[var(--good-border,rgba(16,185,129,0.3))]";
			case "in_progress":
				return "bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/30";
			case "cancelled":
				return "bg-[var(--bad-bg,rgba(239,68,68,0.12))] text-[var(--bad-fg,#b91c1c)] border border-[var(--bad-border,rgba(239,68,68,0.3))]";
			default:
				return "bg-[var(--warn-bg,rgba(245,158,11,0.12))] text-[var(--warn-fg,#b45309)] border border-[var(--warn-border,rgba(245,158,11,0.3))]";
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
		<div className="p-3 rounded-lg flex flex-col gap-1.5 bg-[var(--paper-soft)] border border-[var(--line)] transition-colors shadow-xs">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-1.5 min-w-0">
					<Stethoscope className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
					<span className="font-bold text-xs text-[var(--ink)] truncate">
						{item.snapshotServiceName || "Услуга плана лечения"}
					</span>
				</div>
				<span
					className={`text-[11px] px-2 py-0.5 rounded-md font-bold shrink-0 ${statusColorClass}`}
				>
					{statusLabel}
				</span>
			</div>
			{item.toothCode ? (
				<div className="text-xs text-[var(--muted)]">
					Зуб / область: <strong className="text-[var(--ink)]">{item.toothCode}</strong>
				</div>
			) : null}
			<div className="flex items-center justify-between mt-0.5 pt-1.5 border-t border-[var(--line)] text-xs">
				<span className="text-[var(--ink)] font-bold font-mono text-xs">
					{item.unitPriceRub !== undefined && item.unitPriceRub !== null ? money(item.unitPriceRub) : "—"}
				</span>
				{onOpenPlan ? (
					<button
						type="button"
						onClick={() => onOpenPlan(item.id)}
						className="min-h-[32px] px-1.5 text-[var(--teal)] hover:underline font-bold bg-transparent border-0 cursor-pointer text-xs inline-flex items-center"
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
		<div className="p-3 rounded-lg flex flex-col gap-1.5 bg-[var(--paper-soft)] border border-[var(--line)] transition-colors shadow-xs">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)]">
					<Calendar className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
					<span>{formattedDate}</span>
				</div>
				<span className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--paper)] text-[var(--ink)] font-bold border border-[var(--line-strong)] shrink-0">
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
				<div className="mt-0.5 flex justify-end">
					<button
						type="button"
						onClick={() => onOpenVisit(appointment.id)}
						className="min-h-[32px] px-1.5 text-[var(--teal)] hover:underline font-bold bg-transparent border-0 cursor-pointer text-xs inline-flex items-center"
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
					className="patient-workspace-view flex flex-col gap-3 rounded-xl bg-[var(--paper)] p-3 md:p-4 text-[var(--ink)] border border-[var(--line)] shadow-xs pb-32"
				>
					{/* Clinical Safety & Allergy Red-Flag Emergency Banner */}
					<PatientAllergySafetyBanner
						patientId={patientId}
						patientName={patientName}
						showModalButton={true}
					/>

					{/* Patient Duplicate Alert Guard */}
					<PatientDuplicateAlert patientId={patientId} />

					<div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[var(--line)] pb-3">
						<div className="flex items-center gap-2 min-w-0">
							<span className="text-sm md:text-base font-black text-[var(--ink)] truncate">
								{patientName || "Карточка пациента"}
							</span>
							<span className="text-xs font-mono font-bold text-[var(--muted)] bg-[var(--paper-soft)] px-2 py-0.5 rounded-md border border-[var(--line)] shrink-0">
								{patientId ? `043/у-${patientId.slice(0, 8)}` : "—"}
							</span>
						</div>

						<div className="flex items-center gap-1.5 flex-wrap">
							<button
								type="button"
								className="min-h-[34px] px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer border border-[var(--line-strong)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal)] hover:bg-[var(--teal-surface)] inline-flex items-center"
								onClick={() => setIsLoyaltyModalOpen(true)}
								title="Программа лояльности и бонусы (54-ФЗ)"
								aria-label="Программа лояльности и бонусы (54-ФЗ)"
								data-testid="open-loyalty-program-modal-btn"
							>
								<Gift className="w-3.5 h-3.5 mr-1 text-amber-500 shrink-0" />
								<span>Лояльность (54-ФЗ)</span>
							</button>
							<button
								type="button"
								className="min-h-[34px] px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer border border-[var(--line-strong)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal)] hover:bg-[var(--teal-surface)] inline-flex items-center"
								onClick={() => setIsDmsManagerOpen(true)}
								title="Управление полисами ДМС и гарантийными письмами (СОГАЗ, Ингосстрах, РЕСО)"
								aria-label="Управление полисами ДМС и гарантийными письмами (СОГАЗ, Ингосстрах, РЕСО)"
								data-testid="patient-dms-manager-btn"
							>
								<Shield className="w-3.5 h-3.5 mr-1 text-[var(--teal,var(--brand-primary))] shrink-0" />
								<span>Управление ДМС</span>
							</button>
							<button
								type="button"
								className="min-h-[34px] px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer border border-[var(--line-strong)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal)] hover:bg-[var(--teal-surface)] inline-flex items-center"
								onClick={() => setIsDmsRegistryOpen(true)}
								title="Экспорт реестра услуг ДМС"
							>
								<FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-500 shrink-0" />
								<span>Реестр ДМС</span>
							</button>
							<div className="flex items-center gap-0.5 bg-[var(--paper-soft)] p-0.5 rounded-lg border border-[var(--line)] flex-wrap">
								<button
									type="button"
									className={`min-h-[32px] px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
										activeTab === "timeline"
											? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-xs"
											: "bg-transparent text-[var(--muted)] border-transparent hover:text-[var(--ink)]"
									}`}
									onClick={() => setActiveTab("timeline")}
								>
									<Clock className="w-3 h-3 inline mr-1" />
									Лента
								</button>
								<button
									type="button"
									className={`min-h-[32px] px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
										activeTab === "plans"
											? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-xs"
											: "bg-transparent text-[var(--muted)] border-transparent hover:text-[var(--ink)]"
									}`}
									onClick={() => setActiveTab("plans")}
								>
									<FileText className="w-3 h-3 inline mr-1" />
									Планы лечения ({patientPlanItems.length})
								</button>
								<button
									type="button"
									className={`min-h-[32px] px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
										activeTab === "visits"
											? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-xs"
											: "bg-transparent text-[var(--muted)] border-transparent hover:text-[var(--ink)]"
									}`}
									onClick={() => setActiveTab("visits")}
								>
									<Calendar className="w-3 h-3 inline mr-1" />
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
						<div className="flex flex-col gap-2.5">
							<div className="flex items-center justify-between">
								<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] m-0">
									Позиции плана лечения ({patientPlanItems.length})
								</h4>
							</div>
							{patientPlanItems.length === 0 ? (
								<div className="p-6 text-center text-xs text-[var(--muted)] bg-[var(--paper-soft)] rounded-xl border border-[var(--line)]">
									Планы лечения для пациента пока не составлены.
								</div>
							) : (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
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
						<div className="flex flex-col gap-2.5">
							<div className="flex items-center justify-between">
								<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] m-0">
									История визитов и записей ({patientAppointments.length})
								</h4>
							</div>
							{patientAppointments.length === 0 ? (
								<div className="p-6 text-center text-xs text-[var(--muted)] bg-[var(--paper-soft)] rounded-xl border border-[var(--line)]">
									История приёмов пациента пуста.
								</div>
							) : (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
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

					{/* FAB clearance bottom spacer */}
					<div className="h-24 w-full shrink-0 pointer-events-none" aria-hidden="true" />
				</div>
			);
		},
	);

PatientWorkspaceView.displayName = "PatientWorkspaceView";
