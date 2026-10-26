import React from "react";
import type { PackageType } from "./printerTypes.js";

interface Props {
	autoclaveName: string;
	sterilizationMode: string;
	cycleNumber: string;
	packageType: PackageType;
	responsibleStaff: string;
	onAutoclaveNameChange: (val: string) => void;
	onSterilizationModeChange: (val: string) => void;
	onCycleNumberChange: (val: string) => void;
	onPackageTypeChange: (val: PackageType) => void;
	onResponsibleStaffChange: (val: string) => void;
}

export const PrinterSanpinForm: React.FC<Props> = ({
	autoclaveName,
	sterilizationMode,
	cycleNumber,
	packageType,
	responsibleStaff,
	onAutoclaveNameChange,
	onSterilizationModeChange,
	onCycleNumberChange,
	onPackageTypeChange,
	onResponsibleStaffChange,
}) => {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
				gap: "12px",
			}}
		>
			<div className="hw-field-group">
				<label className="hw-field-label">
					<span>Стерилизатор / Автоклав</span>
				</label>
				<input
					type="text"
					className="hw-field-input"
					value={autoclaveName}
					onChange={(e) => onAutoclaveNameChange(e.target.value)}
				/>
			</div>

			<div className="hw-field-group">
				<label className="hw-field-label">
					<span>Режим стерилизации</span>
				</label>
				<input
					type="text"
					className="hw-field-input"
					value={sterilizationMode}
					onChange={(e) => onSterilizationModeChange(e.target.value)}
				/>
			</div>

			<div className="hw-field-group">
				<label className="hw-field-label">
					<span>Номер цикла / партии</span>
				</label>
				<input
					type="text"
					className="hw-field-input"
					value={cycleNumber}
					onChange={(e) => onCycleNumberChange(e.target.value)}
				/>
			</div>

			<div className="hw-field-group">
				<label className="hw-field-label">
					<span>Тип упаковки (Срок стерильности)</span>
				</label>
				<select
					className="hw-field-select"
					value={packageType}
					onChange={(e) => onPackageTypeChange(e.target.value as PackageType)}
				>
					<option value="combined_heat_seal">Комбинированный пакет (термосварка) — 60 суток</option>
					<option value="paper_double">Двойной крафт-пакет со скрепками — 50 суток</option>
					<option value="paper_single">Одинарный бумажный крафт-пакет — 20 суток</option>
				</select>
			</div>

			<div className="hw-field-group">
				<label className="hw-field-label">
					<span>Ответственный сотрудник ЦСО</span>
				</label>
				<input
					type="text"
					className="hw-field-input"
					value={responsibleStaff}
					onChange={(e) => onResponsibleStaffChange(e.target.value)}
				/>
			</div>
		</div>
	);
};
