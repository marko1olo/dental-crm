import React from "react";
import { isDemoShowcaseMode } from "../../../../lib/demoMode";

export const AnesthesiaVitalsAndBatchFields: React.FC = React.memo(
	function AnesthesiaVitalsAndBatchFields() {
		return (
			<>
				<div className="document-payload-row">
					<label>
						Серия / Партия карпулы
						<input
							placeholder="напр. ART-2026 / 84019"
							defaultValue={isDemoShowcaseMode() ? "ART-2026 / 84019" : undefined}
						/>
					</label>
					<label>
						Срок годности (ГГГГ-ММ)
						<input
							placeholder="напр. 2027-06"
							defaultValue={isDemoShowcaseMode() ? "2027-06" : undefined}
						/>
					</label>
				</div>
				<div className="document-payload-row">
					<label>
						АД (мм рт. ст.) / ЧСС (уд/мин)
						<input
							placeholder="напр. 120/80 мм рт. ст., 72 уд/мин"
							defaultValue={isDemoShowcaseMode() ? "120/80 мм рт. ст., 72 уд/мин" : undefined}
						/>
					</label>
					<label>
						Медсестра / Ассистент
						<input
							placeholder="ФИО ассистента"
							defaultValue={isDemoShowcaseMode() ? "Смирнова А. В." : undefined}
						/>
					</label>
				</div>
			</>
		);
	},
);
