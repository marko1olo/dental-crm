import React from "react";
import { Building2, Gauge } from "lucide-react";
import { countLabel } from "../../../lib/russianPlural";
import { minutesLabel } from "../../../AppHelpers";

export interface ShiftIntelligenceAnalyticsGridProps {
	readonly modeFit?: {
		title?: string;
		fitScore?: number;
		lowFrictionNextStep?: string;
	} | undefined;
	readonly mostLoadedResource?: any;
}

export const ShiftIntelligenceAnalyticsGrid: React.FC<ShiftIntelligenceAnalyticsGridProps> = ({
	modeFit,
	mostLoadedResource,
}) => (
	<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
		<article className="mode-fit-card" style={{ padding: "16px", borderRadius: "12px", border: "1px solid var(--line)", background: "var(--paper-soft)" }}>
			<div className="mode-fit-head" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
				<Building2 aria-hidden="true" className="shrink-0" />
				<div style={{ minWidth: 0 }}>
					<p className="eyebrow">Режим клиники</p>
					<h2 style={{ fontSize: "15px", margin: 0, wordBreak: "break-word", lineHeight: 1.25 }}>
						{modeFit?.title ?? "Режим ещё не выбран"}
					</h2>
				</div>
				<strong style={{ marginLeft: "auto", fontSize: "18px", color: "var(--teal-dark)", flexShrink: 0 }}>
					{modeFit?.fitScore ?? 0}%
				</strong>
			</div>
			<p style={{ fontSize: "12.5px", color: "var(--muted)", margin: "8px 0", wordBreak: "break-word", lineHeight: 1.35 }}>
				{modeFit?.lowFrictionNextStep ?? ""}
			</p>
		</article>

		<article className="mode-fit-card resource-focus-card" style={{ padding: "16px", borderRadius: "12px", border: "1px solid var(--line)", background: "var(--paper-soft)" }}>
			<div className="mode-fit-head" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
				<Gauge aria-hidden="true" className="shrink-0" />
				<div style={{ minWidth: 0 }}>
					<p className="eyebrow">Загрузка</p>
					<h2 style={{ fontSize: "15px", margin: 0, wordBreak: "break-word", lineHeight: 1.25 }}>
						{mostLoadedResource?.title ?? "Кресел и врачей нет"}
					</h2>
				</div>
				<strong style={{ marginLeft: "auto", fontSize: "18px", color: "var(--teal-dark)", flexShrink: 0 }}>
					{mostLoadedResource ? `${mostLoadedResource.utilizationPercent}%` : "0%"}
				</strong>
			</div>
			{mostLoadedResource ? (
				<>
					<p style={{ fontSize: "12.5px", color: "var(--muted)", margin: "8px 0", wordBreak: "break-word", lineHeight: 1.35 }}>
						{minutesLabel(mostLoadedResource.bookedMinutes)} · {countLabel(mostLoadedResource.appointmentCount ?? 0, "запись", "записи", "записей")}
					</p>
					<div
						role="progressbar"
						aria-valuenow={mostLoadedResource.utilizationPercent}
						aria-valuemin={0}
						aria-valuemax={100}
						className="load-meter"
						aria-label={`Загрузка ${mostLoadedResource.utilizationPercent}%`}
						style={{ height: "4px", borderRadius: "4px", background: "var(--line)", overflow: "hidden" }}
					>
						<span style={{ display: "block", height: "100%", width: `${Math.min(100, mostLoadedResource.utilizationPercent)}%`, background: "var(--teal)" }} />
					</div>
				</>
			) : (
				<p style={{ fontSize: "12.5px", color: "var(--muted)", margin: "8px 0", wordBreak: "break-word", lineHeight: 1.35 }}>
					Врачей и кресел пока нет в настройках.
				</p>
			)}
		</article>
	</div>
);
