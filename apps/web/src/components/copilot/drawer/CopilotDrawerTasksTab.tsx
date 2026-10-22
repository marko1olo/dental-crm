import React from "react";
import { Clock, FileText, Zap } from "lucide-react";
import { CopilotActionConfirm } from "../CopilotActionConfirm";
import { ProactiveAlertCardView, WhatsAppApprovalCardView } from "../CopilotGenerativeCards";
import { CopilotDrawerTasksRecalls } from "./CopilotDrawerTasksRecalls";
import { CopilotDrawerTasksEstimates } from "./CopilotDrawerTasksEstimates";
import type { ShiftDebtRecall, ShiftDebtEstimate } from "./drawerTypes";
import type {
	BookSlotHandler,
	ConfirmHandler,
	PendingConfirmation,
	ProactiveAlertCardData,
	WhatsAppApprovalCard,
} from "../copilotTypes";

interface CopilotDrawerTasksTabProps {
	totalEstimatesSumRub: number;
	shiftDebtRecalls: ShiftDebtRecall[];
	shiftDebtEstimates: ShiftDebtEstimate[];
	pending: PendingConfirmation | null;
	nameCache: Record<string, string>;
	whatsappHitLCards?: WhatsAppApprovalCard[] | undefined;
	proactiveAlerts?: ProactiveAlertCardData[] | undefined;
	onConfirm: ConfirmHandler;
	onBookSlot?: BookSlotHandler;
	onSendPrompt: (prompt: string) => void;
	onDismissProactiveAlert?: ((alertId: string) => void) | undefined;
	onApproveWhatsApp?: ((approvalId: string, modifiedReply?: string) => void) | undefined;
	onRejectWhatsApp?: ((approvalId: string, reason?: string) => void) | undefined;
}

export const CopilotDrawerTasksTab: React.FC<CopilotDrawerTasksTabProps> = ({
	totalEstimatesSumRub,
	shiftDebtRecalls,
	shiftDebtEstimates,
	pending,
	nameCache,
	whatsappHitLCards = [],
	proactiveAlerts = [],
	onConfirm,
	onBookSlot,
	onSendPrompt,
	onDismissProactiveAlert,
	onApproveWhatsApp,
	onRejectWhatsApp,
}) => {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "12px" }} data-testid="copilot-tasks-tab-content">
			{/* 1. Summary Banner: Operational Shift Debts */}
			<div className="copilot-tasks-summary-banner" data-testid="copilot-shift-debts-summary">
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

			{/* 2. Block: Просроченные рекаллы */}
			<CopilotDrawerTasksRecalls recalls={shiftDebtRecalls} onBookSlot={onBookSlot} onSendPrompt={onSendPrompt} />

			{/* 3. Block: Ожидают ответа по смете */}
			<CopilotDrawerTasksEstimates estimates={shiftDebtEstimates} />

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
				.filter((alert) => !alert.id.startsWith("alert_hitl_") && alert.category !== "whatsapp_emergency")
				.map((alert) => (
					<ProactiveAlertCardView
						key={alert.id}
						alert={alert}
						onDismiss={onDismissProactiveAlert}
						onSendPrompt={onSendPrompt}
					/>
				))}
		</div>
	);
};
