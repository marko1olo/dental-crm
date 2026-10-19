import {
	type DentalLabWorkflowOrder,
	LAB_WORKFLOW_STATUSES,
} from "../dentalLabWorkflowEngine";

export function DentalLabOrderStageHistory({
	order,
}: {
	readonly order: DentalLabWorkflowOrder;
}) {
	return (
		<div>
			<h4 style={{ margin: "0 0 6px 0", fontSize: "12px", fontWeight: 700 }}>
				История статусов:
			</h4>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "6px",
					fontSize: "11px",
				}}
			>
				{order.stageHistory.map((hist) => (
					<div
						key={`${hist.stage}-${hist.timestampIso}-${hist.authorName}`}
						style={{
							borderLeft: "2px solid var(--teal, #0d9488)",
							paddingLeft: "8px",
						}}
					>
						<span style={{ fontWeight: 700 }}>
							{LAB_WORKFLOW_STATUSES[hist.stage]?.nameRu || hist.stage}
						</span>
						<span style={{ color: "var(--muted, #64748b)", marginLeft: "8px" }}>
							{hist.timestampIso.slice(0, 16).replace("T", " ")} (
							{hist.authorName})
						</span>
						{hist.note && (
							<div style={{ color: "var(--muted, #64748b)" }}>{hist.note}</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
