import type React from "react";
import {
	FileText,
	UserCheck,
	Stethoscope,
	Receipt,
	FileCheck,
} from "lucide-react";

export type DocumentCategoryTab =
	| "all"
	| "intake"
	| "clinical"
	| "finance_tax"
	| "certificates_sanpin";

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
		mobileLabel: string;
		icon: React.ReactNode;
	}> = [
		{
			id: "all",
			label: "Все документы и реестр",
			mobileLabel: "Все",
			icon: <FileText size={16} aria-hidden="true" />,
		},
		{
			id: "intake",
			label: "Первичный приём и ИДС",
			mobileLabel: "Первичный",
			icon: <UserCheck size={16} aria-hidden="true" />,
		},
		{
			id: "clinical",
			label: "Клинический приём и 043/у",
			mobileLabel: "043/у",
			icon: <Stethoscope size={16} aria-hidden="true" />,
		},
		{
			id: "finance_tax",
			label: "Оплата и Налоговая",
			mobileLabel: "Финансы",
			icon: <Receipt size={16} aria-hidden="true" />,
		},
		{
			id: "certificates_sanpin",
			label: "Справки и СанПиН",
			mobileLabel: "СанПиН",
			icon: <FileCheck size={16} aria-hidden="true" />,
		},
	];

	return (
		<nav
			className="document-nav-tabs"
			aria-label="Категории документов"
			role="tablist"
			onWheel={(e) => {
				if (e.deltaY !== 0) {
					e.currentTarget.scrollLeft += e.deltaY;
				}
			}}
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
						<span className="whitespace-nowrap shrink-0 flex-shrink-0 min-w-max">
							<span className="sm:hidden">{tab.mobileLabel}</span>
							<span className="hidden sm:inline">{tab.label}</span>
						</span>
						<span
							className="document-nav-tab-badge shrink-0 flex-shrink-0"
							aria-label={`Количество: ${count}`}
						>
							{count}
						</span>
					</button>
				);
			})}
		</nav>
	);
}
