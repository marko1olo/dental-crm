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
		<div className="flex items-center justify-between gap-3 min-h-[36px] pb-2 mb-2 border-b border-[var(--line)]">
			<h2
				className="text-base font-bold text-[var(--ink)] m-0 shrink-0 whitespace-nowrap"
				title="Центр коммуникаций с пациентами: подтверждения визитов, рассылки, чаты и звонки"
			>
				Связь с пациентами
			</h2>

			<div className="dente-segmented-bar flex items-center overflow-x-auto scrollbar-none min-h-[34px] max-h-[36px] px-1 py-0.5 flex-1 max-w-[760px]">
				<button
					type="button"
					onClick={() => onSelectSection("tasks")}
					className={`dente-segmented-item flex-1 shrink-0 min-h-[30px] text-xs ${
						activeSection === "tasks" ? "active" : ""
					}`}
					data-active={activeSection === "tasks"}
				>
					<MessageSquare size={13} />
					<span>Очередь и рассылки</span>
				</button>

				<button
					type="button"
					onClick={() => onSelectSection("chat")}
					className={`dente-segmented-item flex-1 shrink-0 min-h-[30px] text-xs ${
						activeSection === "chat" ? "active" : ""
					}`}
					data-active={activeSection === "chat"}
				>
					<Send size={13} />
					<span>WhatsApp Чат</span>
				</button>

				<button
					type="button"
					onClick={() => onSelectSection("bot_inbox")}
					className={`dente-segmented-item flex-1 shrink-0 min-h-[30px] text-xs ${
						activeSection === "bot_inbox" ? "active" : ""
					}`}
					data-active={activeSection === "bot_inbox"}
					data-testid="communications-tab-bot-inbox"
					title="Пульт ботов (TG/VK/WA/MAX)"
				>
					<Bot size={13} />
					<span>Пульт ботов</span>
				</button>

				<button
					type="button"
					onClick={() => onSelectSection("notifications")}
					className={`dente-segmented-item flex-1 shrink-0 min-h-[30px] text-xs ${
						activeSection === "notifications" ? "active" : ""
					}`}
					data-active={activeSection === "notifications"}
				>
					<Bell size={13} />
					<span>Уведомления</span>
				</button>

				<button
					type="button"
					onClick={() => onSelectSection("staff_chat")}
					className={`dente-segmented-item flex-1 shrink-0 min-h-[30px] text-xs ${
						activeSection === "staff_chat" ? "active" : ""
					}`}
					data-active={activeSection === "staff_chat"}
					data-testid="communications-tab-staff-chat"
					title="Чат клиники / Интерком"
				>
					<Radio size={13} />
					<span>Интерком</span>
				</button>
			</div>

			<div className="flex items-center gap-1.5 shrink-0 relative">
				<button
					type="button"
					onClick={onOpenOmnichannelHub}
					className="secondary-button min-h-[34px] px-3 py-1 text-xs"
					data-testid="communications-omnichannel-hub-btn"
					title="Омниканальный чат с пациентом (WhatsApp / Telegram / SMS)"
				>
					<MessageSquare size={13} className="text-teal-600 dark:text-teal-400" />
					<span>Омниканальный чат</span>
				</button>

				<button
					type="button"
					onClick={onToggleMoreMenu}
					className="secondary-button min-h-[34px] min-w-[34px] px-2 py-1"
					data-testid="communications-more-menu-btn"
					aria-label="Дополнительные действия связи"
					title="Дополнительные действия: Профосмотры и реколлы, Расписание"
				>
					<MoreHorizontal size={15} />
				</button>

				{isMoreMenuOpen && (
					<div
						className="absolute right-0 top-full mt-1.5 w-56 rounded-xl bg-[var(--paper-strong)] border border-[var(--line)] shadow-xl z-40 p-1.5 flex flex-col gap-1"
						role="menu"
					>
						<button
							type="button"
							onClick={() => {
								onCloseMoreMenu();
								onOpenRecallsHub();
							}}
							className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] text-left cursor-pointer"
							data-testid="communications-recalls-hub-btn"
							role="menuitem"
						>
							<Calendar
								size={14}
								className="text-teal-600 dark:text-teal-400 shrink-0"
							/>
							<span>Профосмотры и реколлы</span>
						</button>
						<button
							type="button"
							onClick={() => {
								onCloseMoreMenu();
								onGoToSchedule();
							}}
							className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] text-left cursor-pointer"
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
