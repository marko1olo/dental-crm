import React, { useState, useMemo, useEffect, useRef } from "react";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import {
	calculateTonnIndex,
	calculatePontIndex,
	type OrthodonticCard043_1uPayload,
	type FacialProfileType,
	type OrthodonticAppliancePlan,
} from "@dental/shared";

type LipCompetenceType = "competent_closed" | "incompetent_open" | "closed_with_strain";

export interface OrthodonticPatientCardFormProps {
	initialPayload?: Partial<OrthodonticCard043_1uPayload>;
	onChange?: (payload: OrthodonticCard043_1uPayload) => void;
	disabled?: boolean;
}

export const OrthodonticPatientCardForm: React.FC<OrthodonticPatientCardFormProps> = React.memo(
	function OrthodonticPatientCardForm({ initialPayload, onChange, disabled }) {
		const [activeSection, setActiveSection] = useState<"indices" | "cephalometry" | "anthropometry" | "plan">("indices");

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

		// Pont measurements (in mm)
		const [premolarWidthActual, setPremolarWidthActual] = useState<number>(35.0);
		const [molarWidthActual, setMolarWidthActual] = useState<number>(45.0);

		// TRG Angles
		const [snaAngle, setSnaAngle] = useState<number>(
			initialPayload?.cephalometry?.snaAngle ?? 82.0,
		);
		const [snbAngle, setSnbAngle] = useState<number>(
			initialPayload?.cephalometry?.snbAngle ?? 80.0,
		);
		const [anbAngle, setAnbAngle] = useState<number>(
			initialPayload?.cephalometry?.anbAngle ?? 2.0,
		);

		// Facial anthropometry
		const [profileType, setProfileType] = useState<FacialProfileType>(
			initialPayload?.anthropometry?.profileType ?? "straight",
		);
		const [lipCompetence, setLipCompetence] = useState<
			"competent_closed" | "incompetent_open" | "closed_with_strain"
		>(initialPayload?.anthropometry?.lipCompetenceAtRest ?? "competent_closed");

		// Appliance plan
		const [applianceType, setApplianceType] = useState<OrthodonticAppliancePlan["applianceType"]>(
			initialPayload?.appliancePlan?.applianceType ?? "metal_braces_self_ligating",
		);
		const [durationMonths, setDurationMonths] = useState<number>(
			initialPayload?.appliancePlan?.estimatedDurationMonths ?? 18,
		);

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

		// Bidirectional data binding: call onChange when inputs change
		const onChangeRef = useRef(onChange);
		onChangeRef.current = onChange;

		useEffect(() => {
			if (!onChangeRef.current) return;

			const payload: OrthodonticCard043_1uPayload = {
				formNumber: "043-1/у",
				clinicLegalName: initialPayload?.clinicLegalName ?? "Стоматологическая клиника",
				clinicAddress: initialPayload?.clinicAddress ?? null,
				clinicOgrn: initialPayload?.clinicOgrn ?? null,
				clinicInn: initialPayload?.clinicInn ?? null,
				clinicLicenseNumber: initialPayload?.clinicLicenseNumber ?? null,
				clinicLicenseDate: initialPayload?.clinicLicenseDate ?? null,
				clinicLicenseIssuer: initialPayload?.clinicLicenseIssuer ?? null,
				medicalCardNumber: initialPayload?.medicalCardNumber ?? "ОРТО-01",
				cardOpenedDate: initialPayload?.cardOpenedDate ?? new Date().toISOString().slice(0, 10),
				patientFullName: initialPayload?.patientFullName ?? "Пациент",
				patientBirthDate: initialPayload?.patientBirthDate ?? "1995-01-01",
				patientSex: initialPayload?.patientSex ?? "female",
				patientPhone: initialPayload?.patientPhone ?? null,
				patientAddress: initialPayload?.patientAddress ?? null,
				legalRepresentativeFullName: initialPayload?.legalRepresentativeFullName ?? null,
				orthodontistFullName: initialPayload?.orthodontistFullName ?? "Врач-ортодонт",
				orthodonticDiagnosis: initialPayload?.orthodonticDiagnosis ?? "Скученное положение зубов фронтального отдела",
				icd10DiagnosisCode: initialPayload?.icd10DiagnosisCode ?? "K07.2",
				angleMolarClassRight: initialPayload?.angleMolarClassRight ?? "class_1",
				angleMolarClassLeft: initialPayload?.angleMolarClassLeft ?? "class_1",
				angleCanineClassRight: initialPayload?.angleCanineClassRight ?? "class_1",
				angleCanineClassLeft: initialPayload?.angleCanineClassLeft ?? "class_1",
				anthropometry: {
					facialType: initialPayload?.anthropometry?.facialType ?? "mesoprosopic",
					profileType,
					facialSymmetry: initialPayload?.anthropometry?.facialSymmetry ?? "symmetric",
					chinDeviationMm: initialPayload?.anthropometry?.chinDeviationMm ?? 0,
					nasolabialAngleDegrees: initialPayload?.anthropometry?.nasolabialAngleDegrees ?? 102,
					mentolabialSulcus: initialPayload?.anthropometry?.mentolabialSulcus ?? "normal",
					lipCompetenceAtRest: lipCompetence,
					incisalDisplayAtSmileMm: initialPayload?.anthropometry?.incisalDisplayAtSmileMm ?? 3,
					gummySmileMm: initialPayload?.anthropometry?.gummySmileMm ?? 0,
					photoProtocolCompleted: true,
				},
				cephalometry: {
					snaAngle,
					snbAngle,
					anbAngle,
					witsAppraisalMm: initialPayload?.cephalometry?.witsAppraisalMm ?? 0,
					fmaAngle: initialPayload?.cephalometry?.fmaAngle ?? 25,
					snGoGnAngle: initialPayload?.cephalometry?.snGoGnAngle ?? 32,
					upperIncisorToNaAngle: initialPayload?.cephalometry?.upperIncisorToNaAngle ?? 22,
					upperIncisorToNaMm: initialPayload?.cephalometry?.upperIncisorToNaMm ?? 4,
					lowerIncisorToNbAngle: initialPayload?.cephalometry?.lowerIncisorToNbAngle ?? 25,
					lowerIncisorToNbMm: initialPayload?.cephalometry?.lowerIncisorToNbMm ?? 4,
					interincisalAngle: initialPayload?.cephalometry?.interincisalAngle ?? 130,
					growthPattern: initialPayload?.cephalometry?.growthPattern ?? "normodivergent",
					skeletalClass: anbAngle > 4 ? "class_2_sub_1" : anbAngle < 0 ? "class_3" : "class_1",
				},
				tonnIndexNotes: `Индекс Тона: SI/Si = ${tonnResult.ratio.toFixed(2)} (Норма: ${tonnResult.normReference.toFixed(2)}) — ${tonnResult.interpretation}`,
				pontIndexNotes: pontResult.interpretation,
				boltonIndexNotes: initialPayload?.boltonIndexNotes ?? "Индекс Болтона: переднее соотношение 77.2%, общее 91.3% (гармонично).",
				korkhausIndexNotes: initialPayload?.korkhausIndexNotes ?? "Индекс Коркхауза: длина переднего отрезка верхней зубной дуги соответствует норме.",
				appliancePlan: {
					applianceType,
					alignerStepsCount: initialPayload?.appliancePlan?.alignerStepsCount ?? 0,
					extractionPlan: initialPayload?.appliancePlan?.extractionPlan ?? "non_extraction",
					treatmentStages: initialPayload?.appliancePlan?.treatmentStages ?? [
						"1. Подготовительный этап: санация полости рта, профессиональная гигиена",
						"2. Этап нивелирования и выравнивания зубных рядов",
						"3. Этап коррекции сагиттального и трансверзального соотношения",
						"4. Финишная детализация окклюзионных контактов",
						"5. Ретенционный период: несъемные ретейнеры + капы",
					],
					estimatedDurationMonths: durationMonths,
					retentionProtocol: initialPayload?.appliancePlan?.retentionProtocol ?? "Несъемный ретейнер 33-43, 13-23 + ретенционная капа",
				},
			};

			onChangeRef.current(payload);
		}, [
			initialPayload,
			upperIncisors,
			lowerIncisors,
			premolarWidthActual,
			molarWidthActual,
			snaAngle,
			snbAngle,
			anbAngle,
			profileType,
			lipCompetence,
			applianceType,
			durationMonths,
			tonnResult,
			pontResult,
		]);

		return (
			<div className="document-form-container orthodontic-card-wrapper">
				<DocumentPayloadCard
					title="Медицинская карта ортодонтического пациента"
					description="Антропометрия лица, цефалометрия ТРГ, расчет индексов Тона, Пона, Болтона и план аппаратурного лечения"
				>
					<div className="document-form-nav-tabs" style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
						<button
							type="button"
							className={`btn btn-secondary ${activeSection === "indices" ? "active" : ""}`}
							onClick={() => setActiveSection("indices")}
							disabled={disabled}
						>
							Биометрические индексы (Тон, Пон)
						</button>
						<button
							type="button"
							className={`btn btn-secondary ${activeSection === "cephalometry" ? "active" : ""}`}
							onClick={() => setActiveSection("cephalometry")}
							disabled={disabled}
						>
							Цефалометрия ТРГ
						</button>
						<button
							type="button"
							className={`btn btn-secondary ${activeSection === "anthropometry" ? "active" : ""}`}
							onClick={() => setActiveSection("anthropometry")}
							disabled={disabled}
						>
							Антропометрия лица
						</button>
						<button
							type="button"
							className={`btn btn-secondary ${activeSection === "plan" ? "active" : ""}`}
							onClick={() => setActiveSection("plan")}
							disabled={disabled}
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
													disabled={disabled}
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
													disabled={disabled}
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
										disabled={disabled}
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
										disabled={disabled}
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
										disabled={disabled}
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
										disabled={disabled}
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
										disabled={disabled}
										onChange={(e) => setAnbAngle(Number(e.target.value))}
									/>
								</div>
							</div>
							<div style={{ fontSize: "13px", color: "var(--muted)" }}>
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
									<select
										className="form-control"
										value={profileType}
										disabled={disabled}
										onChange={(e) => setProfileType(e.target.value as FacialProfileType)}
									>
										<option value="straight">Прямой гармоничный</option>
										<option value="convex">Выпуклый (ретрогнатия н/ч / прогнатия в/ч)</option>
										<option value="concave">Вогнутый (прогнатия н/ч / ретрогнатия в/ч)</option>
									</select>
								</div>
								<div>
									<label style={{ fontSize: "12px", fontWeight: 600 }}>Смыкание губ</label>
									<select
										className="form-control"
										value={lipCompetence}
										disabled={disabled}
										onChange={(e) => setLipCompetence(e.target.value as LipCompetenceType)}
									>
										<option value="competent_closed">Сомкнуты в покое без напряжения</option>
										<option value="incompetent_open">Не смыкаются (зияние ротовой щели)</option>
										<option value="closed_with_strain">Смыкаются с напряжением подбородочной мышцы</option>
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
								<select
									className="form-control"
									value={applianceType}
									disabled={disabled}
									onChange={(e) => setApplianceType(e.target.value as OrthodonticAppliancePlan["applianceType"])}
								>
									<option value="metal_braces_self_ligating">Брекет-система металлическая самолигирующая</option>
									<option value="metal_braces_standard">Брекет-система металлическая лигатурная</option>
									<option value="ceramic_braces_aesthetic">Брекет-система керамическая эстетическая</option>
									<option value="lingual_braces">Лингвальная брекет-система</option>
									<option value="clear_aligners">Прозрачные элайнеры (каппы)</option>
									<option value="rapid_palatal_expander_haas">Аппарат быстрого нёбного расширения (Haas)</option>
									<option value="functional_twin_block">Функциональный двучелюстной аппарат (Twin Block)</option>
									<option value="plate_removable_orthodontic">Пластиночный съемный аппарат</option>
									<option value="skeletal_anchorage_miniscrews">Микроимпланты / скелетный анкораж</option>
								</select>
							</div>
							<div className="form-group" style={{ marginBottom: "10px" }}>
								<label style={{ fontWeight: 600 }}>Ориентировочная продолжительность активного этапа (месяцев)</label>
								<input
									type="number"
									min={1}
									max={60}
									className="form-control"
									value={durationMonths}
									disabled={disabled}
									onChange={(e) => setDurationMonths(Number(e.target.value))}
								/>
							</div>
						</div>
					)}
				</DocumentPayloadCard>
			</div>
		);
	},
);

// Backward-compatible export alias for any callers expecting the old symbol
export const OrthodonticCard043_1uForm = OrthodonticPatientCardForm;
export type OrthodonticCard043_1uFormProps = OrthodonticPatientCardFormProps;
