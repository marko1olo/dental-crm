import type { GeneralCleaningLog } from "@dental/shared";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import type React from "react";
import { CLINIC_ROOMS_CATALOG, MONTH_NAMES_RU } from "./cleaningScheduleTypes";

export interface GeneralCleaningWeekCardProps {
	readonly week: { weekNumber: number; startDate: number; endDate: number; targetDay: number };
	readonly selectedMonth: number;
	readonly weekLogs: readonly GeneralCleaningLog[];
}

export const GeneralCleaningWeekCard: React.FC<GeneralCleaningWeekCardProps> = ({
	week, selectedMonth, weekLogs,
}) => {
	return (
		<div
			style={{
				border: "1px solid var(--line, #e2e8f0)", borderRadius: "10px", padding: "0.85rem",
				background: "var(--paper, #ffffff)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
				display: "flex", flexDirection: "column", gap: "0.6rem",
			}}
		>
			<div
				style={{
					display: "flex", justifyContent: "space-between", alignItems: "center",
					borderBottom: "1px solid var(--line, #f1f5f9)", paddingBottom: "0.4rem",
				}}
			>
				<div>
					<span style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--ink, #0f172a)" }}>
						Неделя {week.weekNumber}
					</span>
					<span style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", marginLeft: "0.4rem" }}>
						(с {week.startDate} по {week.endDate} {MONTH_NAMES_RU[selectedMonth]?.slice(0, 3)})
					</span>
				</div>
				<span
					style={{
						fontSize: "0.75rem", fontWeight: 700, color: "var(--teal, #0d9488)",
						background: "var(--teal-soft, #f0fdfa)", padding: "0.15rem 0.5rem", borderRadius: "6px",
					}}
				>
					{weekLogs.length} уборок
				</span>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
				{CLINIC_ROOMS_CATALOG.map((room) => {
					const existingLog = weekLogs.find((l) => l.roomName?.includes(room.name.split(" ")[0] || ""));
					const isCompleted = existingLog?.status === "completed" || existingLog?.status === "verified_by_inspector";
					const isVerified = existingLog?.status === "verified_by_inspector";

					return (
						<div
							key={room.id}
							style={{
								padding: "0.5rem 0.65rem", borderRadius: "6px",
								background: isCompleted ? "rgba(13, 148, 136, 0.08)" : "var(--paper-soft, #f8fafc)",
								border: isCompleted ? "1px solid rgba(13, 148, 136, 0.25)" : "1px dashed var(--line, #cbd5e1)",
								display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem",
							}}
						>
							<div style={{ minWidth: 0, flex: 1 }}>
								<div style={{ fontSize: "0.825rem", fontWeight: 700, color: "var(--ink, #0f172a)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
									{room.name}
								</div>
								<div style={{ fontSize: "0.7rem", color: "var(--muted, #64748b)" }}>
									{room.areaM2} м² • Аламинол 1.5% • 60 мин + УФ
								</div>
							</div>

							<div>
								{isVerified ? (
									<span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--ok-fg, #16a34a)", display: "inline-flex", alignItems: "center", gap: "2px", whiteSpace: "nowrap" }}>
										<ShieldCheck size={12} /> Заверено
									</span>
								) : isCompleted ? (
									<span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--teal, #0d9488)", display: "inline-flex", alignItems: "center", gap: "2px", whiteSpace: "nowrap" }}>
										<CheckCircle2 size={12} /> Выполнено
									</span>
								) : (
									<span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--muted, #64748b)", whiteSpace: "nowrap" }}>
										План: {week.targetDay} {MONTH_NAMES_RU[selectedMonth]?.slice(0, 3)}
									</span>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
