import { CheckCircle2, FileText } from "lucide-react";
import React from "react";
import { useDocumentStore } from "../../../store/documentStore";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";

export function TaxDeductionApplicationForm({
	normalizedTaxApplicationDeliveryChannel,
	normalizedTaxApplicationForm,
	normalizedTaxApplicationRelationshipSelect,
	typedTaxApplicationRelationshipOptions,
	typedTaxApplicationFormOptions,
	typedTaxApplicationDeliveryChannelOptions,
}: any) {
	const {
		taxApplicationTaxpayerFullName,
		setTaxApplicationTaxpayerFullName,
		taxApplicationTaxpayerInn,
		setTaxApplicationTaxpayerInn,
		taxApplicationTaxpayerBirthDate,
		setTaxApplicationTaxpayerBirthDate,
		taxApplicationTaxpayerIdentityDocument,
		setTaxApplicationTaxpayerIdentityDocument,
		taxApplicationRelationship,
		setTaxApplicationRelationship,
		taxApplicationForm,
		setTaxApplicationForm,
		taxApplicationDeliveryChannel,
		setTaxApplicationDeliveryChannel,
		taxApplicationContact,
		setTaxApplicationContact,
		taxApplicationAuthorityDocument,
		setTaxApplicationAuthorityDocument,
		taxApplicationRequestedAt,
		setTaxApplicationRequestedAt,
		taxApplicationDuplicateWarningAccepted,
		setTaxApplicationDuplicateWarningAccepted,
	} = useDocumentStore();

	return (
		<article className="document-payload-card">
			<div>
				<h3>Заявление на налоговую справку</h3>
				<p>
					Заявитель, ИНН, документ, родство, год и способ выдачи без ручных
					правок в HTML.
				</p>
			</div>
			<details className="document-manual-override">
				<summary className="document-summary-toggle">
					✏️ Ручная корректировка полей (развернуть)
				</summary>
				<div className="document-payload-collapsed-content">
					<label>
						Заявитель / налогоплательщик
						<input
							value={taxApplicationTaxpayerFullName}
							onChange={(event) =>
								setTaxApplicationTaxpayerFullName(event.target.value)
							}
						/>
					</label>
					<div className="document-payload-row">
						<label>
							ИНН
							<input
								inputMode="numeric"
								value={taxApplicationTaxpayerInn}
								onChange={(event) =>
									setTaxApplicationTaxpayerInn(
										event.target.value.replace(/[^\d]/g, "").slice(0, 12),
									)
								}
								placeholder={
									taxApplicationForm === "knd_1151156"
										? "12 цифр, если есть"
										: "10 или 12 цифр"
								}
							/>
						</label>
						<label>
							Дата рождения
							<input
								type="date"
								value={taxApplicationTaxpayerBirthDate}
								onChange={(event) =>
									setTaxApplicationTaxpayerBirthDate(event.target.value)
								}
							/>
						</label>
					</div>
					<label>
						Документ заявителя
						<input
							value={taxApplicationTaxpayerIdentityDocument}
							onChange={(event) =>
								setTaxApplicationTaxpayerIdentityDocument(event.target.value)
							}
							placeholder="паспорт, серия, номер, кем и когда выдан"
						/>
					</label>
					<div className="document-payload-row">
						<label>
							Родство
							<select
								value={taxApplicationRelationship}
								onChange={(event) => {
									const nextRelationship =
										normalizedTaxApplicationRelationshipSelect(
											event.target.value,
										);
									setTaxApplicationRelationship(nextRelationship);
									if (nextRelationship === "self")
										setTaxApplicationAuthorityDocument("");
								}}
							>
								{typedTaxApplicationRelationshipOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</label>
						<label>
							Форма
							<select
								value={taxApplicationForm}
								onChange={(event) =>
									setTaxApplicationForm(
										normalizedTaxApplicationForm(event.target.value),
									)
								}
							>
								{typedTaxApplicationFormOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</label>
					</div>
					<div className="document-payload-row">
						<label>
							Канал выдачи
							<select
								value={taxApplicationDeliveryChannel}
								onChange={(event) =>
									setTaxApplicationDeliveryChannel(
										normalizedTaxApplicationDeliveryChannel(event.target.value),
									)
								}
							>
								{typedTaxApplicationDeliveryChannelOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</label>
						<label>
							Дата заявления
							<input
								type="datetime-local"
								value={taxApplicationRequestedAt}
								onChange={(event) =>
									setTaxApplicationRequestedAt(event.target.value)
								}
							/>
						</label>
					</div>
					<label>
						Кому сообщить о готовности
						<input
							value={taxApplicationContact}
							onChange={(event) => setTaxApplicationContact(event.target.value)}
						/>
					</label>
					<label>
						Полномочия представителя
						<input
							value={taxApplicationAuthorityDocument}
							onChange={(event) =>
								setTaxApplicationAuthorityDocument(event.target.value)
							}
							placeholder="если заявитель не сам пациент"
						/>
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={taxApplicationDuplicateWarningAccepted}
							type="checkbox"
							onChange={(event) =>
								setTaxApplicationDuplicateWarningAccepted(event.target.checked)
							}
						/>
						Перед выдачей будет проверен дубль по тем же расходам
					</label>
				</div>
			</details>
		</article>
	);
}
