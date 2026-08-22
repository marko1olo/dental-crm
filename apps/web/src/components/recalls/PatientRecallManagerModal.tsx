/**
 * Patient Recall & Clinical Prophylaxis Manager HUD (DOMAIN: RECALLS)
 *
 * Touch-First интерфейс управления диспансеризацией, профилактическими вызовами и возвратом пациентов.
 * Интегрирован с омниканальными шаблонами (WhatsApp / Telegram / SMS), скриптами обзвона и метриками конверсии.
 */

import type React from "react";
import { useId, useMemo, useState } from "react";
import {
	AlertTriangle,
	Calendar,
	CheckCircle2,
	Clock,
	MessageCircle,
	Phone,
	PhoneCall,
	RotateCcw,
	Search,
	ShieldCheck,
	X,
} from "lucide-react";
import {
	RECALL_CYCLE_CATALOG,
	calculateRecallMetrics,
	filterAndSortRecallCandidates,
	type PatientRecallCandidate,
	type RecallContactStatus,
	type RecallCycleType,
	type RecallUrgencyStatus,
} from "./recallEngine";
import {
	CLINICAL_CALLING_SCRIPTS,
	buildWhatsAppUrl,
	generateSmsRecallMessage,
	generateWhatsAppRecallMessage,
} from "./recallTemplates";
import "./patientRecalls.css";

export interface PatientRecallManagerModalProps {
	readonly isOpen?: boolean | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly clinicName?: string | undefined;
	readonly initialCandidates?: readonly PatientRecallCandidate[] | undefined;
	readonly onBookAppointment?: ((candidate: PatientRecallCandidate) => void) | undefined;
	readonly onSendWhatsApp?: (
		(candidate: PatientRecallCandidate, message: string) => Promise<void> | void
	) | undefined;
	readonly onStatusChange?: (
		(candidateId: string, status: RecallContactStatus) => Promise<void> | void
	) | undefined;
}

/**
 * Базовый демонстрационный клинический пул пациентов диспансерного учета (если не передан извне).
 */
