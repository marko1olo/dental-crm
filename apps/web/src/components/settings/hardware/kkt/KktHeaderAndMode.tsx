import React from "react";

interface Props {
	isEmulatorMode: boolean;
	onEmulatorModeChange: (val: boolean) => void;
}

export const KktHeaderAndMode: React.FC<Props> = ({ isEmulatorMode, onEmulatorModeChange }) => {
	return (
		<div
			style={{
				display: "flex",
				flexWrap: "wrap",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "12px",
				padding: "12px 14px",
				background: "var(--paper-soft)",
				border: "1px solid var(--line)",
				borderRadius: "8px",
			}}
		>
			<div>
				<div style={{ fontWeight: 600, fontSize: "13px", color: "var(--ink)" }}>
					Фискальные регистраторы и онлайн-кассы
				</div>
				<div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
					Прямой LAN / COM-порт протокол АТОЛ и ШТРИХ-М без посредников и задержек облака.
				</div>
			</div>

			<label
				style={{
					display: "inline-flex",
					alignItems: "center",
					gap: "8px",
					padding: "6px 10px",
					background: isEmulatorMode ? "rgba(16, 185, 129, 0.1)" : "var(--paper)",
					border: `1px solid ${isEmulatorMode ? "rgba(16, 185, 129, 0.3)" : "var(--line)"}`,
					borderRadius: "6px",
					cursor: "pointer",
					fontSize: "12px",
					fontWeight: 500,
					color: isEmulatorMode ? "var(--success, green)" : "var(--ink)",
				}}
				title="В режиме эмулятора чеки рассчитываются с генерацией QR-кода без расхода фискального накопителя"
			>
				<input
					type="checkbox"
					checked={isEmulatorMode}
					onChange={(e) => onEmulatorModeChange(e.target.checked)}
					style={{ accentColor: "var(--success, green)" }}
				/>
				<span>Режим эмулятора кассы (без расхода ФН)</span>
			</label>
		</div>
	);
};
