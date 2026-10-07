import React, { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  Flame,
  MessageCircle,
  PenTool,
  Phone,
  Send,
  ShieldAlert,
  Sparkles,
  User,
  UserCheck,
  XCircle,
  Zap,
} from "lucide-react";
import type { ProactiveAlertCardData } from "../copilotTypes";
import type { ProactiveAlertCardViewProps, WhatsAppApprovalCardViewProps } from "./types";
import { formatDateTime } from "../useCopilotFormat";

export const ProactiveAlertCardView: React.FC<ProactiveAlertCardViewProps> = ({
	alert,
	onDismiss,
	onExecuteAction,
	onSendPrompt,
}) => {
	const isCritical = alert.urgency === "CRITICAL";
	const isUrgent = alert.urgency === "URGENT";

	const handleActionClick = (act: ProactiveAlertCardData["actions"][0]) => {
		if (onExecuteAction) {
			onExecuteAction(act);
		}
		if (act.prompt && onSendPrompt) {
			onSendPrompt(act.prompt);
		}
	};

	return (
		<div
			className={`copilot-gen-card copilot-proactive-card ${isCritical ? "critical" : isUrgent ? "urgent" : "normal"}`}
			data-testid="copilot-proactive-alert-card"
			role="alert"
		>
			{/* Header */}
			<div className="copilot-proactive-header">
				<div className="copilot-proactive-badge">
					{isCritical ? (
						<Flame size={18} className="animate-pulse" />
					) : isUrgent ? (
						<AlertTriangle size={18} />
					) : (
						<Zap size={18} />
					)}
				</div>

				<div className="copilot-proactive-title-block">
					<div className="flex items-center justify-between gap-2 flex-wrap">
						<h4 className="copilot-proactive-title">{alert.title}</h4>
						<span
							className={`copilot-urgency-pill ${isCritical ? "critical" : isUrgent ? "urgent" : "normal"}`}
						>
							{isCritical ? "Критично (0-Click)" : isUrgent ? "Срочно" : "Инфо"}
						</span>
					</div>
					{alert.subtitle && (
						<div className="copilot-proactive-subtitle">{alert.subtitle}</div>
					)}
				</div>

				{onDismiss && (
					<button
						type="button"
						className="copilot-proactive-dismiss-btn"
						onClick={() => onDismiss(alert.id)}
						title="Скрыть оповещение"
					>
						<XCircle size={16} />
					</button>
				)}
			</div>

			{/* Description */}
			<div className="copilot-proactive-body">
				<p className="copilot-proactive-desc">{alert.description}</p>
				{alert.patientPhone && (
					<div className="copilot-proactive-patient-meta">
						<Phone size={12} />
						<span>{alert.patientPhone}</span>
						{alert.patientName && <span>• {alert.patientName}</span>}
					</div>
				)}
			</div>

			{/* 1-Click Action Buttons Strip */}
			{alert.actions && alert.actions.length > 0 && (
				<div className="copilot-proactive-actions">
					{alert.actions.map((act) => {
						const isDanger = act.kind === "danger";
						const isPrimary = act.kind === "primary";
						return (
							<button
								key={act.id}
								type="button"
								className={`copilot-proactive-action-btn ${isDanger ? "danger" : isPrimary ? "primary" : "secondary"}`}
								onClick={() => handleActionClick(act)}
							>
								<span>{act.label}</span>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
};

// ============================================================================
// 10. WhatsAppApprovalCardView (Human-in-the-Loop 1-Click Approval)
// ============================================================================


export const WhatsAppApprovalCardView: React.FC<
	WhatsAppApprovalCardViewProps
> = ({ card, onApprove, onReject, onSendPrompt }) => {
	const [isEditing, setIsEditing] = useState(false);
	const [draftText, setDraftText] = useState(card.draftReply);
	const [isApproved, setIsApproved] = useState(
		card.status === "approved" || card.status === "sent",
	);
	const [isRejected, setIsRejected] = useState(card.status === "rejected");

	const handleApprove = () => {
		setIsApproved(true);
		if (onApprove) {
			onApprove(
				card.approvalId,
				draftText !== card.draftReply ? draftText : undefined,
			);
		}
	};

	const handleReject = () => {
		setIsRejected(true);
		if (onReject) {
			onReject(card.approvalId);
		}
	};

	const handleDiscuss = () => {
		if (onSendPrompt) {
			onSendPrompt(
				`По поводу сообщения пациента ${card.patientName} (${card.phone}): "${card.incomingSnippet}". Как лучше ответить?`,
			);
		}
	};

	return (
		<div
			className={`copilot-gen-card copilot-hitl-card ${isApproved ? "approved" : isRejected ? "rejected" : ""}`}
			data-testid="copilot-whatsapp-approval-card"
		>
			{/* Header */}
			<div className="copilot-hitl-header">
				<div className="copilot-hitl-channel-badge">
					<MessageCircle size={16} />
					<span>WhatsApp HitL</span>
				</div>

				<div className="flex items-center gap-2">
					<span className="copilot-hitl-confidence">
						Черновик ИИ
					</span>
					<span
						className={`copilot-urgency-pill ${card.urgency === "CRITICAL" ? "critical" : card.urgency === "URGENT" ? "urgent" : "normal"}`}
					>
						{card.urgency}
					</span>
				</div>
			</div>

			{/* Patient Info */}
			<div className="copilot-hitl-patient-row">
				<div className="copilot-hitl-patient-name">
					<User size={13} />
					<span>{card.patientName}</span>
				</div>
				<div className="copilot-hitl-patient-phone">
					<Phone size={12} />
					<span>{card.phone}</span>
				</div>
			</div>

			{/* Incoming Message Snippet */}
			<div className="copilot-hitl-snippet-box">
				<div className="copilot-hitl-snippet-label">Пациент написал:</div>
				<p className="copilot-hitl-snippet-text">"{card.incomingSnippet}"</p>
			</div>

			{/* AI Draft Response */}
			<div className="copilot-hitl-draft-box">
				<div className="flex items-center justify-between gap-2 mb-1">
					<div className="copilot-hitl-draft-label">
						<Sparkles size={13} className="text-[var(--teal)]" />
						<span>Сформированный ответ клиники:</span>
					</div>
					{!isApproved && !isRejected && (
						<button
							type="button"
							className="copilot-hitl-edit-toggle"
							onClick={() => setIsEditing(!isEditing)}
						>
							<Edit3 size={12} />
							<span>{isEditing ? "Готово" : "Править"}</span>
						</button>
					)}
				</div>

				{isEditing ? (
					<textarea
						className="copilot-hitl-textarea"
						value={draftText}
						onChange={(e) => setDraftText(e.target.value)}
						rows={3}
					/>
				) : (
					<div className="copilot-hitl-draft-text">{draftText}</div>
				)}
			</div>

			{/* 1-Click Action Footer */}
			<div className="copilot-hitl-actions">
				{isApproved ? (
					<div className="copilot-hitl-success-banner">
						<CheckCircle2 size={16} className="text-[var(--green)]" />
						<span>Сообщение одобрено и отправлено пациенту</span>
					</div>
				) : isRejected ? (
					<div className="copilot-hitl-rejected-banner">
						<XCircle size={16} className="text-[var(--muted)]" />
						<span>Черновик отклонён</span>
					</div>
				) : (
					<div className="copilot-hitl-btn-group">
						<button
							type="button"
							className="copilot-hitl-approve-btn"
							onClick={handleApprove}
							title="Отправить сообщение в WhatsApp"
						>
							<Send size={14} />
							<span>Одобрить и отправить</span>
						</button>

						<button
							type="button"
							className="copilot-hitl-reject-btn"
							onClick={handleReject}
							title="Отклонить отправку сообщения"
						>
							<XCircle size={14} />
							<span>Отклонить</span>
						</button>

						<button
							type="button"
							className="copilot-hitl-discuss-btn"
							onClick={handleDiscuss}
							title="Обсудить с Copilot"
						>
							<Sparkles size={14} />
						</button>
					</div>
				)}
			</div>
		</div>
	);
};