const DEFAULT_CANDIDATES: readonly PatientRecallCandidate[] = [
	{
		id: "rec-001",
		patientId: "pat-101",
		fullName: "Смирнов Алексей Викторович",
		phone: "+7 (916) 450-12-34",
		email: "smirnov.av@example.com",
		cycleType: "caries_high_risk",
		lastVisitDate: "2026-05-10",
		dueDate: "2026-08-10",
		daysOverdue: 12,
		urgencyStatus: "due_now",
		attendingDoctorId: "doc-1",
		attendingDoctorName: "Д-р Кузнецова Е.В.",
		lastProcedures: ["Лечение глубокого кариеса 3.6, 3.7", "Реставрация Estelite"],
		clinicalNotes: "Высокий КПУ (14). Необходим контроль краевого прилегания пломб и глубокое фторирование.",
		status: "pending",
	},
	{
		id: "rec-002",
		patientId: "pat-102",
		fullName: "Волкова Мария Сергеевна",
		phone: "+7 (925) 780-99-11",
		email: "volkova.m@example.com",
		cycleType: "periodontal_maintenance",
		lastVisitDate: "2026-04-15",
		dueDate: "2026-07-15",
		daysOverdue: 38,
		urgencyStatus: "overdue_30",
		attendingDoctorId: "doc-2",
		attendingDoctorName: "Д-р Морозов А.И.",
		lastProcedures: ["Кюретаж пародонтальных карманов", "Вектор-терапия"],
		periodontalPocketMaxMm: 5,
		clinicalNotes: "Хронический пародонтит средней степени. Глубина карманов 5 мм во фронтальном отделе нижней челюсти.",
		status: "pending",
	},
	{
		id: "rec-003",
		patientId: "pat-103",
		fullName: "Иванов Дмитрий Павлович",
		phone: "+7 (903) 111-22-33",
		email: "ivanov.dp@example.com",
		cycleType: "implant_monitoring",
		lastVisitDate: "2026-02-18",
		dueDate: "2026-06-18",
		daysOverdue: 65,
		urgencyStatus: "overdue_30",
		attendingDoctorId: "doc-3",
		attendingDoctorName: "Д-р Васильев П.Н.",
		implantsCount: 3,
		lastProcedures: ["Установка коронок из диоксида циркония на имплантатах 4.6, 4.7"],
		clinicalNotes: "Контроль остеоинтеграции и краевой кости. Требуется прицельный снимок.",
		status: "contacted",
		lastContactedAt: "2026-08-01T10:00:00Z",
		lastContactChannel: "whatsapp",
	},
	{
		id: "rec-004",
		patientId: "pat-104",
		fullName: "Петрова Анна Владимировна",
		phone: "+7 (985) 321-65-40",
		email: "petrova.anna@example.com",
		cycleType: "orthodontic_retention",
		lastVisitDate: "2026-05-20",
		dueDate: "2026-08-20",
		daysOverdue: 2,
		urgencyStatus: "due_now",
		attendingDoctorId: "doc-4",
		attendingDoctorName: "Д-р Соколова Н.А.",
		lastProcedures: ["Снятие брекет-системы Damon", "Фиксация несъемного ретейнера 1.3-2.3, 3.3-4.3"],
		clinicalNotes: "Ретенционный период 3-й месяц. Проверка прилегания ночной каппы.",
		status: "scheduled",
		scheduledDate: "2026-08-25T14:00:00Z",
	},
	{
		id: "rec-005",
		patientId: "pat-105",
		fullName: "Соколов Артем Михайлович (ребенок 8 лет)",
		phone: "+7 (916) 999-88-77",
		email: "sokolova.mama@example.com",
		cycleType: "pediatric_fluoridation",
		lastVisitDate: "2026-05-12",
		dueDate: "2026-08-12",
		daysOverdue: 10,
		urgencyStatus: "due_now",
		attendingDoctorId: "doc-5",
		attendingDoctorName: "Д-р Романова О.В.",
		lastProcedures: ["Герметизация фиссур 1.6, 2.6", "Фторирование Clinpro"],
		clinicalNotes: "Несозревшая эмаль 6-х зубов. Повторная ремотерапия.",
		status: "pending",
	},
	{
		id: "rec-006",
		patientId: "pat-106",
		fullName: "Федоров Сергей Николаевич",
		phone: "+7 (977) 555-44-33",
		email: "fedorov.sn@example.com",
		cycleType: "standard_prophylaxis",
		lastVisitDate: "2025-11-10",
		dueDate: "2026-05-10",
		daysOverdue: 104,
		urgencyStatus: "overdue_90",
		attendingDoctorId: "doc-1",
		attendingDoctorName: "Д-р Кузнецова Е.В.",
		lastProcedures: ["Комплексная профгигиена Air-Flow", "Осмотр"],
		clinicalNotes: "Пропустил плановый майский осмотр. Высокий риск снятия с гарантии.",
		status: "pending",
	},
	{
		id: "rec-007",
		patientId: "pat-107",
		fullName: "Григорьева Елена Викторовна",
		phone: "+7 (905) 777-66-55",
		email: "grigorieva.e@example.com",
		cycleType: "standard_prophylaxis",
		lastVisitDate: "2026-03-01",
		dueDate: "2026-09-01",
		daysOverdue: -10,
		urgencyStatus: "upcoming",
		attendingDoctorId: "doc-2",
		attendingDoctorName: "Д-р Морозов А.И.",
		lastProcedures: ["Профгигиена"],
		status: "pending",
	},
];

