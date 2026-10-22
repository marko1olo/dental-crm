import React from "react";
import { Smile } from "lucide-react";

export interface SplitCatalogToothQuickBarProps {
	readonly selectedTooth: number | null;
	readonly onSelectTooth: (tooth: number | null) => void;
}

const COMMON_TEETH = [
	11, 12, 16, 21, 22, 26,
	36, 31, 41, 46,
];

export const SplitCatalogToothQuickBar: React.FC<SplitCatalogToothQuickBarProps> = ({
	selectedTooth,
	onSelectTooth,
}) => {
	return (
		<div className="split-catalog-tooth-bar" data-testid="split-catalog-tooth-bar">
			<div className="split-catalog-tooth-label">
				<Smile size={13} className="split-catalog-tooth-icon" />
				<span>Целевой зуб (FDI):</span>
			</div>
			<div className="split-catalog-tooth-chips">
				<button
					type="button"
					onClick={() => onSelectTooth(null)}
					className={`split-tooth-chip ${selectedTooth === null ? "active" : ""}`}
					data-testid="tooth-chip-none"
					title="Без привязки к конкретному зубу (общая манипуляция)"
				>
					Общее
				</button>
				{COMMON_TEETH.map((tooth) => (
					<button
						key={tooth}
						type="button"
						onClick={() => onSelectTooth(selectedTooth === tooth ? null : tooth)}
						className={`split-tooth-chip ${selectedTooth === tooth ? "active" : ""}`}
						data-testid={`tooth-chip-${tooth}`}
					>
						{tooth}
					</button>
				))}
				<select
					value={selectedTooth ?? ""}
					onChange={(e) => onSelectTooth(e.target.value ? Number(e.target.value) : null)}
					className="split-tooth-select"
					data-testid="tooth-select-dropdown"
					aria-label="Выбрать любой зуб FDI"
				>
					<option value="">Другой зуб...</option>
					<optgroup label="Верхний правый (11-18)">
						{[11, 12, 13, 14, 15, 16, 17, 18].map((t) => (
							<option key={t} value={t}>Зуб {t}</option>
						))}
					</optgroup>
					<optgroup label="Верхний левый (21-28)">
						{[21, 22, 23, 24, 25, 26, 27, 28].map((t) => (
							<option key={t} value={t}>Зуб {t}</option>
						))}
					</optgroup>
					<optgroup label="Нижний левый (31-38)">
						{[31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
							<option key={t} value={t}>Зуб {t}</option>
						))}
					</optgroup>
					<optgroup label="Нижний правый (41-48)">
						{[41, 42, 43, 44, 45, 46, 47, 48].map((t) => (
							<option key={t} value={t}>Зуб {t}</option>
						))}
					</optgroup>
				</select>
			</div>
		</div>
	);
};
