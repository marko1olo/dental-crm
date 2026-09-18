import type { Appointment, Dashboard, TreatmentPlanItem } from "@dental/shared";
import {
	Calendar,
	Camera,
	Clock,
	FileSpreadsheet,
	FileText,
	Gift,
	MoreVertical,
	Plus,
	Printer,
	Receipt,
	Shield,
	Stethoscope,
	UserCheck,
} from "lucide-react";
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { money } from "../../utils/financeUtils";
import { showToast } from "../GlobalToast";
import type { DmsGuaranteeLetter } from "../insurance/insuranceMath";

const DmsGuaranteeLetterModal = React.lazy(() =>
	import("../insurance/DmsGuaranteeLetterModal").then((m) => ({
		default: m.DmsGuaranteeLetterModal,
	})),
);

const DmsRegistryExportModal = React.lazy(() =>
	import("../insurance/DmsRegistryExportModal").then((m) => ({
		default: m.DmsRegistryExportModal,
	})),
);

const LoyaltyProgramModal = React.lazy(() =>
	import("../loyalty/program/LoyaltyProgramModal").then((m) => ({
		default: m.LoyaltyProgramModal,
	})),
);
import { PatientJourneyTimeline } from "../PatientJourneyTimeline";
import { printBlankMedicalContract } from "./blankContractPrint";
import { PatientAllergySafetyBanner } from "./PatientAllergySafetyBanner";
import { PatientDuplicateAlert } from "./PatientDuplicateAlert";

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
				return "bg-[var(--ok-bg,rgba(16,185,129,0.12))] text-[var(--ok-fg,#047857)] border border-[var(--ok-border,rgba(16,185,129,0.3))]";
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
					Зуб / область:{" "}
					<strong className="text-[var(--ink)]">{item.toothCode}</strong>
				</div>
			) : null}
			<div className="flex items-center justify-between mt-0.5 pt-1.5 border-t border-[var(--line)] text-xs">
				<div className="flex items-center gap-2">
					<span className="text-[var(--ink)] font-bold font-mono text-xs">
						{item.unitPriceRub !== undefined && item.unitPriceRub !== null
							? money(item.unitPriceRub)
							: "—"}
					</span>
					<span className="inline-flex items-center gap-0.5 text-[10px] text-teal-700 dark:text-teal-300 font-medium">
						<Shield className="w-2.5 h-2.5" /> Согласовано
					</span>
				</div>
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
		<div className="visit-history-card p-3 rounded-lg flex flex-col gap-1.5 bg-[var(--paper-soft)] border border-[var(--line)] transition-colors shadow-xs">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)]">
					<Calendar className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
					<span>{formattedDate}</span>
				</div>
				<span className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--paper)] text-[var(--ink)] font-bold border border-[var(--line-strong)] shrink-0">
					{statusLabel}
				</span>
			</div>
			<div className="text-xs text-[var(--muted)] truncate min-w-0">
				Врач:{" "}
				<strong className="text-[var(--ink)]">
					{doctorFullName || "Врач не назначен"}
				</strong>
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
			const [activeTab, setActiveTab] = useState<
				"timeline" | "plans" | "visits"
			>("timeline");

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

			const patientAddendums = useMemo(() => {
				return (dashboard?.documents ?? []).filter(
					(doc) =>
						doc.patientId === patientId &&
						doc.kind === "treatment_plan_acceptance" &&
						doc.status === "issued",
				);
			}, [dashboard?.documents, patientId]);

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
			const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);
			const [isDocsMenuOpen, setIsDocsMenuOpen] = useState(false);
			const docsMenuRef = useRef<HTMLDivElement>(null);

			useEffect(() => {
				const handleClickOutside = (event: MouseEvent) => {
					if (
						docsMenuRef.current &&
						!docsMenuRef.current.contains(event.target as Node)
					) {
						setIsDocsMenuOpen(false);
					}
				};
				if (isDocsMenuOpen) {
					document.addEventListener("mousedown", handleClickOutside);
				}
				return () => {
					document.removeEventListener("mousedown", handleClickOutside);
				};
			}, [isDocsMenuOpen]);

			const handleSaveDmsLetter = useCallback(
				async (letter: DmsGuaranteeLetter) => {
					try {
						const isExisting =
							letter.id &&
							!letter.id.startsWith("letter-") &&
							!letter.id.startsWith("gl-");
						const endpoint = isExisting
							? `/api/insurance/guarantee-letters/${letter.id}`
							: "/api/insurance/guarantee-letters";
						const method = isExisting ? "PUT" : "POST";
						const res = await fetch(endpoint, {
							method,
							headers: {
								"Content-Type": "application/json",
								...denteAdminSecretRequestHeaders(),
							},
							body: JSON.stringify(letter),
						});
						if (!res.ok) {
							const errBody = await res.json().catch(() => null);
							throw new Error(
								errBody?.message || `Ошибка сохранения (${res.status})`,
							);
						}
						showToast(
							`Гарантийное письмо № ${letter.letterNumber} (${letter.insurerName}) сохранено в базе данных`,
							"success",
						);
						setIsDmsLetterOpen(false);
					} catch (err: any) {
						showToast(
							err.message || "Не удалось сохранить гарантийное письмо",
							"error",
						);
					}
				},
				[],
			);

			return (
				<div
					data-testid="patient-workspace-view"
					className="patient-workspace-view flex flex-col gap-2 rounded-xl bg-[var(--paper)] p-2.5 sm:p-3 text-[var(--ink)] border border-[var(--line)] shadow-xs pb-16"
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
							{/* Первичная кнопка прямого действия 1: «+ Новый визит» */}
							<button
								type="button"
								className="primary-button min-h-[34px] h-8 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95 shadow-xs"
								onClick={() => {
									if (patientId) {
										appLogic?.setSelectedPatientId?.(patientId);
									}
									window.location.hash = "visit";
								}}
								title="Создать новый клинический визит для пациента"
								data-testid="btn-patient-create-visit"
							>
								<Plus className="w-3.5 h-3.5 shrink-0" />
								<span>Новый визит</span>
							</button>

							{/* Первичная кнопка прямого действия 2: «+ План лечения» */}
							<button
								type="button"
								className="secondary-button min-h-[34px] h-8 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
								onClick={() => {
									setActiveTab("plans");
									if (onOpenPlan) {
										onOpenPlan("new");
									}
								}}
								title="Составить новый план лечения или открыть раздел планов"
								data-testid="btn-patient-create-treatment-plan"
							>
								<Plus className="w-3.5 h-3.5 shrink-0" />
								<span>План лечения</span>
							</button>

							{/* Вторичные действия: аккуратное выпадающее меню [⋮ Документы и ДМС] */}
							<div
								className="relative inline-block text-left"
								ref={docsMenuRef}
							>
								<button
									type="button"
									className="secondary-button min-h-[34px] h-8 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
									onClick={() => setIsDocsMenuOpen((prev) => !prev)}
									title="Документы, ДМС и программа лояльности"
									aria-haspopup="true"
									aria-expanded={isDocsMenuOpen}
									data-testid="btn-patient-docs-dms-menu"
								>
									<MoreVertical className="w-3.5 h-3.5 shrink-0" />
									<span className="hidden sm:inline">Документы и ДМС</span>
								</button>

								{isDocsMenuOpen && (
									<div
										className="absolute right-0 mt-1 w-64 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-xl z-50 p-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
										role="menu"
										data-testid="patient-docs-dms-dropdown"
									>
										<button
											type="button"
											role="menuitem"
											className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
											onClick={() => {
												setIsDocsMenuOpen(false);
												if (patientId) {
													appLogic?.setSelectedPatientId?.(patientId);
												}
												window.location.hash = "patients";
											}}
											title="Открыть амбулаторную медицинскую карту Форма 043/у"
											data-testid="patient-workspace-open-043u-btn"
										>
											<FileText className="w-4 h-4 text-[var(--teal)] shrink-0" />
											<span>Карта пациента (043/у)</span>
										</button>

										<button
											type="button"
											role="menuitem"
											className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
											onClick={() => {
												setIsDocsMenuOpen(false);
												if (typeof window !== "undefined") {
													window.print();
												}
												showToast(
													"Печать и экспорт карты 043/у запущены",
													"info",
												);
											}}
											title="Распечатать амбулаторную медицинскую карту Форма 043/у"
											data-testid="patient-workspace-print-043u-btn"
										>
											<Printer className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
											<span>Печать карты (043/у)</span>
										</button>

										<button
											type="button"
											role="menuitem"
											className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
											onClick={() => {
												setIsDocsMenuOpen(false);
												if (patientId) {
													appLogic?.setSelectedPatientId?.(patientId);
												}
												window.location.hash = "finance";
											}}
											title="Открыть счета, акты 804н и кассу 54-ФЗ"
											data-testid="patient-workspace-open-finance-btn"
										>
											<Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
											<span>Счета и касса (54-ФЗ)</span>
										</button>

										<button
											type="button"
											role="menuitem"
											className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
											onClick={() => {
												setIsDocsMenuOpen(false);
												showToast(
													"Семейный баланс и распределение авансов",
													"info",
												);
											}}
											title="Семейный баланс и распределение авансовых платежей"
											data-testid="patient-workspace-family-balance-btn"
										>
											<UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
											<span>Семейный баланс</span>
										</button>

										<button
											type="button"
											role="menuitem"
											className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
											onClick={() => {
												setIsDocsMenuOpen(false);
												if (patientId) {
													appLogic?.setSelectedPatientId?.(patientId);
												}
												window.location.hash = "radiology";
											}}
											title="Открыть рентгенологические и КТ исследования"
											data-testid="patient-workspace-open-radiology-btn"
										>
											<Camera className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
											<span>Рентген и КТ снимки</span>
										</button>

										<button
											type="button"
											role="menuitem"
											className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
											onClick={() => {
												setIsDocsMenuOpen(false);
												setIsLoyaltyModalOpen(true);
											}}
											title="Программа лояльности и бонусы (54-ФЗ)"
											data-testid="open-loyalty-program-modal-btn"
										>
											<Gift className="w-4 h-4 text-amber-500 shrink-0" />
											<span>Лояльность (54-ФЗ)</span>
										</button>

										<button
											type="button"
											role="menuitem"
											className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
											onClick={() => {
												setIsDocsMenuOpen(false);
												setIsDmsLetterOpen(true);
											}}
											title="Управление полисами ДМС и гарантийными письмами"
											data-testid="patient-dms-manager-btn"
										>
											<Shield className="w-4 h-4 text-[var(--teal)] shrink-0" />
											<span>Управление ДМС</span>
										</button>

										<button
											type="button"
											role="menuitem"
											className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
											onClick={() => {
												setIsDocsMenuOpen(false);
												setIsDmsRegistryOpen(true);
											}}
											title="Экспорт реестра услуг ДМС"
											data-testid="patient-dms-registry-btn"
										>
											<FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
											<span>Реестр ДМС</span>
										</button>

										<button
											type="button"
											role="menuitem"
											className="w-full text-left px-2.5 py-2 text-xs font-medium rounded-lg hover:bg-amber-500/10 text-amber-900 dark:text-amber-200 flex items-center gap-2 cursor-pointer transition-colors"
											onClick={() => {
												setIsDocsMenuOpen(false);
												void printBlankMedicalContract(
													{ id: patientId, fullName: patientName },
													{
														clinicName:
															dashboard?.clinicSettings?.profile?.legalName,
													},
												);
											}}
											title="Распечатать пустой договор со строками _______ для ручного заполнения"
											data-testid="patient-print-blank-contract-btn"
										>
											<FileText className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
											<span>Бланк договора (_______)</span>
										</button>
									</div>
								)}
							</div>
							<div className="flex items-center gap-0.5 bg-[var(--paper-soft)] p-0.5 rounded-lg border border-[var(--line)] flex-nowrap overflow-x-auto h-8 sm:h-9 max-w-full">
								<button
									type="button"
									className={`min-h-[36px] sm:min-h-[32px] px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
										activeTab === "timeline"
											? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)] shadow-xs"
											: "bg-transparent text-[var(--muted)] border-transparent hover:text-[var(--ink)]"
									}`}
									onClick={() => setActiveTab("timeline")}
								>
									<Clock className="w-3 h-3 inline mr-1" />
									Лента
								</button>
								<button
									type="button"
									className={`min-h-[36px] sm:min-h-[32px] px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
										activeTab === "plans"
											? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)] shadow-xs"
											: "bg-transparent text-[var(--muted)] border-transparent hover:text-[var(--ink)]"
									}`}
									onClick={() => setActiveTab("plans")}
								>
									<FileText className="w-3 h-3 inline mr-1" />
									Планы лечения ({patientPlanItems.length})
								</button>
								<button
									type="button"
									className={`min-h-[36px] sm:min-h-[32px] px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
										activeTab === "visits"
											? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)] shadow-xs"
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
							{/* Decree 659 & Upsell Consent Shield Status Banner */}
							<div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between gap-3 flex-wrap">
								<div className="flex items-center gap-2">
									<Shield className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
									<div className="text-xs">
										<span className="font-bold text-[var(--ink)]">
											Защита согласий и сметы (ПП РФ №659 и ст. 16 ЗоЗПП)
										</span>
										<p className="text-[11px] text-[var(--muted)] m-0">
											Все манипуляции фиксируются в плане. Новые позиции требуют
											Дополнительного соглашения.
										</p>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)]">
										Активных ДС: {patientAddendums.length}
									</span>
									<button
										type="button"
										onClick={() => {
											window.location.hash = "#documents";
										}}
										className="min-h-[32px] px-2.5 py-1 text-xs font-bold rounded-lg bg-[var(--teal)] text-[var(--on-teal)] hover:opacity-90 border-0 cursor-pointer inline-flex items-center gap-1"
									>
										<FileText className="w-3 h-3" />
										<span>Оформить ДС</span>
									</button>
								</div>
							</div>

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
													? (staffMap.get(appt.doctorUserId) ?? null)
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
					{isDmsLetterOpen && (
						<React.Suspense fallback={null}>
							<DmsGuaranteeLetterModal
								isOpen={isDmsLetterOpen}
								onClose={() => setIsDmsLetterOpen(false)}
								patient={{
									id: patientId,
									fullName: patientName || "",
								}}
								onSave={handleSaveDmsLetter}
							/>
						</React.Suspense>
					)}

					{/* DMS Registry Export Modal */}
					{isDmsRegistryOpen && (
						<React.Suspense fallback={null}>
							<DmsRegistryExportModal
								isOpen={isDmsRegistryOpen}
								onClose={() => setIsDmsRegistryOpen(false)}
							/>
						</React.Suspense>
					)}

					{/* Loyalty & Gift Certificate Modal */}
					{isLoyaltyModalOpen && (
						<React.Suspense fallback={null}>
							<LoyaltyProgramModal
								isOpen={isLoyaltyModalOpen}
								onClose={() => setIsLoyaltyModalOpen(false)}
								patientId={patientId}
								patientName={patientName || undefined}
								medicalCardNumber={`043/у-${patientId.slice(0, 8)}`}
							/>
						</React.Suspense>
					)}

					{/* FAB clearance bottom spacer */}
					<div
						className="h-24 w-full shrink-0 pointer-events-none"
						aria-hidden="true"
					/>
				</div>
			);
		},
	);

PatientWorkspaceView.displayName = "PatientWorkspaceView";
