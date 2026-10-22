import type React from "react";
import { BarChart3, Lightbulb, Phone, PhoneCall, ShieldCheck, Users, X } from "lucide-react";

export type RecallHubActiveTab = "task_calls" | "registry";

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
				<div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
					<div className="recall-header-icon" aria-hidden="true">
						<ShieldCheck size={22} />
					</div>
					<div>
						<h2 id="recalls-hub-title" className="recall-header-title">
							Профосмотры и диспансеризация
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
							Плановые осмотры, профессиональная гигиена и контроль лечения
						</p>
					</div>
				</div>

				{onClose ? (
					<button
						type="button"
						className="recall-close-btn recall-close-btn--mobile"
						onClick={onClose}
						aria-label="Закрыть модальное окно"
					>
						<X size={20} />
					</button>
				) : null}
			</div>

			<div className="recall-header-controls">
				<div className="recall-view-mode-tabs dente-segmented-bar" role="tablist">
					<button
						type="button"
						role="tab"
						data-testid="tab-task-calls"
						aria-selected={activeTab === "task_calls"}
						className={`recall-tab-btn ${activeTab === "task_calls" ? "active" : ""}`}
						onClick={() => onTabChange("task_calls")}
						title="Очередь задач сервисных звонков куратора и администратора"
					>
						<PhoneCall size={16} />
						<span className="recall-tab-label-full">1. Очередь на сегодня (Задачи звонков)</span>
						<span className="recall-tab-label-short">Очередь звонков</span>
					</button>

					<button
						type="button"
						role="tab"
						data-testid="tab-registry"
						aria-selected={activeTab === "registry"}
						className={`recall-tab-btn ${activeTab === "registry" ? "active" : ""}`}
						onClick={() => onTabChange("registry")}
						title="Реестр диспансерного наблюдения и профилактических осмотров"
					>
						<Users size={16} />
						<span className="recall-tab-label-full">2. Реестр диспансеризации (Список на обзвон)</span>
						<span className="recall-tab-label-short">Реестр обзвона</span>
					</button>
				</div>

				{onClose ? (
					<button
						type="button"
						className="recall-close-btn recall-close-btn--desktop"
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
