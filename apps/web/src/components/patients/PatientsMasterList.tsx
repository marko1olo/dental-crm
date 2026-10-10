import type { Dashboard, Patient } from "@dental/shared";
import {
	Calendar,
	ChevronRight,
	FileText,
	MoreHorizontal,
	Phone,
	Plus,
	Receipt,
	Search,
	ShieldCheck,
	Upload,
	UserCheck,
	Users,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { EmptyState } from "../EmptyState";
import { showToast } from "../GlobalToast";
import {
	printBlankMedicalContract,
	printBlankMedicalConsent,
} from "./blankContractPrint";
import {
	featureDistinguishes,
	type PatientListFeatureSalience,
} from "./patientListFeatureSalience";
import { useAppStore } from "../../store/appStore";
import { formatPhoneNumber } from "../../utils/inputSanitation";

export interface PatientsMasterListProps {
	readonly patients: Patient[];
	readonly selectedPatientId: string | null;
	readonly onSelectPatient: (patientId: string) => void;
	readonly patientInsightById?: Map<string, Dashboard["patientInsights"][number]>;
	readonly patientInsightRiskLabels?: Record<string, string>;
	readonly featureSalience: PatientListFeatureSalience;
	readonly money: (amountRub: number) => string;
	readonly pagination: {
		visibleItems: Patient[];
		displayedCount: number;
		totalCount: number;
		hasMore: boolean;
		loadMore: (step?: number) => void;
		loadAll: () => void;
	};
	readonly onOpenVisit: (patient: Patient) => void;
	readonly onBookAppointment: (patient: Patient) => void;
	readonly onOpenPatientCard: (patient: Patient) => void;
	readonly onOpenCreatePatient: () => void;
	readonly onClearSearch: () => void;
	readonly query: string;
}

export function PatientsMasterList({
	patients,
	selectedPatientId,
	onSelectPatient,
	patientInsightById,
	patientInsightRiskLabels,
	featureSalience,
	money,
	pagination,
	onOpenVisit,
	onBookAppointment,
	onOpenPatientCard,
	onOpenCreatePatient,
	onClearSearch,
	query,
}: PatientsMasterListProps) {
	const [rowMenuPatientId, setRowMenuPatientId] = useState<string | null>(null);
	const rowMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				rowMenuRef.current &&
				!rowMenuRef.current.contains(e.target as Node)
			) {
				setRowMenuPatientId(null);
			}
		};
		if (rowMenuPatientId) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [rowMenuPatientId]);

	return (
		<div className="patient-list max-md:gap-2 max-md:flex-1 max-md:h-full hidden md:flex">
			{pagination.visibleItems.map((patient) => {
				const insight = patientInsightById?.get(patient.id);
				const patientIsSelected = selectedPatientId === patient.id;
				const riskDistinguishes = insight
					? featureDistinguishes(
							insight.riskLevel,
							featureSalience.prevailingRiskLevel,
						)
					: false;
				const nextActionDistinguishes = insight
					? featureDistinguishes(
							(insight.nextBestAction as any) ?? null,
							featureSalience.prevailingNextAction,
						)
					: false;

				return (
					<article
						className={`patient-row ${insight && riskDistinguishes ? `risk-${insight.riskLevel}` : ""} ${patientIsSelected ? "selected" : ""}`}
						key={patient.id}
						data-patient-id={patient.id}
						data-testid={`patient-row-${patient.id}`}
						style={{
							contentVisibility: "auto",
							containIntrinsicSize: "1px 64px",
							contain: "content",
						}}
						tabIndex={0}
						role="button"
						aria-label={`Карточка пациента: ${patient.fullName}`}
						onClick={() => onSelectPatient(patient.id)}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								onSelectPatient(patient.id);
							}
						}}
					>
						<div className="min-w-0 flex-1">
							<h3
								className="break-words line-clamp-2 leading-tight font-semibold text-sm"
								title={patient.fullName}
							>
								{patient.fullName}
							</h3>
							<p className="text-xs text-[var(--muted)] font-mono select-all">
								{patient.phone ? formatPhoneNumber(patient.phone) : "Телефон не указан"}
							</p>
							{patient.notes && patient.notes.length <= 42 ? (
								<p
									className="break-words text-xs text-[var(--muted)] opacity-75 mt-0.5"
									title={patient.notes}
								>
									{patient.notes}
								</p>
							) : null}
							{insight &&
							(riskDistinguishes ||
								nextActionDistinguishes ||
								insight.balanceDueRub ||
								patient.status === "archived") ? (
								<div className="patient-row-meta">
									{patient.status === "archived" ? (
										<span
											className="patient-risk-label"
											style={{
												backgroundColor:
													"var(--bad-bg, rgba(239, 68, 68, 0.15))",
												color: "var(--bad-fg, var(--danger))",
												borderColor:
													"var(--bad-border, rgba(239, 68, 68, 0.3))",
											}}
										>
											Черный список / Архив
										</span>
									) : null}
									{riskDistinguishes && patientInsightRiskLabels ? (
										<span
											className="patient-risk-label"
											title={patientInsightRiskLabels[insight.riskLevel]}
										>
											{patientInsightRiskLabels[insight.riskLevel]}
										</span>
									) : null}
									{nextActionDistinguishes && insight.nextBestAction ? (
										<strong
											className="patient-next-action"
											title={insight.nextBestAction}
										>
											{insight.nextBestAction.length > 28
												? "Контроль оплат"
												: insight.nextBestAction}
										</strong>
									) : null}
									{insight.balanceDueRub ? (
										<span className="patient-row-chip shrink-0">
											{money(insight.balanceDueRub)}
										</span>
									) : null}
								</div>
							) : patient.status === "archived" ? (
								<div className="patient-row-meta">
									<span
										className="patient-risk-label"
										style={{
											backgroundColor:
												"var(--bad-bg, rgba(239, 68, 68, 0.15))",
											color: "var(--bad-fg, var(--danger))",
											borderColor:
												"var(--bad-border, rgba(239, 68, 68, 0.3))",
										}}
									>
										Черный список / Архив
									</span>
								</div>
							) : null}
						</div>
						<div
							className="patient-row-actions flex items-center gap-1.5 shrink-0 pl-1"
							onClick={(e) => e.stopPropagation()}
						>
							{/* Secondary Actions Dropdown Menu «...» */}
							<div
								className="relative inline-flex items-center"
								ref={rowMenuPatientId === patient.id ? rowMenuRef : null}
							>
								<button
									type="button"
									className="patient-row-more-btn w-8 h-8 min-w-[32px] min-h-[32px] p-0 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:border-[var(--teal)] text-[var(--ink)] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
									title="Действия с пациентом (В карту, Запись, Карточка, Касса)"
									aria-label={`Меню действий для ${patient.fullName}`}
									aria-expanded={rowMenuPatientId === patient.id}
									data-testid={`patient-row-more-btn-${patient.id}`}
									onClick={(e) => {
										e.stopPropagation();
										onSelectPatient(patient.id);
										setRowMenuPatientId((prev) =>
											prev === patient.id ? null : patient.id,
										);
									}}
								>
									<MoreHorizontal size={14} className="text-[var(--ink)]" />
								</button>

								{rowMenuPatientId === patient.id && (
									<div
										className="patient-row-menu-dropdown absolute right-0 top-full mt-1 z-50 flex flex-col gap-0.5 p-1.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-2xl min-w-[210px] text-xs animate-in fade-in zoom-in-95 duration-100"
										role="menu"
										data-testid="patient-row-actions-dropdown"
										onClick={(e) => e.stopPropagation()}
									>
										{/* Action 1: «В карту» */}
										<button
											type="button"
											className="patient-row-action-btn patient-row-chart-btn w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
											role="menuitem"
											title={`Открыть приём и карту: ${patient.fullName}`}
											data-testid={`patient-row-chart-btn-${patient.id}`}
											onClick={() => {
												setRowMenuPatientId(null);
												onSelectPatient(patient.id);
												onOpenVisit(patient);
											}}
										>
											<FileText
												size={14}
												className="text-[var(--teal,var(--brand-primary))] shrink-0"
											/>
											<span>В карту (Приём)</span>
										</button>

										{/* Action 2: «Запись» */}
										<button
											type="button"
											className="patient-row-action-btn patient-row-book-btn w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
											role="menuitem"
											title={`Записать на приём в расписание: ${patient.fullName}`}
											data-testid={`patient-row-book-btn-${patient.id}`}
											onClick={() => {
												setRowMenuPatientId(null);
												onSelectPatient(patient.id);
												onBookAppointment(patient);
											}}
										>
											<Calendar
												size={14}
												className="text-teal-600 dark:text-teal-400 shrink-0"
											/>
											<span>Записать на приём</span>
										</button>

										<button
											type="button"
											className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
											role="menuitem"
											onClick={() => {
												setRowMenuPatientId(null);
												onSelectPatient(patient.id);
												onOpenPatientCard(patient);
											}}
										>
											<UserCheck
												size={14}
												className="text-[var(--teal)] shrink-0"
											/>
											<span>Паспортная карточка</span>
										</button>
										<button
											type="button"
											className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
											role="menuitem"
											onClick={() => {
												setRowMenuPatientId(null);
												onSelectPatient(patient.id);
												useAppStore.getState().setCurrentView("finance");
												showToast(
													`Касса: расчёт ${patient.fullName}`,
													"info",
												);
											}}
										>
											<Receipt
												size={14}
												className="text-emerald-600 dark:text-emerald-400 shrink-0"
											/>
											<span>Касса / Оплата</span>
										</button>
										<button
											type="button"
											className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
											role="menuitem"
											onClick={() => {
												setRowMenuPatientId(null);
												void printBlankMedicalContract(patient);
											}}
										>
											<FileText
												size={14}
												className="text-blue-600 dark:text-blue-400 shrink-0"
											/>
											<span>Печать бланка договора (____)</span>
										</button>
										<button
											type="button"
											className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
											role="menuitem"
											onClick={() => {
												setRowMenuPatientId(null);
												void printBlankMedicalConsent(patient);
											}}
											data-testid="row-print-blank-consent"
										>
											<ShieldCheck
												size={14}
												className="text-teal-600 dark:text-teal-400 shrink-0"
											/>
											<span>Печать бланка ИДС (____)</span>
										</button>
										{patient.phone && (
											<button
												type="button"
												className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
												role="menuitem"
												onClick={() => {
													setRowMenuPatientId(null);
													window.location.href = `tel:${patient.phone}`;
												}}
											>
												<Phone
													size={14}
													className="text-teal-600 dark:text-teal-400 shrink-0"
												/>
												<span>Позвонить ({patient.phone})</span>
											</button>
										)}
									</div>
								)}
							</div>

							{/* Visual interactive chevron button */}
							<button
								type="button"
								className="patient-row-chevron-btn w-8 h-8 min-w-[32px] min-h-[32px] p-0 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] hover:border-[var(--teal)] text-[var(--muted)] hover:text-[var(--teal-dark)] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
								title={`Открыть карточку: ${patient.fullName}`}
								aria-label={`Открыть карточку: ${patient.fullName}`}
								data-testid={`patient-row-open-btn-${patient.id}`}
								onClick={(e) => {
									e.stopPropagation();
									onSelectPatient(patient.id);
								}}
							>
								<ChevronRight
									size={15}
									className="shrink-0"
									aria-hidden="true"
								/>
							</button>
						</div>
					</article>
				);
			})}

			{pagination.hasMore && (
				<div className="patient-list-pagination flex items-center justify-between p-2.5 my-1.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--muted)]">
					<span>
						Показано {pagination.displayedCount} из {pagination.totalCount} пациентов
					</span>
					<div className="flex items-center gap-2">
						<button
							type="button"
							className="secondary-button min-h-[32px] px-2.5 text-xs font-semibold rounded-lg"
							onClick={() => pagination.loadMore(50)}
						>
							Загрузить ещё 50
						</button>
						<button
							type="button"
							className="text-button min-h-[32px] px-2 text-xs text-[var(--teal)] font-medium hover:underline"
							onClick={pagination.loadAll}
						>
							Все ({pagination.totalCount})
						</button>
					</div>
				</div>
			)}

			{patients.length === 0 ? (
				<EmptyState
					className="patient-empty-state"
					icon={!query.trim() ? <Users size={32} /> : <Search size={28} />}
					title={
						!query.trim()
							? "В картотеке пока нет пациентов"
							: "Пациент не найден"
					}
					description={
						!query.trim()
							? "Создайте медицинскую карту первого пациента или выполните пакетный импорт существующей базы из Excel, 1С или IDENT."
							: `По запросу «${query.trim()}» ничего не найдено. Проверьте правильность написания ФИО или номера телефона.`
					}
					action={
						!query.trim() ? (
							<div className="patient-empty-actions flex flex-col sm:flex-row flex-wrap gap-2 justify-center mt-2 w-full">
								<button
									type="button"
									className="primary-button min-h-[44px] px-4 flex items-center justify-center gap-1.5 font-bold shadow-sm"
									onClick={onOpenCreatePatient}
									data-testid="empty-state-create-patient-btn"
								>
									<Plus size={16} aria-hidden="true" />
									<span>Создать карту</span>
								</button>
								<button
									type="button"
									className="secondary-button min-h-[44px] px-4 flex items-center justify-center gap-1.5 font-semibold"
									onClick={() => {
										window.location.hash = "#settings";
										showToast(
											"Переход в настройки клиники: раздел «Импорт баз данных из Excel / 1C / IDENT»",
											"info",
											4000,
										);
									}}
									data-testid="empty-state-import-patients-btn"
								>
									<Upload size={16} aria-hidden="true" />
									<span>Импорт базы из Excel / 1С / IDENT</span>
								</button>
							</div>
						) : (
							<div className="patient-empty-actions flex flex-wrap gap-2 justify-center mt-2">
								<button
									type="button"
									className="primary-button min-h-[44px] px-4 flex items-center justify-center gap-1.5 font-bold"
									onClick={onOpenCreatePatient}
									data-testid="empty-state-create-patient-btn"
								>
									<Plus size={16} aria-hidden="true" />
									<span>Создать карту</span>
								</button>
								<button
									type="button"
									className="text-button min-h-[44px] px-3.5"
									onClick={onClearSearch}
								>
									Сбросить поиск
								</button>
							</div>
						)
					}
					glass={false}
					style={{ padding: "24px 16px" }}
				/>
			) : null}
		</div>
	);
}
