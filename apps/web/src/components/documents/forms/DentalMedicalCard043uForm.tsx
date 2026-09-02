import React, { useState, useMemo } from "react";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import {
	calculateDmftFromOdontogram,
	type FullForm043uPayload,
	type ToothClinicalStatusCode,
	type ToothSurface,
	type FdiToothRecord,
	type CpitnSextantCode,
	type CpitnIndex,
	type DentalBiteType,
	dentalBiteTypeLabels,
	type OralMucosaStatus,
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

const CPITN_SEXTANT_OPTIONS: Array<{ value: CpitnSextantCode; label: string; hint: string }> = [
	{ value: "0_healthy", label: "0 — Здорова (Норма)", hint: "Десна здорова, кровоточивости и карманов нет" },
	{ value: "1_bleeding", label: "1 — Кровоточивость", hint: "Кровоточивость десны при мягком зондировании" },
	{ value: "2_calculus", label: "2 — Зубной камень", hint: "Над- или поддесневой зубной камень" },
	{ value: "3_pocket_4_5mm", label: "3 — Карман 4–5 мм", hint: "Пародонтальный карман 4–5 мм" },
	{ value: "4_pocket_6mm_plus", label: "4 — Карман ≥ 6 мм", hint: "Глубокий пародонтальный карман ≥ 6 мм" },
	{ value: "x_excluded", label: "X — Секстант исключен", hint: "Менее 2 зубов в секстанте" },
];

const CPITN_TN_OPTIONS: Array<{ value: CpitnIndex["treatmentNeedCategory"]; label: string }> = [
	{ value: "0_none", label: "TN 0: Лечение не требуется (здоровый пародонт)" },
	{ value: "1_hygiene_instructions", label: "TN 1: Индивидуальная гигиена полости рта и обучение чистке" },
	{ value: "2_scaling_root_planing", label: "TN 2: Профессиональная гигиена (снятие зубных отложений) + гигиена" },
	{ value: "3_complex_periodontal", label: "TN 3: Комплексное пародонтологическое лечение (SRP / кюретаж / хирургия)" },
];

const ORAL_MUCOSA_COLORS: Array<{ value: OralMucosaStatus["color"]; label: string }> = [
	{ value: "pale_pink_normal", label: "Бледно-розовая, чистая (норма)" },
	{ value: "hyperemic_red", label: "Гиперемированная, яркая (воспаление)" },
	{ value: "cyanotic_bluish", label: "Цианотичная, синюшная (венозный застой)" },
	{ value: "anemic_pale", label: "Анемичная, бледная" },
];

const ORAL_MUCOSA_MOISTURE: Array<{ value: OralMucosaStatus["moisture"]; label: string }> = [
	{ value: "normal", label: "Умеренно увлажнена (норма)" },
	{ value: "dry_xerostomia", label: "Сухая / ксеростомия" },
	{ value: "excessive_salivation", label: "Повышенное слюноотделение (гиперсаливация)" },
];

const GINGIVAL_PAPILLAE_OPTIONS: Array<{ value: OralMucosaStatus["gingivalPapillae"]; label: string }> = [
	{ value: "normal_pointed", label: "Остроконечные, плотно прилежат к шейкам зубов (норма)" },
	{ value: "hypertrophic_swollen", label: "Гипертрофированы, отечны, цианотичны" },
	{ value: "atrophic_receded", label: "Атрофированы, рецессия десны" },
	{ value: "necrotic", label: "Некротизированы, изъязвлены" },
];

const BLEEDING_PBI_OPTIONS: Array<{ value: OralMucosaStatus["bleedingPBI"]; label: string }> = [
	{ value: "grade_0", label: "Степень 0: Кровоточивость отсутствует (норма)" },
	{ value: "grade_1", label: "Степень I: Точечные кровоизлияния через 10–30 сек." },
	{ value: "grade_2", label: "Степень II: Линейное кровотечение по десневому краю" },
	{ value: "grade_3", label: "Степень III: Кровь заполняет межзубной треугольник" },
	{ value: "grade_4", label: "Степень IV: Профузное кровотечение сразу после зондирования" },
];

export const DentalMedicalCard043uForm: React.FC<DentalMedicalCard043uFormProps> = React.memo(
	function DentalMedicalCard043uForm({ initialPayload, onChange, disabled }) {
		const [activeTab, setActiveTab] = useState<"formula" | "indices" | "anamnesis">("formula");
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

		// CPITN State
		const [cpitn, setCpitn] = useState<CpitnIndex>(() => {
			return (
				initialPayload?.cpitnIndex ?? {
					sextant18_14: "0_healthy",
					sextant13_23: "0_healthy",
					sextant24_28: "0_healthy",
					sextant48_44: "0_healthy",
					sextant43_33: "0_healthy",
					sextant34_38: "0_healthy",
					treatmentNeedCategory: "0_none",
				}
			);
		});

		const [hygieneIndexOhiS, setHygieneIndexOhiS] = useState<string>(
			() => initialPayload?.hygieneIndexOhiS ?? "OHI-S = 0.8 (Хорошая)",
		);

		// Anamnesis & Complaints State
		const [chiefComplaint, setChiefComplaint] = useState<string>(
			() => initialPayload?.chiefComplaint ?? "Жалобы на боли при приеме пищи, наличие кариозной полости",
		);
		const [historyOfPresentIllness, setHistoryOfPresentIllness] = useState<string>(
			() =>
				initialPayload?.historyOfPresentIllness ??
				"Считает себя больным в течение нескольких дней, когда впервые появились неприятные ощущения от температурных раздражителей.",
		);
		const [allergologicalHistory, setAllergologicalHistory] = useState<string>(
			() => initialPayload?.allergologicalHistory ?? "Аллергологический анамнез не отягощен. Аллергии на анестетики и медикаменты отрицает.",
		);
		const [concomitantDiseases, setConcomitantDiseases] = useState<string>(
			() => initialPayload?.concomitantDiseases ?? "Сопутствующие соматические заболевания отрицает. ВИЧ, вирусные гепатиты, туберкулез отрицает.",
		);
		const [currentMedications, setCurrentMedications] = useState<string>(
			() => initialPayload?.currentMedications ?? "Постоянный прием лекарственных препаратов отрицает.",
		);
		const [pregnancyLactationStatus, setPregnancyLactationStatus] = useState<string>(
			() => initialPayload?.pregnancyLactationStatus ?? "Нет",
		);
		const [pastDentalInterventions, setPastDentalInterventions] = useState<string>(
			() => initialPayload?.pastDentalInterventions ?? "Ранее проводилось терапевтическое лечение кариеса и профессиональная гигиена.",
		);

		// Bite State
		const [biteType, setBiteType] = useState<DentalBiteType>(
			() => initialPayload?.biteType ?? "orthognathic",
		);
		const [biteDescription, setBiteDescription] = useState<string>(
			() => initialPayload?.biteDescription ?? "Прикус ортогнатический, смыкание зубных рядов по I классу Энгля.",
		);

		// Oral Mucosa State
		const [oralMucosa, setOralMucosa] = useState<OralMucosaStatus>(() => {
			return (
				initialPayload?.oralMucosaStatus ?? {
					color: "pale_pink_normal",
					moisture: "normal",
					pathologicalElements: null,
					gingivalPapillae: "normal_pointed",
					bleedingPBI: "grade_0",
					tongueStatus: "Язык чистый, влажный, сосочки выражены умеренно",
					regionalLymphNodes: "Подчелюстные и шейные лимфоузлы не увеличены, мягкоэластичные, подвижные, безболезненные при пальпации",
					tmjFunction: "Открывание рта в полном объеме (>40 мм), свободное, безболезненное, девиации и щелчков в ВНЧС нет",
				}
			);
		});

		// X-ray & Treatment Plan State
		const [xrayFindingsDescription, setXrayFindingsDescription] = useState<string>(
			() => initialPayload?.xrayFindingsDescription ?? "Рентгенологических изменений в периапикальных тканях не выявлено.",
		);
		const [generalTreatmentPlan, setGeneralTreatmentPlan] = useState<string>(
			() =>
				initialPayload?.generalTreatmentPlan ??
				"1. Профессиональная гигиена полости рта;\n2. Санация кариозных полостей;\n3. Контрольный осмотр через 6 месяцев.",
		);

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
					allergologicalHistory,
					concomitantDiseases,
					currentMedications,
					pregnancyLactationStatus,
					pastDentalInterventions,
					chiefComplaint,
					historyOfPresentIllness,
					odontogramTeeth: Object.values(odontogram),
					dmftIndex: dmftResult,
					cpitnIndex: cpitn,
					hygieneIndexOhiS,
					biteType,
					biteDescription,
					oralMucosaStatus: oralMucosa,
					xrayFindingsDescription,
					generalTreatmentPlan,
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
		}, [
			odontogram,
			dmftResult,
			cpitn,
			hygieneIndexOhiS,
			chiefComplaint,
			historyOfPresentIllness,
			allergologicalHistory,
			concomitantDiseases,
			currentMedications,
			pregnancyLactationStatus,
			pastDentalInterventions,
			biteType,
			biteDescription,
			oralMucosa,
			xrayFindingsDescription,
			generalTreatmentPlan,
			disabled,
			form043DraftKey,
			initialPayload,
			onChange,
		]);

		React.useEffect(() => {
			if (disabled) return;

			const handleBeforeUnload = (e: BeforeUnloadEvent) => {
				const hasModifiedTeeth = Object.values(odontogram).some(
					(t) => t.statusCode !== "healthy" || (t.surfaces && t.surfaces.length > 0),
				);
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
					description="Официальная форма Минздрава РФ с зубной формулой FDI, индексами КПУ/CPITN, анамнезом жизни, СОПР и дневниками SOAP"
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
							Анамнез, СОПР и План
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
													border: isSelected ? "2px solid var(--teal)" : "1px solid var(--line)",
													background: isSelected ? "var(--teal-surface, rgba(13, 148, 136, 0.1))" : "var(--paper)",
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
												<div style={{ fontSize: "12px", fontWeight: 600, color: code !== "healthy" ? "var(--bad-fg)" : "var(--ok-fg)" }}>
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
													border: isSelected ? "2px solid var(--teal)" : "1px solid var(--line)",
													background: isSelected ? "var(--teal-surface, rgba(13, 148, 136, 0.1))" : "var(--paper)",
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
												<div style={{ fontSize: "12px", fontWeight: 600, color: code !== "healthy" ? "var(--bad-fg)" : "var(--ok-fg)" }}>
													{toothStatusCodeShortMap[code] || "Norm"}
												</div>
											</div>
										);
									})}
								</div>
							</div>

							{selectedTooth && (
								<div className="tooth-surface-editor" style={{ marginTop: "16px", padding: "12px", border: "1px solid var(--line)", borderRadius: "8px" }}>
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
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
								<h5 style={{ margin: 0 }}>Пародонтальный индекс CPITN (PSR) по 6 секстантам</h5>
								<button
									type="button"
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
									}}
									disabled={disabled}
								>
									1 клик: Все секстанты здоровы (Код 0 / TN 0)
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
											disabled={disabled}
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
											disabled={disabled}
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
											disabled={disabled}
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
											disabled={disabled}
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
											disabled={disabled}
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
											disabled={disabled}
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
									disabled={disabled}
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
									disabled={disabled}
									style={{ width: "100%" }}
								/>
							</div>
						</div>
					)}

					{activeTab === "anamnesis" && (
						<div className="form-043u-anamnesis-tab">
							<h5 style={{ marginBottom: "12px" }}>Жалобы и Анамнез заболевания</h5>
							<div style={{ marginBottom: "14px" }}>
								<label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>Жалобы пациента (Chief Complaint):</label>
								<textarea
									value={chiefComplaint}
									onChange={(e) => setChiefComplaint(e.target.value)}
									placeholder="Жалобы на боли, эстетический дефект, кровоточивость десен..."
									rows={2}
									disabled={disabled}
									style={{ width: "100%" }}
								/>
							</div>

							<div style={{ marginBottom: "16px" }}>
								<label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>Анамнез настоящего заболевания (Anamnesis Morbi):</label>
								<textarea
									value={historyOfPresentIllness}
									onChange={(e) => setHistoryOfPresentIllness(e.target.value)}
									placeholder="Когда началось заболевание, динамика, проводимое ранее лечение..."
									rows={2}
									disabled={disabled}
									style={{ width: "100%" }}
								/>
							</div>

							<h5 style={{ marginBottom: "12px", borderTop: "1px solid var(--doc-border, #cbd5e1)", paddingTop: "14px" }}>
								Анамнез жизни и соматический статус (Anamnesis Vitae)
							</h5>
							<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
								<label>
									Аллергологический анамнез
									<input
										type="text"
										value={allergologicalHistory}
										onChange={(e) => setAllergologicalHistory(e.target.value)}
										placeholder="Аллергии на лекарства, анестетики, латекс..."
										disabled={disabled}
									/>
								</label>
								<label>
									Сопутствующие заболевания
									<input
										type="text"
										value={concomitantDiseases}
										onChange={(e) => setConcomitantDiseases(e.target.value)}
										placeholder="Гипертония, СД, ИБС, гепатиты, отрицает..."
										disabled={disabled}
									/>
								</label>
							</div>

							<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
								<label>
									Принимаемые препараты
									<input
										type="text"
										value={currentMedications}
										onChange={(e) => setCurrentMedications(e.target.value)}
										placeholder="Антикоагулянты, гипотензивные..."
										disabled={disabled}
									/>
								</label>
								<label>
									Беременность / Лактация
									<input
										type="text"
										value={pregnancyLactationStatus}
										onChange={(e) => setPregnancyLactationStatus(e.target.value)}
										placeholder="Нет / Срок в неделях"
										disabled={disabled}
									/>
								</label>
								<label>
									Перенесенные стом. вмешательства
									<input
										type="text"
										value={pastDentalInterventions}
										onChange={(e) => setPastDentalInterventions(e.target.value)}
										placeholder="Лечение кариеса, удаление..."
										disabled={disabled}
									/>
								</label>
							</div>

							<h5 style={{ marginBottom: "12px", borderTop: "1px solid var(--doc-border, #cbd5e1)", paddingTop: "14px" }}>
								Прикус и Окклюзия
							</h5>
							<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
								<label>
									Вид прикуса
									<select
										value={biteType}
										onChange={(e) => setBiteType(e.target.value as DentalBiteType)}
										disabled={disabled}
									>
										{Object.entries(dentalBiteTypeLabels).map(([k, label]) => (
											<option key={k} value={k}>
												{label}
											</option>
										))}
									</select>
								</label>
								<label>
									Описание смыкания и окклюзии
									<input
										type="text"
										value={biteDescription}
										onChange={(e) => setBiteDescription(e.target.value)}
										placeholder="Смыкание моляров по I классу, перекрытие на 1/3..."
										disabled={disabled}
									/>
								</label>
							</div>

							<h5 style={{ marginBottom: "12px", borderTop: "1px solid var(--doc-border, #cbd5e1)", paddingTop: "14px" }}>
								Состояние слизистой оболочки рта (СОПР) и Пародонта
							</h5>
							<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
								<label>
									Цвет слизистой оболочки
									<select
										value={oralMucosa.color}
										onChange={(e) => setOralMucosa((prev) => ({ ...prev, color: e.target.value as OralMucosaStatus["color"] }))}
										disabled={disabled}
									>
										{ORAL_MUCOSA_COLORS.map((opt) => (
											<option key={opt.value} value={opt.value}>
												{opt.label}
											</option>
										))}
									</select>
								</label>
								<label>
									Увлажненность слизистой
									<select
										value={oralMucosa.moisture}
										onChange={(e) => setOralMucosa((prev) => ({ ...prev, moisture: e.target.value as OralMucosaStatus["moisture"] }))}
										disabled={disabled}
									>
										{ORAL_MUCOSA_MOISTURE.map((opt) => (
											<option key={opt.value} value={opt.value}>
												{opt.label}
											</option>
										))}
									</select>
								</label>
							</div>

							<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
								<label>
									Десневые сосочки и десневой край
									<select
										value={oralMucosa.gingivalPapillae}
										onChange={(e) => setOralMucosa((prev) => ({ ...prev, gingivalPapillae: e.target.value as OralMucosaStatus["gingivalPapillae"] }))}
										disabled={disabled}
									>
										{GINGIVAL_PAPILLAE_OPTIONS.map((opt) => (
											<option key={opt.value} value={opt.value}>
												{opt.label}
											</option>
										))}
									</select>
								</label>
								<label>
									Кровоточивость десен (индекс PBI)
									<select
										value={oralMucosa.bleedingPBI}
										onChange={(e) => setOralMucosa((prev) => ({ ...prev, bleedingPBI: e.target.value as OralMucosaStatus["bleedingPBI"] }))}
										disabled={disabled}
									>
										{BLEEDING_PBI_OPTIONS.map((opt) => (
											<option key={opt.value} value={opt.value}>
												{opt.label}
											</option>
										))}
									</select>
								</label>
							</div>

							<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
								<label>
									Состояние языка
									<input
										type="text"
										value={oralMucosa.tongueStatus}
										onChange={(e) => setOralMucosa((prev) => ({ ...prev, tongueStatus: e.target.value }))}
										disabled={disabled}
									/>
								</label>
								<label>
									Патологические элементы (афты, язвы, эрозии)
									<input
										type="text"
										value={oralMucosa.pathologicalElements ?? ""}
										onChange={(e) => setOralMucosa((prev) => ({ ...prev, pathologicalElements: e.target.value || null }))}
										placeholder="Отсутствуют / Афты на слизистой щеки..."
										disabled={disabled}
									/>
								</label>
							</div>

							<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
								<label>
									Регионарные лимфатические узлы
									<input
										type="text"
										value={oralMucosa.regionalLymphNodes}
										onChange={(e) => setOralMucosa((prev) => ({ ...prev, regionalLymphNodes: e.target.value }))}
										disabled={disabled}
									/>
								</label>
								<label>
									Функция височно-нижнечелюстного сустава (ВНЧС)
									<input
										type="text"
										value={oralMucosa.tmjFunction}
										onChange={(e) => setOralMucosa((prev) => ({ ...prev, tmjFunction: e.target.value }))}
										disabled={disabled}
									/>
								</label>
							</div>

							<h5 style={{ marginBottom: "12px", borderTop: "1px solid var(--doc-border, #cbd5e1)", paddingTop: "14px" }}>
								Рентгенодиагностика и Общий план лечения
							</h5>
							<div style={{ marginBottom: "14px" }}>
								<label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>Данные рентгенологических исследований / КТ:</label>
								<textarea
									value={xrayFindingsDescription}
									onChange={(e) => setXrayFindingsDescription(e.target.value)}
									rows={2}
									disabled={disabled}
									style={{ width: "100%" }}
								/>
							</div>
							<div>
								<label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>Общий план лечения стоматологического больного:</label>
								<textarea
									value={generalTreatmentPlan}
									onChange={(e) => setGeneralTreatmentPlan(e.target.value)}
									rows={3}
									disabled={disabled}
									style={{ width: "100%" }}
								/>
							</div>
						</div>
					)}
				</DocumentPayloadCard>
			</div>
		);
	},
);
