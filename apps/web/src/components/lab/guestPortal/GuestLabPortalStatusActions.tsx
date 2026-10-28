import React from "react";
import { CheckCircle2, Clock, RefreshCcw, Truck } from "lucide-react";

export interface GuestLabPortalStatusActionsProps {
	readonly currentStatus: string;
	readonly isUpdating: boolean;
	readonly onUpdateStatus: (newStatus: string, comments?: string) => void;
}

export function GuestLabPortalStatusActions({
	currentStatus,
	isUpdating,
	onUpdateStatus,
}: GuestLabPortalStatusActionsProps): React.JSX.Element {
	const btnStyle: React.CSSProperties = {
		flex: "1 1 140px",
		minHeight: "44px",
		padding: "10px 14px",
		fontWeight: 600,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		gap: "6px",
		borderRadius: "8px",
	};

	return (
		<div className="guest-portal-actions">
			<h3
				style={{
					fontSize: "14px",
					fontWeight: "600",
					color: "var(--text-secondary)",
					marginBottom: "8px",
					textAlign: "left",
				}}
			>
				Управление статусом заказа
			</h3>

			<div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
				<button
					type="button"
					data-testid="btn-status-in-progress"
					onClick={() => { if (!isUpdating) onUpdateStatus("in_progress"); }}
					aria-busy={isUpdating}
					aria-pressed={currentStatus === "in_progress"}
					className={`secondary-button ${currentStatus === "in_progress" ? "active" : ""}`}
					style={btnStyle}
				>
					<Clock size={16} />
					<span>Взять в работу</span>
				</button>

				<button
					type="button"
					data-testid="btn-status-ready"
					onClick={() => { if (!isUpdating) onUpdateStatus("shipped", "Работа готова"); }}
					aria-busy={isUpdating}
					className="secondary-button"
					style={btnStyle}
				>
					<CheckCircle2 size={16} />
					<span>Работа готова</span>
				</button>

				<button
					type="button"
					data-testid="btn-status-shipped"
					onClick={() => { if (!isUpdating) onUpdateStatus("shipped", "Отправлено курьером в клинику"); }}
					aria-busy={isUpdating}
					aria-pressed={currentStatus === "shipped"}
					className={`secondary-button ${currentStatus === "shipped" ? "active" : ""}`}
					style={btnStyle}
				>
					<Truck size={16} />
					<span>Отправлено курьером</span>
				</button>

				<button
					type="button"
					data-testid="btn-status-refitting"
					onClick={() => { if (!isUpdating) onUpdateStatus("refitting", "На переделке"); }}
					aria-busy={isUpdating}
					aria-pressed={currentStatus === "refitting"}
					className={`secondary-button ${currentStatus === "refitting" ? "active" : ""}`}
					style={btnStyle}
				>
					<RefreshCcw size={16} />
					<span>На переделке</span>
				</button>
			</div>
		</div>
	);
}
