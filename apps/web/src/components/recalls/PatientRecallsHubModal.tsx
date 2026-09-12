/**
 * Patient Recalls & Dispensary Hub Modal (DOMAIN: RECALLS)
 *
 * Touch-First интерфейс диспансерного учета, автоматических вызовов и когортного анализа удержания (Retention Rate & LTV).
 * Интегрирован со специализированными интервалами (гигиена, импланты, ортодонтия, детство),
 * 1-кликовой отправкой (WhatsApp / Telegram / SMS) и речевыми скриптами с отработкой возражений.
 */

import type React from "react";
import { useId, useMemo, useState } from "react";
import {
	AlertTriangle,
	BarChart3,
	Calendar,
	Check,
	CheckCircle2,
	Clock,
	Lightbulb,
	MessageCircle,
	Phone,
	PhoneCall,
	RotateCcw,
	Search,
	Send,
	ShieldCheck,
	TrendingUp,
	Users,
	X,
} from "lucide-react";
import {
	STOMX_TASK_CALLS_CATALOG,
	STOMX_TASK_CALL_BY_TYPE,
	type StomxTaskCallType,
} from "@dental/shared";
import { showToast } from "../GlobalToast";
import {
	RECALL_CYCLE_CATALOG,
	buildTelegramUrl,
	buildWhatsAppUrl,
	calculateCohortRetention,
	calculateRecallMetrics,
	determineTaskCallTypeForCandidate,
	filterAndSortRecallCandidates,
	generateSmsRecallMessage,
	generateTelegramRecallMessage,
	generateWhatsAppRecallMessage,
	type PatientRecallRecord,
	type RecallContactStatus,
	type RecallCycleType,
	type RecallUrgencyStatus,
} from "./patientRecallEngine";
import { CLINICAL_CALLING_SCRIPTS } from "./recallTemplates";
import "./recalls.css";

export interface PatientRecallsHubModalProps {
	readonly isOpen?: boolean | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly clinicName?: string | undefined;
	readonly initialCandidates?: readonly PatientRecallRecord[] | undefined;
	readonly onBookAppointment?: ((candidate: PatientRecallRecord) => void) | undefined;
	readonly onSendWhatsApp?: (
		(candidate: PatientRecallRecord, message: string) => Promise<void> | void
	) | undefined;
	readonly onSendTelegram?: (
		(candidate: PatientRecallRecord, message: string) => Promise<void> | void
	) | undefined;
	readonly onStatusChange?: (
		(candidateId: string, status: RecallContactStatus) => Promise<void> | void
	) | undefined;
}

