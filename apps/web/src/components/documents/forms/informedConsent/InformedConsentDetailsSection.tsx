import React from "react";

export interface InformedConsentDetailsSectionProps {
	docStore: any;
}

export const InformedConsentDetailsSection: React.FC<InformedConsentDetailsSectionProps> = React.memo(
	function InformedConsentDetailsSection({ docStore }) {
		return (
			<>
				<label>
					Материалы, препараты и ограничения
					<textarea
						value={docStore.informedConsentMaterialNotes}
						onChange={(e) => docStore.setInformedConsentMaterialNotes(e.target.value)}
						rows={2}
					/>
				</label>
				<label>
					Кому можно сообщать медицинские сведения
					<input
						value={docStore.informedConsentTrustedContact}
						onChange={(e) => docStore.setInformedConsentTrustedContact(e.target.value)}
						placeholder="кому пациент разрешил сообщать сведения, или «никому»"
					/>
				</label>
				<label>
					Разъясненные риски
					<textarea
						value={docStore.informedConsentRisks}
						onChange={(e) => docStore.setInformedConsentRisks(e.target.value)}
						rows={4}
					/>
				</label>
				<label>
					Альтернативы
					<textarea
						value={docStore.informedConsentAlternatives}
						onChange={(e) => docStore.setInformedConsentAlternatives(e.target.value)}
						rows={4}
					/>
				</label>
				<label>
					После вмешательства
					<textarea
						value={docStore.informedConsentAftercare}
						onChange={(e) => docStore.setInformedConsentAftercare(e.target.value)}
						rows={4}
					/>
				</label>
				<label className="document-payload-checkbox">
					<input
						checked={docStore.informedConsentQuestionsAnswered}
						type="checkbox"
						onChange={(e) => docStore.setInformedConsentQuestionsAnswered(e.target.checked)}
					/>
					Пациент получил ответы на вопросы
				</label>
				<label className="document-payload-checkbox">
					<input
						checked={docStore.informedConsentRisksUnderstood}
						type="checkbox"
						onChange={(e) => docStore.setInformedConsentRisksUnderstood(e.target.checked)}
					/>
					Пациент понял риски, ограничения и прогноз
				</label>
				<label className="document-payload-checkbox">
					<input
						checked={docStore.informedConsentWithdrawUnderstood}
						type="checkbox"
						onChange={(e) => docStore.setInformedConsentWithdrawUnderstood(e.target.checked)}
					/>
					Пациенту объяснено право отказаться до вмешательства
				</label>
			</>
		);
	},
);
