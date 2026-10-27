import React from "react";
import {
	DOUBTFUL_BELOW,
	type DuplicateCandidate,
	duplicatePairKey,
	otherSideOf,
} from "../../../lib/patientDuplicatesApi";
import { usePatientStore } from "../../../store/patientStore";

function formatBirthDate(value: string | null): string {
	if (!value) return "дата рождения не указана";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toLocaleDateString("ru-RU");
}

export interface DuplicateCandidateItemProps {
	readonly candidate: DuplicateCandidate;
	readonly patientId: string;
	readonly busy: boolean;
	readonly isConfirming: boolean;
	readonly onStartConfirm: (key: string) => void;
	readonly onCancelConfirm: () => void;
	readonly onMerge: (candidate: DuplicateCandidate) => Promise<void>;
	readonly onDismiss: (candidate: DuplicateCandidate) => Promise<void>;
}

export const DuplicateCandidateItem: React.FC<DuplicateCandidateItemProps> = React.memo(({
	candidate,
	patientId,
	busy,
	isConfirming,
	onStartConfirm,
	onCancelConfirm,
	onMerge,
	onDismiss,
}) => {
	const { setSelectedPatientId } = usePatientStore();
	const key = duplicatePairKey(candidate);
	const other = otherSideOf(candidate, patientId);
	const doubtful = candidate.confidence < DOUBTFUL_BELOW;

	return (
		<li className="patient-duplicate-alert__item">
			<div className="patient-duplicate-alert__who">
				<span className="patient-duplicate-alert__name">{other.fullName}</span>
				<span className="patient-duplicate-alert__facts">
					{formatBirthDate(other.birthDate)} · {other.phone ?? "телефон не указан"}
				</span>
				<span className={`ops-state ops-state--${doubtful ? "warn" : "ok"}`}>
					{Math.round(candidate.confidence * 100)} % совпадения
				</span>
				<span className="patient-duplicate-alert__why">{candidate.explanation}</span>
				{candidate.caution ? (
					<span className="patient-duplicate-alert__why">
						<strong>Осторожно:</strong> {candidate.caution}
					</span>
				) : null}
			</div>

			<div className="patient-duplicate-alert__actions">
				{isConfirming ? (
					<>
						<span className="patient-duplicate-alert__why">
							Останется открытая карточка. Записи, оплаты и снимки из «{other.fullName}» перенесутся сюда, вторая карточка сохранится как архивная ссылка.
						</span>
						<button className="primary-button" type="button" disabled={busy} onClick={() => void onMerge(candidate)}>
							{busy ? "Перенос…" : "Подтвердить перенос"}
						</button>
						<button className="secondary-button" type="button" onClick={onCancelConfirm}>
							Отмена
						</button>
					</>
				) : (
					<>
						<button className="secondary-button" type="button" disabled={busy} onClick={() => onStartConfirm(key)}>
							{doubtful ? "Всё равно перенести сюда" : "Перенести сюда"}
						</button>
						<button className="secondary-button" type="button" onClick={() => setSelectedPatientId(other.patientId)}>
							Открыть вторую
						</button>
						<button className="secondary-button" type="button" disabled={busy} onClick={() => void onDismiss(candidate)}>
							Это разные люди
						</button>
					</>
				)}
			</div>
		</li>
	);
});

DuplicateCandidateItem.displayName = "DuplicateCandidateItem";