export const PatientRecallManagerModal: React.FC<PatientRecallManagerModalProps> = ({
	isOpen = true,
	onClose,
	clinicName = "DENTE Clinic",
	initialCandidates,
	onBookAppointment,
	onSendWhatsApp,
	onStatusChange,
}) => {
	const searchInputId = useId();
	const cycleSelectId = useId();

	const [candidates, setCandidates] = useState<readonly PatientRecallCandidate[]>(
		initialCandidates && initialCandidates.length > 0
			? initialCandidates
			: DEFAULT_CANDIDATES,
	);

	const [selectedUrgency, setSelectedUrgency] = useState<RecallUrgencyStatus | "all">("all");
	const [selectedCycle, setSelectedCycle] = useState<RecallCycleType | "all">("all");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [activeScriptCandidate, setActiveScriptCandidate] =
		useState<PatientRecallCandidate | null>(null);
	const [selectedObjectionId, setSelectedObjectionId] = useState<string>("");
	const [copiedCandidateId, setCopiedCandidateId] = useState<string | null>(null);
	const [statusNotice, setStatusNotice] = useState<string | null>(null);

	// Расчет сводных метрик конверсии и диспансеризации
	const metrics = useMemo(() => {
		return calculateRecallMetrics(candidates);
	}, [candidates]);

	// Фильтрация и сортировка кандидатов
	const filteredCandidates = useMemo(() => {
		return filterAndSortRecallCandidates(candidates, {
			urgencyStatus: selectedUrgency,
			cycleType: selectedCycle,
			searchQuery,
			sortBy: "daysOverdue",
			sortDirection: "desc",
		});
	}, [candidates, selectedUrgency, selectedCycle, searchQuery]);

	// Обновление статуса контакта
	const updateCandidateStatus = (
		candidateId: string,
		newStatus: RecallContactStatus,
		channel?: "whatsapp" | "telegram" | "sms" | "phone",
	) => {
		setCandidates((prev) =>
			prev.map((c) => {
				if (c.id !== candidateId) return c;
				const updated: PatientRecallCandidate = {
					...c,
					status: newStatus,
					lastContactedAt:
						newStatus === "contacted"
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

	// Открытие 1-Click WhatsApp
	const handleWhatsAppClick = async (candidate: PatientRecallCandidate) => {
		const message = generateWhatsAppRecallMessage(candidate, { clinicName });
		if (onSendWhatsApp) {
			await onSendWhatsApp(candidate, message);
		} else {
			const url = buildWhatsAppUrl(candidate.phone, message);
			window.open(url, "_blank", "noopener,noreferrer");
		}

		// Обновляем статус на "contacted"
		updateCandidateStatus(candidate.id, "contacted", "whatsapp");
		setStatusNotice(`Сообщение для ${candidate.fullName} подготовлено.`);
		setTimeout(() => setStatusNotice(null), 3500);
	};

	// Открытие скрипта обзвона для выбранного пациента
	const handleOpenScript = (candidate: PatientRecallCandidate) => {
		if (activeScriptCandidate?.id === candidate.id) {
			setActiveScriptCandidate(null);
			setSelectedObjectionId("");
		} else {
			setActiveScriptCandidate(candidate);
			const script = CLINICAL_CALLING_SCRIPTS[candidate.cycleType] || CLINICAL_CALLING_SCRIPTS.standard_prophylaxis;
			setSelectedObjectionId(script.objections[0]?.id || "");
		}
	};

	// Копирование SMS текста в буфер
	const handleCopySms = (candidate: PatientRecallCandidate) => {
		const smsText = generateSmsRecallMessage(candidate, { clinicName });
		navigator.clipboard.writeText(smsText).catch(() => {});
		setCopiedCandidateId(candidate.id);
		setTimeout(() => setCopiedCandidateId(null), 2500);
	};

	if (!isOpen) return null;

	return (
		<div
			className="recall-manager-modal-backdrop"
			role="dialog"
			aria-modal="true"
			aria-labelledby="recall-modal-title"
		>
			<div className="recall-manager-container" data-testid="recall-manager-modal">
				{/* Header */}
				<header className="recall-header">
					<div className="recall-header-title-wrap">
						<div className="recall-header-icon" aria-hidden="true">
							<ShieldCheck size={22} />
						</div>
						<div>
							<h2 id="recall-modal-title" className="recall-header-title">
								Диспансеризация и вызов пациентов (Recall Engine)
							</h2>
							<p className="recall-header-subtitle">
								Клинические циклы профилактики, сохранение гарантий и возврат спящих пациентов
							</p>
						</div>
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
				</header>

				{/* Metrics Strip */}
				<section className="recall-metrics-grid" aria-label="Метрики диспансеризации">
					<div className="recall-metric-card recall-metric-card--primary">
						<span className="recall-metric-label">Всего в пуле</span>
						<div className="recall-metric-value-row">
							<span className="recall-metric-value">{metrics.totalCandidates}</span>
							<span className="recall-metric-subtext">пациентов</span>
						</div>
					</div>

					<div className="recall-metric-card recall-metric-card--warning">
						<span className="recall-metric-label">Срочные к вызову</span>
						<div className="recall-metric-value-row">
							<span className="recall-metric-value">{metrics.dueNowCount}</span>
							<span className="recall-metric-subtext">окно 0–30 дн.</span>
						</div>
					</div>

					<div className="recall-metric-card recall-metric-card--danger">
						<span className="recall-metric-label">Риск оттока (&gt; 90 дн.)</span>
						<div className="recall-metric-value-row">
							<span className="recall-metric-value">{metrics.overdue90Count}</span>
							<span className="recall-metric-subtext">критично</span>
						</div>
					</div>

					<div className="recall-metric-card recall-metric-card--success">
						<span className="recall-metric-label">Конверсия в визит</span>
						<div className="recall-metric-value-row">
							<span className="recall-metric-value">{metrics.conversionRatePercent}%</span>
							<span className="recall-metric-subtext">записано/пришли</span>
						</div>
					</div>

					<div className="recall-metric-card">
						<span className="recall-metric-label">Упущенная выручка</span>
						<div className="recall-metric-value-row">
							<span className="recall-metric-value">
								{(metrics.overdueEstimatedLostRevenueRub).toLocaleString("ru-RU")} ₽
							</span>
						</div>
					</div>
				</section>

				{/* Filters & Search Toolbar */}
				<div className="recall-toolbar">
					<div className="recall-toolbar-top">
						<div className="recall-search-input-wrap">
							<Search size={16} className="recall-search-icon" aria-hidden="true" />
							<label htmlFor={searchInputId} className="sr-only">
								Поиск по имени, телефону или врачу
							</label>
							<input
								id={searchInputId}
								type="search"
								className="recall-search-input"
								placeholder="Поиск по ФИО, телефону или врачу..."
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
								<option value="caries_high_risk">Кариес-риск (3 мес.)</option>
								<option value="periodontal_maintenance">Пародонтология (3-4 мес.)</option>
								<option value="implant_monitoring">Импланты (4-6 мес.)</option>
								<option value="orthodontic_retention">Ортодонтия (1-3-6-12 мес.)</option>
								<option value="pediatric_fluoridation">Детская минерализация (3 мес.)</option>
							</select>
						</div>
					</div>

					{/* Status Chips */}
					<div className="recall-status-chips" role="radiogroup" aria-label="Фильтр по статусу вызова">
						<button
							type="button"
							className={`recall-chip ${selectedUrgency === "all" ? "active" : ""}`}
							onClick={() => setSelectedUrgency("all")}
						>
							Все
							<span className="recall-chip-badge">{metrics.totalCandidates}</span>
						</button>

						<button
							type="button"
							className={`recall-chip ${selectedUrgency === "due_now" ? "active" : ""}`}
							onClick={() => setSelectedUrgency("due_now")}
						>
							<Clock size={14} />
							Срочные к вызову
							<span className="recall-chip-badge">{metrics.dueNowCount}</span>
						</button>

						<button
							type="button"
							className={`recall-chip ${selectedUrgency === "overdue_30" ? "active" : ""}`}
							onClick={() => setSelectedUrgency("overdue_30")}
						>
							<AlertTriangle size={14} />
							Просрочено 1–3 мес.
							<span className="recall-chip-badge">{metrics.overdue30Count}</span>
						</button>

						<button
							type="button"
							className={`recall-chip ${selectedUrgency === "overdue_90" ? "active" : ""}`}
							onClick={() => setSelectedUrgency("overdue_90")}
						>
							<RotateCcw size={14} />
							Критично &gt; 90 дн.
							<span className="recall-chip-badge">{metrics.overdue90Count}</span>
						</button>

						<button
							type="button"
							className={`recall-chip ${selectedUrgency === "upcoming" ? "active" : ""}`}
							onClick={() => setSelectedUrgency("upcoming")}
						>
							<Calendar size={14} />
							К визиту (скоро)
							<span className="recall-chip-badge">{metrics.upcomingCount}</span>
						</button>

						<button
							type="button"
							className={`recall-chip ${selectedUrgency === "completed" ? "active" : ""}`}
							onClick={() => setSelectedUrgency("completed")}
						>
							<CheckCircle2 size={14} />
							Завершено
							<span className="recall-chip-badge">{metrics.completedCount}</span>
						</button>
					</div>
				</div>

				{/* Notice Banner */}
				{statusNotice ? (
					<div
						style={{
							background: "var(--rm-success-light)",
							color: "var(--rm-success)",
							padding: "10px 24px",
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

				{/* Content Area */}
				<main className="recall-content-area">
					{filteredCandidates.length === 0 ? (
						<div className="recall-empty-state">
							<div className="recall-empty-icon">🎉</div>
							<h3>Нет пациентов по выбранным фильтрам</h3>
							<p>Все пациенты в данной категории либо уже записаны, либо срок вызова еще не подошел.</p>
						</div>
					) : (
						<div className="recall-table-wrap">
							<table className="recall-table">
								<thead>
									<tr>
										<th scope="col">Пациент</th>
										<th scope="col">Клинический цикл</th>
										<th scope="col">Последний визит / Срок</th>
										<th scope="col">Срочность</th>
										<th scope="col">Врач</th>
										<th scope="col">Статус контакта</th>
										<th scope="col">1-Click Действия</th>
									</tr>
								</thead>
								<tbody>
									{filteredCandidates.map((candidate) => {
										const cycleDef = RECALL_CYCLE_CATALOG[candidate.cycleType];
										const isScriptActive = activeScriptCandidate?.id === candidate.id;

										return (
											<tr key={candidate.id} data-testid={`recall-row-${candidate.id}`}>
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
															updateCandidateStatus(
																candidate.id,
																e.target.value as RecallContactStatus,
															)
														}
													>
														<option value="pending">Ожидает вызова</option>
														<option value="contacted">Связались</option>
														<option value="scheduled">Записан на прием</option>
														<option value="completed">Визит завершен</option>
														<option value="declined">Отказ / Перенос</option>
													</select>
												</td>

												<td>
													<div className="recall-actions-cell">
														{/* WhatsApp 1-Click */}
														<button
															type="button"
															className="recall-action-btn recall-action-btn--whatsapp"
															title="Отправить готовое персонализированное сообщение в WhatsApp"
															disabled={!candidate.phone}
															onClick={() => void handleWhatsAppClick(candidate)}
														>
															<MessageCircle size={16} />
															<span>WhatsApp</span>
														</button>

														{/* Скрипт звонка */}
														<button
															type="button"
															className={`recall-action-btn recall-action-btn--script ${isScriptActive ? "active" : ""}`}
															title="Открыть речевой скрипт для администратора и отработку возражений"
															onClick={() => handleOpenScript(candidate)}
														>
															<PhoneCall size={16} />
															<span>Скрипт</span>
														</button>

														{/* Записать в сетку */}
														<button
															type="button"
															className="recall-action-btn recall-action-btn--book"
															title="Открыть расписание и забронировать слот"
															onClick={() => {
																if (onBookAppointment) {
																	onBookAppointment(candidate);
																} else {
																	updateCandidateStatus(candidate.id, "scheduled");
																	setStatusNotice(`Пациент ${candidate.fullName} переведен в статус «Записан».`);
																}
															}}
														>
															<Calendar size={16} />
															<span>Записать</span>
														</button>

														{/* SMS Копия */}
														<button
															type="button"
															className="recall-action-btn"
															title="Скопировать короткий SMS текст"
															disabled={!candidate.phone}
															onClick={() => handleCopySms(candidate)}
														>
															{copiedCandidateId === candidate.id ? "Скопировано ✓" : "SMS"}
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

					{/* Objection Script Helper Drawer */}
					{activeScriptCandidate ? (
						<section
							className="recall-script-drawer"
							aria-labelledby="script-drawer-heading"
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
											<div className="recall-script-title" id="script-drawer-heading">
												<Phone size={18} />
												<span>
													Клинический скрипт звонка: {activeScriptCandidate.fullName} ({RECALL_CYCLE_CATALOG[activeScriptCandidate.cycleType]?.title})
												</span>
											</div>
											<button
												type="button"
												className="recall-close-btn"
												style={{ minHeight: "36px", minWidth: "36px" }}
												onClick={() => setActiveScriptCandidate(null)}
												aria-label="Закрыть панель скрипта"
											>
												<X size={16} />
											</button>
										</div>

										<div className="recall-script-content-box">
											<div style={{ marginBottom: "8px" }}>
												<strong>1. Приветствие и цель:</strong>
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
												<strong>3. Предложение слота (Призыв к действию):</strong>
												<p style={{ margin: "4px 0", color: "var(--rm-primary)", fontWeight: 600 }}>
													{script.callToAction
														.replace(/\{\{PATIENT_FIRST_NAME\}\}/g, firstName)
														.replace(/\{\{DOCTOR_NAME\}\}/g, doctorName)}
												</p>
											</div>

											{/* Objection Handling Tabs */}
											{script.objections.length > 0 ? (
												<div>
													<strong style={{ display: "block", marginBottom: "6px" }}>
														Отработка типичных возражений пациента:
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
															<div className="recall-script-tip">
																💡 Совет: {currentObjection.psychologicalTip}
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
			</div>
		</div>
	);
};

export default PatientRecallManagerModal;
