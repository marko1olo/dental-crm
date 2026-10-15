/**
 * LeadMobileFeedCard.tsx — Sovereign Native Apple HIG Card for Leads Mobile Feed.
 *
 * Governed by Apple HIG & DENTE Touch Ergonomics:
 * - Grouped Inset Card layout
 * - Touch Targets >= 44x44px for Call, WhatsApp, Schedule
 * - SLA breach pulse indicator
 * - 0px parasitic horizontal drift
 */

import React, { useState } from "react";
import { motion, useAnimation, type PanInfo } from "framer-motion";
import {
	AlertTriangle,
	Calendar,
	ChevronRight,
	Clock,
	MessageSquare,
	Phone,
	UserCheck,
} from "lucide-react";
import type { Lead } from "../../store/leadsStore";
import { formatWhatsAppUrl } from "../messaging/omnichannelEngine";
import {
	CHANNEL_BADGE_COLORS,
	CHANNEL_DISPLAY_NAMES,
} from "../telephony/telephonyAttribution";
import { normalizeMarketingChannel } from "./leadsFunnelTypes";
import {
	COLUMNS,
	getKanbanColumnForLeadStatus,
	getLeadSlaStatus,
} from "./leadsKanbanTypes";

export interface LeadMobileFeedCardProps {
	lead: Lead;
	onSelect: (leadId: string) => void;
	onSchedule: (leadId: string) => void;
	onQuickSchedule?: ((leadId: string) => Promise<void> | void) | undefined;
}

export const LeadMobileFeedCard: React.FC<LeadMobileFeedCardProps> = ({
	lead,
	onSelect,
	onSchedule,
	onQuickSchedule,
}) => {
	const controls = useAnimation();
	const [dragOffset, setDragOffset] = useState(0);

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
	const col =
		COLUMNS.find((c) => c.id === lead.status) ||
		getKanbanColumnForLeadStatus(lead.status);

	const handleDragEnd = async (_: unknown, info: PanInfo) => {
		if (info.offset.x > 75) {
			if (rawPhone) {
				window.location.href = `tel:${rawPhone}`;
			}
		} else if (info.offset.x < -75) {
			if (onQuickSchedule) {
				onQuickSchedule(lead.id);
			} else {
				onSchedule(lead.id);
			}
		}
		setDragOffset(0);
		controls.start({
			x: 0,
			transition: { type: "spring", stiffness: 450, damping: 30 },
		});
	};

	const handleCardClick = () => {
		if (Math.abs(dragOffset) < 10) {
			onSelect(lead.id);
		}
	};

	return (
		<div className="leads-mobile-card-swipe-wrap">
			{/* Underlying Swipe Action Hints */}
			<div className="leads-mobile-card-swipe-background" aria-hidden="true">
				<div
					className="leads-mobile-swipe-action leads-mobile-swipe-action--call"
					style={{ opacity: dragOffset > 25 ? 1 : 0 }}
				>
					<Phone size={17} />
					<span>Звонок</span>
				</div>
				<div
					className="leads-mobile-swipe-action leads-mobile-swipe-action--schedule"
					style={{ opacity: dragOffset < -25 ? 1 : 0 }}
				>
					<span>Записать</span>
					<Calendar size={17} />
				</div>
			</div>

			<motion.article
				drag="x"
				dragConstraints={{ left: -100, right: 100 }}
				dragElastic={0.18}
				animate={controls}
				onDrag={(_, info) => setDragOffset(info.offset.x)}
				onDragEnd={handleDragEnd}
				onClick={handleCardClick}
				className="leads-mobile-card"
				data-testid={`mobile-lead-card-${lead.id}`}
				style={{ touchAction: "pan-y" }}
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
			</motion.article>
		</div>
	);
};
