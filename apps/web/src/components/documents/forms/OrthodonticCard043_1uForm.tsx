import React, { useState, useMemo } from "react";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import {
	calculateTonnIndex,
	calculatePontIndex,
	calculateBoltonIndex,
	type OrthodonticCard043_1uPayload,
} from "@dental/shared";

export interface OrthodonticCard043_1uFormProps {
	initialPayload?: Partial<OrthodonticCard043_1uPayload>;
	onChange?: (payload: OrthodonticCard043_1uPayload) => void;
	disabled?: boolean;
}

export const OrthodonticCard043_1uForm: React.FC<OrthodonticCard043_1uFormProps> = React.memo(
	function OrthodonticCard043_1uForm({ initialPayload, onChange, disabled }) {
		const [activeSection, setActiveSection] = useState<"anthropometry" | "cephalometry" | "indices" | "plan">("indices");

		// Tooth crown width inputs (in mm)
		const [upperIncisors, setUpperIncisors] = useState({
			t12: 7.0,
			t11: 8.5,
			t21: 8.5,
			t22: 7.0,
		});
		const [lowerIncisors, setLowerIncisors] = useState({
			t42: 6.0,
			t41: 5.5,
			t31: 5.5,
			t32: 6.0,
		});

		// Pont measurements
		const [premolarWidthActual, setPremolarWidthActual] = useState<number>(35.0);
		const [molarWidthActual, setMolarWidthActual] = useState<number>(45.0);

		// TRG Angles
		const [snaAngle, setSnaAngle] = useState<number>(82.0);
		const [snbAngle, setSnbAngle] = useState<number>(80.0);
		const [anbAngle, setAnbAngle] = useState<number>(2.0);

		// Calculate Tonn
		const tonnResult = useMemo(() => {
			const sumUpper = upperIncisors.t12 + upperIncisors.t11 + upperIncisors.t21 + upperIncisors.t22;
			const sumLower = lowerIncisors.t42 + lowerIncisors.t41 + lowerIncisors.t31 + lowerIncisors.t32;
			return calculateTonnIndex(sumUpper, sumLower);
		}, [upperIncisors, lowerIncisors]);

		// Calculate Pont
		const pontResult = useMemo(() => {
			const sumUpper = upperIncisors.t12 + upperIncisors.t11 + upperIncisors.t21 + upperIncisors.t22;
			return calculatePontIndex(sumUpper, premolarWidthActual, molarWidthActual);
		}, [upperIncisors, premolarWidthActual, molarWidthActual]);

		return (
			<div className="document-form-container form-043-1u-wrapper">
				<DocumentPayloadCard
					title="Медицинская карта ортодонтического пациента (Форма № 043-1/у)"
					description="Антропометрия лица, цефалометрия ТРГ, расчет индексов Тона, Пона, Болтона и план аппаратурного лечения"
				>
					<div className="document-form-nav-tabs" style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
						<button
							type="button"
							className={`btn btn-secondary ${activeSection === "indices" ? "active" : ""}`}
							onClick={() => setActiveSection("indices")}
						>
							Биометрические индексы (Тон, Пон)
						</button>
						<button
							type="button"
							className={`btn btn-secondary ${activeSection === "cephalometry" ? "active" : ""}`}
							onClick={() => setActiveSection("cephalometry")}
						>
							Цефалометрия ТРГ
						</button>
						<button
							type="button"
							className={`btn btn-secondary ${activeSection === "anthropometry" ? "active" : ""}`}
							onClick={() => setActiveSection("anthropometry")}
						>
							Антропометрия лица
						</button>
						<button
							type="button"
							className={`btn btn-secondary ${activeSection === "plan" ? "active" : ""}`}
							onClick={() => setActiveSection("plan")}
						>
							Аппаратурный план
						</button>
					</div>

					{activeSection === "indices" && (
						<div className="ortho-indices-section">
							<div className="alert alert-info" style={{ marginBottom: "14px", padding: "10px" }}>
								<div style={{ fontWeight: 700, marginBottom: "4px" }}>Результаты биометрического анализа моделей:</div>
								<div>
									<strong>Индекс Тона:</strong> SI/Si = {tonnResult.ratio.toFixed(2)} (Норма: {tonnResult.normReference.toFixed(2)}) — {tonnResult.interpretation}
								</div>
								<div>
									<strong>Индекс Пона:</strong> Премолярная ширина {pontResult.premolars.actualWidthMm} мм (Норма: {pontResult.premolars.expectedWidthMm} мм, Δ: {pontResult.premolars.discrepancyMm > 0 ? `+${pontResult.premolars.discrepancyMm}` : pontResult.premolars.discrepancyMm} мм) | Молярная ширина {pontResult.molars.actualWidthMm} мм (Норма: {pontResult.molars.expectedWidthMm} мм, Δ: {pontResult.molars.discrepancyMm > 0 ? `+${pontResult.molars.discrepancyMm}` : pontResult.molars.discrepancyMm} мм)
								</div>
							</div>

							<h4 style={{ margin: "10px 0" }}>Ширина коронок резцов (мм)</h4>
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
								<div style={{ background: "var(--paper-strong, #f8fafc)", padding: "10px", borderRadius: "6px" }}>
									<div style={{ fontWeight: 600, marginBottom: "6px" }}>Верхние 4 резца (SI)</div>
									<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px" }}>
										{(["t12", "t11", "t21", "t22"] as const).map((k) => (
											<div key={k}>
												<label style={{ fontSize: "12px", fontWeight: 600 }}>{k.toUpperCase()}</label>
												<input
													type="number"
													step="0.1"
													className="form-control form-control-sm"
													value={upperIncisors[k]}
													onChange={(e) => setUpperIncisors((prev) => ({ ...prev, [k]: Number(e.target.value) }))}
												/>
											</div>
										))}
									</div>
								</div>

								<div style={{ background: "var(--paper-strong, #f8fafc)", padding: "10px", borderRadius: "6px" }}>
									<div style={{ fontWeight: 600, marginBottom: "6px" }}>Нижние 4 резца (Si)</div>
									<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px" }}>
										{(["t42", "t41", "t31", "t32"] as const).map((k) => (
											<div key={k}>
												<label style={{ fontSize: "12px", fontWeight: 600 }}>{k.toUpperCase()}</label>
												<input
													type="number"
													step="0.1"
													className="form-control form-control-sm"
													value={lowerIncisors[k]}
													onChange={(e) => setLowerIncisors((prev) => ({ ...prev, [k]: Number(e.target.value) }))}
												/>
											</div>
										))}
									</div>
								</div>
							</div>

							<h4 style={{ margin: "10px 0" }}>Фактическая ширина зубных рядов (мм)</h4>
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
								<div>
									<label style={{ fontSize: "12px", fontWeight: 600 }}>Премолярная ширина (между 14-24 / 44-34)</label>
									<input
										type="number"
										step="0.5"
										className="form-control"
										value={premolarWidthActual}
										onChange={(e) => setPremolarWidthActual(Number(e.target.value))}
									/>
								</div>
								<div>
									<label style={{ fontSize: "12px", fontWeight: 600 }}>Молярная ширина (между 16-26 / 46-36)</label>
									<input
										type="number"
										step="0.5"
										className="form-control"
										value={molarWidthActual}
										onChange={(e) => setMolarWidthActual(Number(e.target.value))}
									/>
								</div>
							</div>
						</div>
					)}

					{activeSection === "cephalometry" && (
						<div className="ortho-trg-section">
							<h4>Цефалометрический анализ ТРГ в боковой проекции</h4>
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", margin: "12px 0" }}>
								<div>
									<label style={{ fontSize: "12px", fontWeight: 600 }}>Угол SNA (Норма: 82° ± 2°)</label>
									<input
										type="number"
										step="0.5"
										className="form-control"
										value={snaAngle}
										onChange={(e) => setSnaAngle(Number(e.target.value))}
									/>
								</div>
								<div>
									<label style={{ fontSize: "12px", fontWeight: 600 }}>Угол SNB (Норма: 80° ± 2°)</label>
									<input
										type="number"
										step="0.5"
										className="form-control"
										value={snbAngle}
										onChange={(e) => setSnbAngle(Number(e.target.value))}
									/>
								</div>
								<div>
									<label style={{ fontSize: "12px", fontWeight: 600 }}>Угол ANB (Норма: 2° ± 2°)</label>
									<input
										type="number"
										step="0.5"
										className="form-control"
										value={anbAngle}
										onChange={(e) => setAnbAngle(Number(e.target.value))}
									/>
								</div>
							</div>
							<div style={{ fontSize: "13px", color: "#475569" }}>
								Скелетный класс: <strong>{anbAngle > 4 ? "II Скелетный класс (прогнатия в/ч или микрогнатия н/ч)" : anbAngle < 0 ? "III Скелетный класс (прогения н/ч или ретрогнатия в/ч)" : "I Скелетный класс (ортогнатическое соотношение челюстей)"}</strong>
							</div>
						</div>
					)}

					{activeSection === "anthropometry" && (
						<div className="ortho-anthropometry-section">
							<h4>Антропометрическая оценка лица и профиля</h4>
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", margin: "12px 0" }}>
								<div>
									<label style={{ fontSize: "12px", fontWeight: 600 }}>Тип профиля лица</label>
									<select className="form-control">
										<option value="straight">Прямой гармоничный</option>
										<option value="convex">Выпуклый (ретрогнатия н/ч / прогнатия в/ч)</option>
										<option value="concave">Вогнутый (прогнатия н/ч / ретрогнатия в/ч)</option>
									</select>
								</div>
								<div>
									<label style={{ fontSize: "12px", fontWeight: 600 }}>Смыкание губ</label>
									<select className="form-control">
										<option value="competent">Сомкнуты в покое без напряжения</option>
										<option value="incompetent">Не смыкаются (зияние ротовой щели)</option>
										<option value="strained">Смыкаются с напряжением подбородочной мышцы</option>
									</select>
								</div>
							</div>
						</div>
					)}

					{activeSection === "plan" && (
						<div className="ortho-plan-section">
							<h4>План аппаратурного и ортодонтического лечения</h4>
							<div className="form-group" style={{ marginBottom: "10px" }}>
								<label style={{ fontWeight: 600 }}>Выбранная аппаратура</label>
								<select className="form-control">
									<option value="fixed_braces_metal">Брекет-система металлическая вестибулярная</option>
									<option value="fixed_braces_ceramic">Брекет-система керамическая эстетическая</option>
									<option value="aligners">Прозрачные элайнеры (каппы)</option>
									<option value="expansion_appliance">Аппарат быстрого нёбного расширения (Haas/RPE)</option>
									<option value="functional_appliance">Функциональный двучелюстной аппарат (Twin Block)</option>
								</select>
							</div>
							<div className="form-group" style={{ marginBottom: "10px" }}>
								<label style={{ fontWeight: 600 }}>Ориентировочная продолжительность активного этапа</label>
								<input type="text" className="form-control" defaultValue="18-24 месяца" />
							</div>
						</div>
					)}
				</DocumentPayloadCard>
			</div>
		);
	},
);
