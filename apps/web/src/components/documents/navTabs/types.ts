export type DocumentCategoryTab =
	| "all"
	| "intake"
	| "clinical"
	| "finance_tax"
	| "certificates_sanpin";

export interface DocumentNavTabsProps {
	readonly activeTab: DocumentCategoryTab;
	readonly onSelectTab: (tab: DocumentCategoryTab) => void;
	readonly counts?: Partial<Record<DocumentCategoryTab, number>> | Record<DocumentCategoryTab, number>;
}
