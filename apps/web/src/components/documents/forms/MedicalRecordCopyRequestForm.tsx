import { CheckCircle2, FileText } from "lucide-react";
import React from "react";
import type { MedicalDocumentReleaseChannel } from "../../../store/documentStore";
import { useDocumentStore } from "../../../store/documentStore";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";

export function MedicalRecordCopyRequestForm({
	documentPatient,
	medicalDocumentReleaseChannelLabels,
	normalizedMedicalDocumentReleaseChannel,
}: any) {
	const {
		copyRequestContactForDelivery,
		copyRequestDocumentTypes,
		copyRequestFormat,
		copyRequestIdentityVerified,
		copyRequestIncludeDicomSourceData,
		copyRequestPeriodEnd,
		copyRequestPeriodStart,
		copyRequestRecipientAuthority,
		copyRequestRecipientFullName,
		copyRequestRecipientIdentityDocument,
		copyRequestRepresentativeAuthorityDocument,
		copyRequestRequestedAt,
		copyRequestSpecialInstructions,
		copyRequestThirdPartyDataChecked,
		setCopyRequestContactForDelivery,
		setCopyRequestDocumentTypes,
		setCopyRequestFormat,
		setCopyRequestIdentityVerified,
		setCopyRequestIncludeDicomSourceData,
		setCopyRequestPeriodEnd,
		setCopyRequestPeriodStart,
		setCopyRequestRecipientAuthority,
		setCopyRequestRecipientFullName,
		setCopyRequestRecipientIdentityDocument,
		setCopyRequestRepresentativeAuthorityDocument,
		setCopyRequestRequestedAt,
		setCopyRequestSpecialInstructions,
		setCopyRequestThirdPartyDataChecked,
	} = useDocumentStore();

	return (
		<article className="document-payload-card">
			<div>
				<h3>Запрос копий меддокументов</h3>
				<p>
					Состав, период, формат, получатель, полномочия и контакт выдачи без
					пустых полей.
				</p>
			</div>
			<details className="document-manual-override">
				<summary className="document-summary-toggle">
					✏️ Ручная корректировка полей (развернуть)
				</summary>
				<div className="document-payload-collapsed-content">
					<label>
						Что выдать
						<textarea
							value={copyRequestDocumentTypes}
							onChange={(event) =>
								setCopyRequestDocumentTypes(event.target.value)
							}
							rows={3}
						/>
					</label>
					<div className="document-payload-row">
						<label>
							Период с
							<input
								value={copyRequestPeriodStart}
								onChange={(event) =>
									setCopyRequestPeriodStart(event.target.value)
								}
							/>
						</label>
						<label>
							Период по
							<input
								value={copyRequestPeriodEnd}
								onChange={(event) =>
									setCopyRequestPeriodEnd(event.target.value)
								}
							/>
						</label>
					</div>
					<label>
						Формат выдачи
						<select
							value={copyRequestFormat}
							onChange={(event) =>
								setCopyRequestFormat(
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
						Получатель
						<input
							value={copyRequestRecipientFullName}
							onChange={(event) =>
								setCopyRequestRecipientFullName(event.target.value)
							}
							placeholder={documentPatient?.fullName ?? "ФИО пациента"}
						/>
					</label>
					<label>
						Документ получателя
						<input
							value={copyRequestRecipientIdentityDocument}
							onChange={(event) =>
								setCopyRequestRecipientIdentityDocument(event.target.value)
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
							value={copyRequestRecipientAuthority}
							onChange={(event) =>
								setCopyRequestRecipientAuthority(event.target.value)
							}
						/>
					</label>
					<label>
						Документ представителя
						<input
							value={copyRequestRepresentativeAuthorityDocument}
							onChange={(event) =>
								setCopyRequestRepresentativeAuthorityDocument(
									event.target.value,
								)
							}
							placeholder="доверенность, свидетельство, законный представитель"
						/>
					</label>
					<div className="document-payload-row">
						<label>
							Дата запроса
							<input
								value={copyRequestRequestedAt}
								onChange={(event) =>
									setCopyRequestRequestedAt(event.target.value)
								}
							/>
						</label>
						<label>
							Контакт и канал
							<input
								value={copyRequestContactForDelivery}
								onChange={(event) =>
									setCopyRequestContactForDelivery(event.target.value)
								}
								placeholder={
									documentPatient?.phone ??
									documentPatient?.email ??
									"телефон, email или портал"
								}
							/>
						</label>
					</div>
					<label>
						Особые указания
						<textarea
							value={copyRequestSpecialInstructions}
							onChange={(event) =>
								setCopyRequestSpecialInstructions(event.target.value)
							}
							placeholder="например: выдать исходные файлы снимков, подготовить архив, передать только лично"
							rows={2}
						/>
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={copyRequestIncludeDicomSourceData}
							type="checkbox"
							onChange={(event) =>
								setCopyRequestIncludeDicomSourceData(event.target.checked)
							}
						/>
						Если есть КТ/снимки, запросить исходные файлы снимков
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={copyRequestIdentityVerified}
							type="checkbox"
							onChange={(event) =>
								setCopyRequestIdentityVerified(event.target.checked)
							}
						/>
						Личность получателя проверена
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={copyRequestThirdPartyDataChecked}
							type="checkbox"
							onChange={(event) =>
								setCopyRequestThirdPartyDataChecked(event.target.checked)
							}
						/>
						Лишние данные третьих лиц будут исключены
					</label>
				</div>
			</details>
		</article>
	);
}
