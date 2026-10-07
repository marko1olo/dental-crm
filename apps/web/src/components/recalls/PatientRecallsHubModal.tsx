/**
 * Patient Recalls & Dispensary Hub Modal (DOMAIN: RECALLS)
 *
 * Touch-First интерфейс плановых профосмотров, автоматических вызовов и когортного анализа удержания (Retention Rate & LTV).
 * Интегрирован со специализированными интервалами (гигиена, импланты, ортодонтия, детство),
 * 1-кликовой отправкой (WhatsApp / Telegram / SMS) и речевыми скриптами с отработкой возражений.
 */

import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	AlertTriangle, BarChart3, Calendar, CheckCircle2, Clock,
	LayoutGrid, Lightbulb, List, Phone, PhoneCall,
	RefreshCw, RotateCcw, Search, Send, ShieldCheck,
	Sparkles, Users, X,
} from "lucide-react";
import type {
	RecallCandidate,
	RecallReport,
	StomxTaskCallType,
} from "@dental/shared";
import { useAppStore } from "../../store/appStore";
import { useScheduleStore } from "../../store/scheduleStore";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { showToast } from "../GlobalToast";
import {
	addCalendarMonthsSafe, buildTelegramUrl, buildWhatsAppUrl,
	calculateCohortRetention, calculateRecallMetrics,
	determineTaskCallTypeForCandidate, filterAndSortRecallCandidates,
	formatIsoDateOnly, generatePdnProtectedRecallMessage,
	sendRecallCandidateInvite, sendRecallCandidateStatusUpdate,
	toCanonicalRecallStatus,
	type CanonicalRecallWorkflowStatus, type ClinicalRecallTriggerType,
	type PatientRecallRecord, type RecallContactStatus,
	type RecallCycleType, type RecallPeriodFilter,
	type RecallUrgencyStatus,
} from "./patientRecallEngine";
import { CLINICAL_CALLING_SCRIPTS } from "./recallTemplates";
import { PatientRecallsCohortsTab } from "./PatientRecallsCohortsTab";
import { PatientRecallsTaskCallsTab } from "./PatientRecallsTaskCallsTab";
import { PatientRecallsPreviewModals } from "./PatientRecallsPreviewModals";
import { PatientRecallsTableView } from "./PatientRecallsTableView";
import { PatientRecallsKanbanView } from "./PatientRecallsKanbanView";
import { PatientRecallsToolbar } from "./PatientRecallsToolbar";
import "./recalls.css";
import "./recallsKanban.css";

/**
 * Адаптер: канонический RecallCandidate из PostgreSQL -> PatientRecallRecord для хаба
 */
