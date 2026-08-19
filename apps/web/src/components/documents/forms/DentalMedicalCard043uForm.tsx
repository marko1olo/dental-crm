import React, { useState, useMemo } from "react";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import {
	calculateDmftFromOdontogram,
	type FullForm043uPayload,
	type DentalConditionCode,
	type DentalSurfaceName,
	type ToothFormulaFdiState,
	type PeriodontalCpitnSextantCode,
	DENTAL_CONDITION_LABELS,
} from "@dental/shared";

export interface DentalMedicalCard043uFormProps {
	initialPayload?: Partial<FullForm043uPayload>;
	onChange?: (payload: FullForm043uPayload) => void;
	disabled?: boolean;
}

const PERMANENT_TEETH_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const PERMANENT_TEETH_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const DECIDUOUS_TEETH_UPPER = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const DECIDUOUS_TEETH_LOWER = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

const SURFACES: Array<{ key: DentalSurfaceName; label: string }> = [
	{ key: "occlusal", label: "Оккл." },
	{ key: "vestibular", label: "Вестиб." },
	{ key: "oral", label: "Оральн." },
	{ key: "mesial", label: "Медиал." },
	{ key: "distal", label: "Дистал." },
];

export const DentalMedicalCard043uForm: React.FC<DentalMedicalCard043uFormProps> = React.memo(
	function DentalMedicalCard043uForm({ initialPayload, onChange, disabled }) {
		const [activeTab, setActiveTab] = useState<"formula" | "indices" | "anamnesis" | "soap">("formula");
		const [selectedTooth, setSelectedTooth] = useState<number>(16);

		// Dental formula state
		const [odontogram, setOdontogram] = useState<ToothFormulaFdiState>(() => {
			return initialPayload?.dentalFormula?.odontogram ?? {};
		});

		// Selected surface condition
		const [activeCondition, setActiveCondition] = useState<DentalConditionCode>("C");

		// CPITN
		const [cpitnSextants, setCpitnSextants] = useState<Record<string, PeriodontalCpitnSextantCode>>(() => {
			return (
				initialPayload?.periodontalStatus?.cpitnSextants ?? {
					upperRight: 0,
					upperAnterior: 0,
					upperLeft: 0,
					lowerRight: 0,
					lowerAnterior: 0,
					lowerLeft: 0,
				}
			);
		});

		// Anamnesis
		const [complaints, setComplaints] = useState(
			initialPayload?.anamnesisAndHealth?.mainComplaints ?? "Жалобы на эстетический дефект, периодический дискомфорт при приеме сладкой пищи.",
		);
		const [anamnesisMorbi, setAnamnesisMorbi] = useState(
			initialPayload?.anamnesisAndHealth?.anamnesisMorbi ?? "Считает себя больным около 2 месяцев, ранее за помощью не обращался.",
		);
		const [allergies, setAllergies] = useState(
			initialPayload?.anamnesisAndHealth?.allergicHistory ?? "Аллергоанамнез не отягощен.",
		);

		// Calculate DMFT
		const dmftResult = useMemo(() => {
			return calculateDmftFromOdontogram(odontogram);
		}, [odontogram]);

		const handleSurfaceToggle = (toothNumber: number, surface: DentalSurfaceName) => {
			if (disabled) return;
			setOdontogram((prev) => {
				const currentTooth = prev[toothNumber] ?? {
					toothNumber,
					condition: "H",
					surfaces: {},
				};
				const currentSurfaces = { ...currentTooth.surfaces };
				if (currentSurfaces[surface] === activeCondition) {
					delete currentSurfaces[surface];
				} else {
					currentSurfaces[surface] = activeCondition;
				}
				const hasCaries = Object.values(currentSurfaces).includes("C");
				const hasFilling = Object.values(currentSurfaces).includes("F");
				const newCondition = hasCaries ? "C" : hasFilling ? "F" : currentTooth.condition;

				return {
					...prev,
					[toothNumber]: {
						...currentTooth,
						condition: newCondition,
						surfaces: currentSurfaces,
					},
				};
			});
		};

		const handleToothConditionSet = (toothNumber: number, cond: DentalConditionCode) => {
			if (disabled) return;
			setOdontogram((prev) => ({
				...prev,
				[toothNumber]: {
					toothNumber,
					condition: cond,
					surfaces: cond === "H" || cond === "X" || cond === "A" ? {} : (prev[toothNumber]?.surfaces ?? {}),
				},
			}));
		};

		return (
			<div className="document-form-container form-043u-wrapper">
				<DocumentPayloadCard
					title="Медицинская карта стоматологического пациента (Форма № 043/у)"
					description="Официальная форма Минздрава РФ с зубной формулой FDI, индексами КПУ/CPITN и дневниками SOAP"
				>
					<div className="document-form-nav-tabs" style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
						<button
							type="button"
							className={`btn btn-secondary ${activeTab === "formula" ? "active" : ""}`}
							onClick={() => setActiveTab("formula")}
						>
							Зубная формула FDI и КПУ
						</button>
						<button
							type="button"
							className={`btn btn-secondary ${activeTab === "indices" ? "active" : ""}`}
							onClick={() => setActiveTab("indices")}
						>
							Индексы и Пародонт (CPITN)
						</button>
						<button
							type="button"
							className={`btn btn-secondary ${activeTab === "anamnesis" ? "active" : ""}`}
							onClick={() => setActiveTab("anamnesis")}
						>
							Анамнез и СОПР
						</button>
					</div>

					{activeTab === "formula" && (
						<div className="form-043u-formula-tab">
							<div className="alert alert-info" style={{ marginBottom: "12px", padding: "10px" }}>
								<strong>Индекс интенсивности кариеса (КПУ): </strong>
								<span>
									К = {dmftResult.decayed}, П = {dmftResult.filled}, У = {dmftResult.missing} | <strong>КПУ(з) = {dmftResult.dmftTotal}</strong> ({dmftResult.intensityLevelLabel})
								</span>
							</div>

							<div className="condition-selector-bar" style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
								<span style={{ alignSelf: "center", fontWeight: 600, marginRight: "4px" }}>Статус:</span>
								{(["C", "F", "P", "Pt", "R", "X", "H", "Im", "Cr"] as DentalConditionCode[]).map((code) => (
									<button
										key={code}
										type="button"
										className={`btn btn-sm ${activeCondition === code ? "btn-primary" : "btn-outline-secondary"}`}
										onClick={() => setActiveCondition(code)}
										title={DENTAL_CONDITION_LABELS[code]?.label}
									>
										{code} — {DENTAL_CONDITION_LABELS[code]?.label}
									</button>
								))}
							</div>

							<div className="fdi-formula-grid" style={{ background: "var(--paper-strong, #f8fafc)", padding: "12px", borderRadius: "8px" }}>
								<div style={{ textAlign: "center", fontWeight: 700, marginBottom: "6px" }}>Верхняя челюсть (Постоянный прикус)</div>
								<div style={{ display: "flex", justifyContent: "center", gap: "4px", marginBottom: "10px", flexWrap: "wrap" }}>
									{PERMANENT_TEETH_UPPER.map((t) => {
										const tooth = odontogram[t];
										const isSelected = selectedTooth === t;
										return (
											<div
												key={t}
												onClick={() => setSelectedTooth(t)}
												style={{
													border: isSelected ? "2px solid #2563eb" : "1px solid #cbd5e1",
													borderRadius: "4px",
													padding: "4px 6px",
													minWidth: "36px",
													textAlign: "center",
													cursor: "pointer",
													background: tooth?.condition === "C" ? "#fee2e2" : tooth?.condition === "F" ? "#dcfce7" : tooth?.condition === "X" ? "#94a3b8" : "var(--paper, #ffffff)",
												}}
											>
												<div style={{ fontSize: "11px", fontWeight: 700 }}>{t}</div>
												<div style={{ fontSize: "10px", color: "#64748b" }}>{tooth?.condition ?? "H"}</div>
											</div>
										);
									})}
								</div>

								<div style={{ textAlign: "center", fontWeight: 700, margin: "6px 0" }}>Нижняя челюсть (Постоянный прикус)</div>
								<div style={{ display: "flex", justifyContent: "center", gap: "4px", flexWrap: "wrap" }}>
									{PERMANENT_TEETH_LOWER.map((t) => {
										const tooth = odontogram[t];
										const isSelected = selectedTooth === t;
										return (
											<div
												key={t}
												onClick={() => setSelectedTooth(t)}
												style={{
													border: isSelected ? "2px solid #2563eb" : "1px solid #cbd5e1",
													borderRadius: "4px",
													padding: "4px 6px",
													minWidth: "36px",
													textAlign: "center",
													cursor: "pointer",
													background: tooth?.condition === "C" ? "#fee2e2" : tooth?.condition === "F" ? "#dcfce7" : tooth?.condition === "X" ? "#94a3b8" : "var(--paper, #ffffff)",
												}}
											>
												<div style={{ fontSize: "11px", fontWeight: 700 }}>{t}</div>
												<div style={{ fontSize: "10px", color: "#64748b" }}>{tooth?.condition ?? "H"}</div>
											</div>
										);
									})}
								</div>
							</div>

							{selectedTooth && (
								<div className="surface-editor-card" style={{ marginTop: "14px", padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
									<h4 style={{ margin: "0 0 8px 0" }}>Поверхности зуба № {selectedTooth}</h4>
									<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
										{SURFACES.map((s) => {
											const currentCond = odontogram[selectedTooth]?.surfaces?.[s.key];
											return (
												<button
													key={s.key}
													type="button"
													className={`btn btn-sm ${currentCond ? "btn-warning" : "btn-outline-secondary"}`}
													onClick={() => handleSurfaceToggle(selectedTooth, s.key)}
												>
													{s.label}: {currentCond ?? "Здоров"}
												</button>
											);
										})}
										<button
											type="button"
											className="btn btn-sm btn-danger"
											onClick={() => handleToothConditionSet(selectedTooth, "X")}
										>
											Удален (X)
										</button>
										<button
											type="button"
											className="btn btn-sm btn-success"
											onClick={() => handleToothConditionSet(selectedTooth, "H")}
										>
											Здоров (H)
										</button>
									</div>
								</div>
							)}
						</div>
					)}

					{activeTab === "indices" && (
						<div className="form-043u-indices-tab">
							<h4>Индекс CPITN (Оценка состояния тканей пародонта по секстантам)</h4>
							<p style={{ fontSize: "12px", color: "#64748b" }}>
								Коды: 0 — Здоров, 1 — Кровоточивость, 2 — Зубной камень, 3 — Карман 4-5 мм, 4 — Карман 6+ мм, X — Исключен
							</p>
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", margin: "12px 0" }}>
								{Object.entries({
									upperRight: "Верхний правый (17-14)",
									upperAnterior: "Верхний фронт (13-23)",
									upperLeft: "Верхний левый (24-27)",
									lowerRight: "Нижний правый (47-44)",
									lowerAnterior: "Нижний фронт (43-33)",
									lowerLeft: "Нижний левый (34-37)",
								}).map(([key, label]) => (
									<div key={key} style={{ padding: "8px", background: "var(--paper-strong, #f8fafc)", borderRadius: "6px" }}>
										<label style={{ fontSize: "12px", fontWeight: 600 }}>{label}</label>
										<select
											className="form-control form-control-sm"
											value={cpitnSextants[key] ?? 0}
											onChange={(e) => {
												const val = e.target.value === "X" ? "X" : Number(e.target.value);
												setCpitnSextants((prev) => ({ ...prev, [key]: val as PeriodontalCpitnSextantCode }));
											}}
										>
											<option value={0}>0 — Здоров</option>
											<option value={1}>1 — Кровоточивость</option>
											<option value={2}>2 — Зубной камень</option>
											<option value={3}>3 — Карман 4-5 мм</option>
											<option value={4}>4 — Карман 6+ мм</option>
											<option value="X">X — Секстант исключен</option>
										</select>
									</div>
								))}
							</div>
						</div>
					)}

					{activeTab === "anamnesis" && (
						<div className="form-043u-anamnesis-tab">
							<div className="form-group" style={{ marginBottom: "12px" }}>
								<label style={{ fontWeight: 600 }}>Жалобы пациента</label>
								<textarea
									className="form-control"
									rows={2}
									value={complaints}
									onChange={(e) => setComplaints(e.target.value)}
								/>
							</div>
							<div className="form-group" style={{ marginBottom: "12px" }}>
								<label style={{ fontWeight: 600 }}>Анамнез заболевания (Anamnesis morbi)</label>
								<textarea
									className="form-control"
									rows={2}
									value={anamnesisMorbi}
									onChange={(e) => setAnamnesisMorbi(e.target.value)}
								/>
							</div>
							<div className="form-group" style={{ marginBottom: "12px" }}>
								<label style={{ fontWeight: 600 }}>Аллергологический анамнез</label>
								<input
									type="text"
									className="form-control"
									value={allergies}
									onChange={(e) => setAllergies(e.target.value)}
								/>
							</div>
						</div>
					)}
				</DocumentPayloadCard>
			</div>
		);
	},
);
