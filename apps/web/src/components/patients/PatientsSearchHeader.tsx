import { Plus, Search } from "lucide-react";
import { type ChangeEvent, useState } from "react";
import { DictationHints } from "../../DictationHints";
import { parsePatientDictationLocal } from "../../lib/smartPatientParser";
import { SmartParsePreview } from "../../SmartParsePreview";
import { usePatientStore } from "../../store/patientStore";
import { formatPhoneNumber } from "../../utils/inputSanitation";
import { SmartMicrophoneButton } from "../SmartMicrophoneButton";

export type PatientsSearchHeaderProps = {
	query: string;
	setQuery: (value: string) => void;
	createPatient: () => void | Promise<void>;
	updatePatientCoreDraft: (field: any, value: string) => void;
};

type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export function PatientsSearchHeader({
	query,
	setQuery,
	createPatient,
	updatePatientCoreDraft,
}: PatientsSearchHeaderProps) {
	const {
		newPatientName,
		newPatientPhone,
		isPatientCreating,
		setNewPatientName,
		setNewPatientPhone,
		setNewPatientBirthDate,
	} = usePatientStore();

	const [smartInputText, setSmartInputText] = useState("");
	const [showSmartPreview, setShowSmartPreview] = useState(false);
	const [smartParsedData, setSmartParsedData] = useState<any>(null);
	const [showHints, setShowHints] = useState(false);

	const patientNameReady = newPatientName.trim().length > 0;
	const patientCreatePhoneIssue =
		newPatientPhone.trim().length > 0 &&
		newPatientPhone.replace(/\D/g, "").length < 5;
	const patientCreateReady =
		patientNameReady && !patientCreatePhoneIssue && !isPatientCreating;
	const patientCreateGuidance = !patientNameReady
		? "Укажите ФИО пациента. Телефон и дату рождения можно добавить позже."
		: patientCreatePhoneIssue
			? "Телефон пациента слишком короткий. Исправьте номер или очистите поле."
			: null;

	return (
		<>
			<header className="patients-header">
				<div className="patients-search-box">
					<Search aria-hidden="true" />
					<input
						aria-label="Поиск пациента"
						type="search"
						autoComplete="off"
						value={query}
						onChange={(event: TextFieldChangeEvent) =>
							setQuery(event.target.value)
						}
						placeholder="Поиск пациента: ФИО или телефон"
					/>
				</div>
				<div className="smart-create-group">
					<div className="smart-input-wrapper">
						<input
							aria-label="ФИО или 'Иванов 89001234567 12.05.1990'"
							autoComplete="name"
							value={smartInputText}
							onChange={(event: TextFieldChangeEvent) => {
								setSmartInputText(event.target.value);
								setNewPatientName(event.target.value); // Sync for normal usage
							}}
							onFocus={() => setShowHints(true)}
							onBlur={(e) => {
								if (!e.currentTarget.contains(e.relatedTarget)) {
									setShowHints(false);
								}
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" && smartInputText.trim()) {
									e.preventDefault();
									const parsed = parsePatientDictationLocal(smartInputText);
									setSmartParsedData(parsed);
									setShowSmartPreview(true);
									setShowHints(false);
								}
							}}
							placeholder="Умный ввод: ФИО Телефон Дата (Enter)"
						/>
						<SmartMicrophoneButton
							context="patient"
							onResult={(text) => {
								setSmartInputText(text);
								const parsed = parsePatientDictationLocal(text);
								setSmartParsedData(parsed);
								setShowSmartPreview(true);
								setShowHints(false);
							}}
							style={{
								position: "absolute",
								right: "4px",
								top: "50%",
								transform: "translateY(-50%)",
							}}
						/>
						<DictationHints isVisible={showHints} type="patient" />
						<SmartParsePreview
							isVisible={showSmartPreview}
							parsedData={smartParsedData}
							rawText={smartInputText}
							type="patient"
							onApply={(data: Record<string, string | undefined>) => {
								if (data) {
									setNewPatientName(data.fullName || smartInputText);
									if (data.phone)
										setNewPatientPhone(formatPhoneNumber(data.phone));
									if (data.birthDate) setNewPatientBirthDate(data.birthDate);
									if (data.notes) updatePatientCoreDraft("notes", data.notes);
								}
								setShowSmartPreview(false);
								setSmartInputText(data?.fullName || "");
							}}
							onManual={() => setShowSmartPreview(false)}
							onClose={() => setShowSmartPreview(false)}
						/>
					</div>
					<button
						className="btn-primary"
						type="button"
						title="Создать пациента"
						onClick={createPatient}
						aria-describedby={
							patientCreateGuidance ? "patient-create-guidance" : undefined
						}
						disabled={!patientCreateReady}
						aria-busy={isPatientCreating || undefined}
					>
						<Plus aria-hidden="true" size={18} /> Создать
					</button>
				</div>
			</header>

			{patientCreateGuidance ? (
				<p
					className="quick-create-guidance"
					id="patient-create-guidance"
					role="status"
					aria-live="polite"
				>
					{patientCreateGuidance}
				</p>
			) : null}
		</>
	);
}
