import { Calendar, Plus, Printer, Stethoscope } from "lucide-react";
import React from "react";

export interface PatientCreationModalFooterProps {
	readonly patientCreateGuidance: string | null;
	readonly onClose: () => void;
	readonly handlePrintBlankContract: () => void;
	readonly handleCreateAndBook: () => Promise<void>;
	readonly handleCreateAndOpenVisit: () => Promise<void>;
	readonly duplicateConflict?: {
		message: string;
		existingPatientId?: string;
		isNameOnlyDuplicate?: boolean;
	} | null;
	readonly handleCreateAsNewDuplicate: () => Promise<void>;
	readonly handleCreate: () => Promise<void>;
	readonly isPatientCreating: boolean;
}

export function PatientCreationModalFooter({
	patientCreateGuidance,
	onClose,
	handlePrintBlankContract,
	handleCreateAndBook,
	handleCreateAndOpenVisit,
	duplicateConflict,
	handleCreateAsNewDuplicate,
	handleCreate,
	isPatientCreating,
}: PatientCreationModalFooterProps) {
	return (
		<footer className="create-patient-modal-footer">
			{patientCreateGuidance ? (
				<p
					className="quick-create-guidance patient-create-modal-guidance"
					id="patient-create-guidance"
					role="status"
					aria-live="polite"
				>
					{patientCreateGuidance}
				</p>
			) : null}

			<div className="create-patient-modal-actions">
				<button type="button" className="secondary-button create-patient-cancel-btn" onClick={onClose}>
					Отмена
				</button>
				<button
					type="button"
					className="secondary-button quick-create-print-blank-contract-btn"
					onClick={handlePrintBlankContract}
					title="Распечатать чистый бланк договора для зоны ожидания"
					data-testid="patient-creation-print-blank-contract-btn"
				>
					<Printer size={16} aria-hidden="true" />
					<span>Печать бланка договора</span>
				</button>
				<button
					type="button"
					className="secondary-button quick-create-book-action"
					onClick={() => void handleCreateAndBook()}
					disabled={false}
					title="Создать карту и сразу открыть расписание с выбранным пациентом"
					data-testid="patient-creation-submit-and-book-btn"
				>
					<Calendar size={16} aria-hidden="true" />
					<span>Создать и записать</span>
				</button>
				<button
					type="button"
					className="secondary-button quick-create-visit-action"
					onClick={() => void handleCreateAndOpenVisit()}
					disabled={false}
					title="Создать карту и сразу открыть приём (для дежурного врача)"
					data-testid="patient-creation-submit-and-visit-btn"
				>
					<Stethoscope size={16} aria-hidden="true" />
					<span>Создать и начать приём</span>
				</button>
				{duplicateConflict ? (
					<button
						type="button"
						className="secondary-button"
						onClick={() => void handleCreateAsNewDuplicate()}
						disabled={false}
						data-testid="footer-allow-duplicate-create-btn"
						title="Подтвердить создание новой карты для тёзки / однофамильца"
					>
						<span>Создать как однофамильца</span>
					</button>
				) : null}
				<button
					type="button"
					className="primary-button quick-create-action"
					onClick={() => void handleCreate()}
					disabled={false}
					aria-busy={isPatientCreating || undefined}
					aria-describedby={patientCreateGuidance ? "patient-create-guidance" : undefined}
					title={isPatientCreating ? "Создание карточки..." : "Создать медицинскую карту пациента"}
					data-testid="patient-creation-submit-btn"
				>
					<Plus size={18} aria-hidden="true" />
					<span>{isPatientCreating ? "Создание..." : "Создать пациента"}</span>
				</button>
			</div>
		</footer>
	);
}
