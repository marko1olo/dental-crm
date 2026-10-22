import React from "react";
import { FileCheck, FileText, Receipt, Shield, ShieldCheck } from "lucide-react";
import { DentalForm043 } from "../../icons/DentalIcons";
import { MOBILE_CATEGORIES } from "./mobileDocumentsConstants";
import type { MobileCategoryTab } from "./mobileDocumentsTypes";

interface MobileCategoryChipsProps {
	activeCategory: MobileCategoryTab;
	categoryCounts: Record<string, number>;
	onSelectCategory: (id: MobileCategoryTab) => void;
	triggerTactile: () => void;
}

export function MobileCategoryChips({
	activeCategory,
	categoryCounts,
	onSelectCategory,
	triggerTactile,
}: MobileCategoryChipsProps) {
	const renderCategoryIcon = (iconName: string) => {
		switch (iconName) {
			case "contract":
				return <FileText size={14} className="shrink-0 text-blue-500" aria-hidden="true" />;
			case "shield":
				return <ShieldCheck size={14} className="shrink-0 text-teal-500" aria-hidden="true" />;
			case "act":
				return <FileCheck size={14} className="shrink-0 text-emerald-500" aria-hidden="true" />;
			case "fns":
				return <Receipt size={14} className="shrink-0 text-amber-500" aria-hidden="true" />;
			case "clinical":
				return <DentalForm043 size={14} className="shrink-0 text-cyan-500" aria-hidden="true" />;
			default:
				return <FileText size={14} className="shrink-0" aria-hidden="true" />;
		}
	};

	return (
		<div
			className="flex overflow-x-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x gap-2 px-4 py-1"
			role="tablist"
			aria-label="Категории документов"
		>
			{MOBILE_CATEGORIES.map((cat) => {
				const isActive = activeCategory === cat.id;
				const count = categoryCounts[cat.id] ?? 0;
				return (
					<button
						key={cat.id}
						type="button"
						role="tab"
						aria-selected={isActive}
						onClick={() => {
							triggerTactile();
							onSelectCategory(cat.id);
						}}
						className={`min-h-[40px] px-3.5 py-1.5 rounded-[12px] text-[13px] font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 border transition-all active:scale-95 ${
							isActive
								? "bg-[var(--teal,#0d9488)] text-white border-transparent shadow-sm"
								: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"
						}`}
						data-testid={`mobile-chip-${cat.id}`}
					>
						{renderCategoryIcon(cat.iconName)}
						<span>{cat.label}</span>
						<span
							className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
								isActive
									? "bg-white/20 text-white"
									: "bg-[var(--paper-soft)] text-[var(--muted)]"
							}`}
						>
							{count}
						</span>
					</button>
				);
			})}
		</div>
	);
}
