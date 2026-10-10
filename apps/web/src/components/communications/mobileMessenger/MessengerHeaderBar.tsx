import React from "react";
import { Bot, Calendar, Clock, FileText, MessageSquare, Search } from "lucide-react";
import type { ActiveSection } from "./types";

export interface MessengerHeaderBarProps {
	activeSection: ActiveSection;
	setActiveSection: (sec: ActiveSection) => void;
	dialogsCount: number;
	tasksCount: number;
	eventsCount: number;
	isSearchOpen: boolean;
	setIsSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
	onGoToSchedule?: (() => void) | undefined;
}

export const MessengerHeaderBar: React.FC<MessengerHeaderBarProps> = ({
	activeSection,
	setActiveSection,
	dialogsCount,
	tasksCount,
	eventsCount,
	isSearchOpen,
	setIsSearchOpen,
	onGoToSchedule,
}) => {
	return (
		<header className="mobile-messenger-header">
			<div className="mobile-messenger-header-top">
				<div className="mobile-messenger-title-group">
					<h1 className="mobile-messenger-title">Связь с пациентами</h1>
					<div
						className="mobile-messenger-telemetry-badge"
						title="Шлюзы WhatsApp / Telegram / SMS активны"
					>
						<span className="mobile-messenger-telemetry-dot" />
						<span>Online</span>
					</div>
				</div>

				<div className="mobile-messenger-header-actions">
					{activeSection === "dialogs" && (
						<button
							type="button"
							className="mobile-touch-btn"
							onClick={() => setIsSearchOpen((prev) => !prev)}
							aria-label="Поиск диалогов"
							title="Поиск"
							data-testid="btn-mobile-messenger-search-toggle"
						>
							<Search size={18} />
						</button>
					)}
					{onGoToSchedule && (
						<button
							type="button"
							className="mobile-touch-btn"
							onClick={onGoToSchedule}
							aria-label="Перейти в расписание"
							title="Расписание"
							data-testid="btn-mobile-messenger-schedule"
						>
							<Calendar size={18} className="text-teal-600" />
						</button>
					)}
				</div>
			</div>

			{/* ─── Apple Segmented Bar ─── */}
			<nav className="mobile-segmented-bar" aria-label="Разделы коммуникаций">
				<button
					type="button"
					className={`mobile-segment-tab ${activeSection === "dialogs" ? "active" : ""}`}
					onClick={() => setActiveSection("dialogs")}
					data-testid="tab-mobile-dialogs"
				>
					<MessageSquare size={15} />
					<span>Диалоги ({dialogsCount})</span>
				</button>

				<button
					type="button"
					className={`mobile-segment-tab ${activeSection === "tasks" ? "active" : ""}`}
					onClick={() => setActiveSection("tasks")}
					data-testid="tab-mobile-tasks"
				>
					<Clock size={15} />
					<span>Задачи ({tasksCount})</span>
				</button>

				<button
					type="button"
					className={`mobile-segment-tab ${activeSection === "journal" ? "active" : ""}`}
					onClick={() => setActiveSection("journal")}
					data-testid="tab-mobile-journal"
				>
					<FileText size={15} />
					<span>Журнал ({eventsCount})</span>
				</button>

				<button
					type="button"
					className={`mobile-segment-tab ${activeSection === "bots" ? "active" : ""}`}
					onClick={() => setActiveSection("bots")}
					data-testid="tab-mobile-bots"
				>
					<Bot size={15} />
					<span>Боты</span>
				</button>
			</nav>
		</header>
	);
};
