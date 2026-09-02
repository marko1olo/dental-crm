import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";
import { usePatientStore } from "../../store/patientStore";
import { PatientCommunicationTimelinesWidget } from "../crm/PatientCommunicationTimelinesWidget";
import { PatientDuplicateMergeQueuesWidget } from "../crm/PatientDuplicateMergeQueuesWidget";
import { LabOrdersPanel } from "../LabOrdersPanel";
import { PatientWorkspaceView } from "../patient/PatientWorkspaceView";
import { OrthodonticProgressWidget } from "./OrthodonticProgressWidget";
import { PatientArchiveAndBlacklistWidget } from "./PatientArchiveAndBlacklistWidget";
import { PatientAttachmentsPanel } from "./PatientAttachmentsPanel";
import { PatientCommunicationConsentsPanel } from "./PatientCommunicationConsentsPanel";
import { PatientCommunicationTimelineWidget } from "./PatientCommunicationTimelineWidget";
import { PatientFamilyCard } from "./PatientFamilyCard";
import { PatientLoyaltyHeader } from "./PatientLoyaltyHeader";
import { PatientNoShowRisk } from "./PatientNoShowRisk";
import { PatientHeaderCard } from "../patient/PatientHeaderCard";
import { PatientReclamationsWidget } from "./PatientReclamationsWidget";
import { PatientTaskTicketsWidget } from "./PatientTaskTicketsWidget";
import { PatientWhatsappSendPanel } from "./PatientWhatsappSendPanel";

// biome-ignore lint/correctness/noUnusedVariables: automated suppression
type TextFieldChangeEvent = React.ChangeEvent<
	HTMLInputElement | HTMLTextAreaElement
>;

import { actionFailureToast } from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";

