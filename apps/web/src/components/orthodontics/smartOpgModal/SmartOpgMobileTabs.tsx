import React from "react";
import { Layers, FileText } from "lucide-react";

interface SmartOpgMobileTabsProps {
	mobileTab: "image" | "details";
	onSelectTab: (tab: "image" | "details") => void;
}

export const SmartOpgMobileTabs: React.FC<SmartOpgMobileTabsProps> = ({
	mobileTab,
	onSelectTab,
}) => {
	return (
		<div className="flex lg:hidden items-center justify-around p-1.5 bg-[var(--paper-soft)] border-b border-[var(--line)] shrink-0">
			<button
				type="button"
				onClick={() => onSelectTab("image")}
				data-testid="mobile-tab-opg-image"
				className={`flex-1 min-h-[44px] py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
					mobileTab === "image"
						? "bg-sky-500 text-white shadow-xs"
						: "text-[var(--muted)] hover:bg-[var(--paper-hover,#f1f5f9)]"
				}`}
			>
				<Layers className="w-4 h-4" />
				<span>Снимок ОПТГ</span>
			</button>
			<button
				type="button"
				onClick={() => onSelectTab("details")}
				data-testid="mobile-tab-opg-details"
				className={`flex-1 min-h-[44px] py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
					mobileTab === "details"
						? "bg-sky-500 text-white shadow-xs"
						: "text-[var(--muted)] hover:bg-[var(--paper-hover,#f1f5f9)]"
				}`}
			>
				<FileText className="w-4 h-4" />
				<span>Зубная формула и метрики</span>
			</button>
		</div>
	);
};
