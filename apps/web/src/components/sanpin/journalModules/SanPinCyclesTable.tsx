import React from "react";
import type { SanPinCycleEntry } from "./sanpinJournalTypes";
import { SanPinMobileCyclesCards } from "./SanPinMobileCyclesCards";
import { SanPinDesktopCycleRow } from "./SanPinDesktopCycleRow";
import { SanPinTableEmptyState } from "./SanPinTableEmptyState";

export interface SanPinCyclesTableProps {
	readonly cycles: readonly SanPinCycleEntry[];
	readonly onAutofillShift?: () => void;
	readonly isAutofilling?: boolean;
	readonly onQuickBatchNorm?: (batchSize: number, regime: "134" | "121") => void;
	readonly onQuickPsoNorm?: () => void;
}

export const SanPinCyclesTable: React.FC<SanPinCyclesTableProps> = ({
	cycles,
	onAutofillShift,
	isAutofilling = false,
	onQuickBatchNorm,
	onQuickPsoNorm,
}) => {
	return (
		<div className="sanpin-cycles-container" style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: "100%", overflowX: "clip" }}>
			<style>{`
				.sanpin-desktop-table { display: block; }
				.sanpin-mobile-cards-wrap { display: none; }
				@media (max-width: 768px) {
					.sanpin-desktop-table { display: none !important; }
					.sanpin-mobile-cards-wrap { display: block !important; }
				}
			`}</style>

			{/* DESKTOP TABLE VIEW (1440x900) */}
			<div className="sanpin-desktop-table" style={{ borderRadius: 8, border: "1px solid var(--line, #e2e8f0)", overflowX: "auto", background: "var(--paper, #ffffff)" }}>
				<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem", tableLayout: "fixed", fontVariantNumeric: "tabular-nums" }}>
					<colgroup>
						<col style={{ width: "110px" }} />
						<col style={{ width: "140px" }} />
						<col style={{ width: "130px" }} />
						<col style={{ width: "180px" }} />
						<col style={{ width: "180px" }} />
						<col style={{ width: "auto" }} />
						<col style={{ width: "130px" }} />
						<col style={{ width: "105px" }} />
					</colgroup>
					<thead>
						<tr style={{ background: "var(--paper-soft, #f8fafc)", borderBottom: "1px solid var(--line, #e2e8f0)" }}>
							<th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Дата / Цикл</th>
							<th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Автоклав</th>
							<th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Партия / Очистка</th>
							<th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Параметры цикла</th>
							<th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Химический индикатор</th>
							<th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Крафт-пакеты / Наборы</th>
							<th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Ответственный</th>
							<th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>Статус</th>
						</tr>
					</thead>
					<tbody>
						{cycles.length === 0 ? (
							<SanPinTableEmptyState onAutofillShift={onAutofillShift} isAutofilling={isAutofilling} onQuickBatchNorm={onQuickBatchNorm} />
						) : (
							cycles.map((cyc) => <SanPinDesktopCycleRow key={cyc.id} cyc={cyc} />)
						)}
					</tbody>
				</table>
			</div>

			{/* MOBILE CARDS VIEW (390x844 Apple HIG) */}
			<div className="sanpin-mobile-cards-wrap">
				<SanPinMobileCyclesCards cycles={cycles} />
			</div>
		</div>
	);
};

export default SanPinCyclesTable;
