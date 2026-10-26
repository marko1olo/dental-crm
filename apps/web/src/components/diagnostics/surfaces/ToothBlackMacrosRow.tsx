import React from "react";
import {
	type BlackClassificationMacro,
	BLACK_MACROS,
} from "../toothSurfacesConstants";

interface ToothBlackMacrosRowProps {
	onApplyMacro: (macro: BlackClassificationMacro) => void;
}

export const ToothBlackMacrosRow: React.FC<ToothBlackMacrosRowProps> = ({
	onApplyMacro,
}) => {
	return (
		<div className="dente-macros-chips-row">
			<span className="dente-macros-title">По Блэку:</span>
			{BLACK_MACROS.map((macro) => (
				<button
					key={macro.id}
					type="button"
					onClick={() => onApplyMacro(macro)}
					className="dente-macro-chip"
					title={macro.titleRu}
				>
					{macro.label}
				</button>
			))}
		</div>
	);
};
