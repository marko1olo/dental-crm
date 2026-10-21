import React from "react";
import {
	type OrthopedicWorkTypeId,
	ORTHOPEDIC_WORK_TYPES,
} from "../../dentalLabWorkflowEngine";
import {
	VITA_CLASSICAL_SHADES,
	VITA_3D_MASTER_SHADES,
	VITA_BLEACH_SHADES,
} from "../../orders/labWorkOrderPresets";

export interface OrderWorkTypeAndShadeProps {
	workType: OrthopedicWorkTypeId;
	onWorkTypeChange: (type: OrthopedicWorkTypeId) => void;
	shade: string;
	onShadeChange: (shade: string) => void;
}

export function OrderWorkTypeAndShade({
	workType, onWorkTypeChange, shade, onShadeChange,
}: OrderWorkTypeAndShadeProps): React.JSX.Element {
	return (
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
	);
}
