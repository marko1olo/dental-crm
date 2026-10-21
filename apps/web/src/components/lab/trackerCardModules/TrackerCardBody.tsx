import React from "react";
import type { DentalLabConstructionDef, DentalLabOrderRecord } from "../dentalLabOrderEngine";
import { formatRuDate } from "../dentalLabOrderEngine";

export interface TrackerCardBodyProps {
	order: DentalLabOrderRecord;
	construction?: DentalLabConstructionDef;
}

export function TrackerCardBody({ order, construction }: TrackerCardBodyProps): React.JSX.Element {
	return (
		<div className="space-y-2">
			{/* Patient & Doctor */}
			<div className="text-xs space-y-0.5">
				<div className="font-bold text-[var(--ink,#0f172a)] truncate">
					{order.patientName}
				</div>
				<div className="text-[11px] text-[var(--muted,#64748b)] truncate">
					{order.doctorName}
				</div>
			</div>

			{/* Construction, Material, VITA Shade */}
			<div className="p-2 rounded-lg bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] text-[11px] space-y-1">
				<div className="flex items-center justify-between">
					<span className="text-[var(--muted,#64748b)]">Вид:</span>
					<span className="font-bold text-[var(--ink,#0f172a)] truncate">
						{construction?.shortNameRu || order.constructionType}
					</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-[var(--muted,#64748b)]">VITA:</span>
					<span className="font-bold font-mono text-teal-700 dark:text-teal-300">
						{order.vitaShade}
						{order.translucency ? ` (${order.translucency})` : ""}
						{order.stumpShade ? ` • Культя: ${order.stumpShade}` : ""}
					</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-[var(--muted,#64748b)]">Лаб:</span>
					<span className="truncate text-[var(--ink,#0f172a)] font-medium">
						{order.labName}
					</span>
				</div>
			</div>

			{/* Dates */}
			<div className="flex items-center justify-between text-[11px] text-[var(--muted,#64748b)] pt-0.5">
				<span>Отпр: {formatRuDate(order.sentDate)}</span>
				<span className="font-bold text-[var(--ink,#0f172a)]">
					Срок: {formatRuDate(order.deadlineDate)}
				</span>
			</div>
		</div>
	);
}
