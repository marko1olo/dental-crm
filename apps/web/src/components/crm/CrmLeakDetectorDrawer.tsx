/**
 * DENTE Dental CRM — Sovereign Tier 2 Drawer for Clinical CRM Leak Detector
 * Mandate 8s (SSOT & Modular Drawer), Mandate 8n (Solo Doctor Ergonomics), Apple HIG
 * No nested modals (Anti-Matryoshka, depth <= 1).
 */

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	AlertTriangle,
	Calendar,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	ExternalLink,
	FileText,
	MessageCircle,
	Phone,
	PhoneCall,
	RefreshCw,
	User,
	UserCheck,
	X,
} from "lucide-react";
import {
	type CrmDeclineReason,
	type CrmLeakFunnelMetrics,
	type CrmLeakLeadItem,
	DECLINE_REASON_LABELS_RU,
} from "@dental/shared";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { showToast } from "../GlobalToast";
import {
	cancelLeakLead,
	createLeakTask,
	fetchLeakDetectorLeads,
	fetchLeakFunnelMetrics,
	processLeakLead,
	startLeakLead,
	syncLeakDetector,
} from "../../lib/crmLeakDetectorApi";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { openWhatsAppChat } from "../../store/telephonyStore";
import "./CrmLeakDetectorModal.css";

export interface CrmLeakDetectorDrawerProps {
	readonly isOpen?: boolean;
	readonly onClose?: () => void;
	readonly onOpenPatientWorkspace?: (patientId: string) => void;

	// Granular / test props compatibility:
	readonly activeScriptLead?: CrmLeakLeadItem | null;
	readonly copiedScript?: boolean;
	readonly onCopyScript?: (text: string) => void;
	readonly onCloseScript?: () => void;

	readonly contactModalLead?: CrmLeakLeadItem | null;
	readonly contactChannel?: "call" | "whatsapp" | "telegram" | "sms";
	readonly onSetContactChannel?: (
		channel: "call" | "whatsapp" | "telegram" | "sms",
	) => void;
	readonly contactNotes?: string;
	readonly onSetContactNotes?: (notes: string) => void;
	readonly onSaveContact?: () => void;
	readonly onCloseContact?: () => void;

	readonly declineModalLead?: CrmLeakLeadItem | null;
	readonly declineReason?: CrmDeclineReason;
	readonly onSetDeclineReason?: (reason: CrmDeclineReason) => void;
	readonly declineComment?: string;
	readonly onSetDeclineComment?: (comment: string) => void;
	readonly onSaveDecline?: () => void;
	readonly onCloseDecline?: () => void;

	readonly selectedLeakLead?: CrmLeakLeadItem | null;
	readonly onCloseLeakLead?: () => void;
}

