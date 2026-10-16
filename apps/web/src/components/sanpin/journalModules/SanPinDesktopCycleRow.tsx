import React from "react";
import { CheckCircle2, ArrowRight, Layers, ShieldCheck } from "lucide-react";
import type { SanPinCycleEntry } from "./sanpinJournalTypes";

export interface SanPinDesktopCycleRowProps {
	readonly cyc: SanPinCycleEntry;
}

export const SanPinDesktopCycleRow: React.FC<SanPinDesktopCycleRowProps> = ({ cyc }) => {
	const batchCount = cyc.batchSize || cyc.kraftPouchesCount || 25;
	const isPassed = cyc.status === "passed";

	return (
		<tr style={{ borderBottom: "1px solid var(--line-subtle, #f1f5f9)", verticalAlign: "top" }}>
			<td style={{ padding: "10px 12px" }}>
				<div style={{ fontWeight: 600, color: "var(--ink, #1e293b)" }}>{cyc.date}</div>
				<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>{cyc.time} • Цикл №{cyc.cycleNumber}</div>
			</td>
			<td style={{ padding: "10px 12px" }}>
				<div style={{ fontWeight: 600, color: "var(--ink, #1e293b)" }}>{cyc.autoclaveCode}</div>
				<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>{cyc.autoclaveModel}</div>
			</td>
			<td style={{ padding: "10px 12px" }}>
				<div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
					<span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.75rem", fontWeight: 600, color: "var(--teal, #0d9488)", background: "rgba(13, 148, 136, 0.08)", padding: "2px 6px", borderRadius: 4, width: "fit-content" }}>
						<Layers size={11} />{batchCount} наборов
					</span>
					<span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: "0.71875rem", fontWeight: 500, color: "var(--emerald-600, #059669)" }}>
						<ShieldCheck size={11} />Очистка (азопирам): норма
					</span>
				</div>
			</td>
			<td style={{ padding: "10px 12px" }}>
				<div style={{ fontWeight: 600, color: "var(--ink, #1e293b)" }}>{cyc.temperatureC}°C • {cyc.pressureBar} бар</div>
				<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>{cyc.durationMin} мин • {cyc.regimeName}</div>
			</td>
			<td style={{ padding: "10px 12px" }}>
				<div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
					<span style={{ width: 14, height: 14, borderRadius: 3, background: cyc.colorBeforeHex, border: "1px solid rgba(0,0,0,0.15)" }} title={`До цикла: ${cyc.colorBefore}`} />
					<ArrowRight size={11} color="var(--muted, #64748b)" />
					<span style={{ width: 14, height: 14, borderRadius: 3, background: cyc.colorAfterHex, border: "1px solid rgba(0,0,0,0.15)" }} title={`После цикла: ${cyc.colorAfter}`} />
					<span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--ink, #1e293b)" }}>{cyc.indicatorClass} класс (ИнтеТЕСТ)</span>
				</div>
				<div style={{ fontSize: "0.71875rem", color: "var(--emerald-600, #059669)", fontWeight: 500 }}>Норма (100% сработка)</div>
			</td>
			<td style={{ padding: "10px 12px" }}>
				<div style={{ color: "var(--ink, #1e293b)", fontWeight: 500, marginBottom: 2, lineHeight: 1.3 }}>{cyc.itemsSummary}</div>
				{cyc.pouchCodes.length > 0 && <div style={{ fontSize: "0.71875rem", color: "var(--muted, #64748b)" }}>Код: {cyc.pouchCodes.join(", ")}</div>}
			</td>
			<td style={{ padding: "10px 12px" }}>
				<div style={{ fontWeight: 500, color: "var(--ink, #1e293b)" }}>{cyc.operatorName}</div>
			</td>
			<td style={{ padding: "10px 12px", textAlign: "center" }}>
				<span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.75rem", fontWeight: 600, color: isPassed ? "var(--emerald-600, #059669)" : "var(--rose-600, #e11d48)", background: isPassed ? "rgba(16, 185, 129, 0.1)" : "rgba(244, 63, 94, 0.1)", padding: "3px 8px", borderRadius: 12 }}>
					<CheckCircle2 size={12} />{isPassed ? "Стерильно" : "Брак"}
				</span>
			</td>
		</tr>
	);
};
