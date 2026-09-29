import { RefreshCw, Zap } from "lucide-react";
import React from "react";

export interface BactericidalFleetGridProps {
	readonly equipments: any[];
	readonly onPreShift30Min: (id: string) => void;
	readonly onReplaceLamps: (id: string, brand: string) => void;
	readonly submitting: boolean;
}

export function BactericidalFleetGrid({
	equipments,
	onPreShift30Min,
	onReplaceLamps,
	submitting,
}: BactericidalFleetGridProps) {
	return (
		<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
			{equipments.map((eq) => {
				const fillClass =
					eq.lampStatus === "expired_replace_now"
						? "expired"
						: eq.lampStatus === "warning_replace_soon"
							? "warning"
							: "normal";

				return (
					<div
						key={eq.id}
						style={{
							padding: "1rem",
							borderRadius: "0.5rem",
							border: `1px solid ${eq.lampStatus === "expired_replace_now" ? "rgba(239,68,68,0.5)" : "var(--glass-border)"}`,
							background: "var(--paper-subtle)",
							display: "flex",
							flexDirection: "column",
							gap: "0.5rem",
						}}
					>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
							<div>
								<div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{eq.deviceBrand}</div>
								<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
									{eq.roomName} (V = {eq.roomVolumeM3} м³)
								</div>
							</div>
							<span
								className={`sanpin-tag sanpin-tag-${fillClass === "expired" ? "danger" : fillClass === "warning" ? "warning" : "success"}`}
							>
								{fillClass === "expired" ? "РЕСУРС ИСЧЕРПАН" : fillClass === "warning" ? "СКОРО ЗАМЕНА" : "НОРМА"}
							</span>
						</div>

						<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
							Зав. №: <strong style={{ color: "var(--ink)" }}>{eq.serialNumber}</strong> | Лампы: {eq.lampType} ({eq.lampCount} шт.)
						</div>

						{/* Progress Bar of Operating Hours */}
						<div>
							<div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
								<span>
									Наработка: <strong>{eq.totalOperatingHours} ч</strong>
								</span>
								<span>
									Лимит: <strong>{eq.maxLampHours} ч</strong>
								</span>
							</div>
							<div className="sanpin-progress-track">
								<div
									className={`sanpin-progress-fill ${fillClass}`}
									style={{ width: `${Math.min(100, (eq.totalOperatingHours / eq.maxLampHours) * 100)}%` }}
								/>
							</div>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									fontSize: "0.725rem",
									marginTop: "0.25rem",
									color: "var(--muted)",
								}}
							>
								<span>
									Остаток ресурса: <strong>{eq.remainingLampHours} ч</strong> ({eq.remainingLampPercent}%)
								</span>
								{eq.lastLampReplacementDate && <span>Замена: {eq.lastLampReplacementDate}</span>}
							</div>
						</div>

						{eq.lampWarningMessage && (
							<div
								style={{
									fontSize: "0.75rem",
									color: eq.isLampCritical ? "#ef4444" : "#f59e0b",
									fontWeight: 600,
								}}
							>
								{eq.lampWarningMessage}
							</div>
						)}

						<div
							style={{
								marginTop: "auto",
								paddingTop: "0.5rem",
								display: "flex",
								justifyContent: "flex-end",
								gap: "0.4rem",
								flexWrap: "wrap",
							}}
						>
							<button
								type="button"
								onClick={() => onPreShift30Min(eq.id)}
								aria-busy={submitting}
								style={{
									minHeight: "44px",
									fontSize: "0.85rem",
									padding: "0.45rem 0.85rem",
									display: "inline-flex",
									alignItems: "center",
									gap: "0.35rem",
									color: "var(--teal, #0d9488)",
									borderColor: "var(--teal, #0d9488)",
									fontWeight: 600,
									opacity: submitting ? 0.7 : 1,
								}}
								className="sanpin-btn sanpin-btn-secondary touch-manipulation"
								title="Включить этот аппарат на 30 мин перед сменой (предоперационная подготовка кабинета)"
								data-testid={`bactericidal-card-quick-30min-${eq.id}`}
							>
								<Zap size={15} /> 30 мин перед сменой
							</button>
							<button
								type="button"
								onClick={() => onReplaceLamps(eq.id, eq.deviceBrand)}
								style={{
									minHeight: "44px",
									fontSize: "0.85rem",
									padding: "0.45rem 0.85rem",
									display: "inline-flex",
									alignItems: "center",
									gap: "0.35rem",
								}}
								className="sanpin-btn sanpin-btn-secondary touch-manipulation"
							>
								<RefreshCw size={15} /> Замена ламп (сброс)
							</button>
						</div>
					</div>
				);
			})}
		</div>
	);
}
