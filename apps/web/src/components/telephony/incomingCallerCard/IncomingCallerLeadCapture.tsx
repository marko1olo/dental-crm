import React from "react";
import { Check, Sparkles, UserPlus } from "lucide-react";
import type { CallAttribution } from "../telephonyAttribution";
import { CHANNEL_BADGE_COLORS } from "../telephonyAttribution";

interface IncomingCallerLeadCaptureProps {
	callAttribution: CallAttribution;
	isLeadCaptured?: boolean | undefined;
	isCapturingLead?: boolean | undefined;
	onCaptureLead?: (() => void) | undefined;
}

export const IncomingCallerLeadCapture: React.FC<IncomingCallerLeadCaptureProps> = ({
	callAttribution,
	isLeadCaptured,
	isCapturingLead,
	onCaptureLead,
}) => {
	const colors = CHANNEL_BADGE_COLORS[callAttribution.channelKey];

	return (
		<div
			className="p-3.5 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--teal-soft)] space-y-2.5 shadow-xs"
			data-testid="telephony-lead-capture-card"
		>
			<div className="flex items-center justify-between gap-1 flex-wrap">
				<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink,#0f172a)]">
					<Sparkles size={14} className="text-amber-500 shrink-0" />
					<span>Захват в CRM-лиды</span>
				</div>
				<span
					className="px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0"
					style={{
						backgroundColor: colors.bg,
						color: colors.text,
						border: `1px solid ${colors.border}`,
					}}
					data-testid="telephony-attribution-channel-pill"
				>
					{callAttribution.channelLabel}
				</span>
			</div>

			<div className="text-[11px] text-[var(--muted,#64748b)] space-y-1">
				{callAttribution.virtualNumberDisplay && (
					<div className="flex items-center justify-between">
						<span>Номер ВАТС:</span>
						<span className="font-mono font-semibold text-[var(--ink,#0f172a)]">
							{callAttribution.virtualNumberDisplay}
						</span>
					</div>
				)}
				{callAttribution.utmSummary && (
					<div className="flex items-start justify-between gap-1">
						<span className="shrink-0">UTM-метки:</span>
						<span className="font-mono text-[10px] text-[var(--teal)] text-right break-all">
							{callAttribution.utmSummary}
						</span>
					</div>
				)}
			</div>

			{onCaptureLead && (
				<button
					type="button"
					onClick={onCaptureLead}
					disabled={isCapturingLead || isLeadCaptured}
					className="w-full h-9 min-h-[36px] px-3.5 py-1.5 rounded-lg bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white text-[13px] font-semibold transition-all inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
					data-testid="drawer-action-capture-lead"
					title="Захват звонящего в лиды с автоматической разметкой рекламного канала"
				>
					{isLeadCaptured ? <Check size={15} /> : <UserPlus size={15} />}
					<span>
						{isLeadCaptured
							? `Лид захвачен (${callAttribution.channelLabel})`
							: isCapturingLead
								? "Сохранение лида..."
								: `Захватить в лиды (${callAttribution.channelLabel})`}
					</span>
				</button>
			)}
		</div>
	);
};
