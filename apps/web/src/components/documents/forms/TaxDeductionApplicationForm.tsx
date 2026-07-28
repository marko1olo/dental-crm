import type {
	TaxDeductionApplicationDeliveryChannel,
	TaxDeductionApplicationForm as TaxDeductionApplicationFormKind,
	TaxDeductionApplicationRelationship,
} from "@dental/shared";
import { useDocumentStore } from "../../../store/documentStore";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import { taxApplicationBlockersReview } from "../taxApplicationBlockers";
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
 *
 * Сверху карточки — перечень невыполненных условий. Разбор и три ловушки, которые
 * по виду экрана угадать нельзя (ИНН обязателен не всегда, полномочия
 * представителя становятся обязательными по родству, контакт обязателен без
 * подсказки), записаны в taxApplicationBlockers.ts.
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

	const review = taxApplicationBlockersReview({
		taxpayerFullName: taxApplicationTaxpayerFullName,
		taxpayerInn: taxApplicationTaxpayerInn,
		taxpayerBirthDate: taxApplicationTaxpayerBirthDate,
		taxpayerIdentityDocument: taxApplicationTaxpayerIdentityDocument,
		relationship: taxApplicationRelationship,
		form: taxApplicationForm,
		authorityDocument: taxApplicationAuthorityDocument,
		contact: taxApplicationContact,
		duplicateWarningAccepted: taxApplicationDuplicateWarningAccepted,
	});

	return (
		<DocumentPayloadCard
			title="Заявление на налоговую справку"
			description="Заявитель, ИНН, документ, родство, год и способ выдачи без ручных правок в HTML."
			notice={
				review.blockers.length > 0 ? (
					<div
						className="schedule-create-missing document-tax-application-blockers"
						role="status"
						aria-live="polite"
						style={{ marginTop: "12px" }}
					>
						<strong>
							Заявление не создастся: осталось {review.blockers.length} условий из{" "}
							{review.requiredCount}:
						</strong>
						<ul>
							{review.blockers.map((blocker) => (
								<li key={blocker.field}>
									{blocker.label} — {blocker.hint}
								</li>
							))}
						</ul>
						<small>
							Все эти поля в блоке «Ручная корректировка полей» ниже. Дату заявления
							программа поставит сама при создании.
						</small>
					</div>
				) : null
			}
		>
			<label>
				Заявитель / налогоплательщик
				<input
					value={taxApplicationTaxpayerFullName}
					onChange={(event) => setTaxApplicationTaxpayerFullName(event.target.value)}
					placeholder="ФИО того, кто получит вычет"
				/>
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
				<input
					value={taxApplicationContact}
					onChange={(event) => setTaxApplicationContact(event.target.value)}
					placeholder="телефон или другой способ связи"
				/>
			</label>
			<label>
				Полномочия представителя
				{/*
					Подпись пустого поля зависит от родства намеренно. Раньше здесь всегда
					стояло «если заявитель не сам пациент», то есть поле читалось как
					необязательное ровно в том случае, когда без него заявление не
					создастся.
				*/}
				<input
					value={taxApplicationAuthorityDocument}
					onChange={(event) => setTaxApplicationAuthorityDocument(event.target.value)}
					placeholder={
						taxApplicationRelationship === "self"
							? "не требуется: заявитель — сам пациент"
							: "обязательно: доверенность, свидетельство о рождении или о браке"
					}
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
