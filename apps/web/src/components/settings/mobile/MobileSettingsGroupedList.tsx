import React from "react";
import { ChevronRight, Search } from "lucide-react";
import type { SettingGroup } from "./mobileSettingsTypes";

interface MobileSettingsGroupedListProps {
	filteredGroups: SettingGroup[];
	onSelectSection: (sectionId: string) => void;
}

export const MobileSettingsGroupedList: React.FC<MobileSettingsGroupedListProps> = ({
	filteredGroups,
	onSelectSection,
}) => {
	if (filteredGroups.length === 0) {
		return (
			<div className="p-6 text-center rounded-2xl bg-[var(--paper)] border border-[var(--line)]">
				<Search size={28} className="text-[var(--muted)] mx-auto mb-2" />
				<p className="text-[14px] font-semibold text-[var(--ink)]">Ничего не найдено</p>
				<p className="text-[12px] text-[var(--muted)] mt-1">Попробуйте изменить поисковый запрос</p>
			</div>
		);
	}

	return (
		<div className="space-y-5 mt-2 px-4">
			{filteredGroups.map((group) => (
				<div key={group.id} className="space-y-1.5">
					<h2 className="px-2 text-[12px] font-bold uppercase tracking-wider text-[var(--muted)]">
						{group.header}
					</h2>

					<div className="rounded-[16px] bg-[var(--paper)] border border-[var(--line)] overflow-hidden divide-y divide-[var(--line-subtle)] shadow-xs">
						{group.items.map((item) => {
							const Icon = item.icon;
							return (
								<div
									key={item.id}
									onClick={() => onSelectSection(item.id)}
									className="flex items-center justify-between p-3.5 min-h-[54px] active:bg-[var(--paper-soft)] cursor-pointer transition-colors"
									role="button"
									tabIndex={0}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											onSelectSection(item.id);
										}
									}}
									data-testid={`mobile-settings-row-${item.id}`}
								>
									<div className="flex items-center gap-3 min-w-0 pr-2 flex-1">
										<div
											className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
											style={{ backgroundColor: item.iconBg, color: item.iconColor }}
										>
											<Icon size={17} />
										</div>
										<div className="min-w-0 flex-1">
											<h4 className="text-[15px] font-semibold text-[var(--ink)] leading-snug">
												{item.title}
											</h4>
											<p className="text-[12px] text-[var(--muted)] leading-snug mt-0.5">
												{item.subtitle}
											</p>
										</div>
									</div>

									<div className="flex items-center gap-2 shrink-0">
										{item.badge && (
											<span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]">
												{item.badge}
											</span>
										)}
										<ChevronRight size={16} className="text-[var(--muted)] shrink-0" />
									</div>
								</div>
							);
						})}
					</div>
				</div>
			))}
		</div>
	);
};
