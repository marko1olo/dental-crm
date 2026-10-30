import React from "react";
import type { CpitnIndex } from "@dental/shared";
import { CPITN_SEXTANT_OPTIONS, CPITN_TN_OPTIONS } from "./medicalCardIndices/cpitnOptions";
import { CpitnSextantsGrid } from "./medicalCardIndices/CpitnSextantsGrid";

export { CPITN_SEXTANT_OPTIONS, CPITN_TN_OPTIONS };

export interface DentalMedicalCardIndicesTabProps {
	readonly cpitn: CpitnIndex;
	readonly setCpitn: React.Dispatch<React.SetStateAction<CpitnIndex>>;
	readonly hygieneIndexOhiS: string;
	readonly setHygieneIndexOhiS: (v: string) => void;
	readonly effectiveDisabled: boolean;
}

export const DentalMedicalCardIndicesTab: React.FC<DentalMedicalCardIndicesTabProps> = ({
	cpitn,
	setCpitn,
	hygieneIndexOhiS,
	setHygieneIndexOhiS,
	effectiveDisabled,
}) => {
	const handleResetToHealthy = () => {
		setCpitn({
			sextant18_14: "0_healthy", sextant13_23: "0_healthy", sextant24_28: "0_healthy",
			sextant48_44: "0_healthy", sextant43_33: "0_healthy", sextant34_38: "0_healthy",
			treatmentNeedCategory: "0_none",
		});
		setHygieneIndexOhiS("OHI-S = 0.0 (Отличная гигиена полости рта)");
	};

	return (
		<div className="form-043u-indices-tab">
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
				<h5 style={{ margin: 0 }}>Пародонтальный индекс CPITN (PSR) по 6 секстантам</h5>
				<button
					type="button"
					data-testid="btn-043-cpitn-norm-1click"
					className="btn btn-sm btn-outline-success"
					onClick={handleResetToHealthy}
					disabled={effectiveDisabled}
					title="Установить норму пародонта (CPITN 0 / TN 0) и гигиены (OHI-S 0.0)"
				>
					Все секстанты здоровы (Код 0 / TN 0, OHI-S = 0.0)
				</button>
			</div>

			<p className="document-form-muted" style={{ marginBottom: "14px" }}>
				Оценка состояния тканей пародонта по 6 секстантам в соответствии с рекомендациями ВОЗ. Коды: 0 — Здорова; 1 — Кровоточивость; 2 — Камень; 3 — Карман 4–5 мм; 4 — Карман ≥ 6 мм; X — Исключен.
			</p>

			<CpitnSextantsGrid cpitn={cpitn} setCpitn={setCpitn} effectiveDisabled={effectiveDisabled} />

			<div style={{ marginBottom: "16px" }}>
				<label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
					Категория потребности в пародонтологическом лечении (Treatment Need):
				</label>
				<select
					value={cpitn.treatmentNeedCategory}
					onChange={(e) => setCpitn((prev) => ({ ...prev, treatmentNeedCategory: e.target.value as CpitnIndex["treatmentNeedCategory"] }))}
					disabled={effectiveDisabled}
					style={{ width: "100%" }}
				>
					{CPITN_TN_OPTIONS.map((opt) => (
						<option key={opt.value} value={opt.value}>{opt.label}</option>
					))}
				</select>
			</div>

			<div>
				<label style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
					Индекс гигиены полости рта (OHI-S / Грин-Вермиллиона):
				</label>
				<input
					type="text"
					value={hygieneIndexOhiS}
					onChange={(e) => setHygieneIndexOhiS(e.target.value)}
					placeholder="например, OHI-S = 0.8 (Хорошая гигиена)"
					disabled={effectiveDisabled}
					style={{ width: "100%" }}
				/>
			</div>
		</div>
	);
};
