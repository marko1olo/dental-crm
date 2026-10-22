import React from "react";
import {
	STATUTORY_PACKAGING_TYPES,
	STATUTORY_STERILIZERS_CATALOG,
	type PackagingTypeId,
} from "../autoclaveLogPresets.js";

export interface NewCyclePrimaryFieldsProps {
	readonly selectedSterilizerId: string;
	readonly onSterilizerChange: (id: string) => void;
	readonly cycleDate: string;
	readonly onCycleDateChange: (d: string) => void;
	readonly cycleNumber: number;
	readonly onCycleNumberChange: (n: number) => void;
	readonly packagingType: PackagingTypeId;
	readonly onPackagingTypeChange: (p: PackagingTypeId) => void;
	readonly packsCount: number;
	readonly onPacksCountChange: (n: number) => void;
	readonly bixNumber: string;
	readonly onBixNumberChange: (b: string) => void;
}

export const NewCyclePrimaryFields: React.FC<NewCyclePrimaryFieldsProps> = ({
	selectedSterilizerId, onSterilizerChange, cycleDate, onCycleDateChange,
	cycleNumber, onCycleNumberChange, packagingType, onPackagingTypeChange,
	packsCount, onPacksCountChange, bixNumber, onBixNumberChange,
}) => (
	<div className="autoclave-form-grid">
		<div className="autoclave-form-group">
			<label className="autoclave-form-label" htmlFor="sterilizer-select">
				Стерилизационный аппарат (Автоклав / Сухожар)
			</label>
			<select
				id="sterilizer-select"
				className="autoclave-select"
				value={selectedSterilizerId}
				onChange={(e) => onSterilizerChange(e.target.value)}
			>
				{STATUTORY_STERILIZERS_CATALOG.map((st) => (
					<option key={st.id} value={st.id}>{st.code} — {st.brand} {st.model} ({st.chamberVolumeLiters} л)</option>
				))}
			</select>
		</div>

		<div className="autoclave-form-group">
			<label className="autoclave-form-label" htmlFor="cycle-date">Дата и номер цикла</label>
			<div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: "0.5rem" }}>
				<input id="cycle-date" type="date" className="autoclave-input" value={cycleDate} onChange={(e) => onCycleDateChange(e.target.value)} required />
				<input id="cycle-number" type="number" min={1} max={99} className="autoclave-input" value={cycleNumber} onChange={(e) => onCycleNumberChange(Number(e.target.value))} title="Номер цикла за день" required />
			</div>
		</div>

		<div className="autoclave-form-group">
			<label className="autoclave-form-label" htmlFor="packaging-type">Вид упаковки и срок стерильности</label>
			<select id="packaging-type" className="autoclave-select" value={packagingType} onChange={(e) => onPackagingTypeChange(e.target.value as PackagingTypeId)}>
				{STATUTORY_PACKAGING_TYPES.map((pkg) => (
					<option key={pkg.id} value={pkg.id}>{pkg.shortLabelRu} (Срок: {pkg.shelfLifeDays > 0 ? `${pkg.shelfLifeDays} дн.` : "Без хранения"})</option>
				))}
			</select>
		</div>

		<div className="autoclave-form-group">
			<label className="autoclave-form-label" htmlFor="packs-count">Количество упаковок / наборов (шт.)</label>
			<input id="packs-count" type="number" min={1} max={500} className="autoclave-input" value={packsCount > 0 ? packsCount : ""} onChange={(e) => onPacksCountChange(Number(e.target.value))} placeholder="14" />
		</div>

		<div className="autoclave-form-group">
			<label className="autoclave-form-label" htmlFor="bix-number">Номер бикса / упаковки</label>
			<input id="bix-number" type="text" className="autoclave-input" value={bixNumber} onChange={(e) => onBixNumberChange(e.target.value)} placeholder="Бикс № 1 (КСКФ-3) / Пакеты № 1-14" />
		</div>
	</div>
);
