/**
 * DocumentGridEmptyState.tsx
 * Clean empty state for document templates catalog.
 * Mandate 8b: Single responsibility, strict line limit.
 */

import { FileText } from "lucide-react";
import React from "react";

export interface DocumentGridEmptyStateProps {
	readonly searchQuery: string;
}

export const DocumentGridEmptyState: React.FC<DocumentGridEmptyStateProps> = ({
	searchQuery,
}) => {
	return (
		<div className="flex flex-col items-center justify-center p-8 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] text-center my-4">
			<FileText size={32} className="text-[var(--muted,#64748b)] mb-2" />
			<h4 className="text-sm font-bold text-[var(--ink,#0f172a)] mb-1">
				Шаблоны не найдены
			</h4>
			<p className="text-xs text-[var(--muted,#64748b)]">
				По запросу «{searchQuery}» ничего не найдено. Проверьте запрос или
				переключите категорию.
			</p>
		</div>
	);
};
