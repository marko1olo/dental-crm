import React from "react";

export interface ClinicalTasksFilterStripProps {
	readonly filterStatus: "open" | "completed" | "all";
	readonly onSelectFilterStatus: (status: "open" | "completed" | "all") => void;
	readonly openCount: number;
	readonly closedCount: number;
	readonly totalCount: number;
}

export const ClinicalTasksFilterStrip: React.FC<ClinicalTasksFilterStripProps> = ({
	filterStatus,
	onSelectFilterStatus,
	openCount,
	closedCount,
	totalCount,
}) => {
	const items = [
		{ id: "open" as const, label: `К исполнению (${openCount})` },
		{ id: "completed" as const, label: `Выполнено (${closedCount})` },
		{ id: "all" as const, label: `Все (${totalCount})` },
	];

	return (
		<div
			className="clinical-tasks-toolbar"
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				height: "36px",
				marginBottom: "0.5rem",
				gap: "0.5rem",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
				{items.map((item) => {
					const isActive = filterStatus === item.id;
					return (
						<button
							key={item.id}
							type="button"
							className="secondary-button"
							onClick={() => onSelectFilterStatus(item.id)}
							style={{
								height: "30px",
								fontSize: "0.8rem",
								padding: "0 0.6rem",
								borderRadius: "6px",
								background: isActive ? "var(--teal, #0284c7)" : "var(--paper-soft, #f1f5f9)",
								color: isActive ? "var(--on-teal, #ffffff)" : "var(--ink, #1e293b)",
								border: "1px solid var(--line, #e2e8f0)",
								fontWeight: isActive ? 600 : 400,
								cursor: "pointer",
							}}
						>
							{item.label}
						</button>
					);
				})}
			</div>
		</div>
	);
};
