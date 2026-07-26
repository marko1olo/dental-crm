import { Dashboard } from "@dental/shared";
import { motion } from "framer-motion";
import { UserCheck } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";
import { usePatientStore } from "../../store/patientStore";
import { formatPhoneNumber } from "../../utils/inputSanitation";
import { PatientJourneyTimeline } from "../PatientJourneyTimeline";
import { SmartMicrophoneButton } from "../SmartMicrophoneButton";
import { OrthodonticProgressWidget } from "./OrthodonticProgressWidget";
import { PatientFamilyCard } from "./PatientFamilyCard";
import { PatientLoyaltyHeader } from "./PatientLoyaltyHeader";
import { PatientNoShowRisk } from "./PatientNoShowRisk";
import { PatientReclamationsWidget } from "./PatientReclamationsWidget";
import { PatientTaskTicketsWidget } from "./PatientTaskTicketsWidget";
import { PatientCommunicationTimelineWidget } from "./PatientCommunicationTimelineWidget";
import { PatientArchiveAndBlacklistWidget } from "./PatientArchiveAndBlacklistWidget";
import { PatientServiceLineagesWidget } from "../crm/PatientServiceLineagesWidget";
import { PatientDuplicateMergeQueuesWidget } from "../crm/PatientDuplicateMergeQueuesWidget";
import { BulkImageOperationLogsWidget } from "../crm/BulkImageOperationLogsWidget";



type TextFieldChangeEvent = React.ChangeEvent<
	HTMLInputElement | HTMLTextAreaElement
>;

