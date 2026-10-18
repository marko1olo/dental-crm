import React from "react";
import { money } from "../../../AppHelpers";

export interface DoctorShiftEncashmentPresetsProps {
	readonly cashRub: number;
	readonly encashmentAmount: number;
	readonly isCustomMode: boolean;
	readonly onFullEncashment: () => void;
	readonly onKeepFloat: (amt: number) => void;
	readonly onToggleCustomMode: () => void;
	readonly onChangeAmount: (amt: number) => void;
}

export const DoctorShiftEncashmentPresets: React.FC<DoctorShiftEncashmentPresetsProps> = ({
	cashRub,
	encashmentAmount,
	isCustomMode,
	onFullEncashment,
	onKeepFloat,
	onToggleCustomMode,
	onChangeAmount,
}) => {
	const btnStyle = (active: boolean): React.CSSProperties => ({
		fontSize: "12px",
		padding: "0 10px",
		height: "32px",
		borderRadius: "8px",
		fontWeight: active ? 700 : 500,
		background: active ? "var(--teal-surface, rgba(13, 148, 136, 0.1))" : "var(--paper)",
		border: active ? "1px solid var(--teal)" : "1px solid var(--line)",
		color: active ? "var(--teal-dark, #0f766e)" : "var(--ink)",
		cursor: "pointer",
		display: "inline-flex",
		alignItems: "center",
		transition: "all 0.15s ease",
	});

	return (
		<>
			<div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
				<button type="button" style={btnStyle(encashmentAmount === cashRub && !isCustomMode)} onClick={onFullEncashment}>
					100% наличности
				</button>
				<button type="button" style={btnStyle(false)} onClick={() => onKeepFloat(5000)}>
					Размен 5 000 ₽
				</button>
				<button type="button" style={btnStyle(false)} onClick={() => onKeepFloat(10000)}>
					Размен 10 000 ₽
				</button>
				<button type="button" style={btnStyle(isCustomMode)} onClick={onToggleCustomMode}>
					{isCustomMode ? "Скрыть ввод" : "Другая сумма"}
				</button>
			</div>

		{isCustomMode && (
			<div style={{ display: "flex", alignItems: "center", gap: "8px", maxWidth: "280px" }}>
				<label htmlFor="custom-encashment-input" className="sr-only">
					Сумма инкассации в рублях
				</label>
				<input
					id="custom-encashment-input"
					type="number"
					min={0}
					max={cashRub}
					step={100}
					value={encashmentAmount}
					onChange={(e) => onChangeAmount(Math.max(0, Number(e.target.value) || 0))}
					className="dente-input"
					style={{ fontSize: "12px", padding: "4px 8px", height: "30px", width: "120px" }}
				/>
				<span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
					из {money(cashRub)} доступных
				</span>
			</div>
		)}
	</>
	);
};
