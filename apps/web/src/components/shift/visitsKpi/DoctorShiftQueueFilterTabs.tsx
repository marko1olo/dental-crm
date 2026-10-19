import React from "react";

export type QueueFilterId = "all" | "in_chair" | "waiting" | "payment";

export interface DoctorShiftQueueFilterTabsProps {
	readonly queueFilter: QueueFilterId;
	readonly onSelectFilter: (filter: QueueFilterId) => void;
	readonly allCount: number;
	readonly inChairCount: number;
	readonly waitingCount: number;
	readonly paymentCount: number;
}

export const DoctorShiftQueueFilterTabs: React.FC<DoctorShiftQueueFilterTabsProps> = ({
	queueFilter,
	onSelectFilter,
	allCount,
	inChairCount,
	waitingCount,
	paymentCount,
}) => {
	const tabs = [
		{ id: "all" as const, label: `Все (${allCount})` },
		{ id: "in_chair" as const, label: `В кресле (${inChairCount})` },
		{ id: "waiting" as const, label: `Ожидают (${waitingCount})` },
		{ id: "payment" as const, label: `Оплата (${paymentCount})` },
	];

	return (
		<div
			className="dente-queue-strip"
			role="tablist"
			aria-label="Очереди приёмов смены"
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: "4px",
				background: "var(--paper-soft)",
				border: "1px solid var(--line)",
				borderRadius: "10px",
				padding: "3px",
				marginBottom: "12px",
				maxWidth: "100%",
				overflowX: "auto",
			}}
		>
			{tabs.map((tab) => {
				const isActive = queueFilter === tab.id;
				return (
					<button
						key={tab.id}
						type="button"
						role="tab"
						aria-selected={isActive}
						style={{
							fontSize: "12px",
							padding: "5px 12px",
							borderRadius: "7px",
							fontWeight: isActive ? 700 : 500,
							background: isActive ? "var(--paper)" : "transparent",
							color: isActive ? "var(--ink)" : "var(--muted)",
							border: isActive ? "1px solid var(--line)" : "1px solid transparent",
							boxShadow: isActive ? "var(--shadow-1)" : "none",
							cursor: "pointer",
							whiteSpace: "nowrap",
							transition: "all 0.15s ease",
						}}
						onClick={() => onSelectFilter(tab.id)}
					>
						{tab.label}
					</button>
				);
			})}
		</div>
	);
};
