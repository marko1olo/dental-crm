import type React from "react";
import {
	FileText,
	UserCheck,
	Stethoscope,
	Receipt,
	Building2,
} from "lucide-react";

export type DocumentCategoryTab =
	| "all"
	| "intake"
	| "clinical"
	| "finance_tax"
	| "hospital_sanpin";

export interface DocumentNavTabsProps {
	readonly activeTab: DocumentCategoryTab;
	readonly onSelectTab: (tab: DocumentCategoryTab) => void;
	readonly counts: Record<DocumentCategoryTab, number>;
}

export function DocumentNavTabs({
	activeTab,
	onSelectTab,
	counts,
}: DocumentNavTabsProps): React.JSX.Element {
	const tabs: Array<{
		id: DocumentCategoryTab;
		label: string;
		icon: React.ReactNode;
	}> = [
		{
			id: "all",
			label: "Все документы и реестр",
			icon: <FileText size={16} aria-hidden="true" />,
		},
		{
			id: "intake",
			label: "Первичный приём и ИДС",
			icon: <UserCheck size={16} aria-hidden="true" />,
		},
		{
			id: "clinical",
			label: "Клинический приём и 043/у",
			icon: <Stethoscope size={16} aria-hidden="true" />,
		},
		{
			id: "finance_tax",
			label: "Оплата и Налоговая",
			icon: <Receipt size={16} aria-hidden="true" />,
		},
		{
			id: "hospital_sanpin",
			label: "Госпитализация и СанПиН",
			icon: <Building2 size={16} aria-hidden="true" />,
		},
	];

	return (
		<nav
			className="document-nav-tabs"
			aria-label="Категории документов"
			role="tablist"
		>
			{tabs.map((tab) => {
				const isActive = activeTab === tab.id;
				const count = counts[tab.id] ?? 0;
				return (
					<button
						key={tab.id}
						type="button"
						role="tab"
						aria-selected={isActive}
						className={`document-nav-tab-btn ${isActive ? "active" : ""}`}
						onClick={() => onSelectTab(tab.id)}
					>
						{tab.icon}
						<span>{tab.label}</span>
						<span className="document-nav-tab-badge" aria-label={`Количество: ${count}`}>
							{count}
						</span>
					</button>
				);
			})}
		</nav>
	);
}
