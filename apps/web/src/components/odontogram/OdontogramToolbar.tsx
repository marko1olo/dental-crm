import React from "react";
import type { ToothStatus } from "../../store/patientStore";
import { STATUS_COLORS, STATUS_OPTIONS } from "./OdontogramConstants";

interface OdontogramToolbarProps {
	multiSelectMode: boolean;
	setMultiSelectMode: React.Dispatch<React.SetStateAction<boolean>>;
	selectedTeeth: Set<number>;
	setSelectedTeeth: React.Dispatch<React.SetStateAction<Set<number>>>;
	bulkMenuOpen: boolean;
	setBulkMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	setRadialMenuOpen: React.Dispatch<React.SetStateAction<number | null>>;
	applyBulkStatus: (status: ToothStatus) => void;
}

export function OdontogramToolbar({
	multiSelectMode,
	setMultiSelectMode,
	selectedTeeth,
	setSelectedTeeth,
	bulkMenuOpen,
	setBulkMenuOpen,
	setRadialMenuOpen,
	applyBulkStatus,
}: OdontogramToolbarProps) {
	return (
		<div
			style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				flexWrap: "wrap",
				gap: "12px",
			}}
		>
			<h3
				style={{
					margin: 0,
					color: "var(--ink)",
					fontSize: "19px",
					fontWeight: 700,
				}}
			>
				Зубная формула
			</h3>

			<div
				style={{
					display: "flex",
					gap: "10px",
					flexWrap: "wrap",
					alignItems: "center",
				}}
			>
				{/* Multi-select toggle */}
				<button
					onClick={() => {
						setMultiSelectMode((m) => !m);
						setSelectedTeeth(new Set());
						setBulkMenuOpen(false);
						setRadialMenuOpen(null);
					}}
					style={{
						padding: "6px 14px",
						borderRadius: "8px",
						border: `1.5px solid ${multiSelectMode ? "var(--teal)" : "var(--line)"}`,
						background: multiSelectMode ? "var(--teal-soft)" : "var(--paper)",
						color: multiSelectMode ? "var(--teal-dark)" : "var(--ink)",
						fontSize: "13px",
						fontWeight: 700,
						cursor: "pointer",
						transition: "all 0.15s",
						display: "flex",
						alignItems: "center",
						gap: "6px",
					}}
				>
					<span>
						{multiSelectMode ? "✓ Групповой выбор" : "☐ Групповой выбор"}
					</span>
					{multiSelectMode && selectedTeeth.size > 0 && (
						<span
							style={{
								background: "var(--teal)",
								color: "#fff",
								borderRadius: "9999px",
								padding: "1px 7px",
								fontSize: "11px",
								fontWeight: 800,
							}}
						>
							{selectedTeeth.size}
						</span>
					)}
				</button>

				{/* Apply to selected */}
				{multiSelectMode && selectedTeeth.size > 0 && (
					<div style={{ position: "relative" }}>
						<button
							onClick={() => setBulkMenuOpen((m) => !m)}
							style={{
								padding: "6px 14px",
								borderRadius: "8px",
								background:
									"linear-gradient(135deg, var(--teal-dark), var(--teal))",
								border: "none",
								color: "#fff",
								fontSize: "13px",
								fontWeight: 700,
								cursor: "pointer",
								boxShadow: "0 0 18px var(--teal-glow)",
								transition: "opacity 0.15s",
							}}
						>
							Применить к {selectedTeeth.size} зубам ▾
						</button>

						{bulkMenuOpen && (
							<div
								style={{
									position: "absolute",
									top: "110%",
									right: 0,
									background: "var(--paper)",
									border: "1px solid var(--line)",
									borderRadius: "10px",
									boxShadow: "0 16px 40px rgba(0,0,0,0.12)",
									zIndex: 100,
									minWidth: "180px",
									overflow: "hidden",
									animation: "popIn 0.15s ease",
								}}
							>
								{STATUS_OPTIONS.map((opt) => (
									<button
										key={opt}
										onClick={() => applyBulkStatus(opt)}
										style={{
											width: "100%",
											textAlign: "left",
											padding: "9px 14px",
											background: "none",
											border: "none",
											cursor: "pointer",
											fontSize: "13px",
											fontWeight: 600,
											color: "var(--ink)",
											display: "flex",
											alignItems: "center",
											gap: "10px",
											transition: "background 0.12s",
											borderBottom: "1px solid var(--line)",
										}}
										onMouseEnter={(e) =>
											(e.currentTarget.style.background = "var(--paper-soft)")
										}
										onMouseLeave={(e) =>
											(e.currentTarget.style.background = "none")
										}
									>
										<span
											style={{
												width: "14px",
												height: "14px",
												borderRadius: "50%",
												background: STATUS_COLORS[opt],
												border: "1px solid var(--muted)",
												flexShrink: 0,
											}}
										/>
										{opt}
									</button>
								))}
							</div>
						)}
					</div>
				)}

				{/* Legend */}
				<div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
					{STATUS_OPTIONS.map((s) => (
						<div
							key={s}
							style={{
								display: "flex",
								alignItems: "center",
								gap: "5px",
								fontSize: "12px",
								fontWeight: 600,
								color: "var(--muted)",
							}}
						>
							<div
								style={{
									width: "12px",
									height: "12px",
									borderRadius: "50%",
									background: STATUS_COLORS[s],
									border: "1px solid var(--muted)",
								}}
							/>
							{s}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
