/**
 * DmsServiceCatalogItemList.tsx — Список результатов поиска номенклатурных услуг
 */

import { Check, Plus } from "lucide-react";
import React from "react";
import { formatRubKopecks, type Nomenclature804nItem } from "../insuranceMath.js";

export interface DmsServiceCatalogItemListProps {
	readonly items: readonly Nomenclature804nItem[];
	readonly approvedServiceCodes: readonly string[];
	readonly onToggleApprovedService: (code: string) => void;
}

export function DmsServiceCatalogItemList({
	items,
	approvedServiceCodes,
	onToggleApprovedService,
}: DmsServiceCatalogItemListProps) {
	return (
		<div style={{ maxHeight: "240px", overflowY: "auto", border: "1px solid var(--line, #e2e8f0)", borderRadius: "12px", padding: "8px" }}>
			{items.map((item) => {
				const isSelected = approvedServiceCodes.includes(item.code);
				return (
					<div key={item.code} className={`dms-service-item ${isSelected ? "selected" : ""}`}>
						<div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1, minWidth: 0, paddingRight: "12px" }}>
							<div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flexWrap: "wrap" }}>
								<span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary, #0284c7)" }} className="shrink-0">
									{item.code}
								</span>
								{isSelected ? (
									<span className="dms-badge dms-badge-active truncate text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-semibold" style={{ fontSize: "0.6875rem", padding: "2px 8px" }}>
										<Check size={11} className="inline mr-1" />
										Услуга входит в программу ДМС
									</span>
								) : (
									<span className="dms-badge dms-badge-secondary truncate" style={{ fontSize: "0.6875rem", padding: "2px 8px" }}>
										{item.categoryTitleRu}
									</span>
								)}
							</div>
							<div style={{ fontSize: "0.8125rem", fontWeight: 500 }} className="truncate" title={item.name}>{item.name}</div>
							<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
								Тариф: {formatRubKopecks(item.defaultPriceRub)} {item.uet ? `(${item.uet} УЕТ)` : ""}
							</div>
						</div>
						<button
							type="button"
							className={`dms-btn ${isSelected ? "dms-btn-primary" : "dms-btn-secondary"}`}
							onClick={() => onToggleApprovedService(item.code)}
							style={{ minWidth: "115px" }}
						>
							{isSelected ? <><Check size={16} /> Согласовано</> : <><Plus size={16} /> Согласовать</>}
						</button>
					</div>
				);
			})}
		</div>
	);
}
