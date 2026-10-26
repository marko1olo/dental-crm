import React from "react";
import { Copy, CheckCheck, X } from "lucide-react";
import { Icd10SeverityBadge } from "./Icd10SeverityBadge";
import type { DentalIcd10Item } from "../../icd10DentalCatalog";

export const COMMON_FDI_TEETH = [
	11, 12, 13, 14, 15, 16, 17, 18,
	21, 22, 23, 24, 25, 26, 27, 28,
	31, 32, 33, 34, 35, 36, 37, 38,
	41, 42, 43, 44, 45, 46, 47, 48,
];

interface Icd10SelectedPreviewProps {
	currentSelectedItem: DentalIcd10Item;
	localTooth: number | null;
	copied: boolean;
	onCopyCode: (code: string) => void;
	onSelectTooth: (tooth: number) => void;
	onClear?: (() => void) | undefined;
	onResetAll: () => void;
}

export const Icd10SelectedPreview: React.FC<Icd10SelectedPreviewProps> = ({
	currentSelectedItem,
	localTooth,
	copied,
	onCopyCode,
	onSelectTooth,
	onClear,
	onResetAll,
}) => {
	return (
		<div className="icd10-selected-preview-card">
			<div className="icd10-preview-header">
				<div className="icd10-preview-code-block min-w-0">
					<span className="icd10-preview-code shrink-0">{currentSelectedItem.code}</span>
					<div className="min-w-0">
						<div className="icd10-preview-title truncate min-w-0" title={currentSelectedItem.titleRu}>
							{currentSelectedItem.titleRu}
						</div>
						<Icd10SeverityBadge severity={currentSelectedItem.severity} />
					</div>
				</div>
				<div className="icd10-preview-actions">
					<button
						type="button"
						className="icd10-preview-btn"
						onClick={() => onCopyCode(currentSelectedItem.code)}
						title="Скопировать код МКБ-10"
					>
						{copied ? <CheckCheck size={16} color="var(--ok-fg)" /> : <Copy size={16} />}
						{copied ? "Скопировано" : "Код"}
					</button>
					{onClear && (
						<button
							type="button"
							className="icd10-preview-btn"
							onClick={onResetAll}
							title="Сбросить выбор"
						>
							<X size={16} />
							Сброс
						</button>
					)}
				</div>
			</div>

			<div className="icd10-tooth-binding-section">
				<div className="icd10-tooth-binding-label">
					Привязка к зубу по формуле FDI (ISO 3950):
					{currentSelectedItem.requiresTooth && (
						<span className="icd10-tooth-required-star" title="Обязательно для данного диагноза">
							* (обязательно)
						</span>
					)}
				</div>

				<div className="icd10-teeth-quick-bar">
					{COMMON_FDI_TEETH.map((tooth) => {
						const isToothSelected = localTooth === tooth;
						return (
							<button
								key={tooth}
								type="button"
								className={`icd10-tooth-quick-btn ${isToothSelected ? "is-selected" : ""}`}
								onClick={() => onSelectTooth(tooth)}
								title={`Выбрать зуб ${tooth}`}
							>
								{tooth}
							</button>
						);
					})}
				</div>
			</div>

			{currentSelectedItem.recommendations.length > 0 && (
				<div className="icd10-recommendations-box">
					<div className="icd10-recommendations-title">Клинические рекомендации СтАР:</div>
					<ul className="icd10-recommendations-list">
						{currentSelectedItem.recommendations.map((rec, i) => (
							<li key={i}>{rec}</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
};