export const PatientRecallsHubModal: React.FC<PatientRecallsHubModalProps> = ({
	isOpen = true,
	onClose,
	clinicName = "DENTE Clinic",
	initialCandidates,
	onBookAppointment,
	onSendWhatsApp,
	onSendTelegram,
	onStatusChange,
}) => {
	const searchInputId = useId();
	const cycleSelectId = useId();

	const [candidates, setCandidates] = useState<readonly PatientRecallRecord[]>(
		initialCandidates ?? [],
	);

	const [activeTab, setActiveTab] = useState<"registry" | "cohorts" | "task_calls">("registry");
	const [statusFilter, setStatusFilter] = useState<
		"all" | "due_now" | "invited" | "scheduled" | "declined" | "completed"
	>("all");
	const [selectedCycle, setSelectedCycle] = useState<RecallCycleType | "all">("all");
	const [selectedTaskCallType, setSelectedTaskCallType] = useState<StomxTaskCallType | "all">("all");
	const [activeTaskCallScriptType, setActiveTaskCallScriptType] = useState<StomxTaskCallType | null>(null);
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [cohortGrouping, setCohortGrouping] = useState<"month" | "quarter">("month");

	const [activeScriptCandidate, setActiveScriptCandidate] =
		useState<PatientRecallRecord | null>(null);
	const [selectedObjectionId, setSelectedObjectionId] = useState<string>("");
	const [copiedCandidateId, setCopiedCandidateId] = useState<string | null>(null);
	const [statusNotice, setStatusNotice] = useState<string | null>(null);

	// Метрики диспансеризации и LTV
	const metrics = useMemo(() => {
		return calculateRecallMetrics(candidates);
	}, [candidates]);

	// Когортный анализ возвращаемости
	const cohortReport = useMemo(() => {
		return calculateCohortRetention(candidates, { grouping: cohortGrouping });
	}, [candidates, cohortGrouping]);

	// Фильтрация кандидатов по клиническому реестру
	const filteredCandidates = useMemo(() => {
		return filterAndSortRecallCandidates(candidates, {
			status: statusFilter,
			cycleType: selectedCycle,
			searchQuery,
			sortBy: "daysOverdue",
			sortDirection: "desc",
		});
	}, [candidates, statusFilter, selectedCycle, searchQuery]);

	// Фильтрация кандидатов по сервисным звонкам StomX
	const taskCallCandidates = useMemo(() => {
		return candidates
			.map((c) => ({
				candidate: c,
				taskType: determineTaskCallTypeForCandidate(c),
			}))
			.filter((item) => {
				if (selectedTaskCallType !== "all" && item.taskType !== selectedTaskCallType) {
					return false;
				}
				if (searchQuery.trim() !== "") {
					const q = searchQuery.toLowerCase();
					return (
						item.candidate.fullName.toLowerCase().includes(q) ||
						(item.candidate.phone && item.candidate.phone.includes(q)) ||
						(item.candidate.attendingDoctorName &&
							item.candidate.attendingDoctorName.toLowerCase().includes(q))
					);
				}
				return true;
			});
	}, [candidates, selectedTaskCallType, searchQuery]);

	// Обновление статуса пациента
	const handleStatusUpdate = (
		candidateId: string,
		newStatus: RecallContactStatus,
		channel?: "whatsapp" | "telegram" | "sms" | "phone",
	) => {
		setCandidates((prev) =>
			prev.map((c) => {
				if (c.id !== candidateId) return c;
				const updated: PatientRecallRecord = {
					...c,
					status: newStatus,
					lastContactedAt:
						newStatus === "invited" || newStatus === "contacted"
							? new Date().toISOString()
							: c.lastContactedAt,
					lastContactChannel: channel !== undefined ? channel : c.lastContactChannel,
				};
				return updated;
			}),
		);

		if (onStatusChange) {
			void onStatusChange(candidateId, newStatus);
		}
	};

	// 1-Click WhatsApp
	const handleWhatsApp = async (candidate: PatientRecallRecord) => {
		if (!candidate.phone || !candidate.phone.trim()) {
			showToast(
				"У пациента не указан номер телефона. Укажите номер в карточке пациента",
				"warning",
			);
			return;
		}
		const message = generateWhatsAppRecallMessage(candidate, { clinicName });
		if (onSendWhatsApp) {
			await onSendWhatsApp(candidate, message);
		} else {
			const url = buildWhatsAppUrl(candidate.phone, message);
			window.open(url, "_blank", "noopener,noreferrer");
		}
		handleStatusUpdate(candidate.id, "invited", "whatsapp");
		setStatusNotice(`WhatsApp сообщение для «${candidate.fullName}» готово.`);
		setTimeout(() => setStatusNotice(null), 3000);
	};

	// 1-Click Telegram
	const handleTelegram = async (candidate: PatientRecallRecord) => {
		if (!candidate.phone || !candidate.phone.trim()) {
			showToast(
				"У пациента не указан номер телефона. Укажите номер в карточке пациента",
				"warning",
			);
			return;
		}
		const message = generateTelegramRecallMessage(candidate, { clinicName });
		if (onSendTelegram) {
			await onSendTelegram(candidate, message);
		} else {
			const url = buildTelegramUrl(candidate.phone, message);
			window.open(url, "_blank", "noopener,noreferrer");
		}
		handleStatusUpdate(candidate.id, "invited", "telegram");
		setStatusNotice(`Telegram сообщение для «${candidate.fullName}» отправлено.`);
		setTimeout(() => setStatusNotice(null), 3000);
	};

	// Копирование SMS
	const handleCopySms = (candidate: PatientRecallRecord) => {
		if (!candidate.phone || !candidate.phone.trim()) {
			showToast(
				"У пациента не указан номер телефона. Укажите номер в карточке пациента",
				"warning",
			);
			return;
		}
		const smsText = generateSmsRecallMessage(candidate, { clinicName });
		navigator.clipboard.writeText(smsText).catch(() => {});
		setCopiedCandidateId(candidate.id);
		handleStatusUpdate(candidate.id, "invited", "sms");
		setTimeout(() => setCopiedCandidateId(null), 2500);
	};

	// 1-Click Запись в расписание
	const handleBook = (candidate: PatientRecallRecord) => {
		if (onBookAppointment) {
			onBookAppointment(candidate);
		} else {
			handleStatusUpdate(candidate.id, "scheduled");
			setStatusNotice(`Пациент «${candidate.fullName}» переведен в статус «Записался».`);
			setTimeout(() => setStatusNotice(null), 3000);
		}
	};

	// Открытие скрипта обзвона
	const handleToggleScript = (candidate: PatientRecallRecord) => {
		if (activeScriptCandidate?.id === candidate.id) {
			setActiveScriptCandidate(null);
			setSelectedObjectionId("");
		} else {
			setActiveScriptCandidate(candidate);
			const script = CLINICAL_CALLING_SCRIPTS[candidate.cycleType] || CLINICAL_CALLING_SCRIPTS.standard_prophylaxis;
			setSelectedObjectionId(script.objections[0]?.id || "");
		}
	};

	if (!isOpen) return null;

	return (
		<div
			className="recall-manager-modal-backdrop"
			role="dialog"
			aria-modal="true"
			aria-labelledby="recalls-hub-title"
		>
			<div className="recall-manager-container" data-testid="patient-recalls-hub-modal">
				{/* Header */}
				<header className="recall-header">
					<div className="recall-header-title-wrap">
						<div className="recall-header-icon" aria-hidden="true">
							<ShieldCheck size={22} />
						</div>
						<div>
							<h2 id="recalls-hub-title" className="recall-header-title">
								Диспансерный учет и вызов пациентов (Recalls Hub)
							</h2>
							<p className="recall-header-subtitle">
								Клинические интервалы (профгигиена, импланты, ортодонтия, детство), когортный Retention & LTV
							</p>
						</div>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
						{/* View Mode Switcher */}
						<div className="recall-view-mode-tabs" role="tablist">
							<button
								type="button"
								role="tab"
								aria-selected={activeTab === "registry"}
								className={`recall-tab-btn ${activeTab === "registry" ? "active" : ""}`}
								onClick={() => setActiveTab("registry")}
							>
								<Users size={16} />
								<span>Реестр пациентов</span>
							</button>
							<button
								type="button"
								role="tab"
								aria-selected={activeTab === "cohorts"}
								className={`recall-tab-btn ${activeTab === "cohorts" ? "active" : ""}`}
								onClick={() => setActiveTab("cohorts")}
							>
								<BarChart3 size={16} />
								<span>Когорты Retention & LTV</span>
							</button>
							<button
								type="button"
								role="tab"
								data-testid="tab-task-calls"
								aria-selected={activeTab === "task_calls"}
								className={`recall-tab-btn ${activeTab === "task_calls" ? "active" : ""}`}
								onClick={() => setActiveTab("task_calls")}
							>
								<PhoneCall size={16} />
								<span>Задачи сервисных звонков (StomX)</span>
							</button>
						</div>

						{onClose ? (
							<button
								type="button"
								className="recall-close-btn"
								onClick={onClose}
								aria-label="Закрыть модальное окно"
							>
								<X size={20} />
							</button>
						) : null}
					</div>
				</header>

				{/* Metrics Ribbon */}
				<section className="recall-metrics-grid" aria-label="Сводные метрики диспансеризации">
					<div className="recall-metric-card recall-metric-card--primary">
						<span className="recall-metric-label">Всего в реестре</span>
						<div className="recall-metric-value-row">
							<span className="recall-metric-value">{metrics.totalCandidates}</span>
							<span className="recall-metric-subtext">пациентов</span>
						</div>
					</div>

					<div className="recall-metric-card recall-metric-card--warning">
						<span className="recall-metric-label">Пора звать (срочные)</span>
						<div className="recall-metric-value-row">
							<span className="recall-metric-value">{metrics.dueNowCount}</span>
							<span className="recall-metric-subtext">окно 0–30 дн.</span>
						</div>
					</div>

					<div className="recall-metric-card recall-metric-card--info">
						<span className="recall-metric-label">Приглашены / Связались</span>
						<div className="recall-metric-value-row">
							<span className="recall-metric-value">{metrics.contactedCount}</span>
							<span className="recall-metric-subtext">отклик {metrics.contactResponseRatePercent}%</span>
						</div>
					</div>

					<div className="recall-metric-card recall-metric-card--success">
						<span className="recall-metric-label">Возвращаемость (Retention)</span>
						<div className="recall-metric-value-row">
							<span className="recall-metric-value">{metrics.retentionRatePercent}%</span>
							<span className="recall-metric-subtext">завершили визит</span>
						</div>
					</div>

					<div className="recall-metric-card">
						<span className="recall-metric-label">Средний LTV recall</span>
						<div className="recall-metric-value-row">
							<span className="recall-metric-value">
								{metrics.averageRecallLtvRub.toLocaleString("ru-RU")} ₽
							</span>
							<span className="recall-metric-subtext">на пациента</span>
						</div>
					</div>
				</section>

				{/* Notice Banner */}
				{statusNotice ? (
					<div
						style={{
							background: "var(--rm-success-light)",
							color: "var(--rm-success)",
							padding: "8px 24px",
							fontSize: "0.875rem",
							fontWeight: 600,
							display: "flex",
							alignItems: "center",
							gap: "8px",
						}}
					>
						<CheckCircle2 size={16} />
						<span>{statusNotice}</span>
					</div>
				) : null}

				{/* Tab 1: Patient Registry */}
				{activeTab === "registry" ? (
					<>
						{/* Toolbar */}
						<div className="recall-toolbar">
							<div className="recall-toolbar-top">
								<div className="recall-search-input-wrap">
									<Search size={16} className="recall-search-icon" aria-hidden="true" />
									<label htmlFor={searchInputId} className="sr-only">
										Поиск по ФИО, телефону или врачу
									</label>
									<input
										id={searchInputId}
										type="search"
										className="recall-search-input"
										placeholder="Поиск по ФИО, телефону или лечащему врачу..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
									/>
								</div>

								<div>
									<label htmlFor={cycleSelectId} className="sr-only">
										Фильтр по клиническому циклу
									</label>
									<select
										id={cycleSelectId}
										className="recall-cycle-select"
										value={selectedCycle}
										onChange={(e) =>
											setSelectedCycle(e.target.value as RecallCycleType | "all")
										}
									>
										<option value="all">Все клинические циклы</option>
										<option value="standard_prophylaxis">Профгигиена 6 мес.</option>
										<option value="periodontal_maintenance">Пародонтология 3-4 мес.</option>
										<option value="implant_monitoring">Импланты (1, 3, 6, 12 мес.)</option>
										<option value="orthodontic_braces">Брекеты (каждые 4 нед.)</option>
										<option value="orthodontic_aligners">Элайнеры (каждые 6-8 нед.)</option>
										<option value="orthodontic_retention">Ортодонтия: ретенция</option>
										<option value="pediatric_fluoridation">Детская минерализация (3-6 мес.)</option>
										<option value="caries_high_risk">Кариес-риск (3 мес.)</option>
										<option value="prosthetic_check">Ортопедия (6-12 мес.)</option>
									</select>
								</div>
							</div>

							{/* Status Chips */}
							<div className="recall-status-chips" role="radiogroup" aria-label="Фильтр по статусам реестра">
								<button
									type="button"
									className={`recall-chip ${statusFilter === "all" ? "active" : ""}`}
									onClick={() => setStatusFilter("all")}
								>
									Все
									<span className="recall-chip-badge">{candidates.length}</span>
								</button>

								<button
									type="button"
									className={`recall-chip ${statusFilter === "due_now" ? "active" : ""}`}
									onClick={() => setStatusFilter("due_now")}
								>
									<Clock size={14} />
									Пора звать
									<span className="recall-chip-badge">{metrics.dueNowCount}</span>
								</button>

								<button
									type="button"
									className={`recall-chip ${statusFilter === "invited" ? "active" : ""}`}
									onClick={() => setStatusFilter("invited")}
								>
									<Send size={14} />
									Приглашен
									<span className="recall-chip-badge">{metrics.contactedCount}</span>
								</button>

								<button
									type="button"
									className={`recall-chip ${statusFilter === "scheduled" ? "active" : ""}`}
									onClick={() => setStatusFilter("scheduled")}
								>
									<Calendar size={14} />
									Записался
									<span className="recall-chip-badge">{metrics.scheduledCount}</span>
								</button>

								<button
									type="button"
									className={`recall-chip ${statusFilter === "declined" ? "active" : ""}`}
									onClick={() => setStatusFilter("declined")}
								>
									<RotateCcw size={14} />
									Отказ / Перенос
									<span className="recall-chip-badge">{metrics.declinedCount}</span>
								</button>

								<button
									type="button"
									className={`recall-chip ${statusFilter === "completed" ? "active" : ""}`}
									onClick={() => setStatusFilter("completed")}
								>
									<CheckCircle2 size={14} />
									Завершено
									<span className="recall-chip-badge">{metrics.completedCount}</span>
								</button>
							</div>
						</div>

						{/* Content Table */}
						<main className="recall-content-area">
							{filteredCandidates.length === 0 ? (
								<div className="recall-empty-state">
									<div className="recall-empty-icon">
										<CheckCircle2 size={36} className="text-teal-500 mx-auto" />
									</div>
									<h3>Нет пациентов по выбранному фильтру</h3>
									<p>Все пациенты обработаны, либо срок вызова еще не наступил.</p>
								</div>
							) : (
								<div className="recall-table-wrap">
									<table className="recall-table">
										<thead>
											<tr>
												<th scope="col">Пациент</th>
												<th scope="col">Клинический цикл</th>
												<th scope="col">Визит / Срок</th>
												<th scope="col">Срочность</th>
												<th scope="col">Лечащий врач</th>
												<th scope="col">Статус</th>
												<th scope="col">1-Click Действия</th>
											</tr>
										</thead>
										<tbody>
											{filteredCandidates.map((candidate) => {
												const cycleDef = RECALL_CYCLE_CATALOG[candidate.cycleType];
												const isScriptActive = activeScriptCandidate?.id === candidate.id;

												return (
													<tr key={candidate.id} data-testid={`recall-hub-row-${candidate.id}`}>
														<td>
															<div className="recall-patient-cell">
																<span className="recall-patient-name">{candidate.fullName}</span>
																<span className="recall-patient-phone">
																	{candidate.phone || "телефон не указан"}
																</span>
															</div>
														</td>

														<td>
															<span
																className="recall-cycle-tag"
																title={cycleDef?.clinicalRationale}
															>
																{cycleDef?.shortTitle || candidate.cycleType}
															</span>
														</td>

														<td>
															<div>
																<div>{candidate.lastVisitDate}</div>
																<div style={{ fontSize: "0.75rem", color: "var(--rm-text-muted)" }}>
																	План: {candidate.dueDate}
																</div>
															</div>
														</td>

														<td>
															<span className={`recall-badge recall-badge--${candidate.urgencyStatus}`}>
																{candidate.urgencyStatus === "due_now" && "Пора звать"}
																{candidate.urgencyStatus === "overdue_30" && `+${candidate.daysOverdue} дн.`}
																{candidate.urgencyStatus === "overdue_90" && `+${candidate.daysOverdue} дн. (риск)`}
																{candidate.urgencyStatus === "upcoming" && `через ${Math.abs(candidate.daysOverdue)} дн.`}
																{candidate.urgencyStatus === "completed" && "Завершено"}
															</span>
														</td>

														<td>
															<span style={{ fontSize: "0.8125rem", color: "var(--rm-text-main)" }}>
																{candidate.attendingDoctorName || "—"}
															</span>
														</td>

														<td>
															<select
																style={{
																	padding: "6px 8px",
																	borderRadius: "6px",
																	border: "1px solid var(--rm-border)",
																	background: "var(--rm-surface)",
																	color: "var(--rm-text-main)",
																	fontSize: "0.8125rem",
																	minHeight: "44px",
																}}
																value={candidate.status}
																onChange={(e) =>
																	handleStatusUpdate(
																		candidate.id,
																		e.target.value as RecallContactStatus,
																	)
																}
															>
																<option value="due_now">Пора звать</option>
																<option value="invited">Приглашен</option>
																<option value="scheduled">Записался</option>
																<option value="completed">Завершен</option>
																<option value="declined">Отказ / Перенос</option>
															</select>
														</td>

														<td>
															<div className="recall-actions-cell">
																{/* WhatsApp */}
																<button
																	type="button"
																	className="recall-action-btn recall-action-btn--whatsapp"
																	title="Отправить готовое сообщение в WhatsApp"
																	style={{ minHeight: "44px" }}
																	onClick={() => void handleWhatsApp(candidate)}
																	data-testid={`recall-whatsapp-btn-${candidate.id}`}
																>
																	<MessageCircle size={16} />
																	<span>WhatsApp</span>
																</button>

																{/* Telegram */}
																<button
																	type="button"
																	className="recall-action-btn recall-action-btn--telegram"
																	title="Отправить персонализированное сообщение в Telegram"
																	style={{ minHeight: "44px" }}
																	onClick={() => void handleTelegram(candidate)}
																	data-testid={`recall-telegram-btn-${candidate.id}`}
																>
																	<Send size={16} />
																	<span>TG</span>
																</button>

																{/* Скрипт */}
																<button
																	type="button"
																	className={`recall-action-btn recall-action-btn--script ${isScriptActive ? "active" : ""}`}
																	title="Открыть речевой скрипт для администратора"
																	style={{ minHeight: "44px" }}
																	onClick={() => handleToggleScript(candidate)}
																	data-testid={`recall-script-btn-${candidate.id}`}
																>
																	<PhoneCall size={16} />
																	<span>Скрипт</span>
																</button>

																{/* Записать */}
																<button
																	type="button"
																	className="recall-action-btn recall-action-btn--book"
																	title="Записать пациента на прием"
																	style={{ minHeight: "44px" }}
																	onClick={() => handleBook(candidate)}
																	data-testid={`recall-book-btn-${candidate.id}`}
																>
																	<Calendar size={16} />
																	<span>Записать</span>
																</button>

																{/* SMS */}
																<button
																	type="button"
																	className="recall-action-btn"
																	title="Скопировать SMS текст"
																	style={{ minHeight: "44px" }}
																	onClick={() => handleCopySms(candidate)}
																	data-testid={`recall-sms-btn-${candidate.id}`}
																>
																	{copiedCandidateId === candidate.id ? (
																		<span style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
																			<Check size={14} />
																			<span>Скопировано</span>
																		</span>
																	) : (
																		<span>SMS</span>
																	)}
																</button>
															</div>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							)}

							{/* Objection Script Drawer */}
							{activeScriptCandidate ? (
								<section
									className="recall-script-drawer"
									aria-labelledby="script-hub-heading"
									data-testid="recall-script-drawer"
								>
									{(() => {
										const script =
											CLINICAL_CALLING_SCRIPTS[activeScriptCandidate.cycleType] ||
											CLINICAL_CALLING_SCRIPTS.standard_prophylaxis;
										const firstName = activeScriptCandidate.fullName.split(" ")[1] || activeScriptCandidate.fullName;
										const doctorName = activeScriptCandidate.attendingDoctorName || "лечащий врач";
										const currentObjection =
											script.objections.find((o) => o.id === selectedObjectionId) ||
											script.objections[0];

										return (
											<>
												<div className="recall-script-drawer-header">
													<div className="recall-script-title" id="script-hub-heading">
														<Phone size={18} />
														<span>
															Речевой скрипт: {activeScriptCandidate.fullName} ({RECALL_CYCLE_CATALOG[activeScriptCandidate.cycleType]?.title})
														</span>
													</div>
													<button
														type="button"
														className="recall-close-btn"
														style={{ minHeight: "36px", minWidth: "36px" }}
														onClick={() => setActiveScriptCandidate(null)}
														aria-label="Закрыть скрипт"
													>
														<X size={16} />
													</button>
												</div>

												<div className="recall-script-content-box">
													<div style={{ marginBottom: "8px" }}>
														<strong>1. Приветствие и цель звонка:</strong>
														<p style={{ margin: "4px 0" }}>
															{script.greeting
																.replace(/\{\{PATIENT_FIRST_NAME\}\}/g, firstName)
																.replace(/\{\{CLINIC_NAME\}\}/g, clinicName)
																.replace(/\{\{DOCTOR_NAME\}\}/g, doctorName)}
														</p>
													</div>

													<div style={{ marginBottom: "8px" }}>
														<strong>2. Клиническое обоснование:</strong>
														<p style={{ margin: "4px 0" }}>
															{script.clinicalContext
																.replace(/\{\{PATIENT_FIRST_NAME\}\}/g, firstName)
																.replace(/\{\{CLINIC_NAME\}\}/g, clinicName)
																.replace(/\{\{DOCTOR_NAME\}\}/g, doctorName)}
														</p>
													</div>

													<div style={{ marginBottom: "12px" }}>
														<strong>3. Призыв к действию (выбор слота):</strong>
														<p style={{ margin: "4px 0", color: "var(--rm-primary)", fontWeight: 600 }}>
															{script.callToAction
																.replace(/\{\{PATIENT_FIRST_NAME\}\}/g, firstName)
																.replace(/\{\{DOCTOR_NAME\}\}/g, doctorName)}
														</p>
													</div>

													{/* Objections */}
													{script.objections.length > 0 ? (
														<div>
															<strong style={{ display: "block", marginBottom: "6px" }}>
																Отработка типичных возражений:
															</strong>
															<div className="recall-script-tabs">
																{script.objections.map((obj) => (
																	<button
																		key={obj.id}
																		type="button"
																		className={`recall-script-tab-btn ${
																			selectedObjectionId === obj.id ? "active" : ""
																		}`}
																		onClick={() => setSelectedObjectionId(obj.id)}
																	>
																		{obj.title}
																	</button>
																))}
															</div>

															{currentObjection ? (
																<div className="recall-script-content-box" style={{ background: "var(--rm-surface)" }}>
																	<div>
																		<em>Пациент говорит:</em> {currentObjection.patientPhrase}
																	</div>
																	<div className="recall-script-suggested-text">
																		<strong>Что ответить администратору:</strong>
																		<div>
																			{currentObjection.suggestedResponse
																				.replace(/\{\{PATIENT_FIRST_NAME\}\}/g, firstName)
																				.replace(/\{\{DOCTOR_NAME\}\}/g, doctorName)}
																		</div>
																	</div>
																	<div className="recall-script-tip flex items-start gap-1.5">
																		<Lightbulb size={13} className="text-amber-500 shrink-0 mt-0.5" />
																		<span>Совет: {currentObjection.psychologicalTip}</span>
																	</div>
																</div>
															) : null}
														</div>
													) : null}
												</div>
											</>
										);
									})()}
								</section>
							) : null}
						</main>
					</>
				) : (
					/* Tab 2: Cohorts & Retention Matrix */
					<main className="recall-content-area" data-testid="recall-cohorts-view">
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
							<div>
								<h3 style={{ margin: 0, fontSize: "1.0625rem", color: "var(--rm-text-main)" }}>
									Когортная аналитика возвращаемости и LTV recall-пациентов
								</h3>
								<p style={{ margin: "2px 0 0", fontSize: "0.8125rem", color: "var(--rm-text-muted)" }}>
									Группировка пациентов по периодам визитов и оценка эффективности повторного привлечения
								</p>
							</div>

							<div style={{ display: "flex", gap: "6px" }}>
								<button
									type="button"
									className={`recall-chip ${cohortGrouping === "month" ? "active" : ""}`}
									onClick={() => setCohortGrouping("month")}
								>
									По месяцам
								</button>
								<button
									type="button"
									className={`recall-chip ${cohortGrouping === "quarter" ? "active" : ""}`}
									onClick={() => setCohortGrouping("quarter")}
								>
									По кварталам
								</button>
							</div>
						</div>

						<div className="recall-table-wrap">
							<table className="recall-table">
								<thead>
									<tr>
										<th scope="col">Когорта (Период)</th>
										<th scope="col">Пациентов</th>
										<th scope="col">Пора звать</th>
										<th scope="col">Приглашены</th>
										<th scope="col">Записались</th>
										<th scope="col">Пришли</th>
										<th scope="col">Отказ</th>
										<th scope="col">Retention Rate %</th>
										<th scope="col">Конверсия %</th>
										<th scope="col">Средний LTV</th>
										<th scope="col">Выручка визитов</th>
									</tr>
								</thead>
								<tbody>
									{cohortReport.cohorts.map((cohort) => (
										<tr key={cohort.cohortKey} data-testid={`cohort-row-${cohort.cohortKey}`}>
											<td style={{ fontWeight: 700 }}>{cohort.cohortLabel}</td>
											<td>{cohort.totalPatients}</td>
											<td>{cohort.dueCount}</td>
											<td>{cohort.contactedCount}</td>
											<td>{cohort.scheduledCount}</td>
											<td style={{ color: "var(--rm-success)", fontWeight: 700 }}>
												{cohort.completedCount}
											</td>
											<td style={{ color: "var(--rm-danger)" }}>{cohort.declinedCount}</td>
											<td>
												<span className="recall-badge recall-badge--upcoming" style={{ fontWeight: 800 }}>
													{cohort.retentionRatePercent}%
												</span>
											</td>
											<td>
												<span className="recall-badge recall-badge--completed">
													{cohort.conversionRatePercent}%
												</span>
											</td>
											<td>{cohort.averageLtvRub.toLocaleString("ru-RU")} ₽</td>
											<td style={{ fontWeight: 700, color: "var(--rm-text-main)" }}>
												{cohort.totalRevenueRub.toLocaleString("ru-RU")} ₽
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{/* Cohort Summary Footer Cards */}
						<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginTop: "16px" }}>
							<div className="recall-metric-card recall-metric-card--success">
								<span className="recall-metric-label">Общая возвращаемость (Retention)</span>
								<div className="recall-metric-value-row">
									<span className="recall-metric-value">{cohortReport.overallRetentionRatePercent}%</span>
								</div>
							</div>

							<div className="recall-metric-card recall-metric-card--primary">
								<span className="recall-metric-label">Общая конверсия реестра</span>
								<div className="recall-metric-value-row">
									<span className="recall-metric-value">{cohortReport.overallConversionRatePercent}%</span>
								</div>
							</div>

							<div className="recall-metric-card">
								<span className="recall-metric-label">Выручка от повторных визитов</span>
								<div className="recall-metric-value-row">
									<span className="recall-metric-value">
										{cohortReport.totalRecallRevenueRub.toLocaleString("ru-RU")} ₽
									</span>
								</div>
							</div>

							<div className="recall-metric-card recall-metric-card--danger">
								<span className="recall-metric-label">Упущенная выгода (не дошли)</span>
								<div className="recall-metric-value-row">
									<span className="recall-metric-value">
										{cohortReport.totalLostRevenueRub.toLocaleString("ru-RU")} ₽
									</span>
								</div>
							</div>
						</div>
					</main>
				)}

				{/* Tab 3: StomX Task Calls & Patient Care Workflow */}
				{activeTab === "task_calls" && (
					<main className="recall-content-area" data-testid="task-calls-view-section">
						<div className="recall-toolbar">
							<div className="recall-toolbar-top">
								<div className="recall-search-input-wrap">
									<Search size={16} className="recall-search-icon" aria-hidden="true" />
									<label htmlFor="task-call-search-input" className="sr-only">
										Поиск по пациенту, телефону или врачу
									</label>
									<input
										id="task-call-search-input"
										type="search"
										className="recall-search-input"
										placeholder="Поиск по пациенту, телефону или врачу..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
									/>
								</div>

								{activeTaskCallScriptType ? (
									<button
										type="button"
										onClick={() => setActiveTaskCallScriptType(null)}
										className="recall-action-btn"
										style={{ minHeight: "44px" }}
									>
										<span>Скрыть речевой скрипт</span>
									</button>
								) : null}
							</div>

							{/* StomX 7 Task Call Category Chips */}
							<div className="recall-status-chips" role="radiogroup" aria-label="Фильтр по типам сервисных звонков StomX">
								<button
									type="button"
									data-testid="chip-task-call-all"
									className={`recall-chip ${selectedTaskCallType === "all" ? "active" : ""}`}
									onClick={() => setSelectedTaskCallType("all")}
								>
									Все задачи
									<span className="recall-chip-badge">{taskCallCandidates.length}</span>
								</button>

								{STOMX_TASK_CALLS_CATALOG.map((cat) => {
									const count = taskCallCandidates.filter((item) => item.taskType === cat.type).length;
									return (
										<button
											key={cat.type}
											type="button"
											data-testid={`chip-task-call-${cat.type}`}
											className={`recall-chip ${selectedTaskCallType === cat.type ? "active" : ""}`}
											onClick={() => setSelectedTaskCallType(cat.type)}
										>
											{cat.shortLabelRu}
											{count > 0 ? <span className="recall-chip-badge">{count}</span> : null}
										</button>
									);
								})}
							</div>
						</div>

						{/* Contextual Speech Script Banner */}
						{activeTaskCallScriptType ? (
							<div
								data-testid="task-call-script-banner"
								style={{
									margin: "0 24px 16px 24px",
									padding: "16px",
									borderRadius: "10px",
									backgroundColor: "var(--paper-soft, #f8fafc)",
									border: "1px solid var(--line, #e2e8f0)",
									display: "flex",
									flexDirection: "column",
									gap: "8px",
								}}
							>
								<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
									<div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
										<Lightbulb size={18} style={{ color: "var(--primary, #0d9488)" }} />
										<span>Речевой скрипт звонка: {STOMX_TASK_CALL_BY_TYPE[activeTaskCallScriptType]?.titleRu}</span>
									</div>
									<button
										type="button"
										onClick={() => setActiveTaskCallScriptType(null)}
										style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ink-2, #64748b)" }}
										aria-label="Закрыть скрипт"
									>
										<X size={16} />
									</button>
								</div>
								<p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.5, color: "var(--ink-2, #334155)", fontStyle: "italic" }}>
									{STOMX_TASK_CALL_BY_TYPE[activeTaskCallScriptType]?.defaultScriptRu}
								</p>
								<div style={{ fontSize: "0.75rem", color: "var(--ink-2, #64748b)" }}>
									Срок регламентного контакта: {STOMX_TASK_CALL_BY_TYPE[activeTaskCallScriptType]?.defaultDueDays === 0 ? "В день события" : `через ${STOMX_TASK_CALL_BY_TYPE[activeTaskCallScriptType]?.defaultDueDays} дн.`}
								</div>
							</div>
						) : null}

						{/* Task Call Cards or Empty State */}
						{taskCallCandidates.length === 0 ? (
							<div className="recall-empty-state" data-testid="task-calls-empty-state">
								<PhoneCall size={48} className="recall-empty-icon" aria-hidden="true" />
								<h3 className="recall-empty-title">Все плановые звонки выполнены</h3>
								<p className="recall-empty-text">
									В выбранной категории сервисных звонков StomX нет ожидающих пациентов.
									Новые задачи формируются автоматически при завершении приемов, операций и истечении сроков планов лечения.
								</p>
							</div>
						) : (
							<div style={{ padding: "0 24px 24px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
								{taskCallCandidates.map(({ candidate, taskType }) => {
									const meta = STOMX_TASK_CALL_BY_TYPE[taskType];
									return (
										<div
											key={candidate.id}
											data-testid={`task-call-card-${candidate.id}`}
											style={{
												padding: "16px",
												borderRadius: "10px",
												backgroundColor: "var(--paper, #ffffff)",
												border: "1px solid var(--line, #e2e8f0)",
												display: "grid",
												gridTemplateColumns: "1fr auto",
												alignItems: "center",
												gap: "16px",
											}}
										>
											<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
												<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
													<span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--ink, #0f172a)" }}>
														{candidate.fullName}
													</span>
													{candidate.phone ? (
														<a
															href={`tel:${candidate.phone.replace(/[^+\d]/g, "")}`}
															style={{ fontSize: "0.8125rem", color: "var(--primary, #0d9488)", textDecoration: "none", fontWeight: 600 }}
														>
															{candidate.phone}
														</a>
													) : null}
													<span
														className="recall-badge"
														style={{
															backgroundColor: "rgba(13, 148, 136, 0.1)",
															color: "var(--primary, #0d9488)",
															fontWeight: 700,
														}}
													>
														{meta?.titleRu || "Сервисный звонок"}
													</span>
													{candidate.daysOverdue > 0 ? (
														<span className="recall-badge recall-badge--overdue">
															Просрочен на {candidate.daysOverdue} дн.
														</span>
													) : (
														<span className="recall-badge recall-badge--upcoming">
															Срок: {candidate.dueDate}
														</span>
													)}
												</div>

												<div style={{ fontSize: "0.8125rem", color: "var(--ink-2, #64748b)" }}>
													{candidate.attendingDoctorName ? (
														<span>Врач: <strong>{candidate.attendingDoctorName}</strong> • </span>
													) : null}
													<span>Последний визит: {candidate.lastVisitDate}</span>
													{candidate.clinicalNotes ? (
														<span> • {candidate.clinicalNotes}</span>
													) : null}
												</div>
											</div>

											{/* Action Buttons */}
											<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
												{candidate.phone ? (
													<a
														href={`tel:${candidate.phone.replace(/[^+\d]/g, "")}`}
														className="recall-action-btn"
														style={{ minHeight: "44px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
														data-testid={`btn-call-phone-${candidate.id}`}
													>
														<Phone size={16} />
														<span>Позвонить</span>
													</a>
												) : null}

												<button
													type="button"
													className="recall-action-btn recall-action-btn--whatsapp"
													style={{ minHeight: "44px" }}
													onClick={() => void handleWhatsApp(candidate)}
													data-testid={`btn-call-wa-${candidate.id}`}
												>
													<MessageCircle size={16} />
													<span>WhatsApp</span>
												</button>

												<button
													type="button"
													className="recall-action-btn recall-action-btn--telegram"
													style={{ minHeight: "44px" }}
													onClick={() => void handleTelegram(candidate)}
													data-testid={`btn-call-tg-${candidate.id}`}
												>
													<Send size={16} />
													<span>TG</span>
												</button>

												<button
													type="button"
													className={`recall-action-btn recall-action-btn--script ${activeTaskCallScriptType === taskType ? "active" : ""}`}
													style={{ minHeight: "44px" }}
													onClick={() => setActiveTaskCallScriptType(activeTaskCallScriptType === taskType ? null : taskType)}
													data-testid={`btn-call-script-${candidate.id}`}
													title="Показать речевой скрипт для этой задачи"
												>
													<Lightbulb size={16} />
													<span>Скрипт</span>
												</button>

												<button
													type="button"
													className="recall-action-btn recall-action-btn--book"
													style={{ minHeight: "44px" }}
													onClick={() => handleBook(candidate)}
													data-testid={`btn-call-book-${candidate.id}`}
												>
													<Calendar size={16} />
													<span>Записать</span>
												</button>

												<button
													type="button"
													className="recall-action-btn"
													style={{ minHeight: "44px", color: "var(--ok-fg, #047857)" }}
													onClick={() => handleStatusUpdate(candidate.id, "scheduled")}
													data-testid={`btn-call-done-${candidate.id}`}
													title="Отметить успешный контакт"
												>
													<Check size={16} />
													<span>Успех</span>
												</button>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</main>
				)}
			</div>
		</div>
	);
};

export default PatientRecallsHubModal;
