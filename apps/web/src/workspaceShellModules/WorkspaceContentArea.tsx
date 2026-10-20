import type React from "react";
import type { WorkspaceContentAreaProps } from "./types";

/**
 * WorkspaceContentArea — канонический контейнер рабочей области CRM.
 * Гарантирует изоляцию скролла, стабильную геометрию без CLS (CLS = 0)
 * и защиту от паразитного горизонтального переполнения.
 */
export function WorkspaceContentArea({
	currentView,
	children,
	className = "",
}: WorkspaceContentAreaProps) {
	return (
		<main
			role="main"
			aria-label="Рабочая область"
			tabIndex={-1}
			id="workspace-content-area"
			data-view={currentView}
			className={`workspace-content-area flex-1 min-h-0 w-full max-w-full overflow-y-auto overflow-x-clip relative outline-none bg-[var(--paper)] text-[var(--ink)] ${className}`}
		>
			{children}
		</main>
	);
}
