import type React from "react";
import { BarChart3, Lightbulb, Phone, PhoneCall, ShieldCheck, Users, X } from "lucide-react";

export type RecallHubActiveTab = "registry" | "funnel" | "task_calls";

export interface RecallHubHeaderProps {
	readonly activeTab: RecallHubActiveTab;
	readonly onTabChange: (tab: RecallHubActiveTab) => void;
	readonly onClose?: (() => void) | undefined;
}

export const RecallHubHeader: React.FC<RecallHubHeaderProps> = ({
	activeTab,
	onTabChange,
	onClose,
}) => {
	return (
		<header className="recall-header">
			<div className="recall-header-title-wrap">
				<div className="recall-header-icon" aria-hidden="true">
					<ShieldCheck size={22} />
				</div>
				<div>
					<h2 id="recalls-hub-title" className="recall-header-title">
						Профосмотры, диспансеризация и ретеншн (Recalls Hub)
					</h2>
					<p className="recall-header-subtitle">
						<Phone
							size={14}
							style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }}
							aria-hidden="true"
						/>
						<Lightbulb
							size={14}
							style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }}
							aria-hidden="true"
						/>
						Клинические циклы возврата (6 мес гигиена, 12 мес импланты), 1-клик WhatsApp и сценарии звонков
					</p>
				</div>
			</div>

			<div className="recall-header-controls">
				<div className="recall-view-mode-tabs dente-segmented-bar" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "registry"}
						className={`recall-tab-btn ${activeTab === "registry" ? "active" : ""}`}
						onClick={() => onTabChange("registry")}
						title="Список пациентов, подошедших к сроку повторного осмотра"
					>
						<Users size={16} />
						<span>Список на обзвон сегодня</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "funnel"}
						className={`recall-tab-btn ${activeTab === "funnel" ? "active" : ""}`}
						onClick={() => onTabChange("funnel")}
						title="Воронка диспансерного учета (6 мес / 12 мес / Индивидуальный срок)"
					>
						<BarChart3 size={16} />
						<span>Воронка диспансеризации</span>
					</button>

					<button
						type="button"
						role="tab"
						data-testid="tab-task-calls"
						aria-selected={activeTab === "task_calls"}
						className={`recall-tab-btn ${activeTab === "task_calls" ? "active" : ""}`}
						onClick={() => onTabChange("task_calls")}
						title="Задачи сервисных звонков куратора и администратора"
					>
						<PhoneCall size={16} />
						<span>Задачи звонков</span>
					</button>
				</div>

				{onClose ? (
					<button
						type="button"
						className="recall-close-btn"
						onClick={onClose}
						aria-label="Закрыть модальное окно"
					>
						<X size={20} />
					</button>
				) : null}
			</div>
		</header>
	);
};
