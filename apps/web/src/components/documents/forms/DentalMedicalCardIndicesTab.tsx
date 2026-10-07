import type React from "react";
import type { CpitnIndex, CpitnSextantCode } from "@dental/shared";

export const CPITN_SEXTANT_OPTIONS: Array<{ value: CpitnSextantCode; label: string; hint: string }> = [
	{ value: "0_healthy", label: "0 — Здорова (Норма)", hint: "Десна здорова, кровоточивости и карманов нет" },
	{ value: "1_bleeding", label: "1 — Кровоточивость", hint: "Кровоточивость десны при мягком зондировании" },
	{ value: "2_calculus", label: "2 — Зубной камень", hint: "Над- или поддесневой зубной камень" },
	{ value: "3_pocket_4_5mm", label: "3 — Карман 4–5 мм", hint: "Пародонтальный карман 4–5 мм" },
	{ value: "4_pocket_6mm_plus", label: "4 — Карман ≥ 6 мм", hint: "Глубокий пародонтальный карман ≥ 6 мм" },
	{ value: "x_excluded", label: "X — Секстант исключен", hint: "Менее 2 зубов в секстанте" },
];

export const CPITN_TN_OPTIONS: Array<{ value: CpitnIndex["treatmentNeedCategory"]; label: string }> = [
	{ value: "0_none", label: "TN 0: Лечение не требуется (здоровый пародонт)" },
	{ value: "1_hygiene_instructions", label: "TN 1: Индивидуальная гигиена полости рта и обучение чистке" },
	{ value: "2_scaling_root_planing", label: "TN 2: Профессиональная гигиена (снятие зубных отложений) + гигиена" },
	{ value: "3_complex_periodontal", label: "TN 3: Комплексное пародонтологическое лечение (SRP / кюретаж / хирургия)" },
];

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
	return (
		<div className="form-043u-indices-tab">
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
				<h5 style={{ margin: 0 }}>Пародонтальный индекс CPITN (PSR) по 6 секстантам</h5>
				<button
					type="button"
					data-testid="btn-043-cpitn-norm-1click"
					className="btn btn-sm btn-outline-success"
					onClick={() => {
						setCpitn({
							sextant18_14: "0_healthy",
							sextant13_23: "0_healthy",
							sextant24_28: "0_healthy",
							sextant48_44: "0_healthy",
							sextant43_33: "0_healthy",
							sextant34_38: "0_healthy",
							treatmentNeedCategory: "0_none",
						});
						setHygieneIndexOhiS("OHI-S = 0.0 (Отличная гигиена полости рта)");
					}}
					disabled={effectiveDisabled}
					title="Установить норму пародонта (CPITN 0 / TN 0) и гигиены (OHI-S 0.0)"
				>
					Все секстанты здоровы (Код 0 / TN 0, OHI-S = 0.0)
				</button>
			</div>

			<p className="document-form-muted" style={{ marginBottom: "14px" }}>
				Оценка состояния тканей пародонта по 6 секстантам в соответствии с рекомендациями ВОЗ. Коды: 0 — Здорова; 1 — Кровоточивость; 2 — Камень; 3 — Карман 4–5 мм; 4 — Карман ≥ 6 мм; X — Исключен.
			</p>

			<div style={{ background: "var(--paper-strong, #f8fafc)", padding: "14px", borderRadius: "8px", marginBottom: "16px" }}>
				<h6 style={{ fontWeight: 700, marginBottom: "8px" }}>Верхняя челюсть</h6>
				<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "14px" }}>
					<label>
						Секстант 18–14 (Верхний правый)
						<select
							value={cpitn.sextant18_14}
							onChange={(e) => setCpitn((prev) => ({ ...prev, sextant18_14: e.target.value as CpitnSextantCode }))}
							disabled={effectiveDisabled}
						>
							{CPITN_SEXTANT_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value} title={opt.hint}>
									{opt.label}
								</option>
							))}
						</select>
					</label>
					<label>
						Секстант 13–23 (Верхний фронтальный)
						<select
							value={cpitn.sextant13_23}
							onChange={(e) => setCpitn((prev) => ({ ...prev, sextant13_23: e.target.value as CpitnSextantCode }))}
							disabled={effectiveDisabled}
						>
							{CPITN_SEXTANT_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value} title={opt.hint}>
									{opt.label}
								</option>
							))}
						</select>
					</label>
					<label>
						Секстант 24–28 (Верхний левый)
						<select
							value={cpitn.sextant24_28}
							onChange={(e) => setCpitn((prev) => ({ ...prev, sextant24_28: e.target.value as CpitnSextantCode }))}
							disabled={effectiveDisabled}
						>
							{CPITN_SEXTANT_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value} title={opt.hint}>
									{opt.label}
								</option>
							))}
						</select>
					</label>
				</div>

				<h6 style={{ fontWeight: 700, marginBottom: "8px" }}>Нижняя челюсть</h6>
				<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
					<label>
						Секстант 48–44 (Нижний правый)
						<select
							value={cpitn.sextant48_44}
							onChange={(e) => setCpitn((prev) => ({ ...prev, sextant48_44: e.target.value as CpitnSextantCode }))}
							disabled={effectiveDisabled}
						>
							{CPITN_SEXTANT_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value} title={opt.hint}>
									{opt.label}
								</option>
							))}
						</select>
					</label>
					<label>
						Секстант 43–33 (Нижний фронтальный)
						<select
							value={cpitn.sextant43_33}
							onChange={(e) => setCpitn((prev) => ({ ...prev, sextant43_33: e.target.value as CpitnSextantCode }))}
							disabled={effectiveDisabled}
						>
							{CPITN_SEXTANT_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value} title={opt.hint}>
									{opt.label}
								</option>
							))}
						</select>
					</label>
					<label>
						Секстант 34–38 (Нижний левый)
						<select
							value={cpitn.sextant34_38}
							onChange={(e) => setCpitn((prev) => ({ ...prev, sextant34_38: e.target.value as CpitnSextantCode }))}
							disabled={effectiveDisabled}
						>
							{CPITN_SEXTANT_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value} title={opt.hint}>
									{opt.label}
								</option>
							))}
						</select>
					</label>
				</div>
			</div>

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
						<option key={opt.value} value={opt.value}>
											{opt.label}
						</option>
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
