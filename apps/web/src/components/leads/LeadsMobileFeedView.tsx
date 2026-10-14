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

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	AlertTriangle,
	BarChart3,
	MoreVertical,
	Plus,
	RotateCcw,
	Search,
	Sparkles,
	X,
} from "lucide-react";
import type { Lead, LeadStatus } from "../../store/leadsStore";
import { LeadMobileBottomSheet } from "./LeadMobileBottomSheet";
import { LeadMobileFeedCard } from "./LeadMobileFeedCard";
import {
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
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const mobileMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
				setIsMobileMenuOpen(false);
			}
		};
		if (isMobileMenuOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isMobileMenuOpen]);

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

					{(onOpenAnalytics || onOpenLeakDetector) && (
						<div className="relative inline-flex" ref={mobileMenuRef}>
							<button
								type="button"
								onClick={() => setIsMobileMenuOpen((prev) => !prev)}
								className="leads-mobile-icon-btn"
								aria-label="Дополнительные функции воронки"
								data-testid="mobile-leads-more-btn"
								title="Дополнительные функции"
							>
								<MoreVertical size={18} />
							</button>

							{isMobileMenuOpen && (
								<div className="leads-mobile-menu-dropdown" role="menu">
									{onOpenAnalytics && (
										<button
											type="button"
											className="leads-mobile-menu-item"
											onClick={() => {
												setIsMobileMenuOpen(false);
												onOpenAnalytics();
											}}
											data-testid="mobile-open-analytics-btn"
										>
											<BarChart3 size={16} className="text-[var(--teal)] shrink-0" />
											<span>Аналитика воронки</span>
										</button>
									)}
									{onOpenLeakDetector && (
										<button
											type="button"
											className="leads-mobile-menu-item"
											onClick={() => {
												setIsMobileMenuOpen(false);
												onOpenLeakDetector();
											}}
											data-testid="mobile-open-leak-detector-btn"
										>
											<RotateCcw size={16} className="text-[var(--teal)] shrink-0" />
											<span>Детектор оттока (&gt;210 дней)</span>
										</button>
									)}
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* ── 2. Collapsible Search Bar ─────────────────────────────────── */}
			{isSearchOpen && (
				<div className="leads-mobile-search-bar">
					<div className="dente-search-wrap leads-mobile-search-input-wrap">
						<Search size={16} className="dente-search-icon" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Поиск по имени, телефону или жалобе..."
							className="dente-search-input leads-mobile-search-input"
							autoFocus
							data-testid="mobile-leads-search-input"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="dente-search-clear"
								aria-label="Очистить поиск"
							>
								<X size={15} />
							</button>
						)}
					</div>
				</div>
			)}

			{/* ── 3. Apple Segmented Status Scroller ────────────────────────── */}
			<div className="leads-mobile-segmented-wrap dente-segmented-bar" role="tablist" aria-label="Статусы воронки">
				<div className="leads-mobile-segmented-scroller">
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "new"}
						onClick={() => setActiveTab("new")}
						className={`leads-mobile-seg-btn dente-segmented-item ${activeTab === "new" ? "is-active active" : ""}`}
						data-testid="mobile-tab-new"
					>
						<span>Новый</span>
						<span className="leads-mobile-seg-count">{counts.new || 0}</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "contacted"}
						onClick={() => setActiveTab("contacted")}
						className={`leads-mobile-seg-btn dente-segmented-item ${activeTab === "contacted" ? "is-active active" : ""}`}
						data-testid="mobile-tab-contacted"
					>
						<span>Думает</span>
						<span className="leads-mobile-seg-count">{counts.contacted || 0}</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "consult_booked"}
						onClick={() => setActiveTab("consult_booked")}
						className={`leads-mobile-seg-btn dente-segmented-item ${activeTab === "consult_booked" ? "is-active active" : ""}`}
						data-testid="mobile-tab-consult_booked"
					>
						<span>Записан</span>
						<span className="leads-mobile-seg-count">{counts.consult_booked || 0}</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "showed_up"}
						onClick={() => setActiveTab("showed_up")}
						className={`leads-mobile-seg-btn dente-segmented-item ${activeTab === "showed_up" ? "is-active active" : ""}`}
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
						className={`leads-mobile-seg-btn dente-segmented-item ${activeTab === "no_answer" ? "is-active active" : ""}`}
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
						className={`leads-mobile-seg-btn dente-segmented-item ${activeTab === "trash" ? "is-active active" : ""}`}
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
						className={`leads-mobile-seg-btn dente-segmented-item ${activeTab === "all" ? "is-active active" : ""}`}
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
					{visibleLeads.map((lead) => (
						<LeadMobileFeedCard
							key={lead.id}
							lead={lead}
							onSelect={(leadId) => setSelectedLeadId(leadId)}
							onSchedule={onSchedule}
							{...(onQuickSchedule ? { onQuickSchedule } : {})}
						/>
					))}
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

			{/* ── 8. Apple HIG Floating Bottom Bar (Natural Thumb Zone) ── */}
			<div className="leads-mobile-floating-bar" data-testid="mobile-floating-bottom-bar">
				<button
					type="button"
					onClick={onNewLead}
					className="leads-mobile-floating-cta"
					data-testid="mobile-leads-add-btn"
					aria-label="Создать новое обращение"
				>
					<Plus size={20} />
					<span>Новое обращение</span>
				</button>
			</div>
		</div>
	);
};
