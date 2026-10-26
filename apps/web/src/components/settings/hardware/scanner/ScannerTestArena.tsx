import React from "react";
import { CornerDownLeft, Scan, Tag } from "lucide-react";
import { CLINICAL_SAMPLES } from "./scannerConstants.js";

interface Props {
	inputCode: string;
	onInputCodeChange: (code: string) => void;
	onExecuteScan: (code: string) => void;
}

export const ScannerTestArena: React.FC<Props> = ({
	inputCode,
	onInputCodeChange,
	onExecuteScan,
}) => {
	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			onExecuteScan(inputCode);
		}
	};

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "10px",
				padding: "12px",
				background: "var(--paper)",
				border: "1px solid var(--line)",
				borderRadius: "8px",
			}}
		>
			<label style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>
				Тестирование сканера: сканируйте устройство или выберите клинический образец
			</label>

			<div style={{ display: "flex", gap: "8px" }}>
				<div style={{ position: "relative", flex: 1 }}>
					<input
						type="text"
						className="hw-field-input"
						value={inputCode}
						onChange={(e) => onInputCodeChange(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Сканируйте штрихкод или DataMatrix сканером..."
						style={{ paddingRight: "36px" }}
						data-testid="scanner-test-input"
					/>
					<Scan
						size={16}
						style={{
							position: "absolute",
							right: "10px",
							top: "50%",
							transform: "translateY(-50%)",
							color: "var(--muted)",
						}}
					/>
				</div>

				<button
					type="button"
					className="hw-btn-compact primary"
					onClick={() => onExecuteScan(inputCode)}
					data-testid="scanner-btn-test"
				>
					<CornerDownLeft size={13} />
					<span>Проверить код</span>
				</button>
			</div>

			<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", marginTop: "4px" }}>
				<span style={{ fontSize: "11px", color: "var(--muted)" }}>Быстрые сэмплы:</span>
				{CLINICAL_SAMPLES.map((sample) => (
					<button
						key={sample.label}
						type="button"
						className="hw-btn-compact"
						style={{ fontSize: "11px", height: "24px", padding: "0 8px" }}
						onClick={() => {
							onInputCodeChange(sample.code);
							onExecuteScan(sample.code);
						}}
						title={sample.desc}
					>
						<Tag size={11} />
						<span>{sample.label}</span>
					</button>
				))}
			</div>
		</div>
	);
};
