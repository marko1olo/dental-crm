import React, { useState } from "react";
import type { ChangeEvent, RefObject } from "react";
import { DictationHints } from "../../../DictationHints";
import { parsePatientDictationLocal } from "../../../lib/smartPatientParser";
import { type SmartParsedPayload, SmartParsePreview } from "../../../SmartParsePreview";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";

export interface PatientNameInputRowProps {
	readonly newPatientName: string;
	readonly onNameChange: (name: string) => void;
	readonly onQuickCreateKeyDown?: ((e: React.KeyboardEvent<HTMLInputElement>) => void) | undefined;
	readonly nameInputRef: RefObject<HTMLInputElement | null>;
	readonly fullNameError?: string | undefined;
	readonly onPhoneChange: (phone: string) => void;
	readonly onBirthDateChange: (birthDate: string) => void;
	readonly updatePatientCoreDraft?: ((field: any, val: any) => void) | undefined;
}

export function PatientNameInputRow({
	newPatientName,
	onNameChange,
	onQuickCreateKeyDown,
	nameInputRef,
	fullNameError,
	onPhoneChange,
	onBirthDateChange,
	updatePatientCoreDraft,
}: PatientNameInputRowProps) {
	const [showHints, setShowHints] = useState(false);
	const [showSmartPreview, setShowSmartPreview] = useState(false);
	const [smartParsedData, setSmartParsedData] = useState<ReturnType<
		typeof parsePatientDictationLocal
	> | null>(null);

	return (
		<div className="create-patient-form-field">
			<div className="create-patient-label-row">
				<label htmlFor="patient-create-full-name" className="create-patient-label">
					ФИО пациента <span className="text-rose-500 font-bold">*</span>
				</label>
				<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					<button
						type="button"
						className="create-patient-smart-parse-btn"
						onClick={() => setShowHints(!showHints)}
						title="Показать примеры голосового ввода"
						style={{ fontSize: "12px", minHeight: "32px", padding: "4px 8px" }}
					>
						{showHints ? "Скрыть подсказку" : "? Подсказка"}
					</button>
					{(newPatientName ?? "").trim().length > 0 && (
						<button
							type="button"
							className="create-patient-smart-parse-btn"
							onClick={() => {
								setSmartParsedData(parsePatientDictationLocal(newPatientName));
								setShowSmartPreview(true);
								setShowHints(false);
							}}
							title="Разобрать строку на ФИО, телефон и дату рождения"
						>
							Разобрать строку
						</button>
					)}
				</div>
			</div>

			<div className="smart-input-wrapper">
				<input
					ref={nameInputRef}
					id="patient-create-full-name"
					data-testid="patient-creation-fullname-input"
					autoComplete="name"
					value={newPatientName}
					onChange={(event: ChangeEvent<HTMLInputElement>) => onNameChange(event.target.value)}
					onKeyDown={onQuickCreateKeyDown}
					placeholder="Фамилия Имя Отчество"
					className={`create-patient-input ${fullNameError ? "border-rose-500" : ""}`}
					aria-invalid={!!fullNameError}
				/>
				<SmartMicrophoneButton
					context="patient"
					onResult={(text) => {
						onNameChange(text);
						const parsed = parsePatientDictationLocal(text);
						setSmartParsedData(parsed);
						setShowSmartPreview(true);
						setShowHints(false);
					}}
					style={{ position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)" }}
				/>
				<DictationHints isVisible={showHints} type="patient" />
				<SmartParsePreview
					isVisible={showSmartPreview}
					parsedData={smartParsedData as SmartParsedPayload | null}
					rawText={newPatientName}
					type="patient"
					onApply={(payload: SmartParsedPayload) => {
						if (payload) {
							onNameChange(payload.fullName || newPatientName);
							if (payload.phone) onPhoneChange(payload.phone);
							if (payload.birthDate) onBirthDateChange(payload.birthDate);
							if (payload.notes && updatePatientCoreDraft) {
								updatePatientCoreDraft("notes", payload.notes);
							}
						}
						setShowSmartPreview(false);
					}}
					onManual={() => setShowSmartPreview(false)}
					onClose={() => setShowSmartPreview(false)}
				/>
			</div>
			{fullNameError && <span className="text-xs text-rose-500 font-semibold mt-1">{fullNameError}</span>}
		</div>
	);
}
