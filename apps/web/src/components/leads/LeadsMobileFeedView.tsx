/**
 * LeadsMobileFeedView.tsx — Sovereign Mobile Leads CRM & Feed per Apple iOS HIG.
 *
 * Governed by Apple HIG & Anti-Desktop-Squeeze Mandates:
 * - Dedicated sovereign mobile layer (<768px)
 * - 0px parasitic horizontal drift (overflow-x: clip; max-width: 100vw;)
 * - Apple segmented control status switcher with real counters
 * - Grouped Inset Cards with source, SLA urgency, clinical tags
 * - 1-tap quick actions >= 44x44px (Direct Call, WhatsApp, Quick Schedule)
 * - Native iOS Bottom Sheet details drawer in Natural Thumb Zone
 */

import React, { useMemo, useState } from "react";
import {
	AlertTriangle,
	Calendar,
	ChevronRight,
	Clock,
	DollarSign,
	Filter,
	MessageSquare,
	Phone,
	Plus,
	Search,
	Sparkles,
	UserCheck,
	X,
} from "lucide-react";
import type { Lead, LeadStatus } from "../../store/leadsStore";
import { formatWhatsAppUrl } from "../messaging/omnichannelEngine";
import {
	CHANNEL_BADGE_COLORS,
	CHANNEL_DISPLAY_NAMES,
} from "../telephony/telephonyAttribution";
import { LeadMobileBottomSheet } from "./LeadMobileBottomSheet";
import { normalizeMarketingChannel } from "./leadsFunnelTypes";
import {
	COLUMNS,
	getLeadSlaStatus,
	STAGE_DISPLAY_LABELS,
} from "./leadsKanbanTypes";
import "./leadsMobileFeed.css";

export interface LeadsMobileFeedViewProps {
	leads: Lead[];
	onNewLead: () => void;
	onEditLead: (lead: Lead) => void;
	onStatusChange: (
		e: React.MouseEvent,
		leadId: string,
		nextStatus: LeadStatus,
		options?: { reason?: string; dropReason?: string },
	) => void;
	onSchedule: (leadId: string) => void;
	onQuickSchedule?: (leadId: string) => Promise<void> | void;
	onCreatePatient?: (lead: Lead) => Promise<void> | void;
	onUpdateLeadDetails?: (
		id: string,
		details: Partial<Omit<Lead, "id">>,
	) => Promise<void> | void;
	onOpenPatientCard?: (patientId: string) => void;
	creatingPatientLeadId?: string | null;
	onOpenAnalytics?: () => void;
	onOpenLeakDetector?: () => void;
}

