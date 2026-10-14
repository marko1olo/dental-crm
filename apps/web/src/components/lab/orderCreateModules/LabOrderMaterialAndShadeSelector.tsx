/**
 * LabOrderMaterialAndShadeSelector.tsx — Выбор конструкции, шкалы VITA, абатментов и параметров окклюзии.
 * 
 * Врачебные инварианты:
 * 1. Шкала VITA Classical (A1-D4), VITA Bleach (BL1-BL4 / OM1-OM3), VITA 3D-Master.
 * 2. Оттенок культи по шкале Natural Die (ND1-ND9).
 * 3. Платформы имплантатов и типы абатментов (прямой, угловой, индивидуальный Ti-base).
 * 4. Клинические указания врачу и технику.
 */

import React from "react";
import {
	type OrthopedicWorkTypeId,
	ORTHOPEDIC_WORK_TYPES,
} from "../dentalLabWorkflowEngine";
import {
	VITA_CLASSICAL_SHADES,
	VITA_3D_MASTER_SHADES,
	VITA_BLEACH_SHADES,
	STUMP_SHADES_ND,
	IMPLANT_PLATFORMS,
	ABUTMENT_TYPE_OPTIONS,
	FIXATION_TYPES,
	type ImplantPlatformType,
	type AbutmentCategoryType,
	type FixationType,
} from "../orders/labWorkOrderPresets";

export interface LabOrderMaterialAndShadeSelectorProps {
	readonly workType: OrthopedicWorkTypeId;
	readonly onWorkTypeChange: (type: OrthopedicWorkTypeId) => void;
	readonly shade: string;
	readonly onShadeChange: (shade: string) => void;
	readonly stumpShade: string;
	readonly onStumpShadeChange: (stump: string) => void;
	readonly implantPlatform: ImplantPlatformType | "";
	readonly onImplantPlatformChange: (platform: ImplantPlatformType | "") => void;
	readonly abutmentType: AbutmentCategoryType | "";
	readonly onAbutmentTypeChange: (abutment: AbutmentCategoryType | "") => void;
	readonly fixationType: FixationType | "";
	readonly onFixationTypeChange: (fixation: FixationType | "") => void;
	readonly clinicalNotes: string;
	readonly onClinicalNotesChange: (notes: string) => void;
}

export const LabOrderMaterialAndShadeSelector: React.FC<LabOrderMaterialAndShadeSelectorProps> = ({
	workType,
	onWorkTypeChange,
	shade,
	onShadeChange,
	stumpShade,
	onStumpShadeChange,
	implantPlatform,
	onImplantPlatformChange,
	abutmentType,
	onAbutmentTypeChange,
	fixationType,
	onFixationTypeChange,
	clinicalNotes,
	onClinicalNotesChange,
}) => {
	return (
		<div className="space-y-3.5">
			{/* Вид конструкции и оттенок */}
			<div className="ztl-form-grid-2">
				<div className="ztl-form-group">
					<label className="ztl-form-label" htmlFor="select-work-type">
						Вид конструкции и материал *
					</label>
					<select
						id="select-work-type"
						className="ztl-select w-full"
						value={workType}
						onChange={(e) => onWorkTypeChange(e.target.value as OrthopedicWorkTypeId)}
						data-testid="select-work-type"
					>
						{Object.values(ORTHOPEDIC_WORK_TYPES).map((t) => (
							<option key={t.id} value={t.id}>
								{t.nameRu} ({t.standardTurnaroundWorkingDays} раб. дн.)
							</option>
						))}
					</select>
				</div>

				<div className="ztl-form-group">
					<label className="ztl-form-label" htmlFor="input-shade-code">
						Оттенок (VITA Classical / Bleach / 3D-Master) *
					</label>
					<div className="flex gap-1.5">
						<input
							id="input-shade-code"
							type="text"
							className="ztl-form-input flex-1 uppercase"
							placeholder="A2, BL1, 2M2..."
							value={shade}
							onChange={(e) => onShadeChange(e.target.value.toUpperCase())}
							list="vita-shades-datalist"
							data-testid="input-shade-code"
						/>
						<select
							className="ztl-select w-[140px] shrink-0"
							value={shade}
							onChange={(e) => onShadeChange(e.target.value)}
							aria-label="Быстрый выбор цвета VITA"
						>
							<optgroup label="VITA Classical (A1..D4)">
								{VITA_CLASSICAL_SHADES.map((s) => (
									<option key={s.code} value={s.code}>
										{s.code} ({s.groupRu.split(":")[0]})
									</option>
								))}
							</optgroup>
							<optgroup label="VITA Bleach (OM / BL)">
								{VITA_BLEACH_SHADES.map((s) => (
									<option key={s.code} value={s.code}>
										{s.code} (Bleach)
									</option>
								))}
							</optgroup>
							<optgroup label="VITA 3D-Master">
								{VITA_3D_MASTER_SHADES.map((s) => (
									<option key={s.code} value={s.code}>
										{s.code}
									</option>
								))}
							</optgroup>
						</select>
						<datalist id="vita-shades-datalist">
							{VITA_CLASSICAL_SHADES.concat(VITA_BLEACH_SHADES, VITA_3D_MASTER_SHADES).map((s) => (
								<option key={s.code} value={s.code} />
							))}
						</datalist>
					</div>
				</div>
			</div>

			{/* Оттенок культи и параметры имплантации */}
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

			{/* Имплантация и абатменты */}
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

			{/* Клинические указания */}
			<div className="ztl-form-group">
				<label className="ztl-form-label" htmlFor="textarea-clinical-notes">
					Клинические указания врачу и зубному технику
				</label>
				<textarea
					id="textarea-clinical-notes"
					className="ztl-form-input w-full min-h-[58px] p-2 resize-none"
					placeholder="Особенности краевого прилегания, прозрачность режущего края, контактные пункты, прикус..."
					value={clinicalNotes}
					onChange={(e) => onClinicalNotesChange(e.target.value)}
					data-testid="textarea-clinical-notes"
				/>
			</div>
		</div>
	);
};