export const CrmLeakDetectorDrawer: React.FC<CrmLeakDetectorDrawerProps> = (
	props,
) => {
	const {
		isOpen = false,
		onClose,
		onOpenPatientWorkspace,
		activeScriptLead: propActiveScriptLead,
		copiedScript: propCopiedScript,
		onCopyScript: propOnCopyScript,
		onCloseScript: propOnCloseScript,
		contactModalLead: propContactModalLead,
		contactChannel: propContactChannel,
		onSetContactChannel: propOnSetContactChannel,
		contactNotes: propContactNotes,
		onSetContactNotes: propOnSetContactNotes,
		onSaveContact: propOnSaveContact,
		onCloseContact: propOnCloseContact,
		declineModalLead: propDeclineModalLead,
		declineReason: propDeclineReason,
		onSetDeclineReason: propOnSetDeclineReason,
		declineComment: propDeclineComment,
		onSetDeclineComment: propOnSetDeclineComment,
		onSaveDecline: propOnSaveDecline,
		onCloseDecline: propOnCloseDecline,
		selectedLeakLead: propSelectedLeakLead,
		onCloseLeakLead: propOnCloseLeakLead,
	} = props;

	// If rendered purely for testing child cards:
	const isStandaloneCardTest =
		!isOpen &&
		Boolean(
			propActiveScriptLead ||
				propContactModalLead ||
				propDeclineModalLead ||
				propSelectedLeakLead,
		);

	const appLogic = useOptionalAppLogicContext();
	const auth = appLogic?.auth;

	const [leads, setLeads] = useState<CrmLeakLeadItem[]>([]);
	const [metrics, setMetrics] = useState<CrmLeakFunnelMetrics | null>(null);
	const [loading, setLoading] = useState(false);
	const [syncing, setSyncing] = useState(false);

	// Filters
	const [minDays, setMinDays] = useState<number>(210);
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [onlyUncompletedPlans, setOnlyUncompletedPlans] =
		useState<boolean>(false);
	const [searchQuery, setSearchQuery] = useState<string>("");

	// Internal Action Drawers
	const [internalScriptLead, setInternalScriptLead] =
		useState<CrmLeakLeadItem | null>(null);
	const [internalCopied, setInternalCopied] = useState(false);
	const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const [internalContactLead, setInternalContactLead] =
		useState<CrmLeakLeadItem | null>(null);
	const [internalContactChannel, setInternalContactChannel] = useState<
		"call" | "whatsapp" | "telegram" | "sms"
	>("call");
	const [internalContactNotes, setInternalContactNotes] = useState<string>("");

	const [internalDeclineLead, setInternalDeclineLead] =
		useState<CrmLeakLeadItem | null>(null);
	const [internalDeclineReason, setInternalDeclineReason] =
		useState<CrmDeclineReason>("too_expensive");
	const [internalDeclineComment, setInternalDeclineComment] =
		useState<string>("");

	const [internalSelectedLead, setInternalSelectedLead] =
		useState<CrmLeakLeadItem | null>(null);

	useEffect(() => {
		return () => {
			if (copyTimerRef.current) {
				clearTimeout(copyTimerRef.current);
				copyTimerRef.current = null;
			}
		};
	}, []);

	const loadData = useCallback(async () => {
		if (!auth?.denteClinicalReadHeaders) return;
		try {
			setLoading(true);
			const headers = auth.denteClinicalReadHeaders();
			const [leadsRes, metricsRes] = await Promise.all([
				fetchLeakDetectorLeads(headers, {
					minDays,
					status: statusFilter,
					hasUncompletedPlan: onlyUncompletedPlans ? true : undefined,
				}),
				fetchLeakFunnelMetrics(headers),
			]);
			setLeads(leadsRes.data || []);
			setMetrics(metricsRes.data || null);
		} catch (err: any) {
			showToast(`Ошибка детектора оттока: ${err.message}`, "error");
		} finally {
			setLoading(false);
		}
	}, [auth, minDays, statusFilter, onlyUncompletedPlans]);

	useEffect(() => {
		if (isOpen) {
			loadData();
		}
	}, [isOpen, loadData]);

	const handleSync = async () => {
		if (!auth?.denteClinicalMutationHeaders) return;
		try {
			setSyncing(true);
			const headers = auth.denteClinicalMutationHeaders();
			const res = await syncLeakDetector(headers);
			showToast(`Синхронизация завершена: ${res.message}`, "success");
			await loadData();
		} catch (err: any) {
			showToast(`Сбой синхронизации: ${err.message}`, "error");
		} finally {
			setSyncing(false);
		}
	};

	const handleStartLead = async (leadId: string) => {
		if (!auth?.denteClinicalMutationHeaders) return;
		try {
			const headers = auth.denteClinicalMutationHeaders();
			await startLeakLead(leadId, headers);
			showToast("Лид взят в работу администратором", "success");
			await loadData();
		} catch (err: any) {
			showToast(`Ошибка: ${err.message}`, "error");
		}
	};

	const handleCreateTask = async (lead: CrmLeakLeadItem) => {
		if (!auth?.denteClinicalMutationHeaders) return;
		try {
			const headers = auth.denteClinicalMutationHeaders();
			await createLeakTask(lead.id, headers);
			showToast(`Создана задача перезвонить: ${lead.patientFullName}`, "success");
			await loadData();
		} catch (err: any) {
			showToast(`Ошибка: ${err.message}`, "error");
		}
	};

	const handleSaveContactInternal = async () => {
		if (!internalContactLead || !internalContactNotes.trim()) {
			showToast("Заполните заметку о результате контакта", "warning");
			return;
		}
		if (!auth?.denteClinicalMutationHeaders) return;
		try {
			const headers = auth.denteClinicalMutationHeaders();
			await processLeakLead(
				internalContactLead.id,
				{
					channel: internalContactChannel,
					notes: internalContactNotes.trim(),
					targetStatus: "contacted",
				},
				headers,
			);
			showToast("Контакт зафиксирован, статус обновлен", "success");
			setInternalContactLead(null);
			setInternalContactNotes("");
			await loadData();
		} catch (err: any) {
			showToast(`Ошибка: ${err.message}`, "error");
		}
	};

	const handleSaveDeclineInternal = async () => {
		if (!internalDeclineLead) return;
		if (!auth?.denteClinicalMutationHeaders) return;
		try {
			const headers = auth.denteClinicalMutationHeaders();
			await cancelLeakLead(
				internalDeclineLead.id,
				{
					declineReason: internalDeclineReason,
					declineComment: internalDeclineComment.trim() || undefined,
				},
				headers,
			);
			showToast("Отказ зафиксирован, лид отправлен в архив", "info");
			setInternalDeclineLead(null);
			setInternalDeclineComment("");
			await loadData();
		} catch (err: any) {
			showToast(`Ошибка: ${err.message}`, "error");
		}
	};

	const handleCopyScriptInternal = (text: string) => {
		navigator.clipboard.writeText(text);
		setInternalCopied(true);
		showToast("Скрипт скопирован в буфер", "success");
		if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
		copyTimerRef.current = setTimeout(() => {
			setInternalCopied(false);
			copyTimerRef.current = null;
		}, 2000);
	};

	const handleOpenWhatsApp = (lead: CrmLeakLeadItem) => {
		const text =
			lead.aiReactivationSuggestion ||
			`Здравствуйте, ${lead.patientFullName}! Вас приветствует стоматологическая клиника DENTE. Напоминаем о возможности контрольного осмотра.`;
		openWhatsAppChat(lead.phone, text);
		showToast(`Чат WhatsApp открыт для ${lead.patientFullName}`, "success");
	};

	const handleBookAppointment = (lead: CrmLeakLeadItem) => {
		usePatientStore.getState().setSelectedPatientId(lead.patientId);
		useAppStore.getState().setCurrentView("schedule");
		onClose?.();
		showToast(
			`Пациент ${lead.patientFullName} выбран. Выберите время приёма в расписании`,
			"info",
		);
	};

	const handleOpenPatientWorkspace = (patientId: string) => {
		if (onOpenPatientWorkspace) {
			onOpenPatientWorkspace(patientId);
			return;
		}
		usePatientStore.getState().setSelectedPatientId(patientId);
		useAppStore.getState().setCurrentView("patients");
		if (typeof window !== "undefined") {
			window.location.hash = "patients";
		}
		onClose?.();
		showToast("Открыта амбулаторная карта пациента", "info");
	};

	// Determine effective active sub-actions
	const activeScript = propActiveScriptLead || internalScriptLead;
	const contactLead = propContactModalLead || internalContactLead;
	const declineLead = propDeclineModalLead || internalDeclineLead;
	const selectedLead = propSelectedLeakLead || internalSelectedLead;

	if (!isOpen && !isStandaloneCardTest) {
		return null;
	}

	const filteredLeads = leads.filter((lead) => {
		if (!searchQuery.trim()) return true;
		const q = searchQuery.toLowerCase();
		return (
			lead.patientFullName.toLowerCase().includes(q) ||
			lead.phone.includes(q) ||
			(lead.lastDoctorName && lead.lastDoctorName.toLowerCase().includes(q))
		);
	});

	const drawerContent = (
		<div
			className="cld-drawer-backdrop"
			role="region"
			aria-label="Детектор утечек и реактивация"
		>
			<div className="cld-drawer-card cld-drawer-main" data-testid="cld-drawer-main-panel">
				{/* 1. Header */}
				<div className="cld-header">
					<div className="cld-header-left">
						<h2 className="cld-title">
							<Clock size={18} className="text-[var(--teal)]" />
							<span>Детектор оттока и спящих пациентов</span>
						</h2>
						<span className="cld-badge-threshold">
							Порог: {minDays} дн.
						</span>
					</div>

					<div className="cld-header-actions">
						<button
							type="button"
							className="secondary-button cld-btn-sync"
							onClick={handleSync}
							disabled={syncing}
							title="Синхронизировать базу спящих пациентов"
						>
							<RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
							<span>{syncing ? "Поиск..." : "Синхронизировать"}</span>
						</button>
						<button
							type="button"
							className="icon-button cld-btn-close"
							onClick={onClose}
							title="Закрыть шторку"
							aria-label="Закрыть шторку"
						>
							<X size={16} />
						</button>
					</div>
				</div>

				{/* 2. Focused Sub-Cards if Active */}
				{activeScript && (
					<div className="p-4 bg-[var(--paper-soft)] border-b border-[var(--line)]">
						<div className="flex items-center justify-between mb-2">
							<h4 className="m-0 text-sm font-bold text-[var(--ink)] flex items-center gap-2">
								<MessageCircle size={15} className="text-[var(--teal)]" />
								<span>Скрипт реактивации: {activeScript.patientFullName}</span>
							</h4>
							<button
								type="button"
								className="icon-button"
								onClick={() => {
									propOnCloseScript?.();
									setInternalScriptLead(null);
								}}
							>
								<X size={14} />
							</button>
						</div>
						<div className="text-xs text-[var(--ink)] bg-[var(--paper)] p-3 rounded-lg border border-[var(--line)] leading-relaxed whitespace-pre-wrap">
							{activeScript.aiReactivationSuggestion}
						</div>
						<div className="flex justify-end gap-2 mt-3">
							<button
								type="button"
								className="primary-button cld-btn-sync"
								onClick={() => {
									if (propOnCopyScript) {
										propOnCopyScript(activeScript.aiReactivationSuggestion);
									} else {
										handleCopyScriptInternal(activeScript.aiReactivationSuggestion);
									}
								}}
							>
								{propCopiedScript || internalCopied ? <Check size={14} /> : <Copy size={14} />}
								<span>{propCopiedScript || internalCopied ? "Скопировано!" : "Скопировать текст"}</span>
							</button>
						</div>
					</div>
				)}

				{contactLead && (
					<div className="p-4 bg-[var(--paper-soft)] border-b border-[var(--line)]">
						<div className="flex items-center justify-between mb-2">
							<h4 className="m-0 text-sm font-bold text-[var(--ink)] flex items-center gap-2">
								<Phone size={15} className="text-[var(--teal)]" />
								<span>Фиксация контакта: {contactLead.patientFullName}</span>
							</h4>
							<button
								type="button"
								className="icon-button"
								onClick={() => {
									propOnCloseContact?.();
									setInternalContactLead(null);
								}}
							>
								<X size={14} />
							</button>
						</div>
						<div className="space-y-3">
							<div>
								<label className="text-xs font-semibold text-[var(--muted)] block mb-1">
									Канал связи:
								</label>
								<select
									className="cld-filter-select w-full"
									value={propContactChannel || internalContactChannel}
									onChange={(e) => {
										const val = e.target.value as any;
										propOnSetContactChannel?.(val);
										setInternalContactChannel(val);
									}}
								>
									<option value="call">Телефонный звонок</option>
									<option value="whatsapp">WhatsApp сообщение</option>
									<option value="telegram">Telegram</option>
									<option value="sms">SMS</option>
								</select>
							</div>
							<div>
								<label className="text-xs font-semibold text-[var(--muted)] block mb-1">
									Результат контакта:
								</label>
								<textarea
									rows={3}
									className="w-full p-2 border border-[var(--line)] rounded-lg text-xs bg-[var(--paper)] text-[var(--ink)]"
									placeholder="Дозвонились, пациент планирует гигиену в субботу..."
									value={propContactNotes ?? internalContactNotes}
									onChange={(e) => {
										propOnSetContactNotes?.(e.target.value);
										setInternalContactNotes(e.target.value);
									}}
								/>
							</div>
							<div className="flex justify-end gap-2 pt-2">
								<button
									type="button"
									className="secondary-button"
									onClick={() => {
										propOnCloseContact?.();
										setInternalContactLead(null);
									}}
								>
									Отмена
								</button>
								<button
									type="button"
									className="primary-button"
									onClick={() => {
										if (propOnSaveContact) propOnSaveContact();
										else handleSaveContactInternal();
									}}
								>
									Сохранить контакт
								</button>
							</div>
						</div>
					</div>
				)}

				{declineLead && (
					<div className="p-4 bg-[var(--paper-soft)] border-b border-[var(--line)]">
						<div className="flex items-center justify-between mb-2">
							<h4 className="m-0 text-sm font-bold text-red-600 flex items-center gap-2">
								<X size={15} />
								<span>Причина отказа: {declineLead.patientFullName}</span>
							</h4>
							<button
								type="button"
								className="icon-button"
								onClick={() => {
									propOnCloseDecline?.();
									setInternalDeclineLead(null);
								}}
							>
								<X size={14} />
							</button>
						</div>
						<div className="space-y-3">
							<div>
								<label className="text-xs font-semibold text-[var(--muted)] block mb-1">
									Причина отказа:
								</label>
								<select
									className="cld-filter-select w-full"
									value={propDeclineReason || internalDeclineReason}
									onChange={(e) => {
										const val = e.target.value as any;
										propOnSetDeclineReason?.(val);
										setInternalDeclineReason(val);
									}}
								>
									{Object.entries(DECLINE_REASON_LABELS_RU).map(([code, label]) => (
										<option key={code} value={code}>
											{label}
										</option>
									))}
								</select>
							</div>
							<div>
								<label className="text-xs font-semibold text-[var(--muted)] block mb-1">
									Комментарий:
								</label>
								<textarea
									rows={2}
									className="w-full p-2 border border-[var(--line)] rounded-lg text-xs bg-[var(--paper)] text-[var(--ink)]"
									placeholder="Пояснение пациента..."
									value={propDeclineComment ?? internalDeclineComment}
									onChange={(e) => {
										propOnSetDeclineComment?.(e.target.value);
										setInternalDeclineComment(e.target.value);
									}}
								/>
							</div>
							<div className="flex justify-end gap-2 pt-2">
								<button
									type="button"
									className="secondary-button"
									onClick={() => {
										propOnCloseDecline?.();
										setInternalDeclineLead(null);
									}}
								>
									Отмена
								</button>
								<button
									type="button"
									className="primary-button !bg-red-600 !border-red-600 text-white"
									onClick={() => {
										if (propOnSaveDecline) propOnSaveDecline();
										else handleSaveDeclineInternal();
									}}
								>
									Зафиксировать отказ
								</button>
							</div>
						</div>
					</div>
				)}

				{selectedLead && (
					<div
						className="p-4 bg-[var(--paper-soft)] border-b border-[var(--line)]"
						data-testid="cld-drawer-inspection-card"
					>
						<div className="flex items-center justify-between mb-3">
							<h3 className="m-0 text-base font-bold text-[var(--ink)] flex items-center gap-2">
								<User size={16} className="text-[var(--teal)]" />
								<span>Карточка утечки: {selectedLead.patientFullName}</span>
							</h3>
							<button
								type="button"
								className="icon-button"
								onClick={() => {
									propOnCloseLeakLead?.();
									setInternalSelectedLead(null);
								}}
								title="Закрыть"
							>
								<X size={15} />
							</button>
						</div>

						<div className="space-y-2.5 text-xs">
							<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] flex items-center justify-between">
								<span className="text-[var(--muted)] font-semibold">Телефон:</span>
								<a
									href={`tel:${(selectedLead.phone || selectedLead.patientPhone || "").replace(/[^\d+]/g, "")}`}
									className="font-bold text-[var(--teal)] hover:underline"
								>
									{selectedLead.phone || selectedLead.patientPhone || "Не указан"}
								</a>
							</div>

							<div className="grid grid-cols-2 gap-2">
								<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)]">
									<span className="text-[var(--muted)] block font-semibold mb-0.5">Без визита:</span>
									<span className="text-sm font-bold text-amber-600">
										{selectedLead.daysSinceLastVisit} дн.
									</span>
								</div>
								<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)]">
									<span className="text-[var(--muted)] block font-semibold mb-0.5">Лечащий врач:</span>
									<span className="font-semibold text-[var(--ink)] block">
										{selectedLead.lastDoctorName || "Не назначен"}
									</span>
								</div>
							</div>

							<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)]">
								<span className="text-[var(--muted)] block font-semibold mb-0.5">Клинический риск:</span>
								<p className="m-0 text-[var(--ink)] leading-relaxed">
									{selectedLead.clinicalRiskReason}
								</p>
								{selectedLead.hasUncompletedPlan && (
									<div className="cld-plan-alert mt-2">
										<AlertTriangle size={12} />
										<span>Брошенный план: {selectedLead.uncompletedPlanSumRub.toLocaleString("ru-RU")} ₽</span>
									</div>
								)}
							</div>

							<div className="flex justify-end gap-2 pt-2">
								<button
									type="button"
									className="secondary-button"
									onClick={() => {
										propOnCloseLeakLead?.();
										setInternalSelectedLead(null);
									}}
								>
									Закрыть
								</button>
								<button
									type="button"
									className="primary-button"
									data-testid="cld-drawer-open-patient-workspace-btn"
									onClick={() => handleOpenPatientWorkspace(selectedLead.patientId)}
								>
									<ExternalLink size={14} />
									<span>Открыть карту пациента</span>
								</button>
							</div>
						</div>
					</div>
				)}

				{/* 3. KPI Metrics Strip */}
				<div className="cld-kpi-bar px-4 py-2.5 border-b border-[var(--line)] bg-[var(--paper)]">
					<div className="cld-kpi-card">
						<span className="cld-kpi-label">Выявлено оттока</span>
						<span className="cld-kpi-val highlight">
							{metrics?.totalIdentifiedLeads ?? leads.length}
						</span>
					</div>
					<div className="cld-kpi-card">
						<span className="cld-kpi-label">Связались</span>
						<span className="cld-kpi-val">
							{metrics?.contactedCount ?? 0}
						</span>
					</div>
					<div className="cld-kpi-card">
						<span className="cld-kpi-label">Записаны на приём</span>
						<span className="cld-kpi-val success">
							{metrics?.rebookedCount ?? 0}
						</span>
					</div>
					<div className="cld-kpi-card">
						<span className="cld-kpi-label">Брошенные планы</span>
						<span className="cld-kpi-val highlight">
							{(metrics?.totalUncompletedPlanSumRub ?? 0).toLocaleString("ru-RU")} ₽
						</span>
					</div>
				</div>

				{/* 4. Filter Toolbar (36px) */}
				<div className="cld-filter-bar px-4 py-2 border-b border-[var(--line)] bg-[var(--paper-soft)] flex items-center gap-2 flex-wrap">
					<select
						className="secondary-button cld-filter-select h-9 text-xs"
						value={minDays}
						onChange={(e) => setMinDays(Number(e.target.value))}
					>
						<option value={210}>Порог: 210 дней (7 мес.)</option>
						<option value={240}>Порог: 240 дней (8 мес.)</option>
						<option value={365}>Порог: 365 дней (1 год)</option>
					</select>

					<select
						className="secondary-button cld-filter-select h-9 text-xs"
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
					>
						<option value="all">Все статусы</option>
						<option value="new">Новые</option>
						<option value="in_progress">В работе</option>
						<option value="contacted">Связались</option>
						<option value="rebooked">Записаны</option>
						<option value="declined">Отказ</option>
					</select>

					<label className="text-xs text-[var(--ink)] font-medium inline-flex items-center gap-1.5 cursor-pointer ml-1">
						<input
							type="checkbox"
							checked={onlyUncompletedPlans}
							onChange={(e) => setOnlyUncompletedPlans(e.target.checked)}
							className="rounded border-[var(--line)]"
						/>
						<span>Только брошенные планы</span>
					</label>

					<input
						type="text"
						className="cld-filter-input h-9 text-xs ml-auto min-w-[180px] bg-[var(--paper)] border border-[var(--line)] rounded-lg px-2.5 text-[var(--ink)]"
						placeholder="Поиск по имени/телефону..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>

				{/* 5. Main Table */}
				<div className="cld-content flex-1 overflow-y-auto p-4">
					{loading ? (
						<div className="cld-empty-state">
							<RefreshCw size={24} className="animate-spin mx-auto mb-2 text-[var(--teal)]" />
							<span>Загрузка пациентов...</span>
						</div>
					) : filteredLeads.length === 0 ? (
						<div className="cld-empty-state">
							<CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-600" />
							<span>Утечек пациентов не обнаружено. Все пациенты с визитами.</span>
						</div>
					) : (
						<table className="cld-table w-full text-xs">
							<thead>
								<tr>
									<th>Пациент и телефон</th>
									<th>Без визита</th>
									<th>Врач</th>
									<th>Клинический риск</th>
									<th>Действия</th>
								</tr>
							</thead>
							<tbody>
								{filteredLeads.map((lead) => {
									const rawPhone = lead.phone || lead.patientPhone || "";
									const cleanPhone = rawPhone.replace(/[^0-9]/g, "");
									return (
										<tr key={lead.id}>
											<td>
												<button
													type="button"
													className="cld-patient-title-btn text-left font-bold text-[var(--ink)] hover:text-[var(--teal)] hover:underline cursor-pointer"
													data-testid={`lead-patient-link-${lead.id}`}
													onClick={() => setInternalSelectedLead(lead)}
													title={`Карточка утечки: ${lead.patientFullName}`}
												>
													{lead.patientFullName}
												</button>
												<div className="cld-phone-row text-[11px] text-[var(--muted)] flex items-center gap-1.5 mt-0.5">
													<Phone size={11} />
													<span>{lead.phone}</span>
												</div>
											</td>

											<td>
												<span className="font-bold text-amber-600">
													{lead.daysSinceLastVisit} дн.
												</span>
											</td>

											<td>
												<span className="font-medium text-[var(--ink)]">
													{lead.lastDoctorName || "—"}
												</span>
											</td>

											<td>
												<div className="text-[11.5px] leading-snug text-[var(--ink)]">
													{lead.clinicalRiskReason}
												</div>
												{lead.hasUncompletedPlan && (
													<div className="cld-plan-alert mt-1 inline-flex items-center gap-1 text-[11px] text-amber-600">
														<AlertTriangle size={11} />
														<span>{lead.uncompletedPlanSumRub.toLocaleString("ru-RU")} ₽</span>
													</div>
												)}
											</td>

											<td>
												<div className="flex items-center gap-1.5 flex-wrap">
													<a
														href={`tel:${rawPhone.replace(/[^\d+]/g, "")}`}
														className="icon-button"
														title="Позвонить"
													>
														<Phone size={12} className="text-[var(--teal)]" />
													</a>

													{cleanPhone && (
														<button
															type="button"
															className="icon-button"
															onClick={() => handleOpenWhatsApp(lead)}
															title="WhatsApp"
														>
															<MessageCircle size={12} className="text-emerald-600" />
														</button>
													)}

													<button
														type="button"
														className="secondary-button h-7 px-2 text-[11px]"
														onClick={() => handleBookAppointment(lead)}
														title="Записать в расписание"
													>
														<Calendar size={11} />
														<span>Запись</span>
													</button>

													<button
														type="button"
														className="secondary-button h-7 px-2 text-[11px]"
														data-testid={`btn-open-workspace-${lead.id}`}
														onClick={() => handleOpenPatientWorkspace(lead.patientId)}
														title="Открыть карту пациента"
													>
														<ExternalLink size={11} />
														<span>Карта</span>
													</button>

													{lead.aiReactivationSuggestion && (
														<button
															type="button"
															className="icon-button"
															onClick={() => setInternalScriptLead(lead)}
															title="Скрипт звонка"
														>
															<FileText size={12} />
														</button>
													)}

													<button
														type="button"
														className="icon-button"
														onClick={() => {
															setInternalContactLead(lead);
															setInternalContactNotes(lead.lastContactNotes || "");
														}}
														title="Фиксация контакта"
													>
														<UserCheck size={12} />
													</button>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					)}
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(drawerContent, document.body)
		: drawerContent;
};

export default CrmLeakDetectorDrawer;