export function PatientOverviewTab() {
	const appLogic = useAppLogicContext();
	const {
		selectedPatientId,
		patientCoreDraft,
		patientCoreSaveState,
		patientCoreDirty,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		patientAdministrativeProfileSaveState,
		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		patientAdministrativeProfileDirty,
	} = usePatientStore();
	const workspaceFlags = useWorkspaceProfile();
	const dashboard = appLogic.dashboard;
	// biome-ignore lint/correctness/noUnusedVariables: automated suppression
	const { savePatientCore, updatePatientCoreDraft, selectedPatient } = appLogic;

	const _patientCoreReadyToSave =
		(patientCoreDraft?.fullName ?? "").trim().length > 0 && patientCoreDirty;
	const _patientCoreSaveGuidance =
		patientCoreSaveState === "error"
			? "Ошибка сохранения"
			: patientCoreSaveState === "saved"
				? "Сохранено"
				: null;
	const _patientCoreSaveGuidanceId = "patientCoreSaveGuidanceId";
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const [familyData, setFamilyData] = useState<any>(null);
	/*
	 * БЫЛО: любой неудачный ответ приравнивался к «семьи нет» — `if (!res.ok)
	 * throw`, а `catch` ставил familyData в null. Карточка семейного счёта на этот
	 * null пишет «Пациент не состоит в семейной группе. Вы можете создать новую
	 * семью или привязать его к существующей» и даёт кнопку «Создать семью».
	 *
	 * Что видел администратор: при обрыве связи, слёте смены (401/403) или сбое
	 * сервера (500) у пациента, который в семье СОСТОИТ, экран уверенно сообщал,
	 * что он в ней не состоит. Дальше по этому экрану создавалась вторая семья на
	 * того же человека — и общий счёт родственников расходился на два кошелька,
	 * а оплата с семейного баланса уходила не туда.
	 *
	 * 404 этот маршрут возвращает ровно в двух случаях: у пациента нет
	 * familyGroupId либо группа не найдена (apps/api/src/routes/finance_family.ts,
	 * GET /api/finance/family/patient/:patientId). Только он и означает «семьи
	 * нет»; всё остальное — непрочитанный ответ, и об этом надо сказать вслух.
	 */
	const [familyLoadFailure, setFamilyLoadFailure] = useState<{
		status: number | null;
	} | null>(null);

	// Ответ по прежнему пациенту не должен перетирать карточку текущего: запросы
	// возвращаются не в том порядке, в каком уходили.
	const selectedPatientIdRef = useRef(selectedPatientId);
	selectedPatientIdRef.current = selectedPatientId;

	/*
	 * Одна загрузка на два вызова. БЫЛО две дословные копии этого запроса — в
	 * эффекте и в onFamilyDataChanged; правка обработки отказа в одной из них
	 * оставила бы вторую врать по-прежнему.
	 */
	const loadFamily = useCallback(() => {
		if (!selectedPatientId) {
			setFamilyData(null);
			setFamilyLoadFailure(null);
			return;
		}
		const requestedPatientId = selectedPatientId;
		const headers = appLogic?.auth
			? appLogic.auth.denteClinicalReadHeaders()
			: {};
		fetch(`/api/finance/family/patient/${requestedPatientId}`, { headers })
			.then(async (res) => {
				if (selectedPatientIdRef.current !== requestedPatientId) return;
				if (res.ok) {
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					const data = await res.json().catch((err: any) => {
						logger.error(err);
						showToast(
							actionFailureToast(
								"Ошибка чтения ответа",
								(err as { status?: number })?.status ?? null,
							),
							"error",
						);
						return null;
					});
					setFamilyData(data ?? null);
					// Ответ 200 без тела — тоже не прочитанные данные, а не «нет семьи».
					setFamilyLoadFailure(data ? null : { status: res.status });
					return;
				}
				setFamilyData(null);
				setFamilyLoadFailure(
					res.status === 404 ? null : { status: res.status },
				);
			})
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			.catch((err: any) => {
				logger.error(err);
				showToast(
					actionFailureToast(
						"Ошибка загрузки семьи",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
				if (selectedPatientIdRef.current !== requestedPatientId) return;
				setFamilyData(null);
				setFamilyLoadFailure({ status: null });
			});
	}, [selectedPatientId, appLogic]);

	useEffect(() => {
		setFamilyData(null);
		setFamilyLoadFailure(null);
		loadFamily();
	}, [loadFamily]);

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
			{selectedPatientId && (
				<div className="mb-4">
					<PatientHeaderCard patientId={selectedPatientId} />
				</div>
			)}

			<div
				className="patient-clinical-grid patients-my-0"
				style={{ marginTop: "16px" }}
			>
				<div className="clinical-col-left" style={{ flex: 1 }}>
					<PatientFamilyCard
						patientId={selectedPatientId}
						patientName={selectedPatient?.fullName || null}
						familyData={familyData}
						loadFailure={familyLoadFailure}
						onRetryLoad={loadFamily}
						onFamilyDataChanged={loadFamily}
					/>

					{selectedPatientId && (
						<PatientWorkspaceView
							patientId={selectedPatientId}
							patientName={selectedPatient?.fullName || null}
							dashboard={dashboard}
						/>
					)}
				</div>
				<div className="clinical-col-right" style={{ flex: 1 }}>
					{selectedPatientId && (
						<PatientNoShowRisk patientId={selectedPatientId} />
					)}

					{selectedPatientId && (
						<PatientWhatsappSendPanel
							patientId={selectedPatientId}
							patientName={selectedPatient?.fullName || null}
							patientPhone={selectedPatient?.phone || null}
						/>
					)}

					{/* 1-Click Accordion: Orthodontics & Lab Orders */}
					{selectedPatientId && (workspaceFlags.hasOrthodontics || true) && (
						<details className="patient-secondary-accordion">
							<summary>
								<span className="flex items-center gap-2">
									<span>🦷</span>
									<span>Ортодонтия и наряды ЗТЛ</span>
								</span>
								<span className="text-xs text-[var(--muted)] font-normal">
									Развернуть &darr;
								</span>
							</summary>
							<div className="patient-secondary-accordion__body">
								{workspaceFlags.hasOrthodontics && (
									<OrthodonticProgressWidget patientId={selectedPatientId} />
								)}
								<LabOrdersPanel patientId={selectedPatientId} />
							</div>
						</details>
					)}

					{/* 1-Click Accordion: Tasks, Reclamations & Consents */}
					{selectedPatientId && (
						<details className="patient-secondary-accordion">
							<summary>
								<span className="flex items-center gap-2">
									<span>📋</span>
									<span>Задачи, файлы, рекламации и согласия</span>
								</span>
								<span className="text-xs text-[var(--muted)] font-normal">
									Развернуть &darr;
								</span>
							</summary>
							<div className="patient-secondary-accordion__body">
								{workspaceFlags.hasReclamations && (
									<PatientReclamationsWidget patientId={selectedPatientId} />
								)}
								{workspaceFlags.hasTasks && (
									<PatientTaskTicketsWidget patientId={selectedPatientId} />
								)}
								<PatientCommunicationConsentsPanel
									patientId={selectedPatientId}
								/>
								<PatientAttachmentsPanel
									patientId={selectedPatientId}
									patientName={selectedPatient?.fullName || null}
								/>
							</div>
						</details>
					)}

					{/* 1-Click Accordion: Timeline & CRM Archive */}
					{selectedPatientId && (
						<details className="patient-secondary-accordion">
							<summary>
								<span className="flex items-center gap-2">
									<span>⏳</span>
									<span>История коммуникаций и CRM</span>
								</span>
								<span className="text-xs text-[var(--muted)] font-normal">
									Развернуть &darr;
								</span>
							</summary>
							<div className="patient-secondary-accordion__body">
								<PatientCommunicationTimelinesWidget patientId={selectedPatientId} />
								<PatientArchiveAndBlacklistWidget patientId={selectedPatientId} />
								<PatientDuplicateMergeQueuesWidget />
							</div>
						</details>
					)}
				</div>
			</div>

			{/* FAB clearance bottom spacer */}
			<div className="h-24 w-full shrink-0 pointer-events-none" aria-hidden="true" />
		</div>
	);
}
