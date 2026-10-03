/**
 * DENTE Dental CRM — Wide Column Focus Workspace Modal
 *
 * Mandate 8n (Clinical Ergonomics, Scale Sovereignty & Solo Doctor Autonomy):
 * - Fullscreen 92vw / 90vh focused clinical workspace for any funnel stage
 * - Dual view toggle: "3-column wide cards" vs "Spreadsheet / dense table (32px rows)"
 * - Bulk action bar: checkbox multi-select, 1-click batch move to next stage, batch doctor assignment, CSV export
 * - Speed-to-lead SLA urgency indicators
 * - ESC key and backdrop click to instantly dismiss
 */

import React, { useEffect, useMemo, useState } from "react";
import {
	AlertTriangle,
	ArrowRight,
	Calendar,
	Check,
	CheckSquare,
	Clock,
	DollarSign,
	Download,
	Edit2,
	Eye,
	FileSpreadsheet,
	Filter,
	Globe,
	LayoutGrid,
	Maximize2,
	MessageSquare,
	Minimize2,
	Phone,
	Search,
	Square,
	Tag,
	User,
	UserCheck,
	UserPlus,
	Users,
	X,
} from "lucide-react";
import type { Lead, LeadStatus } from "../../store/leadsStore";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { formatWhatsAppUrl } from "../messaging/omnichannelEngine";
import {
	CHANNEL_BADGE_COLORS,
	CHANNEL_DISPLAY_NAMES,
} from "../telephony/telephonyAttribution";
import { normalizeMarketingChannel } from "./leadsFunnelTypes";
import { LeadAudioPlayerWidget } from "./LeadAudioPlayerWidget";
import {
	BookableDoctor,
	exportLeadsToCsv,
	getLeadSlaStatus,
	LeadSlaUrgency,
	LeadSortOption,
	NEXT_STAGE_MAP,
	sortLeads,
} from "./leadsKanbanTypes";

export interface ExpandedColumnFocusModalProps {
	isOpen: boolean;
	onClose: () => void;
	column: {
		id: LeadStatus;
		label: string;
		color: string;
		icon: React.ReactNode;
	};
	leads: Lead[];
	staff: BookableDoctor[];
	onStatusChange: (leadId: string, nextStatus: LeadStatus) => Promise<void> | void;
	onBatchStatusChange: (leadIds: string[], nextStatus: LeadStatus) => Promise<void> | void;
	onBatchAssignDoctor: (leadIds: string[], doctorId: string) => Promise<void> | void;
	onEditLead: (lead: Lead) => void;
	onScheduleLead: (leadId: string) => void;
	onCreatePatient: (lead: Lead) => Promise<void> | void;
	onQuickSchedule?: (leadId: string) => Promise<void> | void;
}

