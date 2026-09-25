import React from "react";
import { Delete } from "lucide-react";
import { PIN_KEYS } from "./doctorPrivacyShieldHelpers";

export interface DoctorPrivacyShieldPinPadProps {
	readonly pin: string;
	readonly loading: boolean;
	readonly onKeyPress: (key: string) => void;
	readonly onClear: () => void;
	readonly onBackspace: () => void;
}

export const DoctorPrivacyShieldPinPad: React.FC<DoctorPrivacyShieldPinPadProps> = ({
	pin,
	loading,
	onKeyPress,
	onClear,
	onBackspace,
}) => {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(3, 1fr)",
				gap: "10px",
				width: "100%",
				maxWidth: "230px",
				marginBottom: "16px",
			}}
		>
			{PIN_KEYS.flat().map((key) => {
				if (key === "C") {
					return (
						<button
							key="clear"
							type="button"
							onClick={onClear}
							disabled={loading || pin.length === 0}
							style={{
								width: "56px",
								height: "56px",
								borderRadius: "50%",
								border: "1px solid rgba(255, 255, 255, 0.08)",
								backgroundColor: "rgba(255, 255, 255, 0.04)",
								color: "rgba(255, 255, 255, 0.65)",
								fontSize: "14px",
								fontWeight: 600,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								cursor: loading || pin.length === 0 ? "default" : "pointer",
								opacity: loading || pin.length === 0 ? 0.4 : 1,
								transition: "all 0.15s ease",
							}}
							title="Очистить PIN-код (Esc)"
							aria-label="Очистить ввод"
						>
							C
						</button>
					);
				}

				if (key === "BACKSPACE") {
					return (
						<button
							key="backspace"
							type="button"
							onClick={onBackspace}
							disabled={loading || pin.length === 0}
							style={{
								width: "56px",
								height: "56px",
								borderRadius: "50%",
								border: "1px solid rgba(255, 255, 255, 0.08)",
								backgroundColor: "rgba(255, 255, 255, 0.04)",
								color: "rgba(255, 255, 255, 0.75)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								cursor: loading || pin.length === 0 ? "default" : "pointer",
								opacity: loading || pin.length === 0 ? 0.4 : 1,
								transition: "all 0.15s ease",
							}}
							title="Стереть последнюю цифру (Backspace)"
							aria-label="Стереть последнюю цифру"
						>
							<Delete size={18} />
						</button>
					);
				}

				return (
					<button
						key={key}
						type="button"
						onClick={() => onKeyPress(key)}
						disabled={loading || pin.length >= 4}
						style={{
							width: "56px",
							height: "56px",
							borderRadius: "50%",
							border: "1px solid rgba(255, 255, 255, 0.09)",
							backgroundColor: "rgba(255, 255, 255, 0.06)",
							color: "#ffffff",
							fontSize: "20px",
							fontWeight: 600,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							cursor: loading || pin.length >= 4 ? "default" : "pointer",
							opacity: loading || pin.length >= 4 ? 0.5 : 1,
							transition: "all 0.15s ease",
						}}
						aria-label={`Цифра ${key}`}
					>
						{key}
					</button>
				);
			})}
		</div>
	);
};
