import React from "react";
import { useDocumentStore } from "../../../../store/documentStore";

export const AnesthesiaCheckboxes: React.FC = React.memo(
	function AnesthesiaCheckboxes() {
		const {
			anesthesiaRisksExplained, setAnesthesiaRisksExplained,
			anesthesiaAllergyRestrictionsChecked, setAnesthesiaAllergyRestrictionsChecked,
			anesthesiaConsentConfirmed, setAnesthesiaConsentConfirmed,
		} = useDocumentStore();

		return (
			<>
				<label className="document-payload-checkbox">
					<input
						checked={anesthesiaRisksExplained}
						type="checkbox"
						onChange={(e) => setAnesthesiaRisksExplained(e.target.checked)}
					/>
					Пациенту объяснены риски и ограничения анестезии
				</label>
				<label className="document-payload-checkbox">
					<input
						checked={anesthesiaAllergyRestrictionsChecked}
						type="checkbox"
						onChange={(e) => setAnesthesiaAllergyRestrictionsChecked(e.target.checked)}
					/>
					Аллергии, лекарства и ограничения проверены до введения
				</label>
				<label className="document-payload-checkbox">
					<input
						checked={anesthesiaConsentConfirmed}
						type="checkbox"
						onChange={(e) => setAnesthesiaConsentConfirmed(e.target.checked)}
					/>
					Пациент согласен на выбранную местную анестезию
				</label>
			</>
		);
	},
);
