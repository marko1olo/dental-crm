import React from "react";
import { Check, Edit3, Trash2 } from "lucide-react";
import type { RetroactiveDayRecord } from "../retroactiveSanpinEngine";

export interface RetroactiveDisplayRowProps {
	readonly day: RetroactiveDayRecord;
	readonly idx: number;
	readonly onStartEditing: (day: RetroactiveDayRecord) => void;
	readonly onRequestDeleteDay: (dayId: string) => void;
	readonly onConfirmDeleteDay: (dayId: string) => void;
	readonly onCancelDeleteDay: () => void;
	readonly pendingDeleteDayId: string | null;
}

export function RetroactiveDisplayRow({
	day,
	idx,
	onStartEditing,
	onRequestDeleteDay,
	onConfirmDeleteDay,
	onCancelDeleteDay,
	pendingDeleteDayId,
}: RetroactiveDisplayRowProps) {
	return (
		<tr
			key={day.id}
			className="sanpin-log-row"
			style={{
				minHeight: "44px",
				contentVisibility: "auto",
				containIntrinsicSize: "1px 44px",
				contain: "content",
				opacity: day.isWorkingDay ? 1 : 0.65,
				background: day.isSavedToDb ? "rgba(16, 185, 129, 0.03)" : undefined,
			}}
		>
			<td style={{ textAlign: "center", color: "var(--muted)", fontFeatureSettings: "tnum" }}>{idx + 1}</td>
			<td>
				<strong>{day.date}</strong>
				<div style={{ fontSize: "0.75rem", color: day.isWorkingDay ? "var(--muted)" : "var(--bad-fg)" }}>
					{day.dayOfWeekRu} {!day.isWorkingDay && "(Выходной)"}
				</div>
			</td>
			<td><span style={{ fontSize: "0.82rem" }}>{day.cabinetsListRu}</span></td>
			<td>
				{day.isWorkingDay ? (
					<div>
						<strong>{day.traysProcessedCount}</strong> лотков
						<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{day.visitsCount} приемов</div>
					</div>
				) : <span style={{ color: "var(--muted)" }}>—</span>}
			</td>
			<td>
				{day.isWorkingDay ? (
					<div>
						<span className="sanpin-tag sanpin-tag-success" style={{ fontSize: "0.75rem" }}>
							{day.psoSampleCount} проб (Отр.)
						</span>
						<div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "2px" }}>{day.psoDetergent}</div>
					</div>
				) : <span style={{ color: "var(--muted)" }}>—</span>}
			</td>
			<td>
				{day.isWorkingDay ? (
					<div>
						<strong>{day.autoclaveCyclesCount}</strong> циклов
						<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>134°C (5 точек ОК)</div>
					</div>
				) : <span style={{ color: "var(--muted)" }}>Консервация</span>}
			</td>
			<td>
				{day.isWorkingDay ? <span>{day.recirculatorOperatingHours} ч</span> : <span style={{ color: "var(--muted)" }}>0 ч</span>}
			</td>
			<td>
				<div style={{ fontSize: "0.82rem" }}>{day.cleaningTypeRu}</div>
				{day.isGeneralCleaningDay && (
					<span style={{ fontSize: "0.72rem", background: "var(--teal-surface, rgba(13, 148, 136, 0.12))", color: "var(--teal)", padding: "0.1rem 0.35rem", borderRadius: "4px", fontWeight: 700 }}>
						Генеральная
					</span>
				)}
			</td>
			<td>
				{day.sanpinCompliance100 ? (
					<span className="sanpin-tag sanpin-tag-success" title="Все тесты соответствуют нормам"><Check size={12} /> 100% Норма</span>
				) : <span className="sanpin-tag sanpin-tag-danger">Замечание</span>}
			</td>
			<td>
				<div style={{ fontSize: "0.8rem", fontWeight: 600 }}>{day.nurseFullName}</div>
				<div style={{ fontSize: "0.68rem", fontFamily: "monospace", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "110px" }} title={day.electronicStampHash}>
					{day.electronicStampHash.slice(0, 18)}...
				</div>
			</td>
			<td style={{ textAlign: "center" }}>
				{pendingDeleteDayId === day.id ? (
					<div style={{ display: "flex", alignItems: "center", gap: "0.3rem", justifyContent: "center" }}>
						<span style={{ fontSize: "0.75rem", color: "var(--bad-fg)", fontWeight: 700 }}>Удалить?</span>
						<button type="button" onClick={() => onConfirmDeleteDay(day.id)} className="sanpin-btn sanpin-btn-primary" style={{ minHeight: "28px", padding: "0.15rem 0.45rem", fontSize: "0.75rem", background: "var(--bad-fg)", fontWeight: 700 }}>
							Да
						</button>
						<button type="button" onClick={onCancelDeleteDay} className="sanpin-btn sanpin-btn-secondary" style={{ minHeight: "28px", padding: "0.15rem 0.45rem", fontSize: "0.75rem" }}>
							Нет
						</button>
					</div>
				) : (
					<div style={{ display: "flex", gap: "0.3rem", justifyContent: "center" }}>
						<button type="button" onClick={() => onStartEditing(day)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--teal)", padding: "0.25rem" }} title="Редактировать смену">
							<Edit3 size={15} />
						</button>
						<button type="button" onClick={() => onRequestDeleteDay(day.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--bad-fg)", padding: "0.25rem" }} title="Удалить смену (с подтверждением)">
							<Trash2 size={15} />
						</button>
					</div>
				)}
			</td>
		</tr>
	);
}
