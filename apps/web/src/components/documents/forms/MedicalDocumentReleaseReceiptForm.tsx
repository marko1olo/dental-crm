import type {
	GeneratedDocument,
	Patient,
} from "@dental/shared";
import { Edit3 } from "lucide-react";
import React from "react";
import {
	formatShortDate,
	type MedicalDocumentReleaseChannel,
	medicalDocumentReleaseChannelLabels,
	normalizedMedicalDocumentReleaseChannel,
} from "../../../AppHelpers";
import { useDocumentStore } from "../../../store/documentStore";

export type MedicalCopyRequestSourceDocument = GeneratedDocument & {
	chainSummary?: {
		medicalRecordCopyRequest?: {
			requestedDocumentTypes?: string[];
			recipientFullName?: string;
			requestedFormat?: MedicalDocumentReleaseChannel;
		} | null;
	} | null;
};

export interface MedicalDocumentReleaseReceiptFormProps {
	documentPatient?: Patient | null | undefined;
	issuedMedicalCopyRequestDocuments?: MedicalCopyRequestSourceDocument[] | undefined;
	releaseProtectionNote?: string | undefined;
	setReleaseProtectionNote?: ((value: string) => void) | undefined;
}

export function releaseSourceRequestOptionLabel(
	document: MedicalCopyRequestSourceDocument,
): string {
	const request = document.chainSummary?.medicalRecordCopyRequest;
	const requestedDocuments = (request?.requestedDocumentTypes ?? [])
		.map((type) => type.trim())
		.filter(Boolean)
		.slice(0, 2)
		.join(", ");
	return [
		document.title,
		document.issuedAt ? formatShortDate(document.issuedAt) : null,
		request?.recipientFullName?.trim() || null,
		request?.requestedFormat
			? medicalDocumentReleaseChannelLabels[request.requestedFormat]
			: null,
		requestedDocuments || null,
	]
		.filter((part): part is string => Boolean(part))
		.join(" · ");
}

export const MedicalDocumentReleaseReceiptForm: React.FC<
	MedicalDocumentReleaseReceiptFormProps
> = ({
	documentPatient,
	issuedMedicalCopyRequestDocuments,
	releaseProtectionNote: propReleaseProtectionNote,
	setReleaseProtectionNote: propSetReleaseProtectionNote,
}) => {
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
		releaseSourceRequestDocumentId,
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
				<summary
					style={{
						cursor: "pointer",
						fontWeight: 600,
						color: "var(--brand-700)",
						userSelect: "none",
					}}
				>
					<span
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: "6px",
						}}
					>
						<Edit3 size={13} aria-hidden="true" />
						Ручная корректировка полей (развернуть)
					</span>
				</summary>
				<div
					className="document-payload-collapsed-content"
					style={{
						marginTop: "16px",
						display: "flex",
						flexDirection: "column",
						gap: "16px",
					}}
				>
					<label>
						Основание выдачи
						<select
							value={releaseSourceRequestDocumentId}
							onChange={(event) =>
								setReleaseSourceRequestDocumentId(event.target.value)
							}
						>
							<option value="">
								Выберите выданный запрос на копии
							</option>
							{issuedMedicalCopyRequestDocuments?.map((document) => (
								<option key={document.id} value={document.id}>
									{releaseSourceRequestOptionLabel(document)}
								</option>
							))}
						</select>
						<small>
							Сначала создайте и выдайте документ «Запрос на копии
							медицинской документации». Расписка будет привязана к
							выбранному запросу.
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
								setReleaseRecipientIdentityDocument(
									event.target.value,
								)
							}
							placeholder={
								documentPatient?.administrativeProfile
									?.identityDocument ?? "паспорт / доверенность"
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
									normalizedMedicalDocumentReleaseChannel(
										event.target.value,
									),
								)
							}
						>
							{(
								Object.entries(
									medicalDocumentReleaseChannelLabels,
								) as Array<[MedicalDocumentReleaseChannel, string]>
							)?.map(([value, label]) => (
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
							onChange={(event) =>
								setReleaseDocumentTypes(event.target.value)
							}
							rows={3}
						/>
					</label>
					<div className="document-payload-row">
						<label>
							Период с
							<input
								value={releasePeriodStart}
								onChange={(event) =>
									setReleasePeriodStart(event.target.value)
								}
							/>
						</label>
						<label>
							Период по
							<input
								value={releasePeriodEnd}
								onChange={(event) =>
									setReleasePeriodEnd(event.target.value)
								}
							/>
						</label>
					</div>
					<label>
						Дата и время выдачи
						<input
							value={releaseDeliveredAt}
							onChange={(event) =>
								setReleaseDeliveredAt(event.target.value)
							}
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
							value={propReleaseProtectionNote}
							onChange={(event) =>
								propSetReleaseProtectionNote?.(event.target.value)
							}
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
};
