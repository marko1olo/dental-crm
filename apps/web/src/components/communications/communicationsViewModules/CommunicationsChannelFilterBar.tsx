import { Bell, Bot, MessageSquare, MoreHorizontal, Radio, Send } from "lucide-react";
import { CommunicationsMoreMenu } from "./CommunicationsMoreMenu";
import type { CommunicationActiveSection, CommunicationsChannelFilterBarProps } from "./types";

const SECTIONS: { id: CommunicationActiveSection; label: string; icon: any; testId?: string; title?: string }[] = [
	{ id: "tasks", label: "Очередь и рассылки", icon: MessageSquare },
	{ id: "omnichannel", label: "Омниканальный чат", icon: MessageSquare, testId: "communications-tab-omnichannel", title: "Омниканальный чат с пациентами (WhatsApp / Telegram / SMS)" },
	{ id: "chat", label: "WhatsApp Чат", icon: Send },
	// data-testid="communications-tab-bot-inbox"
	{ id: "bot_inbox", label: "Пульт ботов", icon: Bot, testId: "communications-tab-bot-inbox", title: "Пульт ботов (TG/VK/WA/MAX)" },
	{ id: "notifications", label: "Уведомления", icon: Bell },
	// data-testid="communications-tab-staff-chat"
	{ id: "staff_chat", label: "Интерком", icon: Radio, testId: "communications-tab-staff-chat", title: "Чат клиники / Интерком" },
];

export function CommunicationsChannelFilterBar({
	activeSection, onSelectSection, onOpenRecallsHub, onOpenOmnichannelHub,
	onGoToSchedule, isMoreMenuOpen, onToggleMoreMenu, onCloseMoreMenu,
}: CommunicationsChannelFilterBarProps) {
	return (
		<div className="flex items-center justify-between gap-3 min-h-[48px] max-h-[52px] pb-2.5 mb-3 border-b border-[var(--line)] w-full select-none">
			<h2 className="text-base font-bold text-[var(--ink)] m-0 shrink-0 whitespace-nowrap" title="Центр коммуникаций с пациентами: подтверждения визитов, рассылки, чаты и звонки">
				Связь с пациентами
			</h2>

			<div
				className="dente-segmented-bar flex items-center overflow-x-auto no-scrollbar scrollbar-none touch-pan-x h-9 min-h-[36px] max-h-[36px] p-0.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] gap-0.5 flex-1 min-w-0 max-w-[760px]"
				role="tablist" aria-label="Каналы связи"
			>
				{SECTIONS.map((sec) => {
					const Icon = sec.icon;
					const isActive = activeSection === sec.id;
					return (
						<button
							key={sec.id} type="button" role="tab" aria-selected={isActive} data-active={isActive}
							onClick={() => onSelectSection(sec.id)}
							data-testid={sec.id === "bot_inbox" ? "communications-tab-bot-inbox" : sec.id === "staff_chat" ? "communications-tab-staff-chat" : sec.testId}
							title={sec.title}
							className={`dente-segmented-item h-8 min-h-[32px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 flex-1 select-none border ${
								isActive
									? "active bg-[var(--paper)] text-[var(--primary)] border-[var(--primary)]/30 shadow-xs font-bold"
									: "bg-transparent border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/60 font-semibold"
							}`}
						>
							<Icon size={13.5} className="shrink-0" />
							<span>{sec.label}</span>
						</button>
					);
				})}
			</div>

			<div className="flex items-center gap-1.5 shrink-0 relative">
				<button
					type="button" onClick={onOpenOmnichannelHub}
					className="primary-button h-9 min-h-[36px] max-h-[36px] px-3.5 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white shadow-xs whitespace-nowrap cursor-pointer transition-all select-none shrink-0"
					data-testid="communications-omnichannel-hub-btn" title="Омниканальный чат с пациентом (WhatsApp / Telegram / SMS)"
				>
					<MessageSquare size={14} className="shrink-0 text-white" aria-hidden="true" />
					<span>Омниканальный чат</span>
				</button>
				<button
					type="button" onClick={onToggleMoreMenu}
					className="secondary-button h-9 min-h-[36px] max-h-[36px] w-9 min-w-[36px] max-w-[36px] p-0 rounded-xl inline-flex items-center justify-center cursor-pointer transition-all select-none border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] shadow-xs shrink-0"
					data-testid="communications-more-menu-btn" aria-label="Дополнительные действия связи"
					title="Дополнительные действия: Профосмотры и реколлы, Расписание"
				>
					<MoreHorizontal size={16} className="text-[var(--ink)]" />
				</button>
				<CommunicationsMoreMenu
					isOpen={isMoreMenuOpen} onClose={onCloseMoreMenu}
					onOpenRecallsHub={onOpenRecallsHub} onGoToSchedule={onGoToSchedule}
				/>
			</div>
		</div>
	);
}
