import React from "react";
import { humanizeMigrationText } from "../helpers";

export interface MigrationTechnicalNotesProps {
	title: string;
	items: string[];
	testId?: string;
}

export function MigrationTechnicalNotes({
	title,
	items,
	testId,
}: MigrationTechnicalNotesProps) {
	const visibleItems = items.filter(Boolean).slice(0, 8);
	if (!visibleItems.length) return null;

	return (
		<details className="migration-technical-boundary" data-testid={testId}>
			<summary>{title}</summary>
			<div>
				{visibleItems.map((item) => (
					<small key={item}>{humanizeMigrationText(item)}</small>
				))}
			</div>
		</details>
	);
}
