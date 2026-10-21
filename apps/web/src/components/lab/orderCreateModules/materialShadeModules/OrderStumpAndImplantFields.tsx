import React from "react";
import {
	STUMP_SHADES_ND,
	IMPLANT_PLATFORMS,
	ABUTMENT_TYPE_OPTIONS,
	FIXATION_TYPES,
	type ImplantPlatformType,
	type AbutmentCategoryType,
	type FixationType,
} from "../../orders/labWorkOrderPresets";

export interface OrderStumpAndImplantFieldsProps {
	stumpShade: string;
	onStumpShadeChange: (stump: string) => void;
	implantPlatform: ImplantPlatformType | "";
	onImplantPlatformChange: (platform: ImplantPlatformType | "") => void;
	abutmentType: AbutmentCategoryType | "";
	onAbutmentTypeChange: (abutment: AbutmentCategoryType | "") => void;
	fixationType: FixationType | "";
	onFixationTypeChange: (fixation: FixationType | "") => void;
}

export function OrderStumpAndImplantFields({
	stumpShade, onStumpShadeChange, implantPlatform, onImplantPlatformChange,
	abutmentType, onAbutmentTypeChange, fixationType, onFixationTypeChange,
}: OrderStumpAndImplantFieldsProps): React.JSX.Element {
	return (
		<>
			<div className="ztl-form-grid-2">
				<div className="ztl-form-group">
					<label className="ztl-form-label" htmlFor="select-stump-shade">
						Оттенок культи зуба (ND1..ND9)
					</label>
					<select
						id="select-stump-shade"
						className="ztl-select w-full"
						value={stumpShade}
						onChange={(e) => onStumpShadeChange(e.target.value)}
						data-testid="select-stump-shade"
					>
						{STUMP_SHADES_ND.map((nd) => (
							<option key={nd.code} value={nd.code}>
								{nd.code} — {nd.descriptionRu}
							</option>
						))}
					</select>
				</div>

				<div className="ztl-form-group">
					<label className="ztl-form-label" htmlFor="select-fixation-type">
						Тип фиксации
					</label>
					<select
						id="select-fixation-type"
						className="ztl-select w-full"
						value={fixationType}
						onChange={(e) => onFixationTypeChange(e.target.value as FixationType | "")}
					>
						<option value="">— Не выбрано —</option>
						{FIXATION_TYPES.map((f) => (
							<option key={f.id} value={f.id}>
								{f.nameRu}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="ztl-form-grid-2">
				<div className="ztl-form-group">
					<label className="ztl-form-label" htmlFor="select-implant-platform">
						Платформа имплантата
					</label>
					<select
						id="select-implant-platform"
						className="ztl-select w-full"
						value={implantPlatform}
						onChange={(e) => onImplantPlatformChange(e.target.value as ImplantPlatformType | "")}
					>
						<option value="">— Без имплантата (естественный зуб) —</option>
						{IMPLANT_PLATFORMS.map((p) => (
							<option key={p.id} value={p.id}>
								{p.nameRu}
							</option>
						))}
					</select>
				</div>

				<div className="ztl-form-group">
					<label className="ztl-form-label" htmlFor="select-abutment-type">
						Тип абатмента
					</label>
					<select
						id="select-abutment-type"
						className="ztl-select w-full"
						value={abutmentType}
						onChange={(e) => onAbutmentTypeChange(e.target.value as AbutmentCategoryType | "")}
					>
						<option value="">— Стандартный / не требуется —</option>
						{ABUTMENT_TYPE_OPTIONS.map((a) => (
							<option key={a.id} value={a.id}>
								{a.nameRu} {a.angle > 0 ? `(${a.angle}°)` : ""}
							</option>
						))}
					</select>
				</div>
			</div>
		</>
	);
}
