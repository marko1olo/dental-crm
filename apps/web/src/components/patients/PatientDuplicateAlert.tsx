import type React from "react";
import { duplicatePairKey } from "../../lib/patientDuplicatesApi";
import { DuplicateCandidateItem } from "./duplicateAlert/DuplicateCandidateItem";
import { useDuplicateAlertLogic } from "./duplicateAlert/useDuplicateAlertLogic";

export const PatientDuplicateAlert: React.FC<{ patientId: string }> = ({
	patientId,
}) => {
	const {
		candidates,
		notice,
		busyKey,
		confirmKey,
		setConfirmKey,
		merge,
		dismiss,
	} = useDuplicateAlertLogic(patientId);

	if ((candidates || []).length === 0) {
		return notice ? (
			<p className="patient-duplicate-alert patient-duplicate-alert--done" role="status">
				{notice}
			</p>
		) : null;
	}

	return (
		<section
			className="patient-duplicate-alert"
			data-testid="patient-duplicate-alert"
			aria-label="Возможный дубль карточки"
		>
			<p className="patient-duplicate-alert__lead">
				{(candidates || []).length === 1
					? "Похоже, у этого пациента есть ещё одна карточка:"
					: `Похоже, у этого пациента есть ещё карточки: ${(candidates || []).length}.`}{" "}
				Пока карточки не объединены, приёмы, оплаты и снимки разложены по разным
				местам, и долг не виден целиком.
			</p>

			{notice ? (
				<p className="patient-duplicate-alert__notice" role="status" aria-live="polite">
					{notice}
				</p>
			) : null}

			<ul className="patient-duplicate-alert__list">
				{candidates.map((candidate) => {
					const key = duplicatePairKey(candidate);
					return (
						<DuplicateCandidateItem
							key={key}
							candidate={candidate}
							patientId={patientId}
							busy={busyKey === key}
							isConfirming={confirmKey === key}
							onStartConfirm={setConfirmKey}
							onCancelConfirm={() => setConfirmKey(null)}
							onMerge={merge}
							onDismiss={dismiss}
						/>
					);
				})}
			</ul>
		</section>
	);
};

export default PatientDuplicateAlert;