export function PatientOverviewTab() {
	const appLogic = useAppLogicContext();
	const {
		selectedPatientId,
		patientCoreDraft,
		patientCoreSaveState,
		patientCoreDirty,
		patientAdministrativeProfileSaveState,
		patientAdministrativeProfileDirty,
	} = usePatientStore();
	const workspaceFlags = useWorkspaceProfile();
	const dashboard = appLogic.dashboard;
	const { savePatientCore, updatePatientCoreDraft, selectedPatient } = appLogic;

	const patientCoreReadyToSave =
		(patientCoreDraft?.fullName ?? "").trim().length > 0 && patientCoreDirty;
	const patientCoreSaveGuidance =
		patientCoreSaveState === "error"
			? "Ошибка сохранения"
			: patientCoreSaveState === "saved"
				? "Сохранено"
				: null;
	const patientCoreSaveGuidanceId = "patientCoreSaveGuidanceId";
	const [familyData, setFamilyData] = useState<any>(null);

	useEffect(() => {
		if (selectedPatientId) {
			const headers = appLogic?.auth
				? appLogic.auth.denteClinicalReadHeaders()
				: { "x-organization-id": "00000000-0000-0000-0000-000000000001" };
			fetch(`/api/finance/family/patient/${selectedPatientId}`, { headers })
				.then((res) => {
					if (!res.ok) throw new Error("No family");
					return res.json();
				})
				.then((data) => setFamilyData(data))
				.catch(() => setFamilyData(null));
		} else {
			setFamilyData(null);
		}
	}, [selectedPatientId, appLogic]);

	return (
		<div data-testid="patient-overview-tab">
			<div className="panel-heading compact-heading patients-no-border-mb-8 flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
				<div className="flex gap-3 items-center">
					<span className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
						Карточка пациента
						{dashboard?.activeVisit?.patientId === selectedPatientId && (
							<span
								title="Пациент сейчас находится в клинике (Активный приём)"
								className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_#10b981]"
							/>
						)}
					</span>
					{selectedPatientId && (
						<PatientLoyaltyHeader patientId={selectedPatientId} />
					)}
				</div>
				<span
					className={`status-pill status-${patientCoreSaveState === "error" || patientAdministrativeProfileSaveState === "error" ? "cancelled" : "confirmed"}`}
				>
					{patientCoreSaveState === "saving"
						? "сохранение"
						: patientAdministrativeProfileSaveState === "saving"
							? "сохранение"
							: patientCoreSaveState === "error" ||
									patientAdministrativeProfileSaveState === "error"
								? "ошибка"
								: patientCoreDirty || patientAdministrativeProfileDirty
									? "Ждет сохранения"
									: "сохранено"}
				</span>
			</div>
			<div
				className="clinic-profile-form-grid patient-core-form-grid"
				style={{
					gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
				}}
			>
				<label className="form-span-2">
					ФИО пациента
					<input
						autoComplete="name"
						value={patientCoreDraft?.fullName ?? ""}
						onChange={(event: TextFieldChangeEvent) =>
							updatePatientCoreDraft("fullName", event.target.value)
						}
						placeholder="Фамилия Имя Отчество"
					/>
				</label>
				<label>
					Дата рождения
					<input
						type="date"
						autoComplete="bday"
						value={patientCoreDraft?.birthDate ?? ""}
						onChange={(event: TextFieldChangeEvent) =>
							updatePatientCoreDraft("birthDate", event.target.value)
						}
					/>
				</label>
				<label>
					Телефон
					<input
						type="tel"
						inputMode="tel"
						autoComplete="tel"
						value={patientCoreDraft?.phone ?? ""}
						onChange={(event: TextFieldChangeEvent) =>
							updatePatientCoreDraft(
								"phone",
								formatPhoneNumber(event.target.value),
							)
						}
						placeholder="+7..."
					/>
				</label>
				<label>
					Email
					<input
						type="email"
						autoComplete="email"
						value={patientCoreDraft?.email ?? ""}
						onChange={(event: TextFieldChangeEvent) =>
							updatePatientCoreDraft("email", event.target.value)
						}
						placeholder="patient@example.ru"
					/>
				</label>
				<div className="form-span-2 flex flex-col gap-2">
					<div className="flex justify-between items-center">
						<span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
							Заметки для команды
						</span>
						<SmartMicrophoneButton
							context="general"
							onResult={(t) => {
								const prev = patientCoreDraft?.notes || "";
								updatePatientCoreDraft("notes", prev ? `${prev}, ${t}` : t);
							}}
						/>
					</div>
					<textarea
						value={patientCoreDraft?.notes ?? ""}
						onChange={(e) => updatePatientCoreDraft("notes", e.target.value)}
						placeholder="важное для связи, приема и документов"
						className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm resize-y bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
					/>
					<div className="flex flex-wrap gap-1.5 mt-1">
						{[
							"Очень тревожный",
							"Сложный пациент",
							"VIP",
							"Просит звонить заранее",
							"Часто отменяет",
							"Плохо переносит анестезию",
							"Должник",
							"Рвотный рефлекс",
						].map((chip) => (
							<button
								key={chip}
								type="button"
								onClick={() => {
									const currentVal = (patientCoreDraft?.notes ?? "").trim();
									const chipLower = chip.toLowerCase();
									if (currentVal.toLowerCase().includes(chipLower)) return;
									const newVal = currentVal
										? `${currentVal}, ${chipLower}`
										: chipLower;
									updatePatientCoreDraft("notes", newVal);
								}}
								className="px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full cursor-pointer text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
							>
								+ {chip}
							</button>
						))}
					</div>
				</div>
			</div>
			<div className="patient-admin-actions patients-mt-16-flex">
				<button
					className="primary-button focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
					type="button"
					onClick={savePatientCore}
					aria-busy={patientCoreSaveState === "saving" || undefined}
					aria-describedby={
						patientCoreSaveGuidance ? patientCoreSaveGuidanceId : undefined
					}
					disabled={!patientCoreReadyToSave}
				>
					<UserCheck aria-hidden="true" /> Сохранить карточку
				</button>
			</div>
			{patientCoreSaveGuidance ? (
				<p
					className="patient-save-guidance"
					id={patientCoreSaveGuidanceId}
					role="status"
					aria-live="polite"
				>
					{patientCoreSaveGuidance}
				</p>
			) : null}

			<div
				className="patient-clinical-grid patients-my-0"
				style={{ marginTop: "16px" }}
			>
				<div className="clinical-col-left" style={{ flex: 1 }}>
					<PatientFamilyCard
						patientId={selectedPatientId}
						patientName={selectedPatient?.fullName || null}
						familyData={familyData}
						onFamilyDataChanged={() => {
							if (selectedPatientId) {
								const headers = appLogic?.auth
									? appLogic.auth.denteClinicalReadHeaders()
									: { "x-organization-id": "00000000-0000-0000-0000-000000000001" };
								fetch(`/api/finance/family/patient/${selectedPatientId}`, { headers })
									.then((res) => {
										if (!res.ok) throw new Error("No family");
										return res.json();
									})
									.then((data) => setFamilyData(data))
									.catch(() => setFamilyData(null));
							}
						}}
					/>

					{selectedPatientId && (
						<PatientJourneyTimeline
							patientId={selectedPatientId}
							dashboard={dashboard}
						/>
					)}

					{selectedPatientId && (
						<PatientServiceLineagesWidget patientId={selectedPatientId} />
					)}
				</div>
				<div className="clinical-col-right" style={{ flex: 1 }}>
					{selectedPatientId && (
						<PatientNoShowRisk patientId={selectedPatientId} />
					)}

					{selectedPatientId && workspaceFlags.hasOrthodontics && (
						<OrthodonticProgressWidget patientId={selectedPatientId} />
					)}

					{selectedPatientId && workspaceFlags.hasReclamations && (
						<PatientReclamationsWidget patientId={selectedPatientId} />
					)}

					{selectedPatientId && workspaceFlags.hasTasks && (
						<PatientTaskTicketsWidget patientId={selectedPatientId} />
					)}

					{selectedPatientId && (
						<PatientCommunicationTimelineWidget patientId={selectedPatientId} />
					)}

					{selectedPatientId && (
						<PatientArchiveAndBlacklistWidget patientId={selectedPatientId} />
					)}

					{selectedPatientId && (
						<PatientDuplicateMergeQueuesWidget />
					)}

					{selectedPatientId && (
						<BulkImageOperationLogsWidget />
					)}
				</div>
			</div>
		</div>
	);
}

