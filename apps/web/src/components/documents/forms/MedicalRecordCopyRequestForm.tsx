import { AnamnesisField } from "../AnamnesisField";
import { PaidContractRequiredFieldsPanel } from "../PaidContractRequiredFieldsPanel";
import { EmptyState } from "../../EmptyState";
import {
	EXTRACT_DIAGNOSIS_CHIPS,
	PAID_CONTRACT_FIELDS_BLOCK_TITLE,
} from "./documentFormChips";
import type { MedicalDocumentReleaseChannel } from "../../../store/documentStore";

export function MedicalRecordCopyRequestForm(props: any) {

            const {
                article,
                div,
                h3,
                p,
                details,
                summary,
                label,
                textarea,
                copyRequestDocumentTypes,
                event,
                setCopyRequestDocumentTypes,
                input,
                copyRequestPeriodStart,
                setCopyRequestPeriodStart,
                copyRequestPeriodEnd,
                setCopyRequestPeriodEnd,
                select,
                copyRequestFormat,
                setCopyRequestFormat,
                normalizedMedicalDocumentReleaseChannel,
                medicalDocumentReleaseChannelLabels,
                value,
                option,
                copyRequestRecipientFullName,
                setCopyRequestRecipientFullName,
                documentPatient,
                copyRequestRecipientIdentityDocument,
                setCopyRequestRecipientIdentityDocument,
                copyRequestRecipientAuthority,
                setCopyRequestRecipientAuthority,
                copyRequestRepresentativeAuthorityDocument,
                setCopyRequestRepresentativeAuthorityDocument,
                copyRequestRequestedAt,
                setCopyRequestRequestedAt,
                copyRequestContactForDelivery,
                setCopyRequestContactForDelivery,
                copyRequestSpecialInstructions,
                setCopyRequestSpecialInstructions,
                copyRequestIncludeDicomSourceData,
                setCopyRequestIncludeDicomSourceData,
                copyRequestIdentityVerified,
                setCopyRequestIdentityVerified,
                copyRequestThirdPartyDataChecked,
                setCopyRequestThirdPartyDataChecked
            } = props;
            
            return (
                <article className="document-payload-card">
    							<div>
    								<h3>Запрос копий меддокументов</h3>
    								<p>
    									Состав, период, формат, получатель, полномочия и контакт
    									выдачи без пустых полей.
    								</p>
    							</div>
    							<details
    								className="document-manual-override"
    								style={{
    									background: "var(--surface-100)",
    									padding: "12px 16px",
    									borderRadius: "8px",
    									border: "1px solid var(--line)",
    									marginTop: "16px",
    								}}
    							>
    								<summary
    									style={{
    										cursor: "pointer",
    										fontWeight: 600,
    										color: "var(--brand-700)",
    										userSelect: "none",
    									}}
    								>
    									✏️ Ручная корректировка полей (развернуть)
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
    												setCopyRequestRecipientIdentityDocument(
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
    												setCopyRequestIncludeDicomSourceData(
    													event.target.checked,
    												)
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
    												setCopyRequestThirdPartyDataChecked(
    													event.target.checked,
    												)
    											}
    										/>
    										Лишние данные третьих лиц будут исключены
    									</label>
    								</div>
    							</details>
    						</article>
            );
            
}
