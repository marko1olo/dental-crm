import { CheckCircle2, FileText } from "lucide-react";
import React from "react";
import type { MedicalDocumentReleaseChannel } from "../../../store/documentStore";
import { useDocumentStore } from "../../../store/documentStore";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";

export function MedicalDocumentReleaseReceiptForm({
	documentPatient,
	medicalDocumentReleaseChannelLabels,
	normalizedMedicalDocumentReleaseChannel,
	releaseProtectionNote,
	selectedReleaseSourceRequestDocumentId,
	setReleaseProtectionNote,
	typedIssuedMedicalCopyRequestDocuments,
	releaseSourceRequestOptionLabel,
}: any) {
	const {
		releaseAccessExpiresAt,
		releaseChannel,
		releaseDeliveredAt,
		releaseDocumentTypes,
		releasePeriodEnd,
		releasePeriodStart,
		releaseRecipientAuthority,
		releaseRecipientFullName,
		releaseRecipientIdentityDocument,
		releaseThirdPartyDataChecked,
		setReleaseAccessExpiresAt,
		setReleaseChannel,
		setReleaseDeliveredAt,
		setReleaseDocumentTypes,
		setReleasePeriodEnd,
		setReleasePeriodStart,
		setReleaseRecipientAuthority,
		setReleaseRecipientFullName,
		setReleaseRecipientIdentityDocument,
		setReleaseSourceRequestDocumentId,
		setReleaseThirdPartyDataChecked,
	} = useDocumentStore();

	return (
		<article className="document-payload-card">
			<div>
				<h3>Выдача меддокументов</h3>
				<p>
					Только по конкретному уже выданному запросу пациента или
					представителя.
				</p>
			</div>
			<details className="document-manual-override">
				<summary className="document-summary-toggle">
					✏️ Ручная корректировка полей (развернуть)
				</summary>
				<div className="document-payload-collapsed-content">
					<label>
						Основание выдачи
						<select
							value={selectedReleaseSourceRequestDocumentId}
							onChange={(event) =>
								setReleaseSourceRequestDocumentId(event.target.value)
							}
						>
							<option value="">Выберите выданный запрос на копии</option>
							{typedIssuedMedicalCopyRequestDocuments.map((document) => (
								<option key={document.id} value={document.id}>
									{releaseSourceRequestOptionLabel(document)}
								</option>
							))}
						</select>
						<small>
							Сначала создайте и выдайте документ «Запрос на копии медицинской
							документации». Расписка будет привязана к выбранному запросу.
						</small>
					</label>
					<label>
						Получатель
						<input
							value={releaseRecipientFullName}
							onChange={(event) =>
								setReleaseRecipientFullName(event.target.value)
							}
							placeholder={documentPatient?.fullName ?? "ФИО пациента"}
						/>
					</label>
					<label>
						Документ получателя
						<input
							value={releaseRecipientIdentityDocument}
							onChange={(event) =>
								setReleaseRecipientIdentityDocument(event.target.value)
							}
							placeholder={
								documentPatient?.administrativeProfile?.identityDocument ??
								"паспорт / доверенность"
							}
						/>
					</label>
					<label>
						Основание полномочий
						<input
							value={releaseRecipientAuthority}
							onChange={(event) =>
								setReleaseRecipientAuthority(event.target.value)
							}
						/>
					</label>
					<label>
						Канал выдачи
						<select
							value={releaseChannel}
							onChange={(event) =>
								setReleaseChannel(
									normalizedMedicalDocumentReleaseChannel(event.target.value),
								)
							}
						>
							{(
								Object.entries(medicalDocumentReleaseChannelLabels) as Array<
									[MedicalDocumentReleaseChannel, string]
								>
							).map(([value, label]) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					</label>
					<label>
						Состав выдачи
						<textarea
							value={releaseDocumentTypes}
							onChange={(event) => setReleaseDocumentTypes(event.target.value)}
							rows={3}
						/>
					</label>
					<div className="document-payload-row">
						<label>
							Период с
							<input
								value={releasePeriodStart}
								onChange={(event) => setReleasePeriodStart(event.target.value)}
							/>
						</label>
						<label>
							Период по
							<input
								value={releasePeriodEnd}
								onChange={(event) => setReleasePeriodEnd(event.target.value)}
							/>
						</label>
					</div>
					<label>
						Дата и время выдачи
						<input
							value={releaseDeliveredAt}
							onChange={(event) => setReleaseDeliveredAt(event.target.value)}
						/>
					</label>
					<label>
						Доступ действует до
						<input
							value={releaseAccessExpiresAt}
							onChange={(event) =>
								setReleaseAccessExpiresAt(event.target.value)
							}
						/>
					</label>
					<label>
						Защита передачи
						<textarea
							value={releaseProtectionNote}
							onChange={(event) => setReleaseProtectionNote(event.target.value)}
							rows={2}
						/>
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={releaseThirdPartyDataChecked}
							type="checkbox"
							onChange={(event) =>
								setReleaseThirdPartyDataChecked(event.target.checked)
							}
						/>
						Лишние данные третьих лиц исключены
					</label>
				</div>
			</details>
		</article>
	);
}
