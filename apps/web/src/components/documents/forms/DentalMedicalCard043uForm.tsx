import React, { useState, useMemo, useCallback } from "react";
import { FileEdit, Printer, ShieldCheck, Undo2 } from "lucide-react";
import { showToast } from "../../GlobalToast";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import {
	calculateDmftFromOdontogram,
	renderForm043uHtml,
	type FullForm043uPayload,
	type ToothClinicalStatusCode,
	type ToothSurface,
	type FdiToothRecord,
	type CpitnIndex,
	type DentalBiteType,
	type OralMucosaStatus,
} from "@dental/shared";
import {
	createForm043PhysiologicalNorm,
	createIntactOdontogramRecords,
} from "../../../lib/clinicalProtocols043";
import { safeLocalStorageSetItem } from "../../../lib/safeLocalStorage";
import { DentalMedicalCardOdontogramTab } from "./DentalMedicalCardOdontogramTab";
import { DentalMedicalCardIndicesTab } from "./DentalMedicalCardIndicesTab";
import { DentalMedicalCardAnamnesisTab } from "./DentalMedicalCardAnamnesisTab";
import { DEFAULT_CPITN, DEFAULT_ORAL_MUCOSA, openPrintWindow } from "./form043Utils";

export interface DentalMedicalCard043uFormProps {
	initialPayload?: (Partial<FullForm043uPayload> & {
		isSigned?: boolean | undefined;
		isDraft?: boolean | undefined;
		revisionCount?: number | undefined;
		revisionReason?: string | undefined;
	}) | undefined;
	onChange?: ((payload: FullForm043uPayload) => void) | undefined;
	disabled?: boolean | undefined;
}

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
			return initialPayload?.cpitnIndex ?? DEFAULT_CPITN;
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
			return initialPayload?.oralMucosaStatus ?? DEFAULT_ORAL_MUCOSA;
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

		// Clinical Autonomy & Revision State (Мандат 8e п. 4)
		const [isRevising, setIsRevising] = useState<boolean>(false);
		const [revisionCount, setRevisionCount] = useState<number>(
			() => (initialPayload as any)?.revisionCount ?? 0,
		);
		const [revisionReason, setRevisionReason] = useState<string>(
			() => (initialPayload as any)?.revisionReason ?? "Исправленному верить",
		);
		const [reviseSnapshot, setReviseSnapshot] = useState<{
			odontogram: Record<number, FdiToothRecord>;
			cpitn: CpitnIndex;
			hygieneIndexOhiS: string;
			chiefComplaint: string;
			historyOfPresentIllness: string;
			allergologicalHistory: string;
			concomitantDiseases: string;
			currentMedications: string;
			pregnancyLactationStatus: string;
			pastDentalInterventions: string;
			biteType: DentalBiteType;
			biteDescription: string;
			oralMucosa: OralMucosaStatus;
			xrayFindingsDescription: string;
			generalTreatmentPlan: string;
		} | null>(null);

		const effectiveDisabled = Boolean(disabled && !isRevising);

		const createSnapshot = useCallback(() => ({
			odontogram: { ...odontogram },
			cpitn: { ...cpitn },
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
			oralMucosa: { ...oralMucosa },
			xrayFindingsDescription,
			generalTreatmentPlan,
		}), [
			odontogram, cpitn, hygieneIndexOhiS, chiefComplaint, historyOfPresentIllness,
			allergologicalHistory, concomitantDiseases, currentMedications, pregnancyLactationStatus,
			pastDentalInterventions, biteType, biteDescription, oralMucosa, xrayFindingsDescription,
			generalTreatmentPlan,
		]);

		const handleApplyGlobalNorm = useCallback(() => {
			const hasExistingData =
				Boolean(allergologicalHistory.trim()) ||
				Boolean(concomitantDiseases.trim()) ||
				Boolean(chiefComplaint.trim()) ||
				Boolean(historyOfPresentIllness.trim()) ||
				Boolean(currentMedications.trim()) ||
				Object.values(odontogram).some(
					(t) => t.statusCode !== "healthy" || (t.surfaces && t.surfaces.length > 0),
				);

			if (hasExistingData && !reviseSnapshot) {
				setReviseSnapshot(createSnapshot());
				setIsRevising(true);
			} else if (effectiveDisabled) {
				setIsRevising(true);
			}
			const intactOdonto = createIntactOdontogramRecords();
			setOdontogram(intactOdonto);

			setCpitn(DEFAULT_CPITN);
			setHygieneIndexOhiS("OHI-S = 0.0 (Отличная гигиена полости рта)");

			const norm = createForm043PhysiologicalNorm();
			setChiefComplaint(norm.chiefComplaint);
			setHistoryOfPresentIllness(norm.historyOfPresentIllness);
			setAllergologicalHistory(norm.allergologicalHistory);
			setConcomitantDiseases(norm.concomitantDiseases);
			setCurrentMedications(norm.currentMedications);
			setPregnancyLactationStatus(norm.pregnancyLactationStatus);
			setPastDentalInterventions(norm.pastDentalInterventions);
			setBiteType(norm.biteType);
			setBiteDescription(norm.biteDescription);
			setOralMucosa(norm.oralMucosaStatus);
			setXrayFindingsDescription(norm.xrayFindingsDescription);
			setGeneralTreatmentPlan(norm.generalTreatmentPlan);

			showToast(
				"Вся медицинская карта заполнена физиологической нормой. Врач правит только патологию!",
				"success",
				4000,
			);
		}, [
			effectiveDisabled,
			allergologicalHistory,
			concomitantDiseases,
			chiefComplaint,
			historyOfPresentIllness,
			currentMedications,
			odontogram,
			reviseSnapshot,
			createSnapshot,
		]);

		const handleApplyAnamnesisNorm = useCallback(() => {
			const norm = createForm043PhysiologicalNorm();
			setChiefComplaint(norm.chiefComplaint);
			setHistoryOfPresentIllness(norm.historyOfPresentIllness);
			setAllergologicalHistory(norm.allergologicalHistory);
			setConcomitantDiseases(norm.concomitantDiseases);
			setCurrentMedications(norm.currentMedications);
			setPregnancyLactationStatus(norm.pregnancyLactationStatus);
			setPastDentalInterventions(norm.pastDentalInterventions);
			setBiteType(norm.biteType);
			setBiteDescription(norm.biteDescription);
			setOralMucosa(norm.oralMucosaStatus);
			setXrayFindingsDescription(norm.xrayFindingsDescription);
			setGeneralTreatmentPlan(norm.generalTreatmentPlan);
		}, []);

		const handleBeginRevise = useCallback(() => {
			setReviseSnapshot(createSnapshot());
			setIsRevising(true);
			showToast(
				"Включен режим ревизии («Исправленному верить»). Все поля разблокированы для редактирования.",
				"info",
				4000,
			);
		}, [createSnapshot]);

		const handleCancelRevise = useCallback(() => {
			if (reviseSnapshot) {
				setOdontogram(reviseSnapshot.odontogram);
				setCpitn(reviseSnapshot.cpitn);
				setHygieneIndexOhiS(reviseSnapshot.hygieneIndexOhiS);
				setChiefComplaint(reviseSnapshot.chiefComplaint);
				setHistoryOfPresentIllness(reviseSnapshot.historyOfPresentIllness);
				setAllergologicalHistory(reviseSnapshot.allergologicalHistory);
				setConcomitantDiseases(reviseSnapshot.concomitantDiseases);
				setCurrentMedications(reviseSnapshot.currentMedications);
				setPregnancyLactationStatus(reviseSnapshot.pregnancyLactationStatus);
				setPastDentalInterventions(reviseSnapshot.pastDentalInterventions);
				setBiteType(reviseSnapshot.biteType);
				setBiteDescription(reviseSnapshot.biteDescription);
				setOralMucosa(reviseSnapshot.oralMucosa);
				setXrayFindingsDescription(reviseSnapshot.xrayFindingsDescription);
				setGeneralTreatmentPlan(reviseSnapshot.generalTreatmentPlan);
			}
			setIsRevising(false);
			setReviseSnapshot(null);
			showToast("Режим ревизии отменен, исходные данные восстановлены", "info", 3000);
		}, [reviseSnapshot]);

		const handleSaveRevision = useCallback(() => {
			setRevisionCount((c) => c + 1);
			setIsRevising(false);
			setReviseSnapshot(null);
			showToast("Исправление зафиксировано («Исправленному верить»). Ревизия карты сохранена.", "success", 4000);
		}, []);

		const handleSurfaceToggle = (toothNumber: number, surf: ToothSurface) => {
			if (effectiveDisabled) return;
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
			if (effectiveDisabled) return;
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

		// ── Dual-Layer Local Draft Protection & BeforeUnload (IndexedDB + Debounced LocalStorage)
		const form043DraftKey = `dente_form043_draft_${initialPayload?.medicalCardNumber || "local_current"}`;
		const latestPayloadRef = React.useRef<FullForm043uPayload | null>(null);
		const isInitialMountRef = React.useRef(true);

		React.useEffect(() => {
			if (effectiveDisabled) return;

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
				...(revisionCount > 0 || isRevising
					? {
							revisionCount: revisionCount + (isRevising ? 1 : 0),
							revisionReason: revisionReason.trim() || "Исправленному верить",
						}
					: {}),
			};

			latestPayloadRef.current = payloadToSave;

			const flushDraft = () => {
				try {
					safeLocalStorageSetItem(form043DraftKey, JSON.stringify(payloadToSave));
				} catch {
					// ignore
				}
				if (onChange) {
					onChange(payloadToSave);
				}
			};

			// Initial mount: instant flush to register draft
			if (isInitialMountRef.current) {
				isInitialMountRef.current = false;
				flushDraft();
				return;
			}

			// Debounced autosave (400ms: Mandates 8e item 6 & 8n: anti-HDD thrashing on fast typing)
			const timer = setTimeout(flushDraft, 400);
			return () => clearTimeout(timer);
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
			effectiveDisabled,
			isRevising,
			revisionCount,
			revisionReason,
			form043DraftKey,
			initialPayload,
			onChange,
		]);

		// Flush pending draft on unmount (navigation away / tab switch)
		React.useEffect(() => {
			return () => {
				if (latestPayloadRef.current) {
					try {
						safeLocalStorageSetItem(form043DraftKey, JSON.stringify(latestPayloadRef.current));
					} catch {
						// ignore
					}
				}
			};
		}, [form043DraftKey]);

		React.useEffect(() => {
			if (effectiveDisabled) return;

			const handleBeforeUnload = (e: BeforeUnloadEvent) => {
				const hasModifiedTeeth = Object.values(odontogram).some(
					(t) => t.statusCode !== "healthy" || (t.surfaces && t.surfaces.length > 0),
				);
				if (hasModifiedTeeth) {
					if (latestPayloadRef.current) {
						try {
							safeLocalStorageSetItem(form043DraftKey, JSON.stringify(latestPayloadRef.current));
						} catch {
							// ignore
						}
					}
					e.preventDefault();
					e.returnValue = "В медицинской карте есть несохраненные данные зубной формулы. Закрыть вкладку?";
					return e.returnValue;
				}
			};

			window.addEventListener("beforeunload", handleBeforeUnload);
			return () => window.removeEventListener("beforeunload", handleBeforeUnload);
		}, [odontogram, effectiveDisabled, form043DraftKey]);

		return (
			<div className="document-form-container form-043u-wrapper">
				<DocumentPayloadCard
					title="Медицинская карта приёма"
					description="Электронная карта стоматологического приёма: зубная формула, анамнез, индексы и протоколы"
				>
					<div
						className="document-form-nav-tabs"
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: "16px",
							overflowX: "auto",
							whiteSpace: "nowrap",
							gap: "8px",
							paddingBottom: "4px",
						}}
					>
						<div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
							<button
								type="button"
								className={`btn btn-secondary ${activeTab === "formula" ? "active" : ""}`}
								onClick={() => setActiveTab("formula")}
								style={{ minHeight: "44px", flexShrink: 0 }}
							>
								Зубная формула FDI и КПУ
							</button>
							<button
								type="button"
								className={`btn btn-secondary ${activeTab === "indices" ? "active" : ""}`}
								onClick={() => setActiveTab("indices")}
								style={{ minHeight: "44px", flexShrink: 0 }}
							>
								Индексы и Пародонт (CPITN)
							</button>
							<button
								type="button"
								className={`btn btn-secondary ${activeTab === "anamnesis" ? "active" : ""}`}
								onClick={() => setActiveTab("anamnesis")}
								style={{ minHeight: "44px", flexShrink: 0 }}
							>
								Анамнез, СОПР и План
							</button>
						</div>
						<div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
							<button
								type="button"
								data-testid="btn-043-global-norm-1click"
								className="btn btn-sm btn-success"
								onClick={handleApplyGlobalNorm}
								title="Заполнить всю медицинскую карту физиологической нормой (зубная формула, CPITN, СОПР, анамнез). Врач правит только патологию!"
								style={{ display: "inline-flex", alignItems: "center", gap: "6px", minHeight: "44px" }}
							>
								<ShieldCheck style={{ width: "16px", height: "16px" }} />
								Заполнить нормой
							</button>
							{reviseSnapshot !== null && (
								<button
									type="button"
									data-testid="btn-043-undo-norm"
									className="btn btn-sm btn-outline-warning"
									onClick={handleCancelRevise}
									title="Отменить применение нормы и вернуть исходные записи"
									style={{ display: "inline-flex", alignItems: "center", gap: "6px", minHeight: "44px" }}
								>
									<Undo2 style={{ width: "16px", height: "16px" }} />
									Отменить применение нормы
								</button>
							)}
							{(disabled || initialPayload?.isSigned) && (
								<button
									type="button"
									data-testid="btn-043-revise"
									className={`btn btn-sm ${isRevising ? "btn-warning" : "btn-outline-warning"}`}
									onClick={() => {
										if (isRevising) {
											handleCancelRevise();
										} else {
											handleBeginRevise();
										}
									}}
									title="Внести исправление в закрытую медицинскую карту («Исправленному верить») без задержек и согласований"
									style={{ display: "inline-flex", alignItems: "center", gap: "6px", minHeight: "44px" }}
								>
									<FileEdit style={{ width: "16px", height: "16px" }} />
									{isRevising ? "Отменить ревизию" : "Внести исправление («Исправленному верить»)"}
								</button>
							)}
							<span
								data-testid="form043-stamp-badge"
								className={`badge ${
									isRevising || revisionCount > 0
										? "badge-warning"
										: initialPayload?.isSigned
											? "badge-success"
											: "badge-secondary"
								}`}
								style={{
									padding: "4px 8px",
									borderRadius: "4px",
									fontSize: "11px",
									fontWeight: 700,
									letterSpacing: "0.05em",
									textTransform: "uppercase",
									minHeight: "44px",
									display: "inline-flex",
									alignItems: "center",
									background:
										isRevising || revisionCount > 0
											? "rgba(245, 158, 11, 0.15)"
											: initialPayload?.isSigned
												? "rgba(16, 185, 129, 0.15)"
												: "rgba(100, 116, 139, 0.15)",
									color:
										isRevising || revisionCount > 0
											? "#b45309"
											: initialPayload?.isSigned
												? "#059669"
												: "#64748b",
									border: `1px solid ${
										isRevising || revisionCount > 0
											? "rgba(245, 158, 11, 0.4)"
											: initialPayload?.isSigned
												? "rgba(16, 185, 129, 0.4)"
												: "rgba(100, 116, 139, 0.3)"
									}`,
								}}
							>
								{isRevising || revisionCount > 0
									? `ИСПРАВЛЕННОМУ ВЕРИТЬ (РЕДАКЦИЯ ${revisionCount + (isRevising ? 1 : 0)})`
									: initialPayload?.isSigned
										? "ПОДПИСАНО ВРАЧОМ"
										: "ЧЕРНОВИК — ДЛЯ ПРЕДВАРИТЕЛЬНОГО ОЗНАКОМЛЕНИЯ / БЕЗ ЭЦП"}
							</span>
							<button
								type="button"
								data-testid="btn-043-print-blank"
								className="btn btn-sm btn-outline-secondary"
								onClick={() => {
									openPrintWindow(renderForm043uHtml({
										medicalCardNumber: initialPayload?.medicalCardNumber || "__________",
										cardOpenedDate: "«___» _________ 20___ г.",
										patientFullName: "________________________________________________________",
										patientBirthDate: "«___» _________ _____ г.",
										patientPhone: "+7 (___) ___-__-__",
										patientAddressRegistration: "________________________________________________________",
										chiefComplaint: "________________________________________________________",
										historyOfPresentIllness: "________________________________________________________",
										allergologicalHistory: "________________________________________________________",
										concomitantDiseases: "________________________________________________________",
										attendingDoctorFullName: initialPayload?.attendingDoctorFullName || "________________________",
										isClosed: false,
										watermarkText: "ЧЕРНОВИК (БЛАНК)",
									}));
								}}
								title="Печать чистого бланка медицинской карты со строками «________» для ручного заполнения на приёме"
								style={{ display: "inline-flex", alignItems: "center", gap: "6px", minHeight: "44px" }}
							>
								<Printer style={{ width: "16px", height: "16px" }} />
								Бланк («________»)
							</button>
							<button
								type="button"
								data-testid="btn-043-fast-print"
								className="btn btn-sm btn-outline-primary"
								onClick={() => {
									const isSigned = Boolean(initialPayload?.isSigned);
									const effectiveWatermark =
										isRevising || revisionCount > 0
											? `ИСПРАВЛЕННОМУ ВЕРИТЬ (РЕДАКЦИЯ ${revisionCount + (isRevising ? 1 : 0)})`
											: isSigned
												? "ПОДПИСАНО ВРАЧОМ"
												: "ЧЕРНОВИК — ДЛЯ ПРЕДВАРИТЕЛЬНОГО ОЗНАКОМЛЕНИЯ / БЕЗ ЭЦП";
									openPrintWindow(renderForm043uHtml({
										...(latestPayloadRef.current ?? {}),
										isClosed: isSigned,
										watermarkText: effectiveWatermark,
									}));
								}}
								title="Печать медицинской карты в любой момент"
								style={{ display: "inline-flex", alignItems: "center", gap: "6px", minHeight: "44px" }}
							>
								<Printer style={{ width: "16px", height: "16px" }} />
								Печать карты
							</button>
						</div>
					</div>

					{isRevising && (
						<div
							data-testid="form043-revision-banner"
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								gap: "12px",
								padding: "10px 14px",
								marginBottom: "14px",
								background: "rgba(245, 158, 11, 0.12)",
								border: "1px solid rgba(245, 158, 11, 0.35)",
								borderRadius: "8px",
								flexWrap: "wrap",
							}}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<FileEdit style={{ width: "18px", height: "18px", color: "#d97706" }} />
								<div>
									<strong style={{ color: "#b45309", fontSize: "13px" }}>
										Режим ревизии («Исправленному верить»):
									</strong>
									<span style={{ fontSize: "12px", marginLeft: "6px", color: "var(--ink)" }}>
										Правки вносятся лечащим врачом с сохранением истории ревизий («Исправленному верить»).
									</span>
								</div>
							</div>
							<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
								<input
									type="text"
									data-testid="input-043-revision-reason"
									value={revisionReason}
									onChange={(e) => setRevisionReason(e.target.value)}
									placeholder="Причина правки (по умолчанию: Исправленному верить)"
									style={{ minWidth: "220px", padding: "4px 8px", fontSize: "12px" }}
								/>
								<button
									type="button"
									data-testid="btn-043-save-revision"
									className="btn btn-sm btn-primary"
									onClick={handleSaveRevision}
								>
									Зафиксировать ревизию
								</button>
								<button
									type="button"
									data-testid="btn-043-cancel-revision"
									className="btn btn-sm btn-outline-secondary"
									onClick={handleCancelRevise}
								>
									Отменить правку
								</button>
							</div>
						</div>
					)}

					{activeTab === "formula" && (
						<DentalMedicalCardOdontogramTab
							dmftResult={dmftResult}
							effectiveDisabled={effectiveDisabled}
							odontogram={odontogram}
							setOdontogram={setOdontogram}
							selectedTooth={selectedTooth}
							setSelectedTooth={setSelectedTooth}
							activeStatus={activeStatus}
							setActiveStatus={setActiveStatus}
							handleToothStatusSet={handleToothStatusSet}
							handleSurfaceToggle={handleSurfaceToggle}
						/>
					)}

					{activeTab === "indices" && (
						<DentalMedicalCardIndicesTab
							cpitn={cpitn}
							setCpitn={setCpitn}
							hygieneIndexOhiS={hygieneIndexOhiS}
							setHygieneIndexOhiS={setHygieneIndexOhiS}
							effectiveDisabled={effectiveDisabled}
						/>
					)}

					{activeTab === "anamnesis" && (
						<DentalMedicalCardAnamnesisTab
							chiefComplaint={chiefComplaint}
							setChiefComplaint={setChiefComplaint}
							historyOfPresentIllness={historyOfPresentIllness}
							setHistoryOfPresentIllness={setHistoryOfPresentIllness}
							allergologicalHistory={allergologicalHistory}
							setAllergologicalHistory={setAllergologicalHistory}
							concomitantDiseases={concomitantDiseases}
							setConcomitantDiseases={setConcomitantDiseases}
							currentMedications={currentMedications}
							setCurrentMedications={setCurrentMedications}
							pregnancyLactationStatus={pregnancyLactationStatus}
							setPregnancyLactationStatus={setPregnancyLactationStatus}
							pastDentalInterventions={pastDentalInterventions}
							setPastDentalInterventions={setPastDentalInterventions}
							biteType={biteType}
							setBiteType={setBiteType}
							biteDescription={biteDescription}
							setBiteDescription={setBiteDescription}
							oralMucosa={oralMucosa}
							setOralMucosa={setOralMucosa}
							xrayFindingsDescription={xrayFindingsDescription}
							setXrayFindingsDescription={setXrayFindingsDescription}
							generalTreatmentPlan={generalTreatmentPlan}
							setGeneralTreatmentPlan={setGeneralTreatmentPlan}
							effectiveDisabled={effectiveDisabled}
							onApplyAnamnesisNorm={handleApplyAnamnesisNorm}
						/>
					)}
				</DocumentPayloadCard>
			</div>
		);
	},
);
