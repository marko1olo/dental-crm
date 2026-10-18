import React, { type ReactElement, useRef, useEffect } from "react";
import {
	type VisitSubViewTab,
	VISIT_MAIN_TAB_ITEMS,
} from "./visitMainTabsModules/visitMainTabDefinitions";
import { VisitMainTabButton } from "./visitMainTabsModules/VisitMainTabButton";

export type { VisitSubViewTab };

export interface VisitMainTabsProps {
	visitSubViewTab: VisitSubViewTab;
	setVisitSubViewTab: (tab: VisitSubViewTab) => void;
}

/**
 * VisitMainTabs component for main navigation tabs in Visit view.
 * Solves 3-Line Text Wrapping on Visit Tabs by utilizing font-size adjustments,
 * padding, text-nowrap, flex shrink-0, and horizontal scrolling
 * for mobile viewports to prevent awkward 3-line vertical button wrapping.
 */
export function VisitMainTabs({
	visitSubViewTab,
	setVisitSubViewTab,
}: VisitMainTabsProps): ReactElement {
	const containerRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!containerRef.current) return;
		const activeTab = containerRef.current.querySelector<HTMLElement>('button[aria-selected="true"]');
		if (activeTab) {
			const container = containerRef.current;
			const tabLeft = activeTab.offsetLeft;
			const tabRight = tabLeft + activeTab.offsetWidth;
			const scrollLeft = container.scrollLeft;
			const clientWidth = container.clientWidth;
			if (tabLeft < scrollLeft) {
				container.scrollTo({ left: tabLeft - 12, behavior: "smooth" });
			} else if (tabRight > scrollLeft + clientWidth) {
				container.scrollTo({ left: tabRight - clientWidth + 12, behavior: "smooth" });
			}
		}
	}, [visitSubViewTab]);

	return (
		<div
			ref={containerRef}
			className="visit-sub-nav-tabs flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar scroll-smooth pb-0.5 px-0.5 w-full min-w-0 touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-h-[40px] sm:min-h-[32px] h-10 sm:h-8"
			style={{
				WebkitOverflowScrolling: "touch",
			}}
			role="tablist"
			aria-label="Разделы визита"
		>
			{VISIT_MAIN_TAB_ITEMS.map((tab) => (
				<VisitMainTabButton
					key={tab.id}
					tab={tab}
					isActive={visitSubViewTab === tab.id}
					onSelect={setVisitSubViewTab}
				/>
			))}
		</div>
	);
}
