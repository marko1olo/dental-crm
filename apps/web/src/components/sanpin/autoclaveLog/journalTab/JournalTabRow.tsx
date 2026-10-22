import React from "react";
import { CheckCircle2, Trash2, UserCheck, XCircle } from "lucide-react";
import type { Form257Record } from "../autoclaveLogEngine.js";

export interface JournalTabRowProps {
	readonly record: Form257Record;
	readonly headNurseName?: string | undefined;
	readonly onVerify?: ((id: string, headNurseName: string) => void) | undefined;
	readonly onDelete?: ((id: string) => void) | undefined;
}

export const JournalTabRow: React.FC<JournalTabRowProps> = ({ record, headNurseName, onVerify, onDelete }) => {
	const ptPassedCount = record.chamberPoints.filter((p) => p.status === "passed").length;
	return (
		<tr className="sanpin-log-row" style={{ minHeight: "44px", contentVisibility: "auto", containIntrinsicSize: "1px 44px", contain: "content" }}>
			<td>
				<div style={{ fontWeight: 700 }}>{record.date}</div>
				<div style={{ fontSize: "0.75rem", color: "var(--teal, #0d9488)", fontWeight: 600 }}>Цикл #{record.cycleNumber}</div>
				<div style={{ fontSize: "0.6875rem", color: "var(--muted, #64748b)" }}>{record.id}</div>
			</td>
			<td>
				<div style={{ fontWeight: 600 }}>{record.sterilizerCode}</div>
				<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>{record.sterilizerBrandModel}</div>
			</td>
			<td style={{ maxWidth: "260px" }}>
				<div style={{ fontWeight: 500, lineHeight: 1.3 }}>{record.itemsDescriptionRu}</div>
			</td>
			<td>
				<div style={{ fontWeight: 600 }}>{record.packsCount} упак.</div>
				<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>{record.packagingNameRu}</div>
				{record.bixNumber && <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--teal, #0d9488)" }}>{record.bixNumber}</div>}
			</td>
			<td>
				<div style={{ fontWeight: 600 }}>{record.actualTemperatureCelsius}°C • {record.actualPressureBar} бар</div>
				<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>Выдержка: {record.actualExposureMinutes} мин</div>
			</td>
			<td>
				<div style={{ display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "2px" }}>
					{record.chamberPoints.map((pt) => (
						<span key={pt.pointIndex} title={`${pt.code}: ${pt.status === "passed" ? "ОК" : "БРАК"}`} style={{ width: "12px", height: "12px", borderRadius: "50%", background: pt.status === "passed" ? "#10b981" : "#ef4444", display: "inline-block" }} />
					))}
				</div>
				<div style={{ fontSize: "0.6875rem", color: "var(--muted, #64748b)" }}>{ptPassedCount}/5 точек ОК ({record.chemicalIndicatorNameRu})</div>
			</td>
			<td>
				{record.isCyclePassed ? (
					<span className="status-badge passed"><CheckCircle2 size={13} />СТЕРИЛЬНО</span>
				) : (
					<span className="status-badge failed"><XCircle size={13} />БРАК</span>
				)}
			</td>
			<td>
				<div style={{ fontWeight: 500, fontSize: "0.8125rem" }}>{record.operatorStaffFullName}</div>
				<div style={{ fontSize: "0.6875rem", color: "var(--muted, #64748b)" }}>{record.operatorStaffPosition}</div>
			</td>
			<td>
				{record.isHeadNurseVerified ? (
					<span style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem" }}><UserCheck size={14} />Заверено</span>
				) : (
					<button type="button" onClick={() => onVerify?.(record.id, headNurseName || "Медсестра ЦСО")} className="autoclave-btn autoclave-btn-secondary" style={{ padding: "0.4rem 0.75rem", fontSize: "0.75rem", minHeight: "44px" }}>Заверить</button>
				)}
			</td>
			<td>
				{onDelete && (
					<button type="button" onClick={() => onDelete(record.id)} className="autoclave-log-close-btn" title="Удалить запись" aria-label="Удалить запись" style={{ minWidth: "44px", minHeight: "44px", padding: "8px" }}>
						<Trash2 size={16} color="#ef4444" />
					</button>
				)}
			</td>
		</tr>
	);
};
