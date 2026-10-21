import React from "react";
import type { ProcedureRuleModalState } from "../MaterialBomsRuleModal.js";

const QUICK_CHIPS: readonly { readonly label: string; readonly val: string }[] = [
	{ label: "0.1 г/мл", val: "0.1" },
	{ label: "0.35 г (пломба)", val: "0.35" },
	{ label: "0.5 мл", val: "0.5" },
	{ label: "1 шт/карп.", val: "1" },
	{ label: "2 шт", val: "2" },
	{ label: "15 мл (ирригация)", val: "15" },
	{ label: "25 г (Air-Flow)", val: "25" },
];

export interface MaterialBomsQuantityGroupProps {
	readonly modalState: ProcedureRuleModalState;
	readonly onChangeModalState: (next: ProcedureRuleModalState) => void;
}

export const MaterialBomsQuantityGroup: React.FC<MaterialBomsQuantityGroupProps> = ({
	modalState,
	onChangeModalState,
}) => {
	return (
		<div className="material-boms-form-group">
			<label className="material-boms-form-label">
				Норма расхода на 1 услугу (в граммах, мл или штуках) *
			</label>
			<input
				type="number"
				step="0.0001"
				min="0.0001"
				className="material-boms-form-input"
				value={modalState.quantityToDeduct}
				onChange={(e) =>
					onChangeModalState({
						...modalState,
						quantityToDeduct: e.target.value,
					})
				}
				placeholder="например: 0.35"
				required
			/>

			<div className="material-boms-chips-row">
				{QUICK_CHIPS.map((chip) => (
					<button
						key={chip.label}
						type="button"
						className="material-boms-chip"
						onClick={() =>
							onChangeModalState({
								...modalState,
								quantityToDeduct: chip.val,
							})
						}
					>
						+{chip.label}
					</button>
				))}
			</div>
		</div>
	);
};
