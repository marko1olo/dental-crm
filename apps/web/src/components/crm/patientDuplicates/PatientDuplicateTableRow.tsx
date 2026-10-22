import type React from "react";
import { duplicatePairKey } from "../../../lib/patientDuplicatesApi";
import { PatientDuplicateActions } from "./PatientDuplicateActions";
import { formatBirthDate } from "./patientDuplicateFormatters";
import type { PatientDuplicateRowProps } from "./types";

export const PatientDuplicateTableRow: React.FC<PatientDuplicateRowProps> = ({
	candidate,
	doubtful,
	isBusy,
	pendingConfirm,
	onStartConfirm,
	onCancelConfirm,
	onMerge,
	onDismiss,
}) => {
	const key = duplicatePairKey(candidate);
	return (
		<tr key={key}>
			<td className="ops-strong" data-label="Первая карточка">
				{candidate.leftName}
				<span className="ops-note">{formatBirthDate(candidate.left?.birthDate)}</span>
				<span className="ops-note">{candidate.left?.phone ?? "телефон не указан"}</span>
				{candidate.left?.email ? <span className="ops-note">{candidate.left.email}</span> : null}
			</td>
			<td className="ops-strong" data-label="Вторая карточка">
				{candidate.rightName}
				<span className="ops-note">{formatBirthDate(candidate.right?.birthDate)}</span>
				<span className="ops-note">{candidate.right?.phone ?? "телефон не указан"}</span>
				{candidate.right?.email ? <span className="ops-note">{candidate.right.email}</span> : null}
			</td>
			<td data-label="Чем похожи">
				<span className={`ops-state ops-state--${doubtful ? "warn" : "ok"}`}>
					{Math.round(candidate.confidence * 100)} % совпадения
				</span>
				<span className="ops-note">{candidate.explanation}</span>
				{candidate.caution ? (
					<span className="ops-note">
						<strong>Осторожно:</strong> {candidate.caution}
					</span>
				) : null}
			</td>
			<td data-label="Что делать">
				<PatientDuplicateActions
					candidate={candidate}
					pairKey={key}
					isBusy={isBusy}
					pendingConfirm={pendingConfirm}
					onStartConfirm={onStartConfirm}
					onCancelConfirm={onCancelConfirm}
					onMerge={onMerge}
					onDismiss={onDismiss}
				/>
			</td>
		</tr>
	);
};
