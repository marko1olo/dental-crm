/**
 * apps/web/src/components/treatment-plans/curator/CuratorCommissionField.tsx
 *
 * Блок настройки сдельной комиссии куратора.
 */

import React from "react";
import { Coins } from "lucide-react";

export interface CuratorCommissionFieldProps {
	readonly useCustomCommission: boolean;
	readonly onToggleCustomCommission: (val: boolean) => void;
	readonly customCommissionPercent: number;
	readonly onChangeCommissionPercent: (val: number) => void;
}

export const CuratorCommissionField: React.FC<CuratorCommissionFieldProps> = ({
	useCustomCommission,
	onToggleCustomCommission,
	customCommissionPercent,
	onChangeCommissionPercent,
}) => {
	return (
		<div className="curator-form-group">
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "10px 14px",
					backgroundColor: "var(--paper, #f8fafc)",
					borderRadius: "10px",
					border: "1px solid var(--line, rgba(0,0,0,0.08))",
					minHeight: "44px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<Coins className="w-4 h-4" style={{ color: "var(--teal, #0d9488)" }} />
					<span style={{ fontSize: "13px", fontWeight: 600 }}>
						Индивидуальный процент комиссии
					</span>
				</div>
				<label
					style={{
						display: "flex",
						alignItems: "center",
						cursor: "pointer",
						gap: "8px",
						minHeight: "44px",
					}}
				>
					<input
						type="checkbox"
						checked={useCustomCommission}
						onChange={(e) => onToggleCustomCommission(e.target.checked)}
						style={{ width: "20px", height: "20px", cursor: "pointer" }}
					/>
					<span style={{ fontSize: "12px", color: "var(--ink-muted, #64748b)" }}>
						{useCustomCommission ? "Включен" : "По сетке клиники (2–5.5%)"}
					</span>
				</label>
			</div>

			{useCustomCommission && (
				<div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
					<input
						type="number"
						min="0"
						max="100"
						step="0.1"
						value={customCommissionPercent}
						onChange={(e) => onChangeCommissionPercent(parseFloat(e.target.value) || 0)}
						className="curator-form-input"
						style={{ width: "120px", minHeight: "44px" }}
					/>
					<span style={{ fontSize: "13px", color: "var(--ink-muted, #64748b)" }}>
						% от фактически оплаченной суммы плана
					</span>
				</div>
			)}
		</div>
	);
};
