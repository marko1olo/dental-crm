import React from "react";
import { ShieldCheck, X } from "lucide-react";

export interface AutoclaveLogModalHeaderProps {
	readonly onClose: () => void;
}

export const AutoclaveLogModalHeader: React.FC<AutoclaveLogModalHeaderProps> = ({ onClose }) => {
	return (
		<div className="autoclave-log-header">
			<div className="autoclave-log-title-group">
				<div className="autoclave-log-title-icon">
					<ShieldCheck size={24} />
				</div>
				<div className="autoclave-log-title-text">
					<h2>Журнал работы автоклава</h2>
					<p>Стерилизация инструментов • Паровой (Класс B) и воздушный режимы</p>
				</div>
			</div>

			<button
				type="button"
				onClick={onClose}
				className="autoclave-log-close-btn"
				title="Закрыть журнал работы автоклава"
			>
				<X size={20} />
			</button>
		</div>
	);
};

export default AutoclaveLogModalHeader;
