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

	const navSlotClass = collapsed
		? "flex w-full min-w-0 flex-col items-center gap-[0.1875rem] text-center"
		: "flex w-full min-w-0 items-center gap-[0.5rem]";
	const navCaptionClass = collapsed
		? "block max-w-full text-[0.625rem] font-semibold leading-[1.15] truncate"
		: "hidden";

	return (
		<div
			className="sidebar-quick-tools max-w-full shrink-0 flex flex-col gap-[2px] pt-1.5 pb-1 border-t border-[var(--line-subtle,var(--line))]"
			data-testid="sidebar-quick-tools-container"
		>
			<button
				type="button"
				data-testid="sidebar-quick-tasks-btn"
				onClick={handleOpenTasks}
				className="nav-item sidebar-quick-tool-btn"
				title="Клинические задачи: Передача этапов"
				aria-label="Клинические задачи: Передача этапов"
			>
				<span className={navSlotClass}>
					<ClipboardCheck aria-hidden="true" />
					<span className="nav-copy min-w-0 overflow-hidden flex-1">
						<span className="nav-label truncate min-w-0 block">Клинические задачи</span>
						<small className="nav-hint truncate min-w-0 block">Передача этапов</small>
					</span>
					<span className={navCaptionClass}>Задачи</span>
				</span>
			</button>
			<button
				type="button"
				data-testid="sidebar-quick-recalls-btn"
				onClick={handleOpenRecalls}
				className="nav-item sidebar-quick-tool-btn"
				title="Профосмотры: Повторные вызовы"
				aria-label="Профосмотры: Повторные вызовы"
			>
				<span className={navSlotClass}>
					<PhoneCall aria-hidden="true" />
					<span className="nav-copy min-w-0 overflow-hidden flex-1">
						<span className="nav-label truncate min-w-0 block">Профосмотры</span>
						<small className="nav-hint truncate min-w-0 block">Повторные вызовы</small>
					</span>
					<span className={navCaptionClass}>Осмотры</span>
				</span>
			</button>
		</div>
	);
}
