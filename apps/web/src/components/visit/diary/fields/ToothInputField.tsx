import React from "react";

export interface ToothInputFieldProps {
	readonly tooth: string;
	readonly disabled: boolean;
	readonly onChange: (tooth: string) => void;
	readonly onFocus: () => void;
}

export const ToothInputField: React.FC<ToothInputFieldProps> = ({
	tooth,
	disabled,
	onChange,
	onFocus,
}) => {
	return (
		<div className="vde-043__field">
			<label className="vde-043__label" htmlFor="diary-tooth">
				Зуб FDI
			</label>
			<input
				id="diary-tooth"
				disabled={disabled}
				className="vde-043__input vde-043__tooth-input"
				value={tooth}
				onChange={(e) => onChange(e.target.value)}
				onFocus={onFocus}
				placeholder="16, 36..."
				maxLength={32}
			/>
		</div>
	);
};
