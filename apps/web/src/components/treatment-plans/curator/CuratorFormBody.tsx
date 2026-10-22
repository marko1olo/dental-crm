/**
 * apps/web/src/components/treatment-plans/curator/CuratorFormBody.tsx
 *
 * Поля выбора куратора, этапа воронки, даты контакта и заметок.
 */

import React from "react";
import { CURATOR_STAGE_DEFINITIONS, type CuratorFunnelStage } from "@dental/shared";
import { DOCTOR_SELF_CURATOR_ID, CURATOR_ROLE_LABELS } from "./curatorConstants";
import { CuratorNotesField } from "./CuratorNotesField";

export interface CuratorFormBodyProps {
	readonly staffList: readonly any[];
	readonly selectedCuratorId: string;
	readonly onSelectCuratorId: (id: string) => void;
	readonly selectedStage: CuratorFunnelStage;
	readonly onSelectStage: (stage: CuratorFunnelStage) => void;
	readonly useCustomCommission: boolean;
	readonly onToggleCustomCommission: (val: boolean) => void;
	readonly customCommissionPercent: number;
	readonly onChangeCommissionPercent: (val: number) => void;
	readonly nextContactDate: string;
	readonly onChangeNextContactDate: (date: string) => void;
	readonly notes: string;
	readonly onChangeNotes: (notes: string) => void;
}

export const CuratorFormBody: React.FC<CuratorFormBodyProps> = ({
	staffList,
	selectedCuratorId,
	onSelectCuratorId,
	selectedStage,
	onSelectStage,
	useCustomCommission,
	onToggleCustomCommission,
	customCommissionPercent,
	onChangeCommissionPercent,
	nextContactDate,
	onChangeNextContactDate,
	notes,
	onChangeNotes,
}) => {
	return (
		<div className="curator-modal-body">
			<div className="curator-form-group">
				<label className="curator-form-label" htmlFor="curator-select">
					Ответственный за ведение плана лечения
				</label>
				<select
					id="curator-select"
					data-testid="curator-select"
					value={selectedCuratorId}
					onChange={(e) => onSelectCuratorId(e.target.value)}
					className="curator-form-input"
					style={{ minHeight: "44px" }}
				>
					<option value={DOCTOR_SELF_CURATOR_ID}>
						Лечащий врач (самокурация / без куратора)
					</option>
					{staffList.map((s) => (
						<option key={s.id} value={s.id}>
							{s.fullName || s.name} ({CURATOR_ROLE_LABELS[s.role] || s.role})
						</option>
					))}
				</select>
			</div>

			<div className="curator-form-group">
				<label className="curator-form-label" htmlFor="curator-stage">
					Текущий этап воронки согласования
				</label>
				<select
					id="curator-stage"
					value={selectedStage}
					onChange={(e: any) => onSelectStage(e.target.value)}
					className="curator-form-input"
					style={{ minHeight: "44px" }}
				>
					{CURATOR_STAGE_DEFINITIONS.map((def) => (
						<option key={def.stage} value={def.stage}>
							Этап {def.stepNumber}: {def.title}
						</option>
					))}
				</select>
			</div>

			<CuratorNotesField
				nextContactDate={nextContactDate}
				onChangeNextContactDate={onChangeNextContactDate}
				notes={notes}
				onChangeNotes={onChangeNotes}
			/>
		</div>
	);
};
