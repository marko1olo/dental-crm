/**
 * apps/web/src/components/sanpin/journalModules/SanPinMobileCyclesCards.tsx
 *
 * Layer 4: Mobile presentation subcomponent for SanPin Sterilization Journal.
 * - Apple iOS HIG Grouped Cards (390x844).
 * - Touch targets >= 48px, tabular-nums.
 * - Floating Bottom Bar for quick batch creation and PSO norm.
 * - 0 emojis, strict clinical typography.
 */

import React from "react";
import {
	CheckCircle2,
	Thermometer,
	Gauge,
	Timer,
	ArrowRight,
	Layers,
	ShieldCheck,
} from "lucide-react";
import type { SanPinCycleEntry } from "./sanpinJournalTypes";

export interface SanPinMobileCyclesCardsProps {
	readonly cycles: readonly SanPinCycleEntry[];
	readonly onAutofillShift?: (() => void) | undefined;
	readonly isAutofilling?: boolean | undefined;
	readonly onQuickBatchNorm?: ((batchSize: number, regime: "134" | "121") => void) | undefined;
	readonly onQuickPsoNorm?: (() => void) | undefined;
}

export const SanPinMobileCyclesCards: React.FC<SanPinMobileCyclesCardsProps> = ({
	cycles,
	onAutofillShift,
	isAutofilling = false,
	onQuickBatchNorm,
	onQuickPsoNorm,
}) => {
	return (
		<div className="sanpin-mobile-cards-wrapper" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
			{cycles.length === 0 ? (
				<div
					style={{
						padding: 24,
						textAlign: "center",
						background: "var(--paper, #fff)",
						borderRadius: 16,
						border: "1px solid var(--line, #e2e8f0)",
					}}
				>
					<p style={{ fontWeight: 600, color: "var(--ink, #1e293b)", marginBottom: 8 }}>Нет циклов за период</p>
					{onAutofillShift && (
						<button
							type="button"
							onClick={onAutofillShift}
							disabled={isAutofilling}
							style={{
								height: 48,
								width: "100%",
								borderRadius: 10,
								fontWeight: 600,
								background: "var(--teal, #0d9488)",
								color: "#fff",
								border: "none",
								cursor: isAutofilling ? "wait" : "pointer",
							}}
						>
							{isAutofilling ? "Заполнение..." : "Заполнить смену по нормам"}
						</button>
					)}
				</div>
			) : (
				cycles.map((cyc) => (
					<div
						key={`mob-${cyc.id}`}
						style={{
							background: "var(--paper, #ffffff)",
							borderRadius: 14,
							border: "1px solid var(--line, #e2e8f0)",
							padding: "12px 14px",
							display: "flex",
							flexDirection: "column",
							gap: 8,
							fontVariantNumeric: "tabular-nums",
							boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
						}}
					>
						{/* Header: Autoclave & Status */}
						<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
							<div>
								<span style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--ink, #1e293b)" }}>
									{cyc.autoclaveCode}
								</span>
								<span style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)", marginLeft: 6 }}>
									{cyc.autoclaveModel}
								</span>
							</div>
							<span
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: 4,
									padding: "2px 8px",
									borderRadius: 12,
									fontSize: "0.75rem",
									fontWeight: 600,
									background: "rgba(16, 185, 129, 0.12)",
									color: "var(--emerald-600, #059669)",
									border: "1px solid rgba(16, 185, 129, 0.25)",
								}}
							>
								<CheckCircle2 size={12} />
								<span>Стерильно</span>
							</span>
						</div>

						{/* Date, Time, Batch & PSO */}
						<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
							<div style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
								{cyc.date} • {cyc.time} • Цикл №{cyc.cycleNumber}
							</div>
							<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
								<span
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: 4,
										fontSize: "0.75rem",
										fontWeight: 600,
										color: "var(--teal, #0d9488)",
										background: "rgba(13, 148, 136, 0.08)",
										padding: "2px 6px",
										borderRadius: 4,
									}}
								>
									<Layers size={11} />
									<span>{cyc.batchSize || cyc.kraftPouchesCount || 25} лотков</span>
								</span>
								<span
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: 4,
										fontSize: "0.75rem",
										color: "var(--emerald-600, #059669)",
										fontWeight: 600,
										background: "rgba(16, 185, 129, 0.08)",
										padding: "2px 6px",
										borderRadius: 4,
									}}
								>
									<ShieldCheck size={11} />
									<span>ПСО: Норма</span>
								</span>
							</div>
						</div>

						{/* Parameters & Indicator Proof */}
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								padding: "6px 10px",
								background: "var(--paper-soft, #f8fafc)",
								borderRadius: 8,
								border: "1px solid var(--line-subtle, #f1f5f9)",
							}}
						>
							<div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 600, fontSize: "0.8125rem" }}>
								<Thermometer size={13} style={{ color: "var(--primary, #0284c7)" }} />
								<span>{cyc.temperatureC}°C</span>
								<span style={{ color: "var(--line, #cbd5e1)" }}>•</span>
								<Gauge size={13} style={{ color: "var(--primary, #0284c7)" }} />
								<span>{cyc.pressureBar} бар</span>
								<span style={{ color: "var(--line, #cbd5e1)" }}>•</span>
								<Timer size={13} style={{ color: "var(--primary, #0284c7)" }} />
								<span>{cyc.durationMin} мин</span>
							</div>

							<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
								<div
									title={`До: ${cyc.colorBefore}`}
									style={{
										width: 12,
										height: 12,
										borderRadius: "50%",
										background: cyc.colorBeforeHex,
										border: "1px solid rgba(0,0,0,0.15)",
									}}
								/>
								<ArrowRight size={10} style={{ color: "var(--muted, #64748b)" }} />
								<div
									title={`После: ${cyc.colorAfter}`}
									style={{
										width: 12,
										height: 12,
										borderRadius: "50%",
										background: cyc.colorAfterHex,
										border: "1px solid rgba(0,0,0,0.25)",
									}}
								/>
								<span style={{ fontWeight: 600, fontSize: "0.6875rem", color: "var(--emerald-600, #059669)" }}>
									{cyc.colorAfter} (Норма)
								</span>
							</div>
						</div>

						{/* Pouches and Operator */}
						<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem" }}>
							<div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
								{cyc.pouchCodes.map((code) => (
									<span
										key={`mob-${code}`}
										style={{
											fontFamily: "monospace",
											fontWeight: 600,
											color: "var(--ink, #1e293b)",
											background: "var(--paper-soft, #f1f5f9)",
											padding: "1px 5px",
											borderRadius: 4,
										}}
									>
										{code}
									</span>
								))}
							</div>
							<div style={{ color: "var(--muted, #64748b)" }}>{cyc.operatorName}</div>
						</div>
					</div>
				))
			)}

			{/* Floating Bottom Bar (Natural Thumb Zone) */}
			{(onQuickBatchNorm || onQuickPsoNorm) && (
				<div className="sanpin-mobile-bottom-bar">
					{onQuickBatchNorm && (
						<button
							type="button"
							onClick={() => onQuickBatchNorm(25, "134")}
							disabled={isAutofilling}
							style={{
								flex: 1,
								height: 48,
								borderRadius: 10,
								border: "1px solid var(--teal, #0d9488)",
								background: "var(--teal, #0d9488)",
								color: "#ffffff",
								fontSize: "0.8125rem",
								fontWeight: 600,
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								gap: 6,
								cursor: isAutofilling ? "wait" : "pointer",
							}}
						>
							<Layers size={16} />
							<span>+ Партия 134°C (25 лотков)</span>
						</button>
					)}
					{onQuickPsoNorm && (
						<button
							type="button"
							onClick={onQuickPsoNorm}
							disabled={isAutofilling}
							style={{
								height: 48,
								padding: "0 14px",
								borderRadius: 10,
								border: "1px solid rgba(16, 185, 129, 0.3)",
								background: "rgba(16, 185, 129, 0.12)",
								color: "var(--emerald-600, #059669)",
								fontSize: "0.8125rem",
								fontWeight: 600,
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								gap: 6,
								cursor: isAutofilling ? "wait" : "pointer",
							}}
						>
							<ShieldCheck size={16} />
							<span>✓ ПСО Норма</span>
						</button>
					)}
				</div>
			)}
		</div>
	);
};
