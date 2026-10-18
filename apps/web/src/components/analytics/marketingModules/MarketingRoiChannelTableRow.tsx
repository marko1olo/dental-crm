import React from "react";
import type { ChannelPerformanceRow } from "./marketingTypes";

export const MarketingRoiChannelTableRow: React.FC<{ readonly ch: ChannelPerformanceRow }> = ({ ch }) => {
	let statusClass = "status-profitable";
	if (ch.romiStatus === "super_profitable") statusClass = "status-super-profitable";
	else if (ch.romiStatus === "loss") statusClass = "status-loss";
	else if (ch.romiStatus === "organic") statusClass = "status-organic";
	else if (ch.romiStatus === "break_even") statusClass = "status-break-even";

	return (
		<tr key={ch.id} data-testid={`channel-row-${ch.channelKey}`}>
			<td>
				<div className="font-bold text-[var(--ink,#f8fafc)]">{ch.nameRu}</div>
				{ch.notes && <div className="text-xs text-[var(--muted,#94a3b8)]">{ch.notes}</div>}
			</td>
			<td><span className="marketing-roi-chip">{ch.categoryRu}</span></td>
			<td className="text-right font-mono font-bold">{ch.adSpendFormatted}</td>
			<td className="text-center font-mono">
				{ch.callsCount}
				<div className="text-xs text-[var(--muted,#94a3b8)]">CPL: {ch.cplFormatted}</div>
			</td>
			<td className="text-center font-mono">
				{ch.bookedAppointmentsCount}
				<div className="text-xs text-[var(--muted,#94a3b8)]">CPA: {ch.cpaFormatted}</div>
			</td>
			<td className="text-center font-mono font-bold text-teal-400">{ch.paidPlansCount}</td>
			<td className="text-right font-mono font-bold">{ch.revenueFormatted}</td>
			<td className="text-right font-mono text-emerald-400 font-bold">{ch.cacFormatted}</td>
			<td className="text-right font-mono font-bold">
				<span className={ch.profitKopecks >= 0 ? "text-emerald-400" : "text-rose-400"}>{ch.profitFormatted}</span>
			</td>
			<td className="text-center">
				<span className={`marketing-roi-status-badge ${statusClass}`}>{ch.romiFormatted}</span>
			</td>
		</tr>
	);
};
