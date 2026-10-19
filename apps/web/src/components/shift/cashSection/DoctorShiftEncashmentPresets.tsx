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
	const isFull = !isCustomMode && encashmentAmount === cashRub;
	const is5k = !isCustomMode && cashRub >= 5000 && encashmentAmount === Math.max(0, cashRub - 5000);
	const is10k = !isCustomMode && cashRub >= 10000 && encashmentAmount === Math.max(0, cashRub - 10000);

	const btnStyle = (active: boolean): React.CSSProperties => ({
		fontSize: "12px",
		padding: "0 12px",
		height: "32px",
		borderRadius: "8px",
		fontWeight: active ? 700 : 500,
		background: active ? "var(--teal-surface, rgba(13, 148, 136, 0.12))" : "var(--paper-soft)",
		border: active ? "1px solid var(--teal, #0d9488)" : "1px solid var(--line)",
		color: active ? "var(--teal-dark, #0f766e)" : "var(--ink)",
		cursor: "pointer",
		display: "inline-flex",
		alignItems: "center",
		whiteSpace: "nowrap",
		transition: "all 0.15s ease",
	});

	return (
		<>
			<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
				<button
					type="button"
					style={btnStyle(isFull)}
					onClick={onFullEncashment}
					data-testid="btn-encashment-100"
				>
					100% наличности
				</button>
				<button
					type="button"
					style={btnStyle(is5k)}
					onClick={() => onKeepFloat(5000)}
					data-testid="btn-encashment-float-5k"
				>
					Размен 5 000 ₽
				</button>
				<button
					type="button"
					style={btnStyle(is10k)}
					onClick={() => onKeepFloat(10000)}
					data-testid="btn-encashment-float-10k"
				>
					Размен 10 000 ₽
				</button>
				<button
					type="button"
					style={btnStyle(isCustomMode)}
					onClick={onToggleCustomMode}
					data-testid="btn-encashment-custom"
				>
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
