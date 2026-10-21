import React from "react";
import type { InventoryItem } from "../inventoryDataMappers.js";
import {
	formatExpDate,
	type ExpiryTrafficLightInfo,
	type FefoTrafficLightInfo,
} from "../inventoryExpiryUtils.js";

export interface StockRowFefoCellProps {
	readonly item: InventoryItem;
	readonly expiryTraffic: ExpiryTrafficLightInfo;
	readonly fefoInfo: FefoTrafficLightInfo | null;
}

export const StockRowFefoCell: React.FC<StockRowFefoCellProps> = ({
	item,
	expiryTraffic,
	fefoInfo,
}) => {
	return (
		<td
			className="inventory-col-fefo"
			style={{ padding: "8px 8px", verticalAlign: "middle", whiteSpace: "nowrap" }}
		>
			{item.expirationDate ? (
				<div
					className="flex flex-col items-start gap-0.5 whitespace-nowrap"
					data-fefo-status={fefoInfo?.status || expiryTraffic.status}
					data-testid={`inventory-fefo-traffic-${fefoInfo?.status || "green"}`}
				>
					<div className="inline-flex items-center gap-1.5 whitespace-nowrap">
						<span
							style={{
								width: 7,
								height: 7,
								borderRadius: "50%",
								backgroundColor: fefoInfo?.dotColor || "#10b981",
								flexShrink: 0,
							}}
							data-fefo-dot={fefoInfo?.status || "green"}
							aria-hidden="true"
						/>
						<span
							className={`text-xs font-semibold whitespace-nowrap ${fefoInfo?.className || ""}`}
							title={expiryTraffic.labelRu}
						>
							до {formatExpDate(item.expirationDate)}
						</span>
					</div>
					<div className="flex items-center gap-1.5 flex-wrap">
						<span
							className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${expiryTraffic.className}`}
							data-testid={`traffic-light-badge-${item.id}`}
							title={expiryTraffic.labelRu}
						>
							{expiryTraffic.badgeTextRu}
						</span>
						<span className="hidden" data-testid="fefo-traffic-badge">
							{fefoInfo?.badgeText}
						</span>
					</div>
				</div>
			) : (
				<div className="flex flex-col items-start gap-0.5 whitespace-nowrap">
					<span className="text-xs text-[var(--muted)] italic">Бессрочно</span>
					<span
						className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold border ${expiryTraffic.className}`}
						data-testid={`traffic-light-badge-${item.id}`}
					>
						{expiryTraffic.badgeTextRu}
					</span>
				</div>
			)}
		</td>
	);
};

export default StockRowFefoCell;
