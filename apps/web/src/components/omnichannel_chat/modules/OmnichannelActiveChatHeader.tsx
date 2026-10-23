import React from "react";
import { ArrowLeft, CalendarCheck, UserCheck } from "lucide-react";
import { formatPhoneDisplay } from "../../../store/telephonyStore";
import type { OmnichannelConversation } from "../types";
import { OmnichannelChannelBadge } from "./OmnichannelChannelBadge";

export interface OmnichannelActiveChatHeaderProps {
	conversation: OmnichannelConversation;
	onBackToList: () => void;
	onOpenCard: () => void;
	onQuickBook: () => void;
}

export function OmnichannelActiveChatHeader({
	conversation,
	onBackToList,
	onOpenCard,
	onQuickBook,
}: OmnichannelActiveChatHeaderProps): React.JSX.Element {
	return (
		<div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-[var(--line)] bg-[var(--paper)] gap-2">
			<div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
				<button
					type="button"
					onClick={onBackToList}
					className="sm:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] shrink-0"
					title="Назад ко всем диалогам"
					data-testid="chat-mobile-back-btn"
				>
					<ArrowLeft size={18} />
				</button>

				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-1.5 min-w-0">
						<h3 className="text-xs sm:text-sm font-bold text-[var(--ink)] truncate">
							{conversation.patientName}
						</h3>
						<OmnichannelChannelBadge channel={conversation.channel} />
					</div>
					<div className="text-[11px] text-[var(--muted)] font-mono flex flex-wrap sm:flex-nowrap items-center gap-x-2 gap-y-0.5 min-w-0">
						<span className="truncate">{formatPhoneDisplay(conversation.patientPhone)}</span>
						{conversation.balanceRub !== undefined && (
							<span
								className={`shrink-0 ${
									conversation.balanceRub >= 0
										? "text-emerald-700 dark:text-emerald-300 font-bold"
										: "text-rose-700 dark:text-rose-300 font-bold"
								}`}
							>
								{conversation.balanceRub >= 0
									? `+${conversation.balanceRub.toLocaleString("ru-RU")} ₽`
									: `${conversation.balanceRub.toLocaleString("ru-RU")} ₽`}
							</span>
						)}
					</div>
				</div>
			</div>

			<div className="flex items-center gap-1 shrink-0">
				<button
					type="button"
					onClick={onOpenCard}
					className="secondary-button min-h-[34px] px-2 sm:px-3 text-xs font-bold whitespace-nowrap inline-flex items-center gap-1"
					title="Открыть карту пациента"
					data-testid="chat-action-open-card"
				>
					<UserCheck size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span className="hidden sm:inline">Открыть карту</span>
					<span className="sm:hidden text-[11px]">Карта</span>
				</button>

				<button
					type="button"
					onClick={onQuickBook}
					className="primary-button min-h-[34px] px-2 sm:px-3 text-xs font-bold whitespace-nowrap inline-flex items-center gap-1"
					title="Записать на приём"
					data-testid="chat-action-quick-book"
				>
					<CalendarCheck size={14} className="shrink-0" />
					<span className="hidden sm:inline">Записать на приём</span>
					<span className="sm:hidden text-[11px]">Запись</span>
				</button>
			</div>
		</div>
	);
}
