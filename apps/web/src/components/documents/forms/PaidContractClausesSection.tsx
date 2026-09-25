import React from "react";
import { useDocumentStore } from "../../../store/documentStore";

/**
 * Блок обязательных условий и подтверждений договора по Постановлению Правительства РФ № 736:
 * порядок оплаты, изменение цены, уведомление о бесплатной медпомощи,
 * предупреждение о соблюдении рекомендаций, отказ/возврат, гарантии, дата подписания
 * и 4 регламентных подтверждения пациента.
 */
export const PaidContractClausesSection = React.memo(
	function PaidContractClausesSection() {
		const paidContractPaymentTerms = useDocumentStore(
			(state) => state.paidContractPaymentTerms,
		);
		const setPaidContractPaymentTerms = useDocumentStore(
			(state) => state.setPaidContractPaymentTerms,
		);
		const paidContractPriceChangeRules = useDocumentStore(
			(state) => state.paidContractPriceChangeRules,
		);
		const setPaidContractPriceChangeRules = useDocumentStore(
			(state) => state.setPaidContractPriceChangeRules,
		);
		const paidContractFreeCareNotice = useDocumentStore(
			(state) => state.paidContractFreeCareNotice,
		);
		const setPaidContractFreeCareNotice = useDocumentStore(
			(state) => state.setPaidContractFreeCareNotice,
		);
		const paidContractRecommendationWarning = useDocumentStore(
			(state) => state.paidContractRecommendationWarning,
		);
		const setPaidContractRecommendationWarning = useDocumentStore(
			(state) => state.setPaidContractRecommendationWarning,
		);
		const paidContractRefundTerms = useDocumentStore(
			(state) => state.paidContractRefundTerms,
		);
		const setPaidContractRefundTerms = useDocumentStore(
			(state) => state.setPaidContractRefundTerms,
		);
		const paidContractWarrantyTerms = useDocumentStore(
			(state) => state.paidContractWarrantyTerms,
		);
		const setPaidContractWarrantyTerms = useDocumentStore(
			(state) => state.setPaidContractWarrantyTerms,
		);
		const paidContractSignedAt = useDocumentStore(
			(state) => state.paidContractSignedAt,
		);
		const setPaidContractSignedAt = useDocumentStore(
			(state) => state.setPaidContractSignedAt,
		);
		const paidContractClinicInfoConfirmed = useDocumentStore(
			(state) => state.paidContractClinicInfoConfirmed,
		);
		const setPaidContractClinicInfoConfirmed = useDocumentStore(
			(state) => state.setPaidContractClinicInfoConfirmed,
		);
		const paidContractServiceListConfirmed = useDocumentStore(
			(state) => state.paidContractServiceListConfirmed,
		);
		const setPaidContractServiceListConfirmed = useDocumentStore(
			(state) => state.setPaidContractServiceListConfirmed,
		);
		const paidContractPaidBasisConfirmed = useDocumentStore(
			(state) => state.paidContractPaidBasisConfirmed,
		);
		const setPaidContractPaidBasisConfirmed = useDocumentStore(
			(state) => state.setPaidContractPaidBasisConfirmed,
		);
		const paidContractWrittenChangesConfirmed = useDocumentStore(
			(state) => state.paidContractWrittenChangesConfirmed,
		);
		const setPaidContractWrittenChangesConfirmed = useDocumentStore(
			(state) => state.setPaidContractWrittenChangesConfirmed,
		);

		return (
			<>
				<label>
					Порядок оплаты
					<textarea
						value={paidContractPaymentTerms}
						onChange={(event) =>
							setPaidContractPaymentTerms(event.target.value)
						}
						rows={2}
					/>
				</label>
				<label>
					Изменение цены и объема
					<textarea
						value={paidContractPriceChangeRules}
						onChange={(event) =>
							setPaidContractPriceChangeRules(event.target.value)
						}
						rows={2}
					/>
				</label>
				<label>
					Уведомление о бесплатной помощи
					<textarea
						value={paidContractFreeCareNotice}
						onChange={(event) =>
							setPaidContractFreeCareNotice(event.target.value)
						}
						rows={2}
					/>
				</label>
				<label>
					Предупреждение о рекомендациях врача
					<textarea
						value={paidContractRecommendationWarning}
						onChange={(event) =>
							setPaidContractRecommendationWarning(event.target.value)
						}
						rows={2}
					/>
				</label>
				<label>
					Отказ и возврат
					<textarea
						value={paidContractRefundTerms}
						onChange={(event) =>
							setPaidContractRefundTerms(event.target.value)
						}
						rows={2}
					/>
				</label>
				<label>
					Гарантия и претензии
					<textarea
						value={paidContractWarrantyTerms}
						onChange={(event) =>
							setPaidContractWarrantyTerms(event.target.value)
						}
						rows={2}
					/>
				</label>
				<label>
					Подписано
					<input
						value={paidContractSignedAt}
						onChange={(event) =>
							setPaidContractSignedAt(event.target.value)
						}
					/>
				</label>
				<label className="document-payload-checkbox">
					<input
						checked={paidContractClinicInfoConfirmed}
						type="checkbox"
						onChange={(event) =>
							setPaidContractClinicInfoConfirmed(event.target.checked)
						}
					/>
					Пациент получил сведения о клинике, лицензии и исполнителе
				</label>
				<label className="document-payload-checkbox">
					<input
						checked={paidContractServiceListConfirmed}
						type="checkbox"
						onChange={(event) =>
							setPaidContractServiceListConfirmed(
								event.target.checked,
							)
						}
					/>
					Перечень услуг и стоимость переданы пациенту до подписания
				</label>
				<label className="document-payload-checkbox">
					<input
						checked={paidContractPaidBasisConfirmed}
						type="checkbox"
						onChange={(event) =>
							setPaidContractPaidBasisConfirmed(event.target.checked)
						}
					/>
					Пациент понимает платную основу оказания услуг
				</label>
				<label className="document-payload-checkbox">
					<input
						checked={paidContractWrittenChangesConfirmed}
						type="checkbox"
						onChange={(event) =>
							setPaidContractWrittenChangesConfirmed(
								event.target.checked,
							)
						}
					/>
					Изменения состава или стоимости оформляются письменно
				</label>
			</>
		);
	},
);

PaidContractClausesSection.displayName = "PaidContractClausesSection";