export const LeadsMobileFeedView: React.FC<LeadsMobileFeedViewProps> = ({
	leads,
	onNewLead,
	onEditLead,
	onStatusChange,
	onSchedule,
	onQuickSchedule,
	onCreatePatient,
	onUpdateLeadDetails,
	onOpenPatientCard,
	creatingPatientLeadId,
	onOpenAnalytics,
	onOpenLeakDetector,
}) => {
	const [activeTab, setActiveTab] = useState<LeadStatus | "all">("new");
	const [searchQuery, setSearchQuery] = useState("");
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

	// Status counts
	const counts = useMemo(() => {
		const c: Record<string, number> = {
			all: leads.length,
			new: 0,
			contacted: 0,
			consult_booked: 0,
			showed_up: 0,
			no_answer: 0,
			trash: 0,
		};
		for (const l of leads) {
			if (c[l.status] !== undefined) {
				c[l.status] = (c[l.status] || 0) + 1;
			}
		}
		return c;
	}, [leads]);

	// SLA breached leads
	const breachedLeadsCount = useMemo(() => {
		return leads.filter(
			(l) => (l.status === "new" || l.status === "contacted") && getLeadSlaStatus(l).isBreached,
		).length;
	}, [leads]);

	// Filtered leads
	const visibleLeads = useMemo(() => {
		return leads.filter((l) => {
			const matchesStatus = activeTab === "all" ? true : l.status === activeTab;
			if (!matchesStatus) return false;

			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase();
			const matchName = l.name?.toLowerCase().includes(q);
			const matchPhone = l.phone?.includes(q);
			const matchNotes = l.notes?.toLowerCase().includes(q);
			const matchTag = l.clinicalTags?.some((t) => t.toLowerCase().includes(q));
			return Boolean(matchName || matchPhone || matchNotes || matchTag);
		});
	}, [leads, activeTab, searchQuery]);

	const selectedLead = useMemo(() => {
		return leads.find((l) => l.id === selectedLeadId) || null;
	}, [leads, selectedLeadId]);

	return (
		<div className="leads-mobile-feed" data-testid="leads-mobile-feed">
			{/* ── 1. Top Header Bar ─────────────────────────────────────────── */}
			<div className="leads-mobile-header">
				<div className="leads-mobile-header-left">
					<h2 className="leads-mobile-title" title="Воронка обращений и звонков">
						Обращения
					</h2>
					<div
						className="leads-mobile-telemetry"
						title="Сквозная телеметрия обращений и телефонии активна"
					>
						<span className="leads-mobile-telemetry-dot" />
						<span>CRM Live</span>
					</div>
				</div>

				<div className="leads-mobile-header-actions">
					<button
						type="button"
						onClick={() => setIsSearchOpen((prev) => !prev)}
						className="leads-mobile-icon-btn"
						aria-label={isSearchOpen ? "Скрыть поиск" : "Открыть поиск"}
						data-testid="mobile-leads-search-toggle"
					>
						<Search size={18} />
					</button>

					<button
						type="button"
						onClick={onNewLead}
						className="leads-mobile-new-lead-btn"
						data-testid="mobile-leads-add-btn"
						aria-label="Создать новое обращение"
					>
						<Plus size={16} />
						<span>Лид</span>
					</button>
				</div>
			</div>

			{/* ── 2. Collapsible Search Bar ─────────────────────────────────── */}
			{isSearchOpen && (
				<div className="leads-mobile-search-bar">
					<div className="leads-mobile-search-input-wrap">
						<Search size={16} className="text-[var(--muted)] shrink-0" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск по имени, телефону или жалобе..."
							className="leads-mobile-search-input"
							autoFocus
							data-testid="mobile-leads-search-input"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="text-[var(--muted)] p-1 hover:text-[var(--ink)]"
								aria-label="Очистить поиск"
							>
								<X size={15} />
							</button>
						)}
					</div>
				</div>
			)}

			{/* ── 3. Apple Segmented Status Scroller ────────────────────────── */}
			<div className="leads-mobile-segmented-wrap" role="tablist" aria-label="Статусы воронки">
				<div className="leads-mobile-segmented-scroller">
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "new"}
						onClick={() => setActiveTab("new")}
						className={`leads-mobile-seg-btn ${activeTab === "new" ? "is-active" : ""}`}
						data-testid="mobile-tab-new"
					>
						<span>Новые</span>
						<span className="leads-mobile-seg-count">{counts.new || 0}</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "contacted"}
						onClick={() => setActiveTab("contacted")}
						className={`leads-mobile-seg-btn ${activeTab === "contacted" ? "is-active" : ""}`}
						data-testid="mobile-tab-contacted"
					>
						<span>В работе</span>
						<span className="leads-mobile-seg-count">{counts.contacted || 0}</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "consult_booked"}
						onClick={() => setActiveTab("consult_booked")}
						className={`leads-mobile-seg-btn ${activeTab === "consult_booked" ? "is-active" : ""}`}
						data-testid="mobile-tab-consult_booked"
					>
						<span>Записаны</span>
						<span className="leads-mobile-seg-count">{counts.consult_booked || 0}</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "showed_up"}
						onClick={() => setActiveTab("showed_up")}
						className={`leads-mobile-seg-btn ${activeTab === "showed_up" ? "is-active" : ""}`}
						data-testid="mobile-tab-showed_up"
					>
						<span>Дошли</span>
						<span className="leads-mobile-seg-count">{counts.showed_up || 0}</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "no_answer"}
						onClick={() => setActiveTab("no_answer")}
						className={`leads-mobile-seg-btn ${activeTab === "no_answer" ? "is-active" : ""}`}
						data-testid="mobile-tab-no_answer"
					>
						<span>Недозвон</span>
						<span className="leads-mobile-seg-count">{counts.no_answer || 0}</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "trash"}
						onClick={() => setActiveTab("trash")}
						className={`leads-mobile-seg-btn ${activeTab === "trash" ? "is-active" : ""}`}
						data-testid="mobile-tab-trash"
					>
						<span>Отказ</span>
						<span className="leads-mobile-seg-count">{counts.trash || 0}</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "all"}
						onClick={() => setActiveTab("all")}
						className={`leads-mobile-seg-btn ${activeTab === "all" ? "is-active" : ""}`}
						data-testid="mobile-tab-all"
					>
						<span>Все</span>
						<span className="leads-mobile-seg-count">{counts.all || 0}</span>
					</button>
				</div>
			</div>

			{/* ── 4. Speed-to-Lead SLA Alert Banner ─────────────────────────── */}
			{breachedLeadsCount > 0 && (
				<div
					onClick={() => setActiveTab("new")}
					className="leads-mobile-sla-alert"
					title="Нажмите для перехода к просроченным обращениям"
					data-testid="mobile-sla-alert-banner"
				>
					<div className="leads-mobile-sla-alert-text">
						<AlertTriangle size={16} className="shrink-0" />
						<span>Внимание: {breachedLeadsCount} обр. ждут ответа {">"} 15 мин!</span>
					</div>
					<span className="text-[12px] underline shrink-0">Открыть →</span>
				</div>
			)}

			{/* ── 5. Grouped Inset Cards List ───────────────────────────────── */}
			{visibleLeads.length > 0 ? (
				<div className="leads-mobile-cards-list">
					{visibleLeads.map((lead) => {
						const sla = getLeadSlaStatus(lead);
						const channelKey = lead.source ? normalizeMarketingChannel(lead.source) : null;
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
								: (lead.source || "Прямой звонок");
						const rawPhone = lead.phone ? lead.phone.replace(/[^\d+]/g, "") : "";
						const col = COLUMNS.find((c) => c.id === lead.status);

						return (
							<article
								key={lead.id}
								onClick={() => setSelectedLeadId(lead.id)}
								className="leads-mobile-card"
								data-testid={`mobile-lead-card-${lead.id}`}
							>
								{/* Left Accent Stripe */}
								<div
									className="leads-mobile-card-stripe"
									style={{
										background: sla.isBreached
											? "var(--rust, #ef4444)"
											: (col?.color || "var(--teal)"),
									}}
								/>

								{/* Top Row: Channel Badge + SLA + Expected Revenue */}
								<div className="leads-mobile-card-top">
									<div className="leads-mobile-card-badges">
										{/* Channel Source Badge */}
										<span
											className="leads-mobile-source-badge"
											style={{
												background: channelBadge.bg,
												color: channelBadge.color,
												border: `1px solid ${channelBadge.border}`,
											}}
										>
											{channelLabel}
										</span>

										{/* SLA Timer Badge */}
										<span
											className={`leads-mobile-sla-badge ${
												sla.isBreached ? "lead-sla-breached-pulse" : ""
											}`}
											style={{
												background: sla.badgeBg,
												color: sla.badgeColor,
												border: `1px solid ${sla.badgeBorder}`,
											}}
										>
											{sla.isBreached ? (
												<AlertTriangle size={11} className="shrink-0" />
											) : (
												<Clock size={11} className="shrink-0" />
											)}
											<span>{sla.label}</span>
										</span>
									</div>

									{lead.expectedRevenue && (
										<span className="leads-mobile-revenue-badge">
											{Number(lead.expectedRevenue).toLocaleString("ru-RU")} ₽
										</span>
									)}
								</div>

								{/* Body: Patient Name + Phone + Tags */}
								<div className="leads-mobile-card-body">
									<div className="flex items-center justify-between gap-2">
										<h3 className="leads-mobile-patient-name">{lead.name}</h3>
										<ChevronRight size={18} className="text-[var(--muted)] shrink-0" />
									</div>

									{lead.phone && (
										<span className="leads-mobile-phone-link">
											<Phone size={12} className="shrink-0" />
											<span>{lead.phone}</span>
										</span>
									)}

									{/* Clinical Tags Pills */}
									{Array.isArray(lead.clinicalTags) && lead.clinicalTags.length > 0 && (
										<div className="leads-mobile-tags-row">
											{lead.clinicalTags.map((tag) => (
												<span key={tag} className="leads-mobile-tag">
													{tag}
												</span>
											))}
										</div>
									)}

									{/* Existing Patient Badge */}
									{lead.existingPatient && (
										<div className="mt-1">
											<span className="leads-mobile-existing-patient">
												<UserCheck size={11} />
												<span>Постоянный пациент: {lead.existingPatient.fullName}</span>
											</span>
										</div>
									)}

									{/* Notes Snippet */}
									{lead.notes && (
										<div className="leads-mobile-notes-snippet">
											{lead.notes.slice(0, 95)}
											{lead.notes.length > 95 ? "..." : ""}
										</div>
									)}
								</div>

								{/* 1-Tap Quick Actions Bar (>=44x44px Touch Targets) */}
								<div className="leads-mobile-actions-bar" onClick={(e) => e.stopPropagation()}>
									{/* Direct Call Button */}
									{lead.phone ? (
										<a
											href={`tel:${rawPhone}`}
											className="leads-mobile-action-btn leads-mobile-action-btn--call"
											title="Прямой звонок пациенту"
											data-testid={`quick-call-btn-${lead.id}`}
										>
											<Phone size={15} />
											<span>Звонок</span>
										</a>
									) : (
										<button
											type="button"
											disabled
											className="leads-mobile-action-btn opacity-40 cursor-not-allowed"
										>
											<Phone size={15} />
											<span>Звонок</span>
										</button>
									)}

									{/* Direct WhatsApp Message Button */}
									{lead.phone ? (
										<a
											href={formatWhatsAppUrl(
												lead.phone,
												`Здравствуйте, ${lead.name}! Вас беспокоит стоматология DENTE.`,
											)}
											target="_blank"
											rel="noopener noreferrer"
											className="leads-mobile-action-btn leads-mobile-action-btn--whatsapp"
											title="Открыть диалог в WhatsApp"
											data-testid={`quick-chat-btn-${lead.id}`}
										>
											<MessageSquare size={15} />
											<span>Чат</span>
										</a>
									) : (
										<button
											type="button"
											disabled
											className="leads-mobile-action-btn opacity-40 cursor-not-allowed"
										>
											<MessageSquare size={15} />
											<span>Чат</span>
										</button>
									)}

									{/* Quick Schedule Appointment Button */}
									<button
										type="button"
										onClick={() => {
											if (onQuickSchedule) {
												onQuickSchedule(lead.id);
											} else {
												onSchedule(lead.id);
											}
										}}
										className="leads-mobile-action-btn leads-mobile-action-btn--schedule"
										title="Записать на прием в расписание"
										data-testid={`quick-schedule-btn-${lead.id}`}
									>
										<Calendar size={15} />
										<span>Записать</span>
									</button>
								</div>
							</article>
						);
					})}
				</div>
			) : (
				/* ── 6. Empty State ────────────────────────────────────────── */
				<div className="leads-mobile-empty" data-testid="leads-mobile-empty-state">
					<Sparkles size={36} className="text-[var(--teal)] opacity-60 mb-1" />
					<h4 className="leads-mobile-empty-title">Обращений не найдено</h4>
					<p className="leads-mobile-empty-desc">
						{searchQuery
							? "По вашему поисковому запросу ничего не найдено."
							: activeTab === "all"
								? "Список входящих обращений пока пуст."
								: `В этапе «${STAGE_DISPLAY_LABELS[activeTab] || activeTab}» нет активных лидов.`}
					</p>
					<button
						type="button"
						onClick={onNewLead}
						className="leads-mobile-new-lead-btn mt-2"
					>
						<Plus size={16} />
						<span>Добавить обращение</span>
					</button>
				</div>
			)}

			{/* ── 7. Native Apple HIG Bottom Sheet for Details ──────────────── */}
			<LeadMobileBottomSheet
				lead={selectedLead}
				isOpen={Boolean(selectedLead)}
				onClose={() => setSelectedLeadId(null)}
				onStatusChange={onStatusChange}
				onSchedule={onSchedule}
				onQuickSchedule={onQuickSchedule}
				onCreatePatient={onCreatePatient}
				onUpdateNotes={async (id, notes) => {
					if (onUpdateLeadDetails) {
						await onUpdateLeadDetails(id, { notes });
					}
				}}
				onOpenPatientCard={onOpenPatientCard}
				creatingPatientLeadId={creatingPatientLeadId}
			/>
		</div>
	);
};
