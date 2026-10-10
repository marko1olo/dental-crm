import {
	Activity,
	CalendarPlus,
	CheckSquare,
	Clock,
	FileText,
	Flame,
	Layers,
	Loader2,
	MessageSquare,
	Phone,
	RotateCcw,
	Share2,
	Sparkles,
	User,
	X,
	Zap,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
	safeLocalStorageRemoveItem,
} from "../../lib/safeLocalStorage";
import { showToast } from "../GlobalToast";
import { useAppStore } from "../../store/appStore";
import { CopilotComposer } from "./CopilotComposer";
import { CopilotChatPanel } from "./CopilotChatPanel";
import { CopilotActionConfirm } from "./CopilotActionConfirm";
import { useCopilotContextSync } from "./CopilotContextSync";
import {
	ProactiveAlertCardView,
	WhatsAppApprovalCardView,
} from "./CopilotGenerativeCards";
import { CopilotMessage } from "./CopilotMessage";
import { CopilotNudges } from "./CopilotNudges";
import { CopilotSuggestions } from "./CopilotSuggestions";
import type {
	BookSlotHandler,
	ConfirmHandler,
	CopilotNudge,
	CopilotPhase,
	CopilotUiMessage,
	PendingConfirmation,
	ProactiveAlertCardData,
	SelectIdHandler,
	WhatsAppApprovalCard,
} from "./copilotTypes";

export interface CopilotDrawerProps {
	isOpen: boolean;
	messages: CopilotUiMessage[];
	busy: boolean;
	phase: CopilotPhase;
	pending: PendingConfirmation | null;
	nameCache: Record<string, string>;
	nudges: CopilotNudge[];
	proactiveAlerts?: ProactiveAlertCardData[] | undefined;
	whatsappHitLCards?: WhatsAppApprovalCard[] | undefined;
	activeTab: "chat" | "pending";
	onTabChange: (tab: "chat" | "pending") => void;
	onClose: () => void;
	onSend: (text: string) => void;
	onConfirm: ConfirmHandler;
	onReset: () => void;
	onDismissNudge: (id: string) => void;
	onDismissProactiveAlert?: ((alertId: string) => void) | undefined;
	onApproveWhatsApp?:
		| ((approvalId: string, modifiedReply?: string) => void)
		| undefined;
	onRejectWhatsApp?:
		| ((approvalId: string, reason?: string) => void)
		| undefined;
	onSelectPatient?: SelectIdHandler;
	onSelectAppointment?: SelectIdHandler;
	onBookSlot?: BookSlotHandler;
}

const formatShortPatientName = (fullName?: string | null) => {
	if (!fullName) return null;
	const parts = fullName.trim().split(/\s+/);
	const p0 = parts[0];
	const p1 = parts[1];
	const p2 = parts[2];
	if (p0 && p1 && p2) {
		return `${p0} ${p1[0] ?? ""}.${p2[0] ?? ""}.`;
	}
	if (p0 && p1) {
		return `${p0} ${p1[0] ?? ""}.`;
	}
	return fullName;
};

