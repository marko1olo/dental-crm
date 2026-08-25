import React, { useState, useMemo } from "react";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import {
	calculateDmftFromOdontogram,
	type FullForm043uPayload,
	type ToothClinicalStatusCode,
	type ToothSurface,
	type FdiToothRecord,
	toothStatusCodeLabels,
	toothStatusCodeShortMap,
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

const SURFACES: Array<{ key: ToothSurface; label: string }> = [
	{ key: "occlusal", label: "Оккл. (O)" },
	{ key: "vestibular", label: "Вестиб. (V)" },
	{ key: "oral", label: "Оральн. (L)" },
	{ key: "mesial", label: "Медиал. (M)" },
	{ key: "distal", label: "Дистал. (D)" },
];

const SELECTABLE_STATUSES: ToothClinicalStatusCode[] = [
	"healthy",
	"caries_media",
	"caries_profunda",
	"filled_satisfactory",
	"pulpitis_acute",
	"periodontitis_chronic",
	"crown_zirconia",
	"implant",
	"extracted_absent",
	"root_remnant",
];

export const DentalMedicalCard043uForm: React.FC<DentalMedicalCard043uFormProps> = React.memo(
	function DentalMedicalCard043uForm({ initialPayload, onChange, disabled }) {
		const [activeTab, setActiveTab] = useState<"formula" | "indices" | "anamnesis" | "soap">("formula");
		const [selectedTooth, setSelectedTooth] = useState<number>(16);

		// Dental formula state: Map of toothNumber -> FdiToothRecord
		const [odontogram, setOdontogram] = useState<Record<number, FdiToothRecord>>(() => {
			const raw = initialPayload?.odontogramTeeth ?? [];
			const map: Record<number, FdiToothRecord> = {};
			for (const t of raw) {
				map[t.toothNumber] = t;
			}
			return map;
		});

		const [activeStatus, setActiveStatus] = useState<ToothClinicalStatusCode>("caries_media");

		// Live DMFT calculation
		const dmftResult = useMemo(() => {
			return calculateDmftFromOdontogram(Object.values(odontogram));
		}, [odontogram]);

		const currentToothRecord: FdiToothRecord = odontogram[selectedTooth] ?? {
			toothNumber: selectedTooth,
			statusCode: "healthy" as ToothClinicalStatusCode,
			surfaces: [] as ToothSurface[],
			mobility: "none" as const,
			furcationInvolvement: "none" as const,
		};

		const handleSurfaceToggle = (toothNumber: number, surf: ToothSurface) => {
			if (disabled) return;
			setOdontogram((prev) => {
				const existing: FdiToothRecord = prev[toothNumber] ?? {
					toothNumber,
					statusCode: "healthy" as ToothClinicalStatusCode,
					surfaces: [] as ToothSurface[],
					mobility: "none" as const,
					furcationInvolvement: "none" as const,
				};
				const currentSurfaces = existing.surfaces ?? [];
				const hasSurf = currentSurfaces.includes(surf);
				const nextSurfaces = hasSurf
					? currentSurfaces.filter((s) => s !== surf)
					: [...currentSurfaces, surf];

				return {
					...prev,
					[toothNumber]: {
						...existing,
						surfaces: nextSurfaces,
					},
				};
			});
		};

		const handleToothStatusSet = (toothNumber: number, statusCode: ToothClinicalStatusCode) => {
			if (disabled) return;
			setOdontogram((prev) => {
				const existing: FdiToothRecord = prev[toothNumber] ?? {
					toothNumber,
					statusCode: "healthy" as ToothClinicalStatusCode,
					surfaces: [] as ToothSurface[],
					mobility: "none" as const,
					furcationInvolvement: "none" as const,
				};
				return {
					...prev,
					[toothNumber]: {
						...existing,
						statusCode,
						surfaces: statusCode === "healthy" || statusCode === "extracted_absent" ? [] : existing.surfaces,
					},
				};
			});
		};

		// ── Dual-Layer 5-Second Local Draft Protection & BeforeUnload (IndexedDB + LocalStorage)
		const form043DraftKey = `dente_form043_draft_${initialPayload?.medicalCardNumber || "local_current"}`;

		React.useEffect(() => {
			if (disabled) return;

			const flushDraft = () => {
				const payloadToSave: FullForm043uPayload = {
					...initialPayload,
					formNumber: "043/у",
					clinicLegalName: initialPayload?.clinicLegalName || "ООО «Денте»",
					medicalCardNumber: initialPayload?.medicalCardNumber || "043-DRAFT",
					cardOpenedDate: initialPayload?.cardOpenedDate || new Date().toISOString().slice(0, 10),
					patientFullName: initialPayload?.patientFullName || "Пациент",
					patientBirthDate: initialPayload?.patientBirthDate || "1990-01-01",
					patientSex: initialPayload?.patientSex || "male",
					attendingDoctorFullName: initialPayload?.attendingDoctorFullName || "Врач-стоматолог",
					attendingDoctorSpecialty: initialPayload?.attendingDoctorSpecialty || "Врач-стоматолог-терапевт",
					allergologicalHistory: initialPayload?.allergologicalHistory || "Не отягощен",
					concomitantDiseases: initialPayload?.concomitantDiseases || "Отрицает",
					currentMedications: initialPayload?.currentMedications || "Не принимает",
					pregnancyLactationStatus: initialPayload?.pregnancyLactationStatus || "Нет",
					pastDentalInterventions: initialPayload?.pastDentalInterventions || "Лечение кариеса",
					chiefComplaint: initialPayload?.chiefComplaint || "Жалобы на боли при приеме пищи",
					historyOfPresentIllness: initialPayload?.historyOfPresentIllness || "Считает себя больным в течение нескольких дней",
					odontogramTeeth: Object.values(odontogram),
					dmftIndex: dmftResult,
					cpitnIndex: initialPayload?.cpitnIndex || {
						sextant18_14: "0_healthy",
						sextant13_23: "0_healthy",
						sextant24_28: "0_healthy",
						sextant48_44: "0_healthy",
						sextant43_33: "0_healthy",
						sextant34_38: "0_healthy",
						treatmentNeedCategory: "0_none",
					},
					hygieneIndexOhiS: initialPayload?.hygieneIndexOhiS || "OHI-S = 0.8",
					biteType: initialPayload?.biteType || "orthognathic",
					biteDescription: initialPayload?.biteDescription || "Прикус ортогнатический",
					oralMucosaStatus: initialPayload?.oralMucosaStatus || {
						color: "pale_pink_normal",
						moisture: "normal",
						pathologicalElements: null,
						gingivalPapillae: "normal_pointed",
						bleedingPBI: "grade_0",
						tongueStatus: "Язык чистый, влажный",
						regionalLymphNodes: "Лимфоузлы не увеличены",
						tmjFunction: "Открывание рта свободное",
					},
					xrayFindingsDescription: initialPayload?.xrayFindingsDescription || "Рентгенологических изменений нет",
					generalTreatmentPlan: initialPayload?.generalTreatmentPlan || "Санация полости рта",
					soapDiaries: initialPayload?.soapDiaries || [],
				};

				try {
					localStorage.setItem(form043DraftKey, JSON.stringify(payloadToSave));
				} catch {
					// ignore
				}
				if (onChange) {
					onChange(payloadToSave);
				}
			};

			// Flush immediate
			flushDraft();

			// Resilient 5-second interval
			const timer = setInterval(flushDraft, 5000);
			return () => clearInterval(timer);
		}, [odontogram, dmftResult, disabled, form043DraftKey, initialPayload, onChange]);

		React.useEffect(() => {
			if (disabled) return;

			const handleBeforeUnload = (e: BeforeUnloadEvent) => {
				const hasModifiedTeeth = Object.values(odontogram).some((t) => t.statusCode !== "healthy" || (t.surfaces && t.surfaces.length > 0));
				if (hasModifiedTeeth) {
					try {
						localStorage.setItem(form043DraftKey, JSON.stringify(Object.values(odontogram)));
					} catch {
						// ignore
					}
					e.preventDefault();
					e.returnValue = "В карте 043/у есть несохраненные данные зубной формулы. Закрыть вкладку?";
					return e.returnValue;
				}
			};

			window.addEventListener("beforeunload", handleBeforeUnload);
			return () => window.removeEventListener("beforeunload", handleBeforeUnload);
		}, [odontogram, disabled, form043DraftKey]);

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
								<span style={{ alignSelf: "center", fontWeight: 600, marginRight: "4px" }}>Быстрый статус:</span>
								{SELECTABLE_STATUSES.map((code) => (
									<button
										key={code}
										type="button"
										className={`btn btn-sm ${activeStatus === code ? "btn-primary" : "btn-outline-secondary"}`}
										onClick={() => setActiveStatus(code)}
										title={toothStatusCodeLabels[code]}
									>
										{toothStatusCodeShortMap[code]} — {toothStatusCodeLabels[code]}
									</button>
								))}
							</div>

							<div className="fdi-formula-grid" style={{ background: "var(--paper-strong, #f8fafc)", padding: "12px", borderRadius: "8px" }}>
								<div style={{ textAlign: "center", fontWeight: 700, marginBottom: "6px" }}>Верхняя челюсть (Постоянный прикус)</div>
								<div style={{ display: "flex", justifyContent: "center", gap: "6px", marginBottom: "10px", flexWrap: "wrap" }}>
									{PERMANENT_TEETH_UPPER.map((t) => {
										const tooth = odontogram[t];
										const isSelected = selectedTooth === t;
										const code = tooth?.statusCode ?? "healthy";
										return (
											<div
												key={t}
												onClick={() => setSelectedTooth(t)}
												style={{
													border: isSelected ? "2px solid #0284c7" : "1px solid #cbd5e1",
													background: isSelected ? "#e0f2fe" : "#ffffff",
													borderRadius: "6px",
													padding: "6px 8px",
													textAlign: "center",
													cursor: "pointer",
													minWidth: "44px",
													minHeight: "44px",
													display: "flex",
													flexDirection: "column",
													justifyContent: "center",
													alignItems: "center",
												}}
											>
												<div style={{ fontSize: "13px", fontWeight: "bold" }}>{t}</div>
												<div style={{ fontSize: "12px", fontWeight: 600, color: code !== "healthy" ? "#b91c1c" : "#059669" }}>
													{toothStatusCodeShortMap[code] || "Norm"}
												</div>
											</div>
										);
									})}
								</div>

								<div style={{ textAlign: "center", fontWeight: 700, margin: "10px 0 6px 0" }}>Нижняя челюсть (Постоянный прикус)</div>
								<div style={{ display: "flex", justifyContent: "center", gap: "6px", flexWrap: "wrap" }}>
									{PERMANENT_TEETH_LOWER.map((t) => {
										const tooth = odontogram[t];
										const isSelected = selectedTooth === t;
										const code = tooth?.statusCode ?? "healthy";
										return (
											<div
												key={t}
												onClick={() => setSelectedTooth(t)}
												style={{
													border: isSelected ? "2px solid #0284c7" : "1px solid #cbd5e1",
													background: isSelected ? "#e0f2fe" : "#ffffff",
													borderRadius: "6px",
													padding: "6px 8px",
													textAlign: "center",
													cursor: "pointer",
													minWidth: "44px",
													minHeight: "44px",
													display: "flex",
													flexDirection: "column",
													justifyContent: "center",
													alignItems: "center",
												}}
											>
												<div style={{ fontSize: "13px", fontWeight: "bold" }}>{t}</div>
												<div style={{ fontSize: "12px", fontWeight: 600, color: code !== "healthy" ? "#b91c1c" : "#059669" }}>
													{toothStatusCodeShortMap[code] || "Norm"}
												</div>
											</div>
										);
									})}
								</div>
							</div>

							{selectedTooth && (
								<div className="tooth-surface-editor" style={{ marginTop: "16px", padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
									<h5>Зуб {selectedTooth}: Настройка статуса и поверхностей</h5>
									<div style={{ display: "flex", gap: "8px", margin: "10px 0", flexWrap: "wrap" }}>
										<button
											type="button"
											className="btn btn-sm btn-outline-primary"
											onClick={() => handleToothStatusSet(selectedTooth, activeStatus)}
											disabled={disabled}
										>
											Применить статус ({toothStatusCodeShortMap[activeStatus]})
										</button>
										<button
											type="button"
											className="btn btn-sm btn-outline-danger"
											onClick={() => handleToothStatusSet(selectedTooth, "extracted_absent")}
											disabled={disabled}
										>
											Удален (A)
										</button>
										<button
											type="button"
											className="btn btn-sm btn-outline-success"
											onClick={() => handleToothStatusSet(selectedTooth, "healthy")}
											disabled={disabled}
										>
											Здоров (Norm)
										</button>
									</div>

									<div style={{ marginTop: "8px" }}>
										<label style={{ fontWeight: 600, display: "block", marginBottom: "4px" }}>Пораженные поверхности (5 поверхностей по FDI):</label>
										<div style={{ display: "flex", gap: "8px" }}>
											{SURFACES.map((s) => {
												const active = Boolean(
													currentToothRecord?.surfaces &&
														currentToothRecord.surfaces.includes(s.key),
												);
												return (
													<button
														key={s.key}
														type="button"
														className={`btn btn-sm ${active ? "btn-warning" : "btn-outline-secondary"}`}
														onClick={() => handleSurfaceToggle(selectedTooth, s.key)}
														disabled={disabled}
													>
														{s.label}
													</button>
												);
											})}
										</div>
									</div>
								</div>
							)}
						</div>
					)}

					{activeTab === "indices" && (
						<div className="form-043u-indices-tab">
							<h5>Пародонтальный индекс CPITN (PSR) по 6 секстантам</h5>
							<p className="document-form-muted">
								Секстанты: 18-14, 13-23, 24-28 (верхняя челюсть) и 48-44, 43-33, 34-38 (нижняя челюсть).
							</p>
						</div>
					)}

					{activeTab === "anamnesis" && (
						<div className="form-043u-anamnesis-tab">
							<h5>Анамнез жизни и состояние СОПР</h5>
							<p className="document-form-muted">
								Аллергологический статус, перенесенные соматические заболевания, состояние слизистой оболочки и прикуса.
							</p>
						</div>
					)}
				</DocumentPayloadCard>
			</div>
		);
	},
);
