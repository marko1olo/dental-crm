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
import { PatientDuplicateAlert } from "./PatientDuplicateAlert";
import { PatientLoyaltyHeader } from "./PatientLoyaltyHeader";
import { PatientNoShowRisk } from "./PatientNoShowRisk";
import { PatientReclamationsWidget } from "./PatientReclamationsWidget";
import { PatientTaskTicketsWidget } from "./PatientTaskTicketsWidget";
import { PatientCommunicationTimelineWidget } from "./PatientCommunicationTimelineWidget";
import { PatientArchiveAndBlacklistWidget } from "./PatientArchiveAndBlacklistWidget";
import { PatientDuplicateMergeQueuesWidget } from "../crm/PatientDuplicateMergeQueuesWidget";



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
				: {};
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
			{/*
				ЗДЕСЬ БЫЛА ВТОРАЯ КАРТОЧКА ПАЦИЕНТА — не похожая, а буквально та же.
				Оба блока правили один и тот же `patientCoreDraft` и вызывали один и
				тот же `savePatientCore`. На экране «Пациенты» получалось: два поля
				«ФИО пациента», две даты рождения, два телефона, две кнопки
				сохранения («Сохранить данные» и «Сохранить карточку»), два значка
				состояния и два разных набора быстрых пометок, дописывающих в одно и
				то же поле заметок. Текст, набранный в одном поле, тут же появлялся
				во втором, и понять, какую из карточек заполнять, было нельзя.

				Оставлена одна форма — в PatientsView. Полезное из этой копии
				перенесено туда: пропуск повторной пометки и приведение телефона к
				формату. Уникальные части этого блока (семейный счёт, лояльность,
				рекламации, лента приёмов, архив) сохранены ниже.
			*/}
			<div className="panel-heading compact-heading patients-no-border-mb-8 flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
				<div className="flex gap-3 items-center">
					<span className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
						Пациент в клинике
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
			</div>
			{/* Предупреждение о второй карточке того же человека стоит выше полей:
			    иначе администратор успевает внести данные не в ту карточку. Само
			    себя не показывает, когда дублей нет. */}
			{selectedPatientId ? <PatientDuplicateAlert patientId={selectedPatientId} /> : null}

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
									: {};
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
				</div>
			</div>
		</div>
	);
}

