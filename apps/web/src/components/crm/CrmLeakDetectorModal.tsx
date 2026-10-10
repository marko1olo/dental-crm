import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	AlertTriangle,
	Calendar,
	Check,
	CheckCircle2,
	ChevronRight,
	Clock,
	Copy,
	FileText,
	MessageCircle,
	Phone,
	PhoneCall,
	RefreshCw,
	UserCheck,
	X,
} from "lucide-react";
import {
	type CrmDeclineReason,
	type CrmLeakFunnelMetrics,
	type CrmLeakLeadItem,
	DECLINE_REASON_LABELS_RU,
} from "@dental/shared";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
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
import { CrmLeakDetectorDrawer } from "./CrmLeakDetectorDrawer";
import "./CrmLeakDetectorModal.css";

interface Props {
	isOpen: boolean;
	onClose: () => void;
}

export const CrmLeakDetectorModal: React.FC<Props> = ({ isOpen, onClose }) => {
	const appLogic = useAppLogicContext();
	const auth = appLogic.auth;

	const [leads, setLeads] = useState<CrmLeakLeadItem[]>([]);
	const [metrics, setMetrics] = useState<CrmLeakFunnelMetrics | null>(null);
	const [loading, setLoading] = useState(false);
	const [syncing, setSyncing] = useState(false);

	// Фильтры
	const [minDays, setMinDays] = useState<number>(210);
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [onlyUncompletedPlans, setOnlyUncompletedPlans] = useState<boolean>(false);
	const [searchQuery, setSearchQuery] = useState<string>("");

	// Модальные окна действий
	const [activeScriptLead, setActiveScriptLead] = useState<CrmLeakLeadItem | null>(null);
	const [copiedScript, setCopiedScript] = useState(false);
	const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (copyTimerRef.current) {
				clearTimeout(copyTimerRef.current);
				copyTimerRef.current = null;
			}
		};
	}, []);

	const [contactModalLead, setContactModalLead] = useState<CrmLeakLeadItem | null>(null);
	const [contactChannel, setContactChannel] = useState<"call" | "whatsapp" | "telegram" | "sms">("call");
	const [contactNotes, setContactNotes] = useState<string>("");

	const [declineModalLead, setDeclineModalLead] = useState<CrmLeakLeadItem | null>(null);
	const [declineReason, setDeclineReason] = useState<CrmDeclineReason>("too_expensive");
	const [declineComment, setDeclineComment] = useState<string>("");

	const loadData = useCallback(async () => {
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
			showToast(`Ошибка загрузки детектора утечек: ${err.message}`, "error");
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
		try {
			const headers = auth.denteClinicalMutationHeaders();
			await startLeakLead(leadId, headers);
			showToast("Лид взят в работу: Пациент назначен на вас", "success");
			await loadData();
		} catch (err: any) {
			showToast(`Ошибка: ${err.message}`, "error");
		}
	};

	const handleCreateTask = async (lead: CrmLeakLeadItem) => {
		try {
			const headers = auth.denteClinicalMutationHeaders();
			await createLeakTask(lead.id, headers);
			showToast(`Задача перезвонить создана: ${lead.patientFullName}`, "success");
			await loadData();
		} catch (err: any) {
			showToast(`Ошибка: ${err.message}`, "error");
		}
	};

	const handleSaveContact = async () => {
		if (!contactModalLead || !contactNotes.trim()) {
			showToast("Заполните заметку: Укажите результат звонка или сообщения", "warning");
			return;
		}
		try {
			const headers = auth.denteClinicalMutationHeaders();
			await processLeakLead(
				contactModalLead.id,
				{
					channel: contactChannel,
					notes: contactNotes.trim(),
					targetStatus: "contacted",
				},
				headers,
			);
			showToast("Контакт сохранен: Статус лида обновлен на «Связались»", "success");
			setContactModalLead(null);
			setContactNotes("");
			await loadData();
		} catch (err: any) {
			showToast(`Ошибка: ${err.message}`, "error");
		}
	};

	const handleSaveDecline = async () => {
		if (!declineModalLead) return;
		try {
			const headers = auth.denteClinicalMutationHeaders();
			await cancelLeakLead(
				declineModalLead.id,
				{
					declineReason,
					declineComment: declineComment.trim() || undefined,
				},
				headers,
			);
			showToast("Отказ зафиксирован: Лид переведен в статус отказа", "info");
			setDeclineModalLead(null);
			setDeclineComment("");
			await loadData();
		} catch (err: any) {
			showToast(`Ошибка: ${err.message}`, "error");
		}
	};

	const handleCopyScript = (text: string) => {
		navigator.clipboard.writeText(text);
		setCopiedScript(true);
		showToast("Скрипт скопирован в буфер обмена", "success");
		if (copyTimerRef.current) {
			clearTimeout(copyTimerRef.current);
		}
		copyTimerRef.current = setTimeout(() => {
			setCopiedScript(false);
			copyTimerRef.current = null;
		}, 2000);
	};

	const handleOpenWhatsApp = (lead: CrmLeakLeadItem) => {
		const text =
			lead.aiReactivationSuggestion ||
			`Здравствуйте, ${lead.patientFullName}! Вас приветствует стоматологическая клиника DENTE. Напоминаем о возможности пройти контрольный осмотр.`;
		openWhatsAppChat(lead.phone, text);
		showToast(`Чат WhatsApp открыт для ${lead.patientFullName}`, "success");
	};

	const handleBookAppointment = (lead: CrmLeakLeadItem) => {
		usePatientStore.getState().setSelectedPatientId(lead.patientId);
		useAppStore.getState().setCurrentView("schedule");
		onClose();
		showToast(
			`Пациент ${lead.patientFullName} выбран. Выберите время приёма в расписании`,
			"info",
		);
	};

	if (!isOpen) return null;

	const filteredLeads = leads.filter((lead) => {
		if (!searchQuery.trim()) return true;
		const q = searchQuery.toLowerCase();
		return (
			lead.patientFullName.toLowerCase().includes(q) ||
			lead.phone.includes(q) ||
			(lead.lastDoctorName && lead.lastDoctorName.toLowerCase().includes(q))
		);
	});

	return (
		<div className="cld-modal-overlay">
			<div className="cld-modal-dialog">
				{/* Шапка */}
				<div className="cld-header">
					<div className="cld-header-left">
						<h2 className="cld-title">
							<Clock size={18} className="text-blue-600" />
							Детектор клинических утечек CRM
						</h2>
						<span className="cld-badge-threshold">
							Порог: {minDays} дней (7 мес. угасание гигиены · 6 мес. гарантия СтАР)
						</span>
					</div>

					<div className="cld-header-actions">
						<button
							type="button"
							className="cld-btn-sync"
							onClick={handleSync}
							disabled={syncing}
							title="Сканировать пациентов без будущих визитов с датой приема > 210 дней"
						>
							<RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
							{syncing ? "Поиск оттока..." : "Синхронизировать базу"}
						</button>
						<button
							type="button"
							className="cld-btn-close"
							onClick={onClose}
							title="Закрыть"
						>
							<X size={16} />
						</button>
					</div>
				</div>

				{/* KPI Воронка реактивации */}
				<div className="cld-kpi-bar">
					<div className="cld-kpi-card">
						<span className="cld-kpi-label">Выявлено утечек</span>
						<span className="cld-kpi-val highlight">
							{metrics?.totalIdentifiedLeads ?? leads.length}
						</span>
					</div>
					<div className="cld-kpi-card">
						<span className="cld-kpi-label">В работе у админов</span>
						<span className="cld-kpi-val warning">
							{metrics?.inProgressCount ?? 0}
						</span>
					</div>
					<div className="cld-kpi-card">
						<span className="cld-kpi-label">Связались (звонок/WA)</span>
						<span className="cld-kpi-val">
							{metrics?.contactedCount ?? 0}
						</span>
					</div>
					<div className="cld-kpi-card">
						<span className="cld-kpi-label">Записаны на прием</span>
						<span className="cld-kpi-val success">
							{metrics?.rebookedCount ?? 0}
						</span>
					</div>
					<div className="cld-kpi-card">
						<span className="cld-kpi-label">Конверсия</span>
						<span className="cld-kpi-val success">
							{metrics?.reactivationConversionPct ?? 0}%
						</span>
					</div>
					<div className="cld-kpi-card">
						<span className="cld-kpi-label">Спасенная выручка (прогноз)</span>
						<span className="cld-kpi-val success">
							{(metrics?.rebookedRevenuePotentialRub ?? 0).toLocaleString("ru-RU")} ₽
						</span>
					</div>
					<div className="cld-kpi-card" title="Пациенты на этапе остеоинтеграции (4–6 мес.) или ортодонтии (до 2 лет) — физиологическая норма, исключены из оттока">
						<span className="cld-kpi-label">Клин. пауза (норма)</span>
						<span className="cld-kpi-val">
							{metrics?.clinicalObservationPauseCount ?? 0}
						</span>
					</div>
					<div className="cld-kpi-card">
						<span className="cld-kpi-label">Брошенные планы</span>
						<span className="cld-kpi-val highlight">
							{(metrics?.totalUncompletedPlanSumRub ?? 0).toLocaleString("ru-RU")} ₽
						</span>
					</div>
				</div>

				{/* Панель фильтров */}
				<div className="cld-filter-bar">
					<select
						className="cld-filter-select"
						value={minDays}
						onChange={(e) => setMinDays(Number(e.target.value))}
					>
						<option value={210}>Порог: 210 дней (7 мес. - гигиена)</option>
						<option value={240}>Порог: 240 дней (8 мес.)</option>
						<option value={365}>Порог: 365 дней (1 год)</option>
					</select>

					<select
						className="cld-filter-select"
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
					>
						<option value="all">Все статусы</option>
						<option value="new">Новые (не взяты)</option>
						<option value="in_progress">В работе</option>
						<option value="contacted">Связались</option>
						<option value="rebooked">Записаны</option>
						<option value="declined">Отказ</option>
						<option value="CLINICAL_OBSERVATION_PAUSE">Клин. пауза (остеоинтеграция / ортодонтия)</option>
					</select>

					<label className="cld-filter-checkbox">
						<input
							type="checkbox"
							checked={onlyUncompletedPlans}
							onChange={(e) => setOnlyUncompletedPlans(e.target.checked)}
						/>
						Только с брошенным планом лечения
					</label>

					<input
						type="text"
						className="cld-filter-input"
						placeholder="Поиск по пациенту, телефону..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						style={{ minWidth: "220px", marginLeft: "auto" }}
					/>
				</div>

				{/* Таблица лидов */}
				<div className="cld-content">
					{loading ? (
						<div className="cld-empty-state">
							<RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
							Загрузка реестра реактивации...
						</div>
					) : filteredLeads.length === 0 ? (
						<div className="cld-empty-state">
							<CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-600" />
							Утечек пациентов не обнаружено (или все пациенты уже имеют записи в расписании).
						</div>
					) : (
						<table className="cld-table">
							<thead>
								<tr>
									<th>Пациент и контакт</th>
									<th>Дней без визита</th>
									<th>Врач / Специальность</th>
									<th>Клинический риск & Брошенный план</th>
									<th>Статус & Ответственный</th>
									<th>Действия</th>
								</tr>
							</thead>
							<tbody>
								{filteredLeads.map((lead) => {
									const cleanPhone = lead.phone.replace(/[^0-9]/g, "");
									return (
										<tr key={lead.id}>
											<td>
												<div className="cld-patient-title">{lead.patientFullName}</div>
												<div className="cld-phone-row">
													<a href={`tel:${lead.phone}`} className="cld-phone-link">
														<Phone size={12} className="inline mr-1" />
														{lead.phone}
													</a>
													{cleanPhone && (
														<a
															href={`https://wa.me/${cleanPhone}`}
															target="_blank"
															rel="noreferrer"
															className="cld-wa-btn"
															title="Открыть чат в WhatsApp"
														>
															<MessageCircle size={11} />
															WA
														</a>
													)}
												</div>
											</td>

											<td>
												<span
													className={`cld-badge-days ${
														lead.daysSinceLastVisit > 270 ? "high" : "mid"
													}`}
												>
													{lead.daysSinceLastVisit} дн.
												</span>
												<div className="text-xs text-slate-500 mt-1">
													{lead.lastVisitDate
														? new Date(lead.lastVisitDate).toLocaleDateString("ru-RU")
														: "—"}
												</div>
											</td>

											<td>
												<div className="font-medium text-slate-800">
													{lead.lastDoctorName || "Врач не назначен"}
												</div>
												<div className="text-xs text-slate-500">
													{lead.lastSpecialty || "Терапия"}
												</div>
											</td>

											<td>
												<div className="text-xs text-slate-700 leading-snug">
													{lead.clinicalRiskReason}
												</div>
												{lead.hasUncompletedPlan && (
													<div className="cld-plan-alert">
														<AlertTriangle size={12} />
														План: {lead.uncompletedPlanSumRub.toLocaleString("ru-RU")} ₽
													</div>
												)}
											</td>

											<td>
												<span className={`cld-status-pill ${lead.leadStatus}`}>
													{lead.leadStatus === "new" && "Новый"}
													{lead.leadStatus === "in_progress" && "В работе"}
													{lead.leadStatus === "contacted" && "Связались"}
													{lead.leadStatus === "rebooked" && "Записан"}
													{lead.leadStatus === "declined" && "Отказ"}
													{lead.leadStatus === "archived" && "В архиве"}
													{(lead.leadStatus === "CLINICAL_OBSERVATION_PAUSE" ||
														lead.leadStatus === "clinical_observation_pause") &&
														"Клин. пауза (норма)"}
												</span>
												{lead.assignedAdminName && (
													<div className="text-xs text-slate-500 mt-1">
														{lead.assignedAdminName}
													</div>
												)}
												{lead.contactAttemptsCount > 0 && (
													<div className="text-xs text-slate-400 mt-0.5">
														Попыток: {lead.contactAttemptsCount}
													</div>
												)}
											</td>

											<td>
												<div className="cld-actions-col">
													{/* Быстрые 1-клик действия без модальных барьеров */}
													<div className="cld-actions-quick-row">
														<a
															href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}
															className="cld-action-btn primary"
															title={`Позвонить пациенту ${lead.phone}`}
														>
															<Phone size={12} />
															Звонок
														</a>

														<button
															type="button"
															className="cld-action-btn success"
															onClick={() => handleOpenWhatsApp(lead)}
															title="Открыть диалог WhatsApp с текстом предложения"
														>
															<MessageCircle size={12} />
															WhatsApp
														</button>

														<button
															type="button"
															className="cld-action-btn accent"
															onClick={() => handleBookAppointment(lead)}
															title="Перейти в расписание для записи пациента"
														>
															<Calendar size={12} />
															Записать
														</button>
													</div>

													<button
														type="button"
														className="cld-action-btn"
														onClick={() => handleCreateTask(lead)}
														title="Создать задачу администратору перезвонить пациенту (быстрая реактивация)"
													>
														<PhoneCall size={12} />
														Перезвонить (задача)
													</button>

													{lead.leadStatus === "new" && (
														<button
															type="button"
															className="cld-action-btn"
															onClick={() => handleStartLead(lead.id)}
															title="Взять лид в работу"
														>
															<UserCheck size={12} />
															В работу
														</button>
													)}

													<button
														type="button"
														className="cld-action-btn"
														onClick={() => {
															setContactModalLead(lead);
															setContactNotes(lead.lastContactNotes || "");
														}}
													>
														<Phone size={12} />
														Фиксация контакта
													</button>

													{lead.aiReactivationSuggestion && (
														<button
															type="button"
															className="cld-action-btn"
															onClick={() => setActiveScriptLead(lead)}
														>
															<FileText size={12} />
															Скрипт звонка / WA
														</button>
													)}

													{lead.leadStatus !== "declined" && lead.leadStatus !== "rebooked" && (
														<button
															type="button"
															className="cld-action-btn danger"
															onClick={() => setDeclineModalLead(lead)}
														>
															<X size={12} />
															Отказ
														</button>
													)}
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					)}
				</div>

				{/* Панель действий реактивации (Инлайн-дровер вместо вложенных модалок по Мандату 8d) */}
				<CrmLeakDetectorDrawer
					activeScriptLead={activeScriptLead}
					copiedScript={copiedScript}
					onCopyScript={handleCopyScript}
					onCloseScript={() => setActiveScriptLead(null)}
					contactModalLead={contactModalLead}
					contactChannel={contactChannel}
					onSetContactChannel={setContactChannel}
					contactNotes={contactNotes}
					onSetContactNotes={setContactNotes}
					onSaveContact={handleSaveContact}
					onCloseContact={() => setContactModalLead(null)}
					declineModalLead={declineModalLead}
					declineReason={declineReason}
					onSetDeclineReason={setDeclineReason}
					declineComment={declineComment}
					onSetDeclineComment={setDeclineComment}
					onSaveDecline={handleSaveDecline}
					onCloseDecline={() => setDeclineModalLead(null)}
				/>
			</div>
		</div>
	);
};
