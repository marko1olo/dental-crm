import type React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SPECIALTY_CATEGORIES_META, type SpecialtyCategoryKey } from "../clinicalProtocolsCatalog";

export interface ClinicalCatalogSpecialtyTabsProps {
	activeCategory: SpecialtyCategoryKey;
	setActiveCategory: (cat: SpecialtyCategoryKey) => void;
	tabsRef: React.RefObject<HTMLDivElement | null>;
	canScrollLeft: boolean;
	canScrollRight: boolean;
	scrollTabs: (dir: "left" | "right") => void;
}

export function ClinicalCatalogSpecialtyTabs({
	activeCategory,
	setActiveCategory,
	tabsRef,
	canScrollLeft,
	canScrollRight,
	scrollTabs,
}: ClinicalCatalogSpecialtyTabsProps) {
	return (
		<div className="relative px-2 py-2 border-b border-[var(--glass-border)] bg-[var(--paper-soft)] shrink-0 flex items-center">
			{canScrollLeft && (
				<div className="absolute left-1 z-10 flex items-center pr-2 bg-gradient-to-r from-[var(--paper-soft)] via-[var(--paper-soft)]/90 to-transparent">
					<button
						type="button"
						onClick={() => scrollTabs("left")}
						className="w-6 h-6 rounded-md bg-[var(--paper-strong)] border border-[var(--glass-border)] shadow-xs flex items-center justify-center text-[var(--ink)] hover:text-[var(--teal-dark)] hover:border-[var(--teal)] transition-colors cursor-pointer"
						aria-label="Прокрутить вкладки влево"
					>
						<ChevronLeft size={14} />
					</button>
				</div>
			)}

			<div
				ref={tabsRef as any}
				className="dente-filter-chips overflow-x-auto no-scrollbar scroll-smooth px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden w-full flex-nowrap"
			>
				{SPECIALTY_CATEGORIES_META.map((meta) => {
					const isActive = activeCategory === meta.key;
					return (
						<button
							key={meta.key}
							type="button"
							onClick={() => setActiveCategory(meta.key)}
							className={`dente-filter-chip ${isActive ? "active" : ""}`}
							data-testid={`tab-specialty-${meta.key}`}
						>
							<span>{meta.shortLabel}</span>
							<span
								className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
									isActive
										? "bg-white/20 text-inherit"
										: "bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--glass-border)]"
								}`}
							>
								{meta.count}
							</span>
						</button>
					);
				})}
			</div>

			{canScrollRight && (
				<div className="absolute right-1 z-10 flex items-center pl-2 bg-gradient-to-l from-[var(--paper-soft)] via-[var(--paper-soft)]/90 to-transparent">
					<button
						type="button"
						onClick={() => scrollTabs("right")}
						className="w-6 h-6 rounded-md bg-[var(--paper-strong)] border border-[var(--glass-border)] shadow-xs flex items-center justify-center text-[var(--ink)] hover:text-[var(--teal-dark)] hover:border-[var(--teal)] transition-colors cursor-pointer"
						aria-label="Прокрутить вкладки вправо"
					>
						<ChevronRight size={14} />
					</button>
				</div>
			)}
		</div>
	);
}