export function mapRecallCandidateToRecord(
	candidate: RecallCandidate,
): PatientRecallRecord {
	const months = candidate.monthsSinceLastVisit ?? 6;
	const interval = candidate.suggestedIntervalMonths ?? 6;
	const daysOverdue = Math.max(0, (months - interval) * 30);

	let urgencyStatus: RecallUrgencyStatus = "due_now";
	if (candidate.band === "probably_lost") {
		urgencyStatus = "overdue_90";
	} else if (candidate.band === "overdue") {
		urgencyStatus = "overdue_30";
	} else if (candidate.band === "due") {
		urgencyStatus = "due_now";
	}

	const lastVisitDate = candidate.lastCompletedAt
		? formatIsoDateOnly(new Date(candidate.lastCompletedAt))
		: formatIsoDateOnly(addCalendarMonthsSafe(new Date(), -months));

	const dueDateTime = candidate.lastCompletedAt
		? addCalendarMonthsSafe(new Date(candidate.lastCompletedAt), interval)
		: new Date();
	const dueDate = formatIsoDateOnly(dueDateTime);

	let cycleType: RecallCycleType = "standard_prophylaxis";
	if (candidate.cohortType === "implant") {
		cycleType = "implant_monitoring";
	} else if (candidate.cohortType === "orthodontic_retention") {
		cycleType = "orthodontic_retention";
	} else if (candidate.cohortType === "hygiene_therapy") {
		cycleType = "standard_prophylaxis";
	}

	return {
		id: candidate.patientId,
		patientId: candidate.patientId,
		fullName: candidate.fullName,
		phone: candidate.phone ?? null,
		email: candidate.email ?? null,
		cycleType,
		attendingDoctorId: candidate.attendingDoctorId ?? undefined,
		attendingDoctorName: candidate.attendingDoctorName ?? undefined,
		lastVisitDate,
		dueDate,
		daysOverdue,
		urgencyStatus,
		status: "due_now",
		clinicalNotes: candidate.reason,
		historicalRevenueRub: 6500,
		visitsCount: candidate.lastCompletedAt ? 1 : 0,
	};
}

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
	const [candidates, setCandidates] = useState<readonly PatientRecallRecord[]>(
		initialCandidates ?? [],
	);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [fetchError, setFetchError] = useState<string | null>(null);
	const [openContactDropdownId, setOpenContactDropdownId] = useState<string | null>(null);

	const appLogic = useOptionalAppLogicContext();
	const auth = appLogic?.auth;

	const loadCandidates = useCallback(async () => {
		if (initialCandidates && initialCandidates.length > 0) {
			setCandidates(initialCandidates);
			return;
		}
		setIsLoading(true);
		setFetchError(null);
		try {
			const response = await fetch("/api/patients/recall-candidates?minMonths=6&limit=100", {
				headers: {
					...(auth ? auth.denteClinicalReadHeaders() : {}),
					Accept: "application/json",
				},
			});
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as { message?: string };
				throw new Error(body.message || `Сервер ответил ${response.status}`);
			}
			const payload = (await response.json()) as RecallReport;
			const mapped = (payload.candidates || []).map(mapRecallCandidateToRecord);
			setCandidates(mapped);
		} catch (err) {
			setCandidates([]);
			setFetchError(
				err instanceof Error
					? err.message
					: "Не удалось загрузить список пациентов на контрольный осмотр.",
			);
		} finally {
			setIsLoading(false);
		}
	}, [auth, initialCandidates]);

	useEffect(() => {
		if (isOpen) {
			void loadCandidates();
		}
	}, [isOpen, loadCandidates]);

	const [activeTab, setActiveTab] = useState<"registry" | "cohorts" | "task_calls">("registry");
	const [registryViewMode, setRegistryViewMode] = useState<"table" | "kanban">("table");
	const [statusFilter, setStatusFilter] = useState<
		"all" | "due_now" | "invited" | "scheduled" | "declined" | "completed"
	>("all");
	const [selectedCycle, setSelectedCycle] = useState<RecallCycleType | "all">("all");
	const [selectedTrigger, setSelectedTrigger] = useState<ClinicalRecallTriggerType | "all">("all");
	const [selectedDoctorId, setSelectedDoctorId] = useState<string | "all">("all");
	const [selectedPeriod, setSelectedPeriod] = useState<RecallPeriodFilter>("all");
	const [selectedTaskCallType, setSelectedTaskCallType] = useState<StomxTaskCallType | "all">("all");
	const [activeTaskCallScriptType, setActiveTaskCallScriptType] = useState<StomxTaskCallType | null>(null);
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [cohortGrouping, setCohortGrouping] = useState<"month" | "quarter">("month");

	const [activeScriptCandidate, setActiveScriptCandidate] =
		useState<PatientRecallRecord | null>(null);
	const [activePreviewCandidate, setActivePreviewCandidate] =
		useState<PatientRecallRecord | null>(null);
	const [previewChannel, setPreviewChannel] = useState<"sms" | "whatsapp" | "telegram">("sms");
	const [selectedObjectionId, setSelectedObjectionId] = useState<string>("");
	const [copiedCandidateId, setCopiedCandidateId] = useState<string | null>(null);
	const [statusNotice, setStatusNotice] = useState<string | null>(null);

	// Метрики плановых профосмотров и LTV
	const metrics = useMemo(() => {
		return calculateRecallMetrics(candidates);
	}, [candidates]);

	// Когортный анализ возвращаемости
	const cohortReport = useMemo(() => {
		return calculateCohortRetention(candidates, { grouping: cohortGrouping });
	}, [candidates, cohortGrouping]);

	// Список уникальных врачей для селектора
	const uniqueDoctors = useMemo(() => {
		const docMap = new Map<string, string>();
		for (const c of candidates) {
			if (c.attendingDoctorId && c.attendingDoctorName) {
				docMap.set(c.attendingDoctorId, c.attendingDoctorName);
			}
		}
		return Array.from(docMap.entries()).map(([id, name]) => ({ id, name }));
	}, [candidates]);

	// Фильтрация кандидатов по клиническому реестру
	const filteredCandidates = useMemo(() => {
		return filterAndSortRecallCandidates(candidates, {
			status: statusFilter,
			cycleType: selectedCycle,
			triggerType: selectedTrigger,
			doctorId: selectedDoctorId,
			period: selectedPeriod,
			searchQuery,
			sortBy: "daysOverdue",
			sortDirection: "desc",
		});
	}, [candidates, statusFilter, selectedCycle, selectedTrigger, selectedDoctorId, selectedPeriod, searchQuery]);

	// Группировка для 4-колоночной Канбан-доски
	const kanbanGroups = useMemo(() => {
		const groups: Record<CanonicalRecallWorkflowStatus, PatientRecallRecord[]> = {
			not_called: [],
			reached: [],
			declined: [],
			scheduled: [],
		};
		for (const candidate of filteredCandidates) {
			const canonical = toCanonicalRecallStatus(candidate.status);
			groups[canonical].push(candidate);
		}
		return groups;
	}, [filteredCandidates]);

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
		note?: string,
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

		// Persist recall status transition to PostgreSQL 18
		void sendRecallCandidateStatusUpdate({
			patientId: candidateId,
			status: newStatus,
			channel,
			note,
		}).catch((err) => {
			console.error("[PatientRecallsHubModal] Failed to persist recall status:", err);
		});

		if (onStatusChange) {
			void onStatusChange(candidateId, newStatus);
		}
	};

	// 1-Click WhatsApp (152-ФЗ PDn Protected, Mandate 8e Doctor Autonomy: zero disabled buttons)
	const handleWhatsApp = async (candidate: PatientRecallRecord) => {
		const message = generatePdnProtectedRecallMessage(candidate, { clinicName });
		if (!candidate.phone || !candidate.phone.trim()) {
			showToast(
				"У пациента не указан номер телефона. Открыт предпросмотр сообщения для отправки",
				"warning",
			);
			setActivePreviewCandidate(candidate);
			setPreviewChannel("whatsapp");
			setActiveScriptCandidate(null);
			return;
		}
		if (onSendWhatsApp) {
			await onSendWhatsApp(candidate, message);
		} else {
			const url = buildWhatsAppUrl(candidate.phone, message);
			window.open(url, "_blank", "noopener,noreferrer");
		}
		handleStatusUpdate(candidate.id, "invited", "whatsapp");

		try {
			const res = await sendRecallCandidateInvite(
				{
					patientId: candidate.patientId,
					channel: "whatsapp",
					body: message,
				},
				auth ? auth.denteClinicalMutationHeaders() : undefined,
			);
			setStatusNotice(res.message);
		} catch (inviteErr) {
			const errMsg = inviteErr instanceof Error ? inviteErr.message : String(inviteErr);
			setStatusNotice(`WhatsApp открыт. Ответ сервера: ${errMsg}`);
		}
		setTimeout(() => setStatusNotice(null), 3500);
	};

	// 1-Click Telegram (152-ФЗ PDn Protected, Mandate 8e Doctor Autonomy: zero disabled buttons)
	const handleTelegram = async (candidate: PatientRecallRecord) => {
		const message = generatePdnProtectedRecallMessage(candidate, { clinicName });
		if (!candidate.phone || !candidate.phone.trim()) {
			showToast(
				"У пациента не указан номер телефона. Открыт предпросмотр сообщения для отправки",
				"warning",
			);
			setActivePreviewCandidate(candidate);
			setPreviewChannel("telegram");
			setActiveScriptCandidate(null);
			return;
		}
		if (onSendTelegram) {
			await onSendTelegram(candidate, message);
		} else {
			const url = buildTelegramUrl(candidate.phone, message);
			window.open(url, "_blank", "noopener,noreferrer");
		}
		handleStatusUpdate(candidate.id, "invited", "telegram");

		try {
			const res = await sendRecallCandidateInvite(
				{
					patientId: candidate.patientId,
					channel: "telegram",
					body: message,
				},
				auth ? auth.denteClinicalMutationHeaders() : undefined,
			);
			setStatusNotice(res.message);
		} catch (inviteErr) {
			const errMsg = inviteErr instanceof Error ? inviteErr.message : String(inviteErr);
			setStatusNotice(`Telegram открыт. Ответ сервера: ${errMsg}`);
		}
		setTimeout(() => setStatusNotice(null), 3500);
	};

	// Копирование SMS (152-ФЗ PDn Protected, Mandate 8e: zero disabled buttons, 1-Click dispatch)
	const handleCopySms = async (candidate: PatientRecallRecord) => {
		const smsText = generatePdnProtectedRecallMessage(candidate, { clinicName });
		navigator.clipboard.writeText(smsText).catch(() => {});
		setCopiedCandidateId(candidate.id);
		handleStatusUpdate(candidate.id, "invited", "sms");
		if (!candidate.phone || !candidate.phone.trim()) {
			showToast("152-ФЗ SMS текст скопирован (номер телефона не указан в карте)", "info");
		}

		try {
			const res = await sendRecallCandidateInvite(
				{
					patientId: candidate.patientId,
					channel: "sms",
					body: smsText,
				},
				auth ? auth.denteClinicalMutationHeaders() : undefined,
			);
			setStatusNotice(res.message);
		} catch (inviteErr) {
			const errMsg = inviteErr instanceof Error ? inviteErr.message : String(inviteErr);
			setStatusNotice(`SMS скопировано. Ответ сервера: ${errMsg}`);
		}
		setTimeout(() => {
			setCopiedCandidateId(null);
			setStatusNotice(null);
		}, 3000);
	};

	// 1-Click Запись в расписание
	const handleBook = (candidate: PatientRecallRecord) => {
		if (onBookAppointment) {
			onBookAppointment(candidate);
		} else {
			handleStatusUpdate(candidate.id, "scheduled");
			setStatusNotice(`Пациент «${candidate.fullName}» переведен в статус «Записался».`);
			try {
				if (candidate.dueDate) {
					useScheduleStore.getState().setScheduleDateFilter(candidate.dueDate);
				}
				useAppStore.getState().setCurrentView("schedule");
				if (typeof window !== "undefined") {
					window.location.hash = "schedule";
				}
				onClose?.();
			} catch {
				// Standalone/test fallback
			}
			setTimeout(() => setStatusNotice(null), 3000);
		}
	};

	// Открытие предпросмотра шаблона (Mandate 8i Anti-Simulator)
	const handleTogglePreview = (
		candidate: PatientRecallRecord,
		channel: "sms" | "whatsapp" | "telegram" = "sms",
	) => {
		if (activePreviewCandidate?.id === candidate.id && previewChannel === channel) {
			setActivePreviewCandidate(null);
		} else {
			setActivePreviewCandidate(candidate);
			setPreviewChannel(channel);
			setActiveScriptCandidate(null);
		}
	};

	// Открытие скрипта обзвона
	const handleToggleScript = (candidate: PatientRecallRecord) => {
		if (activeScriptCandidate?.id === candidate.id) {
			setActiveScriptCandidate(null);
			setSelectedObjectionId("");
		} else {
			setActiveScriptCandidate(candidate);
			setActivePreviewCandidate(null);
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
								Плановые профосмотры и возврат пациентов (Recalls Hub)
							</h2>
							<p className="recall-header-subtitle">
								<Phone size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} aria-hidden="true" />
								<Lightbulb size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} aria-hidden="true" />
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
								<span>Задачи сервисных звонков</span>
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
				<section
					className="recall-metrics-grid recall-metrics-ribbon"
					aria-label="Сводные метрики плановых профосмотров"
					style={{
						display: "flex",
						flexWrap: "wrap",
						alignItems: "center",
						gap: "10px 16px",
						padding: "8px 24px",
						minHeight: "36px",
					}}
				>
					<div
						className="recall-metric-card recall-metric-card--primary"
						style={{ padding: "4px 8px", minHeight: "26px", flexDirection: "row", alignItems: "center", gap: "6px" }}
					>
						<span className="recall-metric-label" style={{ fontSize: "0.75rem" }}>Всего:</span>
						<span className="recall-metric-value" style={{ fontSize: "0.9375rem" }}>{metrics.totalCandidates}</span>
					</div>

					<div
						className="recall-metric-card recall-metric-card--warning"
						style={{ padding: "4px 8px", minHeight: "26px", flexDirection: "row", alignItems: "center", gap: "6px" }}
					>
						<span className="recall-metric-label" style={{ fontSize: "0.75rem" }}>Пора звать:</span>
						<span className="recall-metric-value" style={{ fontSize: "0.9375rem" }}>{metrics.dueNowCount}</span>
					</div>

					<div
						className="recall-metric-card recall-metric-card--info"
						style={{ padding: "4px 8px", minHeight: "26px", flexDirection: "row", alignItems: "center", gap: "6px" }}
					>
						<span className="recall-metric-label" style={{ fontSize: "0.75rem" }}>Связались:</span>
						<span className="recall-metric-value" style={{ fontSize: "0.9375rem" }}>{metrics.contactedCount}</span>
						<span className="recall-metric-subtext" style={{ fontSize: "0.6875rem" }}>({metrics.contactResponseRatePercent}%)</span>
					</div>

					<div
						className="recall-metric-card recall-metric-card--success"
						style={{ padding: "4px 8px", minHeight: "26px", flexDirection: "row", alignItems: "center", gap: "6px" }}
					>
						<span className="recall-metric-label" style={{ fontSize: "0.75rem" }}>Retention:</span>
						<span className="recall-metric-value" style={{ fontSize: "0.9375rem" }}>{metrics.retentionRatePercent}%</span>
					</div>

					<div
						className="recall-metric-card"
						style={{ padding: "4px 8px", minHeight: "26px", flexDirection: "row", alignItems: "center", gap: "6px" }}
					>
						<span className="recall-metric-label" style={{ fontSize: "0.75rem" }}>Средний LTV:</span>
						<span className="recall-metric-value" style={{ fontSize: "0.9375rem" }}>
							{metrics.averageRecallLtvRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>
				</section>

				{/* Loading Banner */}
				{isLoading ? (
					<div
						style={{
							padding: "10px 24px",
							background: "var(--rm-bg)",
							color: "var(--rm-text-muted)",
							fontSize: "0.875rem",
							display: "flex",
							alignItems: "center",
							gap: "8px",
						}}
					>
						<RefreshCw size={16} className="animate-spin" />
						<span>Загрузка списка пациентов на контрольный осмотр из базы данных...</span>
					</div>
				) : null}

				{/* Error Banner */}
				{fetchError ? (
					<div
						style={{
							padding: "10px 24px",
							background: "var(--bad-bg)",
							color: "var(--bad-fg)",
							fontSize: "0.875rem",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: "8px",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<AlertTriangle size={16} />
							<span>{fetchError}</span>
						</div>
						<button
							type="button"
							className="recall-action-btn"
							style={{ minHeight: "32px", fontSize: "0.75rem", padding: "4px 10px" }}
							onClick={() => void loadCandidates()}
						>
							<RefreshCw size={14} />
							<span>Повторить</span>
						</button>
					</div>
				) : null}

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
						<PatientRecallsToolbar
							registryViewMode={registryViewMode}
							onRegistryViewModeChange={setRegistryViewMode}
							uniqueDoctors={uniqueDoctors}
							selectedDoctorId={selectedDoctorId}
							onSelectedDoctorIdChange={setSelectedDoctorId}
							selectedPeriod={selectedPeriod}
							onSelectedPeriodChange={setSelectedPeriod}
							searchQuery={searchQuery}
							onSearchQueryChange={setSearchQuery}
							selectedCycle={selectedCycle}
							onSelectedCycleChange={setSelectedCycle}
							statusFilter={statusFilter}
							onStatusFilterChange={setStatusFilter}
							candidatesCount={candidates.length}
							metrics={metrics}
						/>

						{/* Content Area */}
						<main className="recall-content-area">
							{filteredCandidates.length === 0 ? (
								<div className="recall-empty-state">
									<div className="recall-empty-icon">
										<CheckCircle2 size={36} className="recall-empty-check-icon" />
									</div>
									<h3>Нет пациентов по выбранному фильтру</h3>
									<p>Все пациенты обработаны, либо срок вызова еще не наступил.</p>
								</div>
							) : registryViewMode === "kanban" ? (
								<PatientRecallsKanbanView
									kanbanGroups={kanbanGroups}
									onBook={handleBook}
									onWhatsApp={(c) => void handleWhatsApp(c)}
									onCopySms={handleCopySms}
									onStatusUpdate={handleStatusUpdate}
								/>
							) : (
								<PatientRecallsTableView
									filteredCandidates={filteredCandidates}
									activeScriptCandidate={activeScriptCandidate}
									activePreviewCandidate={activePreviewCandidate}
									openContactDropdownId={openContactDropdownId}
									setOpenContactDropdownId={setOpenContactDropdownId}
									copiedCandidateId={copiedCandidateId}
									onBook={handleBook}
									onTogglePreview={handleTogglePreview}
									onToggleScript={handleToggleScript}
									onWhatsApp={(c) => void handleWhatsApp(c)}
									onTelegram={(c) => void handleTelegram(c)}
									onCopySms={handleCopySms}
									onStatusUpdate={handleStatusUpdate}
								/>
							)}

							<PatientRecallsPreviewModals
								activePreviewCandidate={activePreviewCandidate}
								previewChannel={previewChannel}
								onPreviewChannelChange={setPreviewChannel}
								onClosePreview={() => setActivePreviewCandidate(null)}
								activeScriptCandidate={activeScriptCandidate}
								onCloseScript={() => {
									setActiveScriptCandidate(null);
									setSelectedObjectionId("");
								}}
								selectedObjectionId={selectedObjectionId}
								onSelectObjectionId={setSelectedObjectionId}
								clinicName={clinicName}
								copiedCandidateId={copiedCandidateId}
								onCopySms={handleCopySms}
								onWhatsApp={(c) => void handleWhatsApp(c)}
								onTelegram={(c) => void handleTelegram(c)}
								onBook={handleBook}
							/>
						</main>
					</>
				) : activeTab === "cohorts" ? (
					<PatientRecallsCohortsTab
						cohortReport={cohortReport}
						cohortGrouping={cohortGrouping}
						onCohortGroupingChange={setCohortGrouping}
					/>
				) : (
					<PatientRecallsTaskCallsTab
						taskCallCandidates={taskCallCandidates}
						searchQuery={searchQuery}
						onSearchQueryChange={setSearchQuery}
						selectedTaskCallType={selectedTaskCallType}
						onSelectTaskCallType={setSelectedTaskCallType}
						activeTaskCallScriptType={activeTaskCallScriptType}
						onToggleTaskCallScriptType={setActiveTaskCallScriptType}
						onWhatsApp={(c) => void handleWhatsApp(c)}
						onTelegram={(c) => void handleTelegram(c)}
						onBook={handleBook}
						onStatusUpdate={handleStatusUpdate}
					/>
				)}
			</div>
		</div>
	);
};

export default PatientRecallsHubModal;