export const ExpandedColumnFocusModal: React.FC<ExpandedColumnFocusModalProps> = ({
	isOpen,
	onClose,
	column,
	leads,
	staff,
	onStatusChange,
	onBatchStatusChange,
	onBatchAssignDoctor,
	onEditLead,
	onScheduleLead,
	onCreatePatient,
	onQuickSchedule,
}) => {
	// View mode: 'cards' (3-col wide) vs 'table' (32px dense spreadsheet)
	const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

	// Local search and filter states
	const [searchQuery, setSearchQuery] = useState("");
	const [urgencyFilter, setUrgencyFilter] = useState<"all" | LeadSlaUrgency>("all");
	const [sortOption, setSortOption] = useState<LeadSortOption>("sla_urgent");

	// Multi-select for bulk actions
	const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
	const [batchTargetDoctorId, setBatchTargetDoctorId] = useState<string>("");
	const [isProcessingBatch, setIsProcessingBatch] = useState(false);

	// ESC key listener to dismiss
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	// Filter leads belonging to this column
	const columnLeads = useMemo(() => {
		return leads.filter((l) => l.status === column.id);
	}, [leads, column.id]);

	// Compute telemetry & metrics
	const metrics = useMemo(() => {
		const totalRevenue = columnLeads.reduce(
			(acc, l) => acc + (Number(l.expectedRevenue) || 0),
			0,
		);
		let breachedCount = 0;
		let warningCount = 0;
		let freshCount = 0;
		let totalMinutes = 0;

		columnLeads.forEach((lead) => {
			const sla = getLeadSlaStatus(lead);
			totalMinutes += sla.minutesElapsed;
			if (sla.urgency === "breached") breachedCount++;
			else if (sla.urgency === "warning") warningCount++;
			else freshCount++;
		});

		const avgWaitMinutes =
			columnLeads.length > 0
				? Math.round(totalMinutes / columnLeads.length)
				: 0;

		return {
			totalCount: columnLeads.length,
			totalRevenue,
			breachedCount,
			warningCount,
			freshCount,
			avgWaitMinutes,
		};
	}, [columnLeads]);

	// Filtered & sorted leads for display
	const displayLeads = useMemo(() => {
		let result = columnLeads.filter((lead) => {
			const q = searchQuery.toLowerCase().trim();
			const matchesQuery =
				!q ||
				lead.name?.toLowerCase().includes(q) ||
				lead.phone?.includes(q) ||
				lead.notes?.toLowerCase().includes(q) ||
				lead.source?.toLowerCase().includes(q);

			if (!matchesQuery) return false;

			if (urgencyFilter !== "all") {
				const sla = getLeadSlaStatus(lead);
				if (sla.urgency !== urgencyFilter) return false;
			}

			return true;
		});

		return sortLeads(result, sortOption);
	}, [columnLeads, searchQuery, urgencyFilter, sortOption]);

	// Pagination limit for massive datasets (prevents DOM freeze on 300+ leads)
	const [visibleLimit, setVisibleLimit] = useState(60);

	useEffect(() => {
		setVisibleLimit(60);
	}, [searchQuery, urgencyFilter, sortOption, column.id]);

	const visibleLeads = useMemo(() => {
		return displayLeads.slice(0, visibleLimit);
	}, [displayLeads, visibleLimit]);

	// Toggle selection for a single lead
	const toggleSelectLead = (id: string, e?: React.MouseEvent) => {
		if (e) e.stopPropagation();
		setSelectedLeadIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	// Toggle select all visible
	const toggleSelectAll = () => {
		if (selectedLeadIds.size >= displayLeads.length && displayLeads.length > 0) {
			setSelectedLeadIds(new Set());
		} else {
			setSelectedLeadIds(new Set(displayLeads.map((l) => l.id)));
		}
	};

	// Bulk actions
	const handleBatchAdvance = async () => {
		const nextStage = NEXT_STAGE_MAP[column.id]?.status;
		if (!nextStage || selectedLeadIds.size === 0 || isProcessingBatch) return;

		setIsProcessingBatch(true);
		try {
			await onBatchStatusChange(Array.from(selectedLeadIds), nextStage);
			setSelectedLeadIds(new Set());
		} finally {
			setIsProcessingBatch(false);
		}
	};

	const handleBatchMoveToStage = async (nextStatus: LeadStatus) => {
		if (selectedLeadIds.size === 0 || isProcessingBatch) return;

		setIsProcessingBatch(true);
		try {
			await onBatchStatusChange(Array.from(selectedLeadIds), nextStatus);
			setSelectedLeadIds(new Set());
		} finally {
			setIsProcessingBatch(false);
		}
	};

	const handleBatchAssign = async () => {
		if (
			!batchTargetDoctorId ||
			selectedLeadIds.size === 0 ||
			isProcessingBatch
		)
			return;

		setIsProcessingBatch(true);
		try {
			await onBatchAssignDoctor(
				Array.from(selectedLeadIds),
				batchTargetDoctorId,
			);
			setSelectedLeadIds(new Set());
			setBatchTargetDoctorId("");
		} finally {
			setIsProcessingBatch(false);
		}
	};

	const handleExportCsv = (onlySelected = false) => {
		const targetLeads = onlySelected
			? displayLeads.filter((l) => selectedLeadIds.has(l.id))
			: displayLeads;

		const csvContent = exportLeadsToCsv(targetLeads, column.label);
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `leads_${column.id}_${new Date().toISOString().slice(0, 10)}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	if (!isOpen) return null;

	const nextStageInfo = NEXT_STAGE_MAP[column.id];

	return (
		<div
			className="expanded-focus-modal-overlay"
			onClick={onClose}
			data-testid="expanded-column-modal"
		>
			<div
				className="expanded-focus-modal-container"
				onClick={(e) => e.stopPropagation()}
			>
				{/* 1. MODAL HEADER & METRICS BAR */}
				<header className="expanded-focus-header">
					<div className="expanded-focus-title-group">
						<div
							className="expanded-focus-column-icon"
							style={{ background: column.color }}
						>
							{column.icon}
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 className="expanded-focus-title">{column.label}</h2>
								<span className="expanded-focus-badge-mode">
									Focus Workspace · 92vw
								</span>
							</div>
							<p className="expanded-focus-subtitle">
								Широкий рабочий стол этапа воронки для скоростной пакетной обработки
							</p>
						</div>
					</div>

					{/* Clinical Telemetry / Metrics */}
					<div className="expanded-focus-metrics-cluster">
						<div className="expanded-focus-metric-pill" title="Всего лидов на этапе">
							<Users size={12} className="text-[var(--muted)]" />
							<span>Лидов: <strong>{metrics.totalCount}</strong></span>
						</div>
						{metrics.totalRevenue > 0 && (
							<div
								className="expanded-focus-metric-pill expanded-focus-metric-pill--revenue"
								title="Суммарный потенциал выручки"
							>
								<DollarSign size={12} />
								<span>{metrics.totalRevenue.toLocaleString("ru-RU")} ₽</span>
							</div>
						)}
						<div
							className="expanded-focus-metric-pill"
							title="Среднее время ожидания в очереди"
						>
							<Clock size={12} className="text-[var(--muted)]" />
							<span>Ср. SLA: <strong>{metrics.avgWaitMinutes}м</strong></span>
						</div>
						{metrics.breachedCount > 0 && (
							<div
								className="expanded-focus-metric-pill expanded-focus-metric-pill--breached lead-sla-breached-pulse"
								title="Требуют немедленной реакции"
							>
								<AlertTriangle size={12} />
								<span>SLA просрочен: <strong>{metrics.breachedCount}</strong></span>
							</div>
						)}
					</div>

					{/* View Toggle & Close */}
					<div className="expanded-focus-header-actions">
						<div className="leads-viewmode-segmented">
							<button
								type="button"
								className={`leads-viewmode-segmented-btn ${viewMode === "cards" ? "is-active" : ""}`}
								onClick={() => setViewMode("cards")}
								title="Вид: 3-колоночная широкая сетка карточек"
								data-testid="focus-view-toggle-cards"
							>
								<LayoutGrid size={13} />
								<span>Карточки (3-col)</span>
							</button>
							<button
								type="button"
								className={`leads-viewmode-segmented-btn ${viewMode === "table" ? "is-active" : ""}`}
								onClick={() => setViewMode("table")}
								title="Вид: клинический спредшит (таблица 32px)"
								data-testid="focus-view-toggle-table"
							>
								<FileSpreadsheet size={13} />
								<span>Таблица 32px</span>
							</button>
						</div>

						<button
							type="button"
							className="expanded-focus-close-btn"
							onClick={onClose}
							title="Закрыть широкий фокус (Esc)"
							aria-label="Закрыть фокус"
							data-testid="focus-modal-close-btn"
						>
							<X size={16} />
						</button>
					</div>
				</header>

				{/* 2. FILTER & SORT TOOLBAR */}
				<div className="expanded-focus-toolbar">
					{/* Search Box */}
					<div className="expanded-focus-search-box">
						<Search size={14} className="text-[var(--muted)] shrink-0" />
						<input
							type="text"
							placeholder="Поиск по имени, телефону, жалобе..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="expanded-focus-search-input"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="text-[var(--muted)] hover:text-[var(--ink)]"
							>
								<X size={12} />
							</button>
						)}
					</div>

					{/* SLA Urgency Filter Tabs */}
					<div className="expanded-focus-urgency-tabs">
						<button
							type="button"
							className={`expanded-focus-tab ${urgencyFilter === "all" ? "is-active" : ""}`}
							onClick={() => setUrgencyFilter("all")}
						>
							Все ({metrics.totalCount})
						</button>
						<button
							type="button"
							className={`expanded-focus-tab expanded-focus-tab--fresh ${urgencyFilter === "fresh" ? "is-active" : ""}`}
							onClick={() => setUrgencyFilter("fresh")}
						>
							Свежие ({metrics.freshCount})
						</button>
						<button
							type="button"
							className={`expanded-focus-tab expanded-focus-tab--warning ${urgencyFilter === "warning" ? "is-active" : ""}`}
							onClick={() => setUrgencyFilter("warning")}
						>
							Внимание ({metrics.warningCount})
						</button>
						{metrics.breachedCount > 0 && (
							<button
								type="button"
								className={`expanded-focus-tab expanded-focus-tab--breached ${urgencyFilter === "breached" ? "is-active" : ""}`}
								onClick={() => setUrgencyFilter("breached")}
							>
								Просрочен SLA ({metrics.breachedCount})
							</button>
						)}
					</div>

					{/* Sort Selector */}
					<div className="expanded-focus-sort-cluster">
						<span className="text-[11.5px] text-[var(--muted)] font-medium">
							Сортировка:
						</span>
						<select
							value={sortOption}
							onChange={(e) => setSortOption(e.target.value as LeadSortOption)}
							className="expanded-focus-select"
						>
							<option value="sla_urgent">Срочные по SLA</option>
							<option value="created_desc">Сначала новые</option>
							<option value="created_asc">Сначала старые</option>
							<option value="revenue_desc">По выручке (макс)</option>
							<option value="name_asc">По имени (А-Я)</option>
						</select>
					</div>

					{/* CSV Export Button */}
					<button
						type="button"
						onClick={() => handleExportCsv(false)}
						className="expanded-focus-csv-btn"
						title="Экспортировать обращения этапа в Excel CSV"
						data-testid="focus-csv-export-btn"
					>
						<Download size={13} />
						<span>CSV Экспорт</span>
					</button>
				</div>

				{/* 3. BULK ACTION BAR (Conditional on selected items) */}
				{selectedLeadIds.size > 0 && (
					<div className="expanded-focus-bulk-bar" data-testid="focus-bulk-bar">
						<div className="flex items-center gap-2">
							<span className="expanded-focus-bulk-count">
								Выбрано: <strong>{selectedLeadIds.size}</strong> из {displayLeads.length}
							</span>
							<button
								type="button"
								onClick={toggleSelectAll}
								className="expanded-focus-bulk-link"
							>
								{selectedLeadIds.size === displayLeads.length
									? "Снять выбор"
									: "Выбрать все"}
							</button>
						</div>

						<div className="expanded-focus-bulk-actions">
							{/* 1-click batch move to next stage */}
							{nextStageInfo && (
								<button
									type="button"
									disabled={isProcessingBatch}
									onClick={handleBatchAdvance}
									className="expanded-focus-bulk-primary-btn"
									data-testid="focus-batch-advance-btn"
								>
									<span>{nextStageInfo.label} ({selectedLeadIds.size})</span>
									<ArrowRight size={13} />
								</button>
							)}

							{/* Batch move dropdown to any other status */}
							<select
								onChange={(e) => {
									if (e.target.value) {
										void handleBatchMoveToStage(e.target.value as LeadStatus);
										e.target.value = "";
									}
								}}
								defaultValue=""
								disabled={isProcessingBatch}
								className="expanded-focus-bulk-select"
							>
								<option value="" disabled>
									Перенести пачку в этап...
								</option>
								<option value="new">1. Новые</option>
								<option value="contacted">2. Квалифицированные</option>
								<option value="consult_booked">3. Консультация</option>
								<option value="showed_up">4. Дошли</option>
								<option value="no_answer">Недозвон</option>
								<option value="trash">Отказ</option>
							</select>

							{/* Batch Doctor Assignment */}
							{staff.length > 0 && (
								<div className="flex items-center gap-1.5">
									<select
										value={batchTargetDoctorId}
										onChange={(e) => setBatchTargetDoctorId(e.target.value)}
										disabled={isProcessingBatch}
										className="expanded-focus-bulk-select"
									>
										<option value="">Назначить врача...</option>
										{staff.map((doc) => (
											<option key={doc.id} value={doc.id}>
												{doc.fullName || doc.name}
											</option>
										))}
									</select>
									{batchTargetDoctorId && (
										<button
											type="button"
											onClick={handleBatchAssign}
											disabled={isProcessingBatch}
											className="expanded-focus-bulk-confirm-btn"
										>
											Применить
										</button>
									)}
								</div>
							)}

							{/* Export selected CSV */}
							<button
								type="button"
								onClick={() => handleExportCsv(true)}
								className="expanded-focus-bulk-secondary-btn"
								title="Экспорт выбранных лидов в CSV"
							>
								<Download size={12} />
								<span>Экспорт ({selectedLeadIds.size})</span>
							</button>

							{/* Clear Selection */}
							<button
								type="button"
								onClick={() => setSelectedLeadIds(new Set())}
								className="expanded-focus-bulk-cancel-btn"
								title="Снять выделение"
							>
								<X size={13} />
							</button>
						</div>
					</div>
				)}

				{/* 4. CONTENT WORKSPACE (Dual View) */}
				<div className="expanded-focus-content-scroll">
					{displayLeads.length === 0 ? (
						<div className="expanded-focus-empty-state">
							<Filter size={32} className="text-[var(--muted)] opacity-40 mb-2" />
							<p className="text-[14px] font-semibold text-[var(--ink)]">
								{columnLeads.length === 0
									? "В этом этапе пока нет обращений"
									: "По заданным фильтрам ничего не найдено"}
							</p>
							<p className="text-[12px] text-[var(--muted)] mt-1">
								{columnLeads.length === 0
									? "Новые лиды появятся здесь автоматически или перетащите их с соседних колонок"
									: "Попробуйте сбросить поисковый запрос или фильтр срочности SLA"}
							</p>
						</div>
					) : viewMode === "cards" ? (
						/* VIEW 1: 3-COLUMN WIDE CARDS GRID */
						<div className="flex flex-col gap-3">
							<div className="expanded-focus-cards-grid">
								{visibleLeads.map((lead) => {
								const sla = getLeadSlaStatus(lead);
								const isSelected = selectedLeadIds.has(lead.id);
								const dropReasonMatch =
									lead.dropReason ||
									(lead.notes ? lead.notes.match(/\[Причина срыва\]:\s*([^\n\r]+)/)?.[1] : null);
								const channelKey = lead.source
									? normalizeMarketingChannel(lead.source)
									: null;
								const channelBadge =
									channelKey && CHANNEL_BADGE_COLORS[channelKey]
										? CHANNEL_BADGE_COLORS[channelKey]
										: {
												bg: "var(--teal-soft)",
												color: "var(--teal-dark, var(--teal))",
												border: "var(--teal)",
											};
								const channelLabel =
									channelKey && CHANNEL_DISPLAY_NAMES[channelKey]
										? CHANNEL_DISPLAY_NAMES[channelKey]
										: lead.source;

								return (
									<div
										key={lead.id}
										className={`expanded-focus-card ${isSelected ? "is-selected" : ""} ${sla.isBreached ? "has-sla-breach" : ""}`}
										onClick={() => onEditLead(lead)}
									>
										{/* Card Header */}
										<div className="expanded-focus-card-header">
											<div className="flex items-center gap-2 min-w-0">
												<button
													type="button"
													className="expanded-focus-checkbox-btn"
													onClick={(e) => toggleSelectLead(lead.id, e)}
													aria-label={isSelected ? "Снять выбор" : "Выбрать лид"}
												>
													{isSelected ? (
														<CheckSquare size={16} className="text-[var(--teal)]" />
													) : (
														<Square size={16} className="text-[var(--muted)] opacity-60" />
													)}
												</button>
												<span className="expanded-focus-card-name" title={lead.name}>
													{lead.name}
												</span>
											</div>

											{/* SLA Badge */}
											<div
												className={`expanded-focus-sla-badge ${sla.isBreached ? "lead-sla-breached-pulse" : ""}`}
												style={{
													background: sla.badgeBg,
													color: sla.badgeColor,
													borderColor: sla.badgeBorder,
												}}
												title={`Время с момента поступления / смены этапа: ${sla.formattedDuration}`}
											>
												<Clock size={11} className="shrink-0" />
												<span>{sla.label}</span>
											</div>
										</div>

										{/* Бейджи статуса пациента и причины срыва */}
										{(lead.existingPatient || (lead.status === "trash" && dropReasonMatch)) && (
											<div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4, marginBottom: 4 }}>
												{lead.existingPatient && (
													<div
														style={{
															display: "inline-flex",
															alignItems: "center",
															gap: 4,
															fontSize: 10.5,
															fontWeight: 600,
															color: "var(--teal-dark, var(--teal))",
															background: "var(--teal-soft)",
															border: "1px solid var(--teal)",
															padding: "1px 6px",
															borderRadius: 4,
															cursor: "pointer",
														}}
														onClick={(e) => {
															e.stopPropagation();
															usePatientStore.getState().setSelectedPatientId(lead.existingPatient!.id);
															useAppStore.getState().setCurrentView("patients");
															if (typeof window !== "undefined") {
																window.location.hash = "patients";
															}
															onClose();
														}}
														title={`Постоянный пациент базы клиники: ${lead.existingPatient.fullName}. Нажмите для перехода в карту.`}
														data-testid={`expanded-existing-patient-badge-${lead.id}`}
													>
														<UserCheck size={11} className="shrink-0" />
														<span>Постоянный пациент: {lead.existingPatient.fullName}</span>
													</div>
												)}
												{lead.status === "trash" && dropReasonMatch && (
													<div
														style={{
															display: "inline-flex",
															alignItems: "center",
															gap: 4,
															fontSize: 10.5,
															fontWeight: 600,
															color: "var(--rust, #ef4444)",
															background: "var(--rust-soft, rgba(239, 68, 68, 0.1))",
															border: "1px solid var(--rust, #ef4444)",
															padding: "1px 6px",
															borderRadius: 4,
														}}
														title={`Причина срыва: ${dropReasonMatch}`}
													>
														<span>Срыв: {dropReasonMatch}</span>
													</div>
												)}
											</div>
										)}

										{/* Phone & Audio Recording Row */}
										<div className="expanded-focus-card-phone-row">
											{lead.phone ? (
												<div className="flex items-center gap-1.5 text-[12px] text-[var(--muted)]">
													<Phone size={12} className="shrink-0" />
													<a
														href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}
														onClick={(e) => e.stopPropagation()}
														className="expanded-focus-phone-link"
													>
														{lead.phone}
													</a>
													<a
														href={formatWhatsAppUrl(
															lead.phone,
															`Здравствуйте, ${lead.name}! Вас беспокоит стоматологическая клиника DENTE.`,
														)}
														target="_blank"
														rel="noopener noreferrer"
														onClick={(e) => e.stopPropagation()}
														className="expanded-focus-whatsapp-link"
														title="Написать пациенту в WhatsApp"
														aria-label="Написать пациенту в WhatsApp"
														data-testid={`focus-lead-whatsapp-${lead.id}`}
													>
														<MessageSquare size={11} />
													</a>
												</div>
											) : (
												<div />
											)}

											{/* Inline Audio Player Widget */}
											<LeadAudioPlayerWidget
												audioUrl={lead.audioRecordUrl}
												transcriptionSnippet={lead.transcriptionSnippet}
												durationSeconds={lead.audioDurationSeconds}
											/>
										</div>

										{/* Notes / Clinical Complaints (Full view without cutting) */}
										{lead.notes && (
											<div className="expanded-focus-card-notes" title={lead.notes}>
												<span className="text-[var(--muted)] font-medium">Запрос: </span>
												<span className="text-[var(--ink)]">{lead.notes}</span>
											</div>
										)}

										{/* Clinical Tags & Marketing Source */}
										<div className="expanded-focus-card-meta-row">
											<div className="flex items-center gap-1.5 flex-wrap min-w-0">
												{lead.source && (
													<span
														className="expanded-focus-channel-badge"
														style={{
															background: channelBadge.bg,
															color: channelBadge.color,
															borderColor: channelBadge.border,
														}}
													>
														<Globe size={10} className="shrink-0" />
														<span>{channelLabel}</span>
													</span>
												)}
												{Array.isArray(lead.clinicalTags) &&
													lead.clinicalTags.map((tag) => (
														<span key={tag} className="expanded-focus-clinical-tag">
															<Tag size={10} className="shrink-0" />
															<span>{tag}</span>
														</span>
													))}
											</div>

											{lead.expectedRevenue ? (
												<span className="expanded-focus-revenue-badge">
													{Number(lead.expectedRevenue).toLocaleString("ru-RU")} ₽
												</span>
											) : null}
										</div>

										{/* Card Action Buttons (Dense & Clean) */}
										<div
											className="expanded-focus-card-actions-row"
											onClick={(e) => e.stopPropagation()}
										>
											{nextStageInfo && (
												<button
													type="button"
													onClick={() => onStatusChange(lead.id, nextStageInfo.status)}
													className="expanded-focus-action-btn expanded-focus-action-btn--advance"
													title={`Перевести в ${nextStageInfo.label}`}
												>
													<span>{nextStageInfo.label}</span>
													<ArrowRight size={12} />
												</button>
											)}

											{lead.status !== "trash" && (
												<button
													type="button"
													onClick={() => onScheduleLead(lead.id)}
													className="expanded-focus-action-btn expanded-focus-action-btn--schedule"
													title="Записать в расписание"
												>
													<Calendar size={12} />
													<span>Записать</span>
												</button>
											)}

											{lead.existingPatient ? (
												<button
													type="button"
													onClick={() => {
														usePatientStore.getState().setSelectedPatientId(lead.existingPatient!.id);
														useAppStore.getState().setCurrentView("patients");
														if (typeof window !== "undefined") {
															window.location.hash = "patients";
														}
														onClose();
													}}
													className="expanded-focus-action-btn expanded-focus-action-btn--patient"
													title={`Открыть карту постоянного пациента: ${lead.existingPatient.fullName}`}
													data-testid={`expanded-open-patient-btn-${lead.id}`}
												>
													<UserCheck size={12} />
													<span>Карта</span>
												</button>
											) : (
												<button
													type="button"
													onClick={() => void onCreatePatient(lead)}
													className="expanded-focus-action-btn expanded-focus-action-btn--patient"
													title="Создать карту пациента в 1 клик"
													data-testid={`expanded-create-patient-btn-${lead.id}`}
												>
													<UserPlus size={12} />
													<span>В пациенты</span>
												</button>
											)}
										</div>
									</div>
								);
							})}
							</div>
							{visibleLimit < displayLeads.length && (
								<div className="flex justify-center p-3">
									<button
										type="button"
										onClick={() => setVisibleLimit((prev) => prev + 60)}
										className="px-4 py-2 text-xs font-semibold rounded-md border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
									>
										Показать ещё 60 (показано {visibleLeads.length} из {displayLeads.length})
									</button>
								</div>
							)}
						</div>
					) : (
						/* VIEW 2: CLINICAL SPREADSHEET (32px Dense Table) */
						<div className="expanded-focus-table-container">
							<table className="expanded-focus-table">
								<thead>
									<tr>
										<th style={{ width: 36, textAlign: "center" }}>
											<button
												type="button"
												onClick={toggleSelectAll}
												className="expanded-focus-th-checkbox"
												aria-label="Выбрать все строки"
											>
												{selectedLeadIds.size >= displayLeads.length &&
												displayLeads.length > 0 ? (
													<CheckSquare size={14} className="text-[var(--teal)]" />
												) : (
													<Square size={14} className="text-[var(--muted)] opacity-60" />
												)}
											</button>
										</th>
										<th style={{ minWidth: 180 }}>Пациент / Имя</th>
										<th style={{ width: 140 }}>Телефон</th>
										<th style={{ width: 130 }}>Канал</th>
										<th style={{ minWidth: 220 }}>Жалобы / Запрос</th>
										<th style={{ width: 130 }}>Запись звонка</th>
										<th style={{ width: 150 }}>SLA / Ожидание</th>
										<th style={{ width: 110, textAlign: "right" }}>Выручка</th>
										<th style={{ width: 180, textAlign: "right" }}>Действия</th>
									</tr>
								</thead>
								<tbody>
									{visibleLeads.map((lead) => {
										const sla = getLeadSlaStatus(lead);
										const isSelected = selectedLeadIds.has(lead.id);
										const dropReasonMatch =
											lead.dropReason ||
											(lead.notes ? lead.notes.match(/\[Причина срыва\]:\s*([^\n\r]+)/)?.[1] : null);
										const channelKey = lead.source
											? normalizeMarketingChannel(lead.source)
											: null;
										const channelLabel =
											channelKey && CHANNEL_DISPLAY_NAMES[channelKey]
												? CHANNEL_DISPLAY_NAMES[channelKey]
												: lead.source || "—";

										return (
											<tr
												key={lead.id}
												className={`expanded-focus-tr ${isSelected ? "is-selected" : ""} ${sla.isBreached ? "is-breached-row" : ""}`}
												onClick={() => onEditLead(lead)}
											>
												{/* Checkbox */}
												<td
													style={{ textAlign: "center" }}
													onClick={(e) => toggleSelectLead(lead.id, e)}
												>
													<button
														type="button"
														className="expanded-focus-checkbox-btn"
														aria-label="Выбрать строку"
														aria-checked={isSelected}
														onClick={(e) => {
															e.stopPropagation();
															toggleSelectLead(lead.id, e);
														}}
													>
														{isSelected ? (
															<CheckSquare size={14} className="text-[var(--teal)]" />
														) : (
															<Square size={14} className="text-[var(--muted)] opacity-60" />
														)}
													</button>
												</td>

												{/* Name with quick edit */}
												<td>
													<div className="flex items-center gap-1.5 min-w-0">
														<span className="expanded-focus-table-name" title={lead.name}>
															{lead.name}
														</span>
														{lead.existingPatient && (
															<span
																className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--teal-soft)] text-[var(--teal-dark,var(--teal))] border border-[var(--teal)] shrink-0 cursor-pointer"
																onClick={(e) => {
																	e.stopPropagation();
																	usePatientStore.getState().setSelectedPatientId(lead.existingPatient!.id);
																	useAppStore.getState().setCurrentView("patients");
																	if (typeof window !== "undefined") {
																		window.location.hash = "patients";
																	}
																	onClose();
																}}
																title={`Постоянный пациент клиники: ${lead.existingPatient.fullName}. Нажмите для перехода в карту.`}
																data-testid={`expanded-table-patient-badge-${lead.id}`}
															>
																<UserCheck size={10} />
																<span className="truncate max-w-[85px]">{lead.existingPatient.fullName}</span>
															</span>
														)}
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																onEditLead(lead);
															}}
															className="text-[var(--muted)] hover:text-[var(--teal)] p-0.5"
															title="Редактировать"
														>
															<Edit2 size={11} />
														</button>
													</div>
												</td>

												{/* Phone */}
												<td>
													{lead.phone ? (
														<div className="flex items-center gap-1.5">
															<a
																href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}
																onClick={(e) => e.stopPropagation()}
																className="expanded-focus-phone-link"
															>
																{lead.phone}
															</a>
															<a
																href={formatWhatsAppUrl(
																	lead.phone,
																	`Здравствуйте, ${lead.name}! Вас беспокоит стоматологическая клиника DENTE.`,
																)}
																target="_blank"
																rel="noopener noreferrer"
																onClick={(e) => e.stopPropagation()}
																className="expanded-focus-whatsapp-link"
																title="Написать пациенту в WhatsApp"
																aria-label="Написать пациенту в WhatsApp"
																data-testid={`focus-table-whatsapp-${lead.id}`}
															>
																<MessageSquare size={11} />
															</a>
														</div>
													) : (
														<span className="text-[var(--muted)]">—</span>
													)}
												</td>

												{/* Source */}
												<td>
													<span
														className="expanded-focus-table-source"
														title={`Канал: ${channelLabel}`}
													>
														{channelLabel}
													</span>
												</td>

												{/* Notes / Clinical Tags */}
												<td>
													<div className="expanded-focus-table-notes" title={lead.notes || ""}>
														{lead.status === "trash" && dropReasonMatch && (
															<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--rust-soft,rgba(239,68,68,0.1))] text-[var(--rust,#ef4444)] border border-[var(--rust,#ef4444)] mr-1 shrink-0">
																Срыв: {dropReasonMatch}
															</span>
														)}
														{lead.notes || <span className="text-[var(--muted)]">—</span>}
													</div>
												</td>

												{/* Audio */}
												<td>
													<LeadAudioPlayerWidget
														audioUrl={lead.audioRecordUrl}
														transcriptionSnippet={lead.transcriptionSnippet}
														durationSeconds={lead.audioDurationSeconds}
														compact
													/>
												</td>

												{/* SLA */}
												<td>
													<span
														className={`expanded-focus-table-sla ${sla.isBreached ? "lead-sla-breached-pulse" : ""}`}
														style={{
															background: sla.badgeBg,
															color: sla.badgeColor,
															borderColor: sla.badgeBorder,
														}}
														title={`Время ожидания: ${sla.formattedDuration}`}
													>
														{sla.label}
													</span>
												</td>

												{/* Revenue */}
												<td style={{ textAlign: "right" }}>
													{lead.expectedRevenue ? (
														<span className="font-semibold text-[var(--ink)] text-[12px]">
															{Number(lead.expectedRevenue).toLocaleString("ru-RU")} ₽
														</span>
													) : (
														<span className="text-[var(--muted)]">—</span>
													)}
												</td>

												{/* Row Actions */}
												<td
													style={{ textAlign: "right" }}
													onClick={(e) => e.stopPropagation()}
												>
													<div className="flex items-center justify-end gap-1">
														{nextStageInfo && (
															<button
																type="button"
																onClick={() => onStatusChange(lead.id, nextStageInfo.status)}
																className="expanded-focus-table-action-btn"
																title={`В ${nextStageInfo.label}`}
															>
																<ArrowRight size={12} />
															</button>
														)}
														{lead.status !== "trash" && (
															<button
																type="button"
																onClick={() => onScheduleLead(lead.id)}
																className="expanded-focus-table-action-btn"
																title="Записать на приём"
															>
																<Calendar size={12} />
															</button>
														)}
														{lead.existingPatient ? (
															<button
																type="button"
																onClick={() => {
																	usePatientStore.getState().setSelectedPatientId(lead.existingPatient!.id);
																	useAppStore.getState().setCurrentView("patients");
																	if (typeof window !== "undefined") {
																		window.location.hash = "patients";
																	}
																	onClose();
																}}
																className="expanded-focus-table-action-btn"
																title={`Открыть карту постоянного пациента: ${lead.existingPatient.fullName}`}
																data-testid={`expanded-table-open-patient-btn-${lead.id}`}
															>
																<UserCheck size={12} />
															</button>
														) : (
															<button
																type="button"
																onClick={() => void onCreatePatient(lead)}
																className="expanded-focus-table-action-btn"
																title="Создать карту пациента"
																data-testid={`expanded-table-create-patient-btn-${lead.id}`}
															>
																<UserPlus size={12} />
															</button>
														)}
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
							{visibleLimit < displayLeads.length && (
								<div className="flex justify-center p-3">
									<button
										type="button"
										onClick={() => setVisibleLimit((prev) => prev + 60)}
										className="px-4 py-2 text-xs font-semibold rounded-md border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
									>
										Показать ещё 60 (показано {visibleLeads.length} из {displayLeads.length})
									</button>
								</div>
							)}
						</div>
					)}
				</div>

				{/* 5. FOOTER STATUS BAR */}
				<footer className="expanded-focus-footer">
					<div className="flex items-center gap-3 text-[11.5px] text-[var(--muted)]">
						<span>Показано: <strong>{visibleLeads.length}</strong> из {displayLeads.length}{displayLeads.length !== columnLeads.length ? ` (всего ${columnLeads.length})` : ""}</span>
						<span>·</span>
						<span>Клавиша <strong>Esc</strong> для возврата к доске</span>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="expanded-focus-footer-close-btn"
						>
							Закрыть
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};