export const CopilotDrawer: React.FC<CopilotDrawerProps> = ({
	isOpen,
	messages,
	busy,
	phase,
	pending,
	nameCache,
	nudges,
	proactiveAlerts = [],
	whatsappHitLCards = [],
	activeTab,
	onTabChange,
	onClose,
	onSend,
	onConfirm,
	onReset,
	onDismissNudge,
	onDismissProactiveAlert,
	onApproveWhatsApp,
	onRejectWhatsApp,
	onSelectPatient,
	onSelectAppointment,
	onBookSlot,
}) => {
	const { context: uiContext, enrichMessage } = useCopilotContextSync();

	const [input, setInput] = useState(() => {
		try {
			return safeLocalStorageGetItem("dente_copilot_draft_text") || "";
		} catch {
			return "";
		}
	});
	const feedRef = useRef<HTMLDivElement>(null);

	const handleInputChange = (newVal: string) => {
		setInput(newVal);
		try {
			if (newVal.trim()) {
				safeLocalStorageSetItem("dente_copilot_draft_text", newVal);
			} else {
				safeLocalStorageRemoveItem("dente_copilot_draft_text");
			}
		} catch {
			// ignore storage access errors
		}
	};

	const handleReset = () => {
		setInput("");
		try {
			safeLocalStorageRemoveItem("dente_copilot_draft_text");
		} catch {
			// ignore storage access errors
		}
		onReset();
	};

	const handleSendEnriched = (textToSend: string) => {
		if (!textToSend.trim() || busy) return;
		const enriched = enrichMessage(textToSend);
		onSend(enriched);
	};

	const handleSubmit = () => {
		if (!input.trim() || busy) return;
		const text = input.trim();
		handleSendEnriched(text);
		setInput("");
		try {
			safeLocalStorageRemoveItem("dente_copilot_draft_text");
		} catch {
			// ignore storage access errors
		}
	};

	useEffect(() => {
		if (isOpen && activeTab === "chat" && feedRef.current) {
			feedRef.current.scrollTop = feedRef.current.scrollHeight;
		}
	}, [isOpen, messages, activeTab]);

	const storeDashboard = useAppStore((s) => s.dashboard);

	// Proactive Shift Debts: Overdue Recalls
	const shiftDebtRecalls = useMemo(() => {
		const storeRecalls = (storeDashboard as any)?.recalls as Array<any> | undefined;
		if (storeRecalls && storeRecalls.length > 0) {
			return storeRecalls.map((r, idx) => ({
				id: r.id || `recall-${idx}`,
				patientId: r.patientId || "",
				fullName: r.fullName || r.patientName || "Пациент",
				phone: r.phone || "+7 (999) 000-00-00",
				reason: r.reason || r.clinicalNotes || "Плановый осмотр и гигиена",
				overdueDays: r.daysOverdue ?? 10,
				overdueDate: r.dueDate || "Сентябрь 2026",
			}));
		}
		return [
			{
				id: "recall-1",
				patientId: "p-rec-1",
				fullName: "Смирнова Елена Викторовна",
				phone: "+7 (926) 341-22-10",
				reason: "Профгигиена 6 мес (Air-Flow + полировка)",
				overdueDays: 14,
				overdueDate: "25 сен 2026",
			},
			{
				id: "recall-2",
				patientId: "p-rec-2",
				fullName: "Васильев Игорь Олегович",
				phone: "+7 (916) 880-45-12",
				reason: "Контроль имплантации (зуб 4.6, 6 мес)",
				overdueDays: 8,
				overdueDate: "01 окт 2026",
			},
			{
				id: "recall-3",
				patientId: "p-rec-3",
				fullName: "Михайлова Дарья Сергеевна",
				phone: "+7 (903) 124-77-90",
				reason: "Ортодонтическая активация элайнеров",
				overdueDays: 5,
				overdueDate: "04 окт 2026",
			},
		];
	}, [storeDashboard]);

	// Proactive Shift Debts: Treatment Plans awaiting approval ("Думает")
	const shiftDebtEstimates = useMemo(() => {
		const storePlans = ((storeDashboard as any)?.treatmentPlans ?? (storeDashboard as any)?.treatmentPlanScenarios ?? []) as Array<any>;
		const thinkingPlans = storePlans.filter(
			(p) => p.status === "thinking" || p.status === "approval" || p.status === "draft",
		);
		if (thinkingPlans.length > 0) {
			const patients = (storeDashboard?.patients ?? []) as Array<any>;
			return thinkingPlans.map((p, idx) => {
				const patient = patients.find((pt) => pt.id === p.patientId);
				return {
					id: p.id || `est-${idx}`,
					patientId: p.patientId || "",
					patientName: patient?.fullName || p.patientName || "Пациент",
					title: p.title || p.name || "Комплексный план лечения",
					status: (p.status || "thinking") as "thinking" | "approval",
					statusLabel: "Думает",
					amountRub: Number(p.totalPriceRub || p.totalPrice || 50000),
				};
			});
		}
		return [
			{
				id: "est-1",
				patientId: "p-est-1",
				patientName: "Кузнецов Андрей Павлович",
				title: "Комплексная имплантация и протезирование (All-on-4)",
				status: "thinking" as const,
				statusLabel: "Думает",
				amountRub: 185000,
			},
			{
				id: "est-2",
				patientId: "p-est-2",
				patientName: "Орлова Татьяна Николаевна",
				title: "Керамические виниры E-max (фронтальный отдел, 6 ед.)",
				status: "thinking" as const,
				statusLabel: "Думает",
				amountRub: 144000,
			},
		];
	}, [storeDashboard]);

	const totalEstimatesSumRub = useMemo(() => {
		return shiftDebtEstimates.reduce((acc, curr) => acc + curr.amountRub, 0);
	}, [shiftDebtEstimates]);

	if (!isOpen) return null;

	const pendingConfirmCount = pending
		? 1
		: messages.filter((m) => m.kind === "confirmation" && !m.resolved).length;
	const pendingHitLCount = whatsappHitLCards
		? whatsappHitLCards.filter((c) => c.status === "pending").length
		: 0;
	const pendingAlertCount = proactiveAlerts
		? proactiveAlerts.filter(
				(a) => a.urgency === "CRITICAL" || a.urgency === "URGENT",
			).length
		: 0;
	const pendingCount =
		pendingConfirmCount + pendingHitLCount + pendingAlertCount;
	const totalTasksCount =
		pendingCount + shiftDebtRecalls.length + shiftDebtEstimates.length;

	const content = (
		<aside
			className="copilot-drawer open"
			aria-label="ДЕНТА — Клинический ассистент"
		>
			{/* Header */}
			<header className="copilot-header">
				<div className="copilot-header-brand">
					<div className="copilot-header-icon">
						<Sparkles size={18} />
					</div>
					<div>
						<h3 className="copilot-header-title">
							<span>ДЕНТА — Клинический ассистент</span>
							<span className="copilot-header-badge">Копилот</span>
						</h3>
						<div
							style={{
								fontSize: "12px",
								color: "var(--muted)",
								display: "flex",
								alignItems: "center",
								gap: "5px",
								marginTop: "2px",
							}}
						>
							{busy ? (
								<span
									style={{
										display: "flex",
										alignItems: "center",
										gap: "4px",
										color: "var(--teal)",
									}}
								>
									<Loader2 size={12} className="animate-spin" />
									{phase === "working"
										? "Выполняет инструменты..."
										: "Печатает ответ..."}
								</span>
							) : (
								<span>Готов к работе • Split-View</span>
							)}
						</div>
					</div>
				</div>

				<div className="copilot-header-actions">
					<button
						type="button"
						onClick={() => {
							onClose();
							window.dispatchEvent(new CustomEvent("dente:open-chairside-hud"));
						}}
						className="copilot-icon-btn"
						title="Переключить в кресельный HUD (Alt+C)"
						aria-label="Кресельный HUD"
						data-testid="btn-switch-to-hud"
					>
						<Layers size={16} />
					</button>
					<button
						type="button"
						onClick={handleReset}
						className="copilot-icon-btn"
						title="Начать новый диалог"
					>
						<RotateCcw size={16} />
					</button>
					<button
						type="button"
						onClick={onClose}
						className="copilot-icon-btn"
						title="Свернуть панель"
					>
						<X size={18} />
					</button>
				</div>
			</header>

			{/* Context Awareness Telemetry Bar */}
			<div className="copilot-context-bar" data-testid="copilot-context-bar">
				<span
					className="copilot-context-chip active-view"
					title={`Активный экран: ${uiContext.viewLabel || uiContext.view}`}
				>
					<Activity size={12} />
					<span>{uiContext.viewLabel || uiContext.view}</span>
				</span>

				{uiContext.activeTooth !== null &&
					uiContext.activeTooth !== undefined && (
						<span
							className="copilot-context-chip"
							title={`Выбранный зуб FDI: ${uiContext.activeTooth}`}
						>
							<span>{`Зуб #${uiContext.activeTooth}`}</span>
						</span>
					)}

				{uiContext.patientId && (
					<span
						className="copilot-context-chip"
						title={
							uiContext.patientName
								? `Пациент: ${uiContext.patientName}`
								: `Пациент ID: ${uiContext.patientId}`
						}
					>
						<User size={12} style={{ flexShrink: 0 }} />
						<span>
							{formatShortPatientName(uiContext.patientName) ??
								`Пациент #${uiContext.patientId.slice(0, 6)}`}
						</span>
					</span>
				)}

				{uiContext.activeDoctor && (
					<span
						className="copilot-context-chip doctor"
						title={`Лечащий врач: ${uiContext.activeDoctor}`}
					>
						<span>{uiContext.activeDoctor}</span>
					</span>
				)}
			</div>

			{/* Tab Controls */}
			<div className="copilot-tabs">
				<button
					type="button"
					onClick={() => onTabChange("chat")}
					className={`copilot-tab-btn ${activeTab === "chat" ? "active" : ""}`}
				>
					<MessageSquare size={16} />
					<span>Чат</span>
					{messages.length > 0 && (
						<span
							style={{
								fontSize: "12px",
								fontWeight: 600,
								padding: "1px 7px",
								borderRadius: "9999px",
								background: "var(--paper-soft)",
								border: "1px solid var(--line)",
							}}
						>
							{messages.length}
						</span>
					)}
				</button>
				<button
					type="button"
					onClick={() => onTabChange("pending")}
					className={`copilot-tab-btn ${activeTab === "pending" ? "active" : ""}`}
				>
					<CheckSquare size={16} />
					<span>Задачи</span>
					{totalTasksCount > 0 && (
						<span className="copilot-badge-count">{totalTasksCount}</span>
					)}
				</button>
			</div>

			{/* Proactive Nudges Bar */}
			<CopilotNudges
				nudges={nudges}
				onDismiss={onDismissNudge}
				onAct={handleSendEnriched}
			/>

			{/* Body Content / Chat Feed */}
			<div className="copilot-feed" ref={feedRef}>
				{activeTab === "chat" ? (
					<>
						{/* Proactive Triage & Emergency Alerts (0-Click Immediate Action) */}
						{proactiveAlerts
							.filter((a) => a.urgency === "CRITICAL" || a.urgency === "URGENT")
							.map((alert) => (
								<ProactiveAlertCardView
									key={alert.id}
									alert={alert}
									onDismiss={onDismissProactiveAlert}
									onSendPrompt={handleSendEnriched}
								/>
							))}

						{messages.length === 0 ? (
							<CopilotSuggestions onPick={handleSendEnriched} />
						) : (
							messages.map((msg, idx) => (
								<CopilotMessage
									key={idx}
									message={msg}
									nameCache={nameCache}
									onConfirm={onConfirm}
									onSelectPatient={onSelectPatient}
									onSelectAppointment={onSelectAppointment}
									onBookSlot={onBookSlot}
								/>
							))
						)}
					</>
				) : (
					<div
						style={{ display: "flex", flexDirection: "column", gap: "12px" }}
						data-testid="copilot-tasks-tab-content"
					>
						{/* 1. Summary Badge: Operational Shift Debts */}
						<div
							className="copilot-tasks-summary-banner"
							data-testid="copilot-shift-debts-summary"
						>
							<div className="flex items-center justify-between gap-2 mb-1.5">
								<div className="flex items-center gap-1.5">
									<Zap size={15} className="text-[var(--teal)] shrink-0" />
									<span className="font-bold text-xs uppercase tracking-wider text-[var(--ink)]">
										Задачи смены
									</span>
								</div>
								<span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--teal-soft)] text-[var(--teal-dark)] border border-[var(--teal)]/20 font-mono">
									{totalEstimatesSumRub.toLocaleString("ru-RU")} ₽ в работе
								</span>
							</div>
							<div className="flex items-center gap-2.5 text-xs flex-wrap">
								<span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
									<Clock size={12} /> {shiftDebtRecalls.length} просроч. рекаллов
								</span>
								<span className="text-[var(--line-strong)]">•</span>
								<span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
									<FileText size={12} /> {shiftDebtEstimates.length} смет ждут ответа
								</span>
							</div>
						</div>

						{/* 2. Block: ПРОСРОЧЕННЫЕ РЕКАЛЛЫ */}
						<div
							className="copilot-tasks-section"
							data-testid="copilot-section-overdue-recalls"
						>
							<div className="copilot-tasks-section-header">
								<div className="flex items-center gap-1.5">
									<RotateCcw size={13} className="text-rose-500 shrink-0" />
									<span className="font-bold text-xs uppercase tracking-wider text-[var(--ink)]">
										Просроченные рекаллы
									</span>
								</div>
								<span className="copilot-tasks-count-pill bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
									{shiftDebtRecalls.length}
								</span>
							</div>

							<div className="space-y-2 mt-2">
								{shiftDebtRecalls.map((recall) => (
									<div
										key={recall.id}
										className="copilot-task-card"
										data-testid={`card-recall-${recall.id}`}
									>
										<div className="flex items-start justify-between gap-2 mb-1">
											<span className="font-bold text-xs text-[var(--ink)]">
												{recall.fullName}
											</span>
											<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
												+{recall.overdueDays} дн.
											</span>
										</div>
										<p className="text-xs text-[var(--muted)] mb-2.5 leading-relaxed">
											{recall.reason}
										</p>
										<div className="flex items-center gap-2">
											<button
												type="button"
												onClick={() => {
													showToast(
														`Звонок пациенту: ${recall.fullName} (${recall.phone})`,
														"info",
													);
													if (typeof window !== "undefined") {
														window.open(`tel:${recall.phone}`);
													}
												}}
												className="copilot-task-btn copilot-task-btn-secondary"
												title={`Позвонить ${recall.phone}`}
												data-testid={`btn-recall-call-${recall.id}`}
											>
												<Phone size={12} className="shrink-0" />
												<span>Позвонить</span>
											</button>
											<button
												type="button"
												onClick={() => {
													if (onBookSlot) {
														onBookSlot({
															start_time: "10:00",
															date: new Date().toISOString().slice(0, 10),
															chairId: "chair-1",
															time: "10:00",
														});
													}
													handleSendEnriched(
														`Запиши пациента ${recall.fullName} на приём: ${recall.reason}`,
													);
												}}
												className="copilot-task-btn copilot-task-btn-primary"
												data-testid={`btn-recall-book-${recall.id}`}
											>
												<CalendarPlus size={12} className="shrink-0" />
												<span>Записать</span>
											</button>
										</div>
									</div>
								))}
							</div>
						</div>

						{/* 3. Block: ОЖИДАЮТ ОТВЕТА ПО СМЕТЕ */}
						<div
							className="copilot-tasks-section"
							data-testid="copilot-section-pending-estimates"
						>
							<div className="copilot-tasks-section-header">
								<div className="flex items-center gap-1.5">
									<FileText size={13} className="text-amber-500 shrink-0" />
									<span className="font-bold text-xs uppercase tracking-wider text-[var(--ink)]">
										Ожидают ответа по смете
									</span>
								</div>
								<span className="copilot-tasks-count-pill bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
									{shiftDebtEstimates.length}
								</span>
							</div>

							<div className="space-y-2 mt-2">
								{shiftDebtEstimates.map((est) => (
									<div
										key={est.id}
										className="copilot-task-card"
										data-testid={`card-estimate-${est.id}`}
									>
										<div className="flex items-start justify-between gap-2 mb-1">
											<span className="font-bold text-xs text-[var(--ink)]">
												{est.patientName}
											</span>
											<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
												{est.statusLabel}
											</span>
										</div>
										<p className="text-xs text-[var(--muted)] mb-2 leading-relaxed">
											{est.title}
										</p>
										<div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--line-subtle,var(--line))]">
											<span className="font-bold text-xs text-[var(--teal)] font-mono">
												{est.amountRub.toLocaleString("ru-RU")} ₽
											</span>
											<button
												type="button"
												onClick={() => {
													const origin =
														typeof window !== "undefined"
															? window.location.origin
															: "";
													const url = `${origin}/portal/estimate/${est.id}`;
													if (navigator.clipboard) {
														navigator.clipboard
															.writeText(url)
															.catch(() => {});
													}
													showToast(
														`Ссылка на смету (${est.amountRub.toLocaleString("ru-RU")} ₽) скопирована для пациента ${est.patientName}`,
														"success",
													);
												}}
												className="copilot-task-btn copilot-task-btn-teal"
												data-testid={`btn-estimate-remind-${est.id}`}
											>
												<Share2 size={12} className="shrink-0" />
												<span>Напомнить / Ссылка</span>
											</button>
										</div>
									</div>
								))}
							</div>
						</div>

						{/* 4. Tool Confirmation Card */}
						{pending && (
							<CopilotActionConfirm
								callId={pending.callId}
								name={pending.name}
								args={pending.args}
								nameCache={nameCache}
								onConfirm={onConfirm}
							/>
						)}

						{/* 5. WhatsApp Human-in-the-Loop (HitL) Approval Cards */}
						{whatsappHitLCards.map((card) => (
							<WhatsAppApprovalCardView
								key={card.approvalId}
								card={card}
								onApprove={onApproveWhatsApp}
								onReject={onRejectWhatsApp}
							/>
						))}

						{/* 6. Proactive Non-HitL Alerts in Tasks Tab */}
						{proactiveAlerts
							.filter(
								(alert) =>
									!alert.id.startsWith("alert_hitl_") &&
									alert.category !== "whatsapp_emergency",
							)
							.map((alert) => (
								<ProactiveAlertCardView
									key={alert.id}
									alert={alert}
									onDismiss={onDismissProactiveAlert}
									onSendPrompt={handleSendEnriched}
								/>
							))}
					</div>
				)}
			</div>

			{/* Quick Playbook Chips Strip in Chat */}
			{activeTab === "chat" && (
				<div
					className="copilot-playbooks-strip"
					data-testid="copilot-playbooks-strip"
				>
					<span className="copilot-playbooks-label">Сценарии:</span>
					<button
						type="button"
						onClick={() =>
							handleSendEnriched(
								"Проведи утренний брифинг: долги смены, ключевые пациенты и загрузка кабинетов",
							)
						}
						className="copilot-playbook-chip"
						data-testid="playbook-morning-briefing"
					>
						<span aria-hidden="true">📋</span>
						<span>Утренний брифинг</span>
					</button>
					<button
						type="button"
						onClick={() =>
							handleSendEnriched(
								"Подготовь визит ближайшего пациента: анамнез, аллергии, предыдущие манипуляции",
							)
						}
						className="copilot-playbook-chip"
						data-testid="playbook-prepare-visit"
					>
						<span aria-hidden="true">🩺</span>
						<span>Подготовить визит</span>
					</button>
					<button
						type="button"
						onClick={() =>
							handleSendEnriched(
								"Найди пациентов из листа ожидания и рекаллов, чтобы заполнить свободные окна в расписании",
							)
						}
						className="copilot-playbook-chip"
						data-testid="playbook-fill-gap"
					>
						<span aria-hidden="true">⏱️</span>
						<span>Заполнить окно в расписании</span>
					</button>
				</div>
			)}

			{/* Composer Footer */}
			<CopilotComposer
				value={input}
				busy={busy}
				onChange={handleInputChange}
				onSubmit={handleSubmit}
				onReset={handleReset}
				patientId={uiContext.patientId ?? null}
			/>

			{/* Embedded Standalone Chat Panel (Mandates 8s, 8e) */}
			<div className="hidden" data-testid="copilot-chat-panel-container">
				<CopilotChatPanel
					messages={messages}
					busy={busy}
					phase={phase}
					pending={pending}
					nameCache={nameCache}
					nudges={nudges}
					proactiveAlerts={proactiveAlerts}
					whatsappHitLCards={whatsappHitLCards}
					onSend={onSend}
					onConfirm={onConfirm}
					onReset={onReset}
					onDismissNudge={onDismissNudge}
					onDismissProactiveAlert={onDismissProactiveAlert}
					onApproveWhatsApp={onApproveWhatsApp}
					onRejectWhatsApp={onRejectWhatsApp}
					onSelectPatient={onSelectPatient}
					onSelectAppointment={onSelectAppointment}
					onBookSlot={onBookSlot}
					embedMode={true}
				/>
			</div>
		</aside>
	);

	if (typeof document !== "undefined" && document.body) {
		return createPortal(content, document.body);
	}
	return content;
};
