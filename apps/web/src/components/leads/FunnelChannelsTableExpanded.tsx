/**
 * DENTE Dental CRM — Funnel Channels Table Expanded View
 * Mandate 8b (<= 120 lines)
 */

import React from "react";
import { FunnelChannelsTableRow } from "./FunnelChannelsTableRow";
import type { ChannelFunnelMetric } from "./leadsFunnelTypes";

export const FunnelChannelsTableExpanded: React.FC<{
	channels: readonly ChannelFunnelMetric[];
}> = ({ channels }) => {
	return (
		<div
			style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}
			data-testid="channels-table-expanded"
		>
			<table
				style={{
					width: "100%",
					minWidth: "760px",
					borderCollapse: "collapse",
					fontSize: 12,
					textAlign: "left",
					whiteSpace: "nowrap",
				}}
			>
				<thead>
					<tr
						style={{
							borderBottom: "1px solid var(--line)",
							color: "var(--muted)",
							fontSize: 11,
							textTransform: "uppercase",
							letterSpacing: "0.03em",
						}}
					>
						<th style={{ padding: "10px 8px" }}>Канал</th>
						<th style={{ padding: "10px 8px" }}>Расход (₽)</th>
						<th style={{ padding: "10px 8px" }}>Лиды</th>
						<th style={{ padding: "10px 8px" }}>CPL (₽)</th>
						<th style={{ padding: "10px 8px" }}>Записи</th>
						<th style={{ padding: "10px 8px" }}>Дошли</th>
						<th style={{ padding: "10px 8px" }}>Оплатили</th>
						<th style={{ padding: "10px 8px" }}>Конв. (%)</th>
						<th style={{ padding: "10px 8px" }}>Выручка (₽)</th>
						<th style={{ padding: "10px 8px" }}>CAC (₽)</th>
						<th style={{ padding: "10px 8px" }}>ROMI (%)</th>
						<th style={{ padding: "10px 8px" }}>Статус & Рекомендация</th>
					</tr>
				</thead>
				<tbody>
					{channels.map((ch) => (
						<FunnelChannelsTableRow key={ch.channelKey} ch={ch} />
					))}
				</tbody>
			</table>
		</div>
	);
};
