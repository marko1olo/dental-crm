import React from "react";
import { useDocumentStore } from "../../../store/documentStore";
import { PaidContractChecklist } from "./paidContract/PaidContractChecklist";

export const PaidContractClausesSection = React.memo(
	function PaidContractClausesSection() {
		const {
			paidContractPaymentTerms, setPaidContractPaymentTerms,
			paidContractPriceChangeRules, setPaidContractPriceChangeRules,
			paidContractFreeCareNotice, setPaidContractFreeCareNotice,
			paidContractRecommendationWarning, setPaidContractRecommendationWarning,
			paidContractRefundTerms, setPaidContractRefundTerms,
			paidContractWarrantyTerms, setPaidContractWarrantyTerms,
			paidContractSignedAt, setPaidContractSignedAt,
		} = useDocumentStore();

		return (
			<>
				<label>
					Порядок оплаты
					<textarea
						value={paidContractPaymentTerms}
						onChange={(e) => setPaidContractPaymentTerms(e.target.value)}
						rows={2}
					/>
				</label>
				<label>
					Изменение цены и объема
					<textarea
						value={paidContractPriceChangeRules}
						onChange={(e) => setPaidContractPriceChangeRules(e.target.value)}
						rows={2}
					/>
				</label>
				<label>
					Уведомление о бесплатной помощи
					<textarea
						value={paidContractFreeCareNotice}
						onChange={(e) => setPaidContractFreeCareNotice(e.target.value)}
						rows={2}
					/>
				</label>
				<label>
					Предупреждение о рекомендациях врача
					<textarea
						value={paidContractRecommendationWarning}
						onChange={(e) => setPaidContractRecommendationWarning(e.target.value)}
						rows={2}
					/>
				</label>
				<label>
					Отказ и возврат
					<textarea
						value={paidContractRefundTerms}
						onChange={(e) => setPaidContractRefundTerms(e.target.value)}
						rows={2}
					/>
				</label>
				<label>
					Гарантия и претензии
					<textarea
						value={paidContractWarrantyTerms}
						onChange={(e) => setPaidContractWarrantyTerms(e.target.value)}
						rows={2}
					/>
				</label>
				<label>
					Подписано
					<input
						value={paidContractSignedAt}
						onChange={(e) => setPaidContractSignedAt(e.target.value)}
					/>
				</label>
				<PaidContractChecklist />
			</>
		);
	},
);

PaidContractClausesSection.displayName = "PaidContractClausesSection";
