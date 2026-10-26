import { ClipboardCheck, PhoneCall } from "lucide-react";
import React from "react";

export interface SidebarQuickToolsProps {
	readonly collapsed?: boolean;
}

export function SidebarQuickTools({ collapsed = false }: SidebarQuickToolsProps) {
	const handleOpenTasks = () => {
		window.dispatchEvent(new CustomEvent("dente:open-clinical-tasks"));
	};

	const handleOpenRecalls = () => {
		window.dispatchEvent(new CustomEvent("dente:open-recalls-hub"));
	};

	if (collapsed) {
		return (
			<div
				className="sidebar-quick-tools max-w-full shrink-0 flex flex-col items-center justify-center gap-1.5 px-1 py-2 border-t border-[var(--line-subtle,var(--line))]"
				data-testid="sidebar-quick-tools-container"
			>
				<button
					type="button"
					data-testid="sidebar-quick-tasks-btn"
					onClick={handleOpenTasks}
					className="sidebar-quick-tool-btn sidebar-quick-tool-btn--collapsed flex items-center justify-center w-9 h-9 min-w-[36px] min-h-[36px] mx-auto rounded-lg transition-all cursor-pointer"
					title="Клинические задачи (передача этапов)"
					aria-label="Клинические задачи (передача этапов)"
				>
					<ClipboardCheck size={16} className="text-[var(--teal,#0d9488)] shrink-0" aria-hidden="true" />
				</button>
				<button
					type="button"
					data-testid="sidebar-quick-recalls-btn"
					onClick={handleOpenRecalls}
					className="sidebar-quick-tool-btn sidebar-quick-tool-btn--collapsed flex items-center justify-center w-9 h-9 min-w-[36px] min-h-[36px] mx-auto rounded-lg transition-all cursor-pointer"
					title="Профосмотры и повторные вызовы"
					aria-label="Профосмотры и повторные вызовы"
				>
					<PhoneCall size={16} className="text-[var(--teal-dark,#0f766e)] dark:text-[var(--teal,#2dd4bf)] shrink-0" aria-hidden="true" />
				</button>
			</div>
		);
	}

	return (
		<div
			className="sidebar-quick-tools max-w-full shrink-0 flex flex-col gap-1 px-1.5 py-2 border-t border-[var(--line-subtle,var(--line))] max-[860px]:hidden"
			data-testid="sidebar-quick-tools-container"
		>
			<button
				type="button"
				data-testid="sidebar-quick-tasks-btn"
				onClick={handleOpenTasks}
				className="sidebar-quick-tool-btn sidebar-quick-tool-btn--expanded flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] transition-all cursor-pointer"
				title="Клинические задачи передачи этапов"
			>
				<ClipboardCheck size={15} className="text-[var(--teal,#0d9488)] shrink-0" aria-hidden="true" />
				<span className="truncate whitespace-nowrap">Клинические задачи</span>
			</button>
			<button
				type="button"
				data-testid="sidebar-quick-recalls-btn"
				onClick={handleOpenRecalls}
				className="sidebar-quick-tool-btn sidebar-quick-tool-btn--expanded flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] transition-all cursor-pointer"
				title="Профосмотры и повторные вызовы"
			>
				<PhoneCall size={15} className="text-[var(--teal-dark,#0f766e)] dark:text-[var(--teal,#2dd4bf)] shrink-0" aria-hidden="true" />
				<span className="truncate whitespace-nowrap">Профосмотры</span>
			</button>
		</div>
	);
}
