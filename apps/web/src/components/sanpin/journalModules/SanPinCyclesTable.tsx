/**
 * apps/web/src/components/sanpin/journalModules/SanPinCyclesTable.tsx
 *
 * Layer 4: Presentation subcomponent - Table of sterilization cycles & pouches.
 * - Displays 134°C, 2.1 bar, 5 min parameters (Mode B).
 * - Chemical indicator 4/5 class visual proof (Beige -> Dark Brown).
 * - Kraft pouch codes chips and sterilization status.
 * - 0 emojis, strict clinical typography (32-36px density).
 */

import React from "react";
import {
	CheckCircle2,
	Thermometer,
	Gauge,
	Timer,
	ArrowRight,
} from "lucide-react";
import type { SanPinCycleEntry } from "./sanpinJournalTypes";

export interface SanPinCyclesTableProps {
	readonly cycles: readonly SanPinCycleEntry[];
	readonly onAutofillShift?: () => void;
	readonly isAutofilling?: boolean;
}

export const SanPinCyclesTable: React.FC<SanPinCyclesTableProps> = ({
	cycles,
	onAutofillShift,
	isAutofilling = false,
}) => {
	return (
		<div
			style={{
				borderRadius: 8,
				border: "1px solid var(--line, #e2e8f0)",
				overflowX: "auto",
				background: "var(--paper, #ffffff)",
			}}
		>
			<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
				<thead>
					<tr style={{ background: "var(--paper-soft, #f8fafc)", borderBottom: "1px solid var(--line, #e2e8f0)" }}>
						<th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Дата / Цикл</th>
						<th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Автоклав</th>
						<th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Параметры цикла</th>
						<th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Химический индикатор (4/5 кл.)</th>
						<th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Крафт-пакеты / Содержимое</th>
						<th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Ответственный</th>
						<th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>Статус</th>
					</tr>
				</thead>
				<tbody>
					{cycles.length === 0 ? (
						<tr>
							<td colSpan={7} style={{ padding: "40px 16px", textAlign: "center" }}>
								<div
									style={{
										maxWidth: 520,
										margin: "0 auto",
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										gap: 12,
									}}
								>
									<div
										style={{
											width: 48,
											height: 48,
											borderRadius: "50%",
											background: "var(--paper-soft, #f1f5f9)",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											color: "var(--muted, #64748b)",
										}}
									>
										<Thermometer size={24} />
									</div>
									<div
										style={{
											fontWeight: 600,
											fontSize: "0.9375rem",
											color: "var(--ink, #1e293b)",
											lineHeight: 1.4,
										}}
									>
										Нет зарегистрированных циклов за выбранный период. Запустите цикл стерилизации или выполните автозаполнение смены
									</div>
									<div style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)", lineHeight: 1.4 }}>
										СанПиН 3.3686-21 (Форма 257/у): режим B 134°C / 2.1 бар / 5 мин, химические индикаторы 5 класса и контроль предстерилизационной очистки (азопирам).
									</div>
									{onAutofillShift && (
										<button
											type="button"
											onClick={onAutofillShift}
											disabled={isAutofilling}
											style={{
												marginTop: 4,
												display: "inline-flex",
												alignItems: "center",
												gap: 6,
												height: 36,
												padding: "0 16px",
												borderRadius: 6,
												fontSize: "0.8125rem",
												fontWeight: 600,
												background: "var(--teal, #0d9488)",
												color: "#ffffff",
												border: "none",
												cursor: isAutofilling ? "wait" : "pointer",
												opacity: isAutofilling ? 0.7 : 1,
												boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
											}}
										>
											<CheckCircle2 size={16} />
											<span>{isAutofilling ? "Заполнение смены..." : "Автозаполнение смены (134°C / 2.1 бар)"}</span>
										</button>
									)}
								</div>
							</td>
						</tr>
					) : (
						cycles.map((cyc) => (
							<tr
								key={cyc.id}
								style={{
									borderBottom: "1px solid var(--line-subtle, #f1f5f9)",
									verticalAlign: "top",
								}}
							>
								{/* Date & Cycle */}
								<td style={{ padding: "10px 12px" }}>
									<div style={{ fontWeight: 600, color: "var(--ink, #1e293b)" }}>{cyc.date}</div>
									<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
										{cyc.time} • Цикл №{cyc.cycleNumber}
									</div>
								</td>

								{/* Autoclave */}
								<td style={{ padding: "10px 12px" }}>
									<div style={{ fontWeight: 600, color: "var(--ink, #1e293b)" }}>{cyc.autoclaveCode}</div>
									<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>{cyc.autoclaveModel}</div>
								</td>

								{/* Regime Parameters */}
								<td style={{ padding: "10px 12px" }}>
									<div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
										<Thermometer size={13} style={{ color: "var(--primary, #0284c7)" }} />
										<span>{cyc.temperatureC}°C</span>
										<span style={{ color: "var(--line, #cbd5e1)" }}>|</span>
										<Gauge size={13} style={{ color: "var(--primary, #0284c7)" }} />
										<span>{cyc.pressureBar} бар</span>
										<span style={{ color: "var(--line, #cbd5e1)" }}>|</span>
										<Timer size={13} style={{ color: "var(--primary, #0284c7)" }} />
										<span>{cyc.durationMin} мин</span>
									</div>
									<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", marginTop: 2 }}>
										{cyc.regimeName}
									</div>
								</td>

								{/* Chemical Indicator Visual Proof */}
								<td style={{ padding: "10px 12px" }}>
									<div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
										<div
											title={`До: ${cyc.colorBefore}`}
											style={{
												width: 14,
												height: 14,
												borderRadius: "50%",
												background: cyc.colorBeforeHex,
												border: "1px solid rgba(0,0,0,0.15)",
											}}
										/>
										<ArrowRight size={12} style={{ color: "var(--muted, #64748b)" }} />
										<div
											title={`После: ${cyc.colorAfter} (Норма)`}
											style={{
												width: 14,
												height: 14,
												borderRadius: "50%",
												background: cyc.colorAfterHex,
												border: "1px solid rgba(0,0,0,0.25)",
											}}
										/>
										<span style={{ fontWeight: 600, fontSize: "0.75rem", color: "var(--emerald-600, #059669)" }}>
											{cyc.colorAfter} (Норма)
										</span>
									</div>
									<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
										Индикатор {cyc.indicatorClass} класса (химический интегратор)
									</div>
								</td>

								{/* Pouch Codes & Items */}
								<td style={{ padding: "10px 12px", maxWidth: 280 }}>
									<div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
										{cyc.pouchCodes.map((code) => (
											<span
												key={code}
												style={{
													display: "inline-block",
													padding: "1px 6px",
													borderRadius: 4,
													fontSize: "0.75rem",
													fontFamily: "monospace",
													fontWeight: 600,
													background: "var(--paper-soft, #f1f5f9)",
													border: "1px solid var(--line, #cbd5e1)",
													color: "var(--ink, #1e293b)",
												}}
											>
												{code}
											</span>
										))}
									</div>
									<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", lineHeight: 1.3 }}>
										{cyc.itemsSummary}
									</div>
								</td>

								{/* Operator */}
								<td style={{ padding: "10px 12px" }}>
									<div style={{ fontSize: "0.8125rem", color: "var(--ink, #1e293b)" }}>{cyc.operatorName}</div>
								</td>

								{/* Status */}
								<td style={{ padding: "10px 12px", textAlign: "center" }}>
									<span
										style={{
											display: "inline-flex",
											alignItems: "center",
											gap: 4,
											padding: "3px 8px",
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
								</td>
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
};
