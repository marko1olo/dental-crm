import React from "react";
import { Trash2 } from "lucide-react";
import {
	type EndoCanalData,
	CANAL_NAME_OPTIONS,
	REFERENCE_POINT_OPTIONS,
	MAF_ISO_OPTIONS,
	TAPER_OPTIONS,
	OBTURATION_TECHNIQUE_OPTIONS,
} from "../../endo/EndoCanalLogModal";

export interface ToothEndoCanalRowProps {
	canal: EndoCanalData;
	onCanalChange: (id: string, field: keyof EndoCanalData, value: string | number) => void;
	onRemoveCanal: (id: string) => void;
}

export const ToothEndoCanalRow: React.FC<ToothEndoCanalRowProps> = ({
	canal: c,
	onCanalChange,
	onRemoveCanal,
}) => {
	return (
		<tr>
			<td>
				<select
					value={c.canalName}
					onChange={(e) => onCanalChange(c.id, "canalName", e.target.value)}
					className="dente-table-select font-bold"
				>
					{CANAL_NAME_OPTIONS.map((opt) => (
						<option key={opt.value} value={opt.value}>{opt.value}</option>
					))}
				</select>
			</td>
			<td>
				<select
					value={c.referencePoint}
					onChange={(e) => onCanalChange(c.id, "referencePoint", e.target.value)}
					className="dente-table-select"
				>
					{REFERENCE_POINT_OPTIONS.map((refOpt) => (
						<option key={refOpt} value={refOpt}>{refOpt.split(" ")[0]}</option>
					))}
				</select>
			</td>
			<td>
				<input
					type="number"
					step="0.5"
					min="10"
					max="35"
					value={c.workingLengthMm}
					onChange={(e) => onCanalChange(c.id, "workingLengthMm", Number(e.target.value))}
					className="dente-table-input font-mono font-bold"
				/>
			</td>
			<td>
				<select
					value={c.masterApicalFile}
					onChange={(e) => onCanalChange(c.id, "masterApicalFile", e.target.value)}
					className="dente-table-select"
				>
					{MAF_ISO_OPTIONS.map((maf) => (
						<option key={maf} value={maf}>{maf.slice(0, 7)}</option>
					))}
				</select>
			</td>
			<td>
				<select
					value={c.taper}
					onChange={(e) => onCanalChange(c.id, "taper", e.target.value)}
					className="dente-table-select"
				>
					{TAPER_OPTIONS.map((tap) => (
						<option key={tap} value={tap}>{tap.slice(0, 4)}</option>
					))}
				</select>
			</td>
			<td>
				<select
					value={c.obturationTechnique}
					onChange={(e) => onCanalChange(c.id, "obturationTechnique", e.target.value)}
					className="dente-table-select"
				>
					{OBTURATION_TECHNIQUE_OPTIONS.map((obt) => (
						<option key={obt} value={obt}>{obt.slice(0, 18)}...</option>
					))}
				</select>
			</td>
			<td>
				<button
					type="button"
					onClick={() => onRemoveCanal(c.id)}
					className="dente-row-del-btn"
					title="Удалить канал"
				>
					<Trash2 size={16} />
				</button>
			</td>
		</tr>
	);
};
