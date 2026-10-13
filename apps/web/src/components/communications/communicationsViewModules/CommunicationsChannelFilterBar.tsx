import {
	Bell,
	Bot,
	Calendar,
	MessageSquare,
	MoreHorizontal,
	Radio,
	Send,
} from "lucide-react";
import type { CommunicationsChannelFilterBarProps } from "./types";

export function CommunicationsChannelFilterBar({
	activeSection,
	onSelectSection,
	onOpenRecallsHub,
	onOpenOmnichannelHub,
	onGoToSchedule,
	isMoreMenuOpen,
	onToggleMoreMenu,
	onCloseMoreMenu,
}: CommunicationsChannelFilterBarProps) {
	return (
		<div className="flex items-center justify-between gap-3 min-h-[48px] max-h-[52px] pb-2.5 mb-3 border-b border-[var(--line)] w-full select-none">
			<h2
				className="text-base font-bold text-[var(--ink)] m-0 shrink-0 whitespace-nowrap"
				title="Центр коммуникаций с пациентами: подтверждения визитов, рассылки, чаты и звонки"
			>
				Связь с пациентами
			</h2>

			<div
				className="dente-segmented-bar flex items-center overflow-x-auto no-scrollbar scrollbar-none touch-pan-x h-9 min-h-[36px] max-h-[36px] p-0.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] gap-0.5 flex-1 min-w-0 max-w-[760px]"
				role="tablist"
				aria-label="Каналы связи"
			>
				<button
					type="button"
					role="tab"
					aria-selected={activeSection === "tasks"}
					onClick={() => onSelectSection("tasks")}
					className={`dente-segmented-item h-8 min-h-[32px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 flex-1 select-none border ${
						activeSection === "tasks"
							? "active bg-[var(--paper)] text-[var(--primary)] border-[var(--primary)]/30 shadow-xs font-bold"
							: "bg-transparent border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/60 font-semibold"
					}`}
					data-active={activeSection === "tasks"}
				>
					<MessageSquare size={13.5} className="shrink-0" />
					<span>Очередь и рассылки</span>
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={activeSection === "chat"}
					onClick={() => onSelectSection("chat")}
					className={`dente-segmented-item h-8 min-h-[32px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 flex-1 select-none border ${
						activeSection === "chat"
							? "active bg-[var(--paper)] text-[var(--primary)] border-[var(--primary)]/30 shadow-xs font-bold"
							: "bg-transparent border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/60 font-semibold"
					}`}
					data-active={activeSection === "chat"}
				>
					<Send size={13.5} className="shrink-0" />
					<span>WhatsApp Чат</span>
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={activeSection === "bot_inbox"}
					onClick={() => onSelectSection("bot_inbox")}
					className={`dente-segmented-item h-8 min-h-[32px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 flex-1 select-none border ${
						activeSection === "bot_inbox"
							? "active bg-[var(--paper)] text-[var(--primary)] border-[var(--primary)]/30 shadow-xs font-bold"
							: "bg-transparent border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/60 font-semibold"
					}`}
					data-active={activeSection === "bot_inbox"}
					data-testid="communications-tab-bot-inbox"
					title="Пульт ботов (TG/VK/WA/MAX)"
				>
					<Bot size={13.5} className="shrink-0" />
					<span>Пульт ботов</span>
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={activeSection === "notifications"}
					onClick={() => onSelectSection("notifications")}
					className={`dente-segmented-item h-8 min-h-[32px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 flex-1 select-none border ${
						activeSection === "notifications"
							? "active bg-[var(--paper)] text-[var(--primary)] border-[var(--primary)]/30 shadow-xs font-bold"
							: "bg-transparent border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/60 font-semibold"
					}`}
					data-active={activeSection === "notifications"}
				>
					<Bell size={13.5} className="shrink-0" />
					<span>Уведомления</span>
				</button>

				<button
					type="button"
					role="tab"
					aria-selected={activeSection === "staff_chat"}
					onClick={() => onSelectSection("staff_chat")}
					className={`dente-segmented-item h-8 min-h-[32px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 flex-1 select-none border ${
						activeSection === "staff_chat"
							? "active bg-[var(--paper)] text-[var(--primary)] border-[var(--primary)]/30 shadow-xs font-bold"
							: "bg-transparent border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/60 font-semibold"
					}`}
					data-active={activeSection === "staff_chat"}
					data-testid="communications-tab-staff-chat"
					title="Чат клиники / Интерком"
				>
					<Radio size={13.5} className="shrink-0" />
					<span>Интерком</span>
				</button>
			</div>

			<div className="flex items-center gap-1.5 shrink-0 relative">
				<button
					type="button"
					onClick={onOpenOmnichannelHub}
					className="primary-button h-9 min-h-[36px] max-h-[36px] px-3.5 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white shadow-xs whitespace-nowrap cursor-pointer transition-all select-none shrink-0"
					data-testid="communications-omnichannel-hub-btn"
					title="Омниканальный чат с пациентом (WhatsApp / Telegram / SMS)"
				>
					<MessageSquare size={14} className="shrink-0 text-white" aria-hidden="true" />
					<span>Омниканальный чат</span>
				</button>

				<button
					type="button"
					onClick={onToggleMoreMenu}
					className="secondary-button h-9 min-h-[36px] max-h-[36px] w-9 min-w-[36px] max-w-[36px] p-0 rounded-xl inline-flex items-center justify-center cursor-pointer transition-all select-none border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] shadow-xs shrink-0"
					data-testid="communications-more-menu-btn"
					aria-label="Дополнительные действия связи"
					title="Дополнительные действия: Профосмотры и реколлы, Расписание"
				>
					<MoreHorizontal size={16} className="text-[var(--ink)]" />
				</button>

				{isMoreMenuOpen && (
					<div
						className="absolute right-0 top-full mt-1.5 w-60 rounded-xl bg-[var(--paper-strong)] border border-[var(--line)] shadow-xl z-40 p-1.5 flex flex-col gap-1 select-none"
						role="menu"
					>
						<button
							type="button"
							onClick={() => {
								onCloseMoreMenu();
								onOpenRecallsHub();
							}}
							className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors text-left cursor-pointer"
							data-testid="communications-recalls-hub-btn"
							role="menuitem"
						>
							<Calendar
								size={14}
								className="text-[var(--primary)] shrink-0"
							/>
							<span>Профосмотры и реколлы</span>
						</button>
						<button
							type="button"
							onClick={() => {
								onCloseMoreMenu();
								onGoToSchedule();
							}}
							className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors text-left cursor-pointer"
							role="menuitem"
						>
							<Calendar size={14} className="text-[var(--muted)] shrink-0" />
							<span>Перейти в расписание</span>
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
