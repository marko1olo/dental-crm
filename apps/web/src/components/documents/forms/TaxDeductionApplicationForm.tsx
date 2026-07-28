import type {
	TaxDeductionApplicationDeliveryChannel,
	TaxDeductionApplicationForm as TaxDeductionApplicationFormKind,
	TaxDeductionApplicationRelationship,
} from "@dental/shared";
import { useDocumentStore } from "../../../store/documentStore";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import type { DocumentSelectOption } from "./documentFormTypes";

export interface TaxDeductionApplicationFormProps {
	/** Родство заявителя и пациента. */
	relationshipOptions: readonly DocumentSelectOption<TaxDeductionApplicationRelationship>[];
	/** Форма справки: КНД 1151156 с 2024 года или старая для 2021-2023. */
	formOptions: readonly DocumentSelectOption<TaxDeductionApplicationFormKind>[];
	/** Способ выдачи готовой справки. */
	deliveryChannelOptions: readonly DocumentSelectOption<TaxDeductionApplicationDeliveryChannel>[];
	normalizeRelationship: (value: string) => TaxDeductionApplicationRelationship;
	normalizeForm: (value: string) => TaxDeductionApplicationFormKind;
	normalizeDeliveryChannel: (value: string) => TaxDeductionApplicationDeliveryChannel;
}

/**
 * Заявление на налоговую справку.
 *
 * ЭТОТ ФАЙЛ БЫЛ МЁРТВЫМ: компонент не импортировал никто, а экран рисовал ту же
 * форму копией внутри DocumentsView.tsx (строки 2263-2374 до этого коммита).
 * Две копии одной формы означали, что правка в одной из них не доходила до
 * пациента вовсе. Теперь копия в DocumentsView.tsx удалена, а сюда вернулись
 * настоящие типы вместо `any` и общая оболочка карточки.
 */
export function TaxDeductionApplicationForm({
	deliveryChannelOptions,
	formOptions,
	normalizeDeliveryChannel,
	normalizeForm,
	normalizeRelationship,
	relationshipOptions,
}: TaxDeductionApplicationFormProps) {
	const {
		taxApplicationAuthorityDocument,
		taxApplicationContact,
		taxApplicationDeliveryChannel,
		taxApplicationDuplicateWarningAccepted,
		taxApplicationForm,
		taxApplicationRelationship,
		taxApplicationRequestedAt,
		taxApplicationTaxpayerBirthDate,
		taxApplicationTaxpayerFullName,
		taxApplicationTaxpayerIdentityDocument,
		taxApplicationTaxpayerInn,
		setTaxApplicationAuthorityDocument,
		setTaxApplicationContact,
		setTaxApplicationDeliveryChannel,
		setTaxApplicationDuplicateWarningAccepted,
		setTaxApplicationForm,
		setTaxApplicationRelationship,
		setTaxApplicationRequestedAt,
		setTaxApplicationTaxpayerBirthDate,
		setTaxApplicationTaxpayerFullName,
		setTaxApplicationTaxpayerIdentityDocument,
		setTaxApplicationTaxpayerInn,
	} = useDocumentStore();

	return (
		<DocumentPayloadCard
			title="Заявление на налоговую справку"
			description="Заявитель, ИНН, документ, родство, год и способ выдачи без ручных правок в HTML."
		>
			<label>
				Заявитель / налогоплательщик
				<input value={taxApplicationTaxpayerFullName} onChange={(event) => setTaxApplicationTaxpayerFullName(event.target.value)} />
			</label>
			<div className="document-payload-row">
				<label>
					ИНН
					<input
						inputMode="numeric"
						value={taxApplicationTaxpayerInn}
						onChange={(event) => setTaxApplicationTaxpayerInn(event.target.value.replace(/[^\d]/g, "").slice(0, 12))}
						placeholder={taxApplicationForm === "knd_1151156" ? "12 цифр, если есть" : "10 или 12 цифр"}
					/>
				</label>
				<label>
					Дата рождения
					<input
						type="date"
						value={taxApplicationTaxpayerBirthDate}
						onChange={(event) => setTaxApplicationTaxpayerBirthDate(event.target.value)}
					/>
				</label>
			</div>
			<label>
				Документ заявителя
				<input
					value={taxApplicationTaxpayerIdentityDocument}
					onChange={(event) => setTaxApplicationTaxpayerIdentityDocument(event.target.value)}
					placeholder="паспорт, серия, номер, кем и когда выдан"
				/>
			</label>
			<div className="document-payload-row">
				<label>
					Родство
					<select
						value={taxApplicationRelationship}
						onChange={(event) => {
							const nextRelationship = normalizeRelationship(event.target.value);
							setTaxApplicationRelationship(nextRelationship);
							if (nextRelationship === "self") setTaxApplicationAuthorityDocument("");
						}}
					>
						{relationshipOptions.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</label>
				<label>
					Форма
					<select value={taxApplicationForm} onChange={(event) => setTaxApplicationForm(normalizeForm(event.target.value))}>
						{formOptions.map((option) => (
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
						onChange={(event) => setTaxApplicationDeliveryChannel(normalizeDeliveryChannel(event.target.value))}
					>
						{deliveryChannelOptions.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</label>
				<label>
					Дата заявления
					<input type="datetime-local" value={taxApplicationRequestedAt} onChange={(event) => setTaxApplicationRequestedAt(event.target.value)} />
				</label>
			</div>
			<label>
				Кому сообщить о готовности
				<input value={taxApplicationContact} onChange={(event) => setTaxApplicationContact(event.target.value)} />
			</label>
			<label>
				Полномочия представителя
				<input
					value={taxApplicationAuthorityDocument}
					onChange={(event) => setTaxApplicationAuthorityDocument(event.target.value)}
					placeholder="если заявитель не сам пациент"
				/>
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={taxApplicationDuplicateWarningAccepted}
					type="checkbox"
					onChange={(event) => setTaxApplicationDuplicateWarningAccepted(event.target.checked)}
				/>
				Перед выдачей будет проверен дубль по тем же расходам
			</label>
		</DocumentPayloadCard>
	);
}
