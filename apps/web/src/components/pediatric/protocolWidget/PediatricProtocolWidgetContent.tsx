import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useVisitStore } from "../../../store/visitStore";
import { showToast } from "../../GlobalToast";
import type {
	FranklRating,
	ResorptionStagePercent,
} from "../../odontogram/pediatricDentitionEngine";
import { PediatricParentMemoModal } from "../PediatricParentMemoModal";
import type {
	PediatricDentitionMode,
	ToothClinicalFinding,
} from "../PediatricTeethChart";
import {
	DEFAULT_LEGAL_REPRESENTATIVE,
	DEFAULT_PEDIATRIC_SOMATIC_NORM,
	type LegalRepresentativeData,
	type PediatricSomaticStatus,
} from "../PediatricSomaticAndLegalRep";
import type { PediatricAnesthesiaCalculationResult } from "../PediatricAnesthesiaCalculator";
import {
	DEFAULT_SEDATION_STATE,
	FRANKL_EXPRESS_ITEMS,
	PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION,
	PEDIATRIC_PROTOCOL_PRESETS,
	PEDIATRIC_TEETH_NAMES,
	isValidFdiTooth,
} from "./constants";
import { PediatricBehaviorCard } from "./PediatricBehaviorCard";
import { PediatricMobileBottomBar } from "./PediatricMobileBottomBar";
import { PediatricPrimaryTeethCard } from "./PediatricPrimaryTeethCard";
import { PediatricProtocolDetailsAccordion } from "./PediatricProtocolDetailsAccordion";
import {
	PediatricProtocolDesktopActionBar,
	PediatricProtocolTopBar,
} from "./PediatricProtocolToolbar";
import { PediatricRewardsModal } from "./PediatricRewardsModal";
import { PediatricSedationProtocol } from "./PediatricSedationProtocol";
import { PediatricTreatmentSteps } from "./PediatricTreatmentSteps";
import {
	buildAdaptationVisit043Text,
	buildPhysiologicalNorm043Text,
	calculateClinicalProtocol,
} from "./protocolCalculation";
import type {
	FranklExpressItem,
	PediatricProtocolDefinition,
	PediatricProtocolId,
	PediatricSedationState,
	VisitPediatricProtocolWidgetProps,
} from "./types";

export const PediatricProtocolWidgetContent: React.FC<
	VisitPediatricProtocolWidgetProps
> = ({
	activeTooth = 54,
	activeSurfaces,
	onSelectSurfaces,
	onApplyProtocolText,
	onAddToInvoice,
	initialFranklRating = 3,
	onFranklChange,
	patientName = "Юный пациент",
	patientPhone,
	patientAgeYears = 6,
	patientWeightKg = 20,
	doctorName = "Детский врач-стоматолог",
	clinicName = "Детское отделение DENTE",
	representativeFullName,
	representativePhone,
	representativeRole,
	somaticProfile,
	allergies,
	initialShowDetails = false,
	className = "",
}) => {
	// 1. Санитизация активного зуба (по умолчанию 54) с проверкой квадрантов FDI
	const effectiveTooth = useMemo<number>(() => {
		if (activeTooth && isValidFdiTooth(activeTooth)) return activeTooth;
		return 54;
	}, [activeTooth]);

	const anatomicalToothName = useMemo<string>(() => {
		return PEDIATRIC_TEETH_NAMES[effectiveTooth] ?? `Зуб ${effectiveTooth}`;
	}, [effectiveTooth]);

	// 2. Локальное состояние активного зуба для быстрого переключения в виджете
	const [currentTooth, setCurrentTooth] = useState<number>(effectiveTooth);

	useEffect(() => {
		setCurrentTooth(effectiveTooth);
	}, [effectiveTooth]);

	// 2.1 Режим прикуса: молочный (20 зубов) или сменный (с постоянными молярами 16, 26, 36, 46)
	const [dentitionMode, setDentitionMode] = useState<PediatricDentitionMode>(
		patientAgeYears >= 6 ? "mixed" : "primary",
	);

	// 2.2 Состояния зубов на карте
	const [toothFindings, setToothFindings] = useState<
		Record<number, ToothClinicalFinding>
	>({});

	// 2.2b Стадии физиологической резорбции корней молочных зубов (0%, 25%, 50%, 75%, 100%)
	const [resorptionStages, setResorptionStages] = useState<
		Record<number, ResorptionStagePercent>
	>({});

	// 2.3 Соматический статус (1-клик физиологическая норма Мандат 8e)
	const [somaticStatus, setSomaticStatus] = useState<PediatricSomaticStatus>(
		DEFAULT_PEDIATRIC_SOMATIC_NORM,
	);
	const [somaticText, setSomaticText] = useState<string>("");

	// 2.4 Законный представитель (автоподстановка без принуждения к лишним полям)
	const [representative, setRepresentative] = useState<LegalRepresentativeData>(
		() => ({
			...DEFAULT_LEGAL_REPRESENTATIVE,
			fullName: representativeFullName || "",
			phone: representativePhone || patientPhone || "",
			...(representativeRole ? { role: representativeRole as any } : {}),
		}),
	);
	const [representativeText, setRepresentativeText] = useState<string>("");

	// 2.5 Калькулятор безопасности анестетика по весу ребенка (кг)
	const [anesthesiaCalculation, setAnesthesiaCalculation] =
		useState<PediatricAnesthesiaCalculationResult | null>(null);
	const [anesthesiaText, setAnesthesiaText] = useState<string>("");

	// 2.6 Седация ЗАКС (N2O/O2)
	const [sedation, setSedation] = useState<PediatricSedationState>(
		DEFAULT_SEDATION_STATE,
	);

	// 2.7 Модалка «Диплом за храбрость» (1-клик печать маленькому пациенту)
	const [isDiplomaModalOpen, setIsDiplomaModalOpen] = useState<boolean>(false);

	// 3. Активный пресет клинического протокола
	const [activePresetId, setActivePresetId] =
		useState<PediatricProtocolId>("caries_primary");

	// Проверка на инвазивность вмешательства (ст. 20 323-ФЗ: обязательное подтверждение ИДС законного представителя)
	const isInvasiveProtocol = useMemo<boolean>(() => {
		return [
			"caries_primary",
			"pulpotomy_primary",
			"extraction_primary_exfoliation",
			"standard_crown",
		].includes(activePresetId);
	}, [activePresetId]);

	const activePreset = useMemo<PediatricProtocolDefinition>(() => {
		return (
			PEDIATRIC_PROTOCOL_PRESETS.find((p) => p.id === activePresetId) ??
			(PEDIATRIC_PROTOCOL_PRESETS[0] as PediatricProtocolDefinition)
		);
	}, [activePresetId]);

	// 4. Шкала Франкла
	const [franklRating, setFranklRating] =
		useState<FranklRating>(initialFranklRating);

	const activeFrankl = useMemo<FranklExpressItem>(() => {
		return (
			FRANKL_EXPRESS_ITEMS.find((f) => f.rating === franklRating) ??
			(FRANKL_EXPRESS_ITEMS[2] as FranklExpressItem)
		);
	}, [franklRating]);

	const handleSelectFrankl = useCallback(
		(rating: FranklRating) => {
			setFranklRating(rating);
			onFranklChange?.(rating);
			const item = FRANKL_EXPRESS_ITEMS.find((f) => f.rating === rating);
			if (item) {
				showToast(`Шкала Франкла: ${item.titleRu}`, "info", 2000);
			}
		},
		[onFranklChange],
	);

	const handleCycleFrankl = useCallback(() => {
		handleSelectFrankl(
			franklRating >= 4 ? 1 : ((franklRating + 1) as FranklRating),
		);
	}, [franklRating, handleSelectFrankl]);

	// 5. Выбранные поверхности зуба
	const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>(() => {
		if (activeSurfaces && activeSurfaces.length > 0) return [...activeSurfaces];
		return ["O"];
	});

	// Синхронизация поверхностей при внешнем обновлении
	useEffect(() => {
		if (activeSurfaces && activeSurfaces.length > 0) {
			setSelectedSurfaces([...activeSurfaces]);
		}
	}, [activeSurfaces]);

	const toggleSurface = useCallback(
		(surf: string) => {
			setSelectedSurfaces((prev) => {
				const next = prev.includes(surf)
					? prev.filter((s) => s !== surf)
					: [...prev, surf];
				const sanitized = next.length > 0 ? next : ["O"];
				onSelectSurfaces?.(sanitized);
				return sanitized;
			});
		},
		[onSelectSurfaces],
	);

	const handleApplySurfacePreset = useCallback(
		(surfs: readonly string[]) => {
			const next = [...surfs];
			setSelectedSurfaces(next);
			onSelectSurfaces?.(next);
		},
		[onSelectSurfaces],
	);

	// 6. Выбранный материал
	const [selectedMaterial, setSelectedMaterial] = useState<string>(
		activePreset.defaultMaterial,
	);

	const handleSelectPreset = useCallback(
		(preset: PediatricProtocolDefinition) => {
			setActivePresetId(preset.id);
			setSelectedMaterial(preset.defaultMaterial);
			if (preset.defaultSurfaces.length > 0) {
				setSelectedSurfaces([...preset.defaultSurfaces]);
				onSelectSurfaces?.([...preset.defaultSurfaces]);
			}
			showToast(`1-клик протокол: «${preset.titleRu}»`, "info", 2000);
		},
		[onSelectSurfaces],
	);

	// 7. Детали и спойлер параметров
	const [showDetailsAccordion, setShowDetailsAccordion] =
		useState<boolean>(initialShowDetails);
	const [isMemoModalOpen, setIsMemoModalOpen] = useState<boolean>(false);

	// 8. Ортодонтический статус первичного осмотра (норма по умолчанию согласно Мандату 8e)
	const [orthoFrenulumNormal, setOrthoFrenulumNormal] = useState<boolean>(true);
	const [orthoNasalBreathing, setOrthoNasalBreathing] = useState<boolean>(true);
	const [orthoNoHarmfulHabits, setOrthoNoHarmfulHabits] =
		useState<boolean>(true);

	const handleSignConsent323Fz = useCallback(() => {
		const updated: LegalRepresentativeData = {
			...representative,
			consentSigned: true,
			statutoryDocument: "ст. 20 323-ФЗ, ст. 64 СК РФ (законный представитель)",
		};
		setRepresentative(updated);
		showToast(
			"ИДС законного представителя подтверждено (ст. 20 323-ФЗ)",
			"success",
			2500,
		);
	}, [representative]);

	// 9. Формирование полного текста протокола по Форме 043/у и Номенклатуре 804н
	const clinicalCalculation = useMemo(() => {
		return calculateClinicalProtocol({
			currentTooth,
			activePreset,
			activePresetId,
			selectedSurfaces,
			selectedMaterial,
			anesthesiaCalculation,
			anesthesiaText,
			sedation,
			representative,
			representativeText,
			somaticStatus,
			somaticText,
			activeFrankl,
			orthoFrenulumNormal,
			orthoNasalBreathing,
			orthoNoHarmfulHabits,
		});
	}, [
		activePreset,
		activePresetId,
		anesthesiaCalculation,
		anesthesiaText,
		currentTooth,
		selectedSurfaces,
		selectedMaterial,
		activeFrankl,
		orthoFrenulumNormal,
		orthoNasalBreathing,
		orthoNoHarmfulHabits,
		representative,
		representativeText,
		somaticStatus,
		somaticText,
		sedation,
	]);

	// 10. Внесение в Форму 043/у (Двойной диспатч: useVisitStore + CustomEvent dente-apply-soap-protocol)
	const handleInsertToForm043 = useCallback(() => {
		if (anesthesiaCalculation?.isOverdose) {
			showToast(
				`БЛОКИРОВКА ПЕРЕДОЗИРОВКИ: доза анестетика (${anesthesiaCalculation.totalDoseAdministeredMg} мг) превышает безопасный предел МРД (${anesthesiaCalculation.maxAllowedTotalDoseMg} мг) для веса ${anesthesiaCalculation.patientWeightKg} кг! Снизьте количество карпул.`,
				"error",
				6000,
			);
			return;
		}

		const textToApply = clinicalCalculation.fullProtocolText043;
		onApplyProtocolText?.(textToApply);

		setToothFindings((prev) => ({
			...prev,
			[currentTooth]: clinicalCalculation.toothFindingState,
		}));
		if (activePresetId === "extraction_primary_exfoliation") {
			setResorptionStages((prev) => ({
				...prev,
				[currentTooth]: 100,
			}));
		}

		try {
			useVisitStore.getState().setVisitNoteForm((prev) => {
				const existing = prev.objectiveStatus?.trim() || "";
				return {
					...prev,
					objectiveStatus: existing
						? `${existing}\n\n${textToApply}`
						: textToApply,
				};
			});
		} catch (err) {
			console.warn("useVisitStore update fallback:", err);
		}

		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							diagnosisIcd10: clinicalCalculation.diagnosisIcd10,
							treatmentDescription: clinicalCalculation.treatmentDescription,
							statusLocalis: clinicalCalculation.statusLocalis,
							recommendations: clinicalCalculation.recommendations,
						},
						finding: {
							toothNumber: currentTooth,
							state: clinicalCalculation.toothFindingState,
							surfaces: [...selectedSurfaces],
						},
						mode: "smart_append",
						immediate: true,
					},
				}),
			);
		} catch (err) {
			console.warn("dente-apply-soap-protocol dispatch fallback:", err);
		}

		if (isInvasiveProtocol && !representative.consentSigned) {
			showToast(
				`Детский протокол зуба ${currentTooth} внесен в карту (напоминание: требуется ИДС)`,
				"info",
				3500,
			);
		} else {
			showToast(
				`Детский протокол зуба ${currentTooth} внесен в медицинскую карту`,
				"success",
				3000,
			);
		}
	}, [
		activePresetId,
		anesthesiaCalculation,
		clinicalCalculation,
		currentTooth,
		isInvasiveProtocol,
		onApplyProtocolText,
		representative.consentSigned,
		selectedSurfaces,
	]);

	// 11. Добавление услуг в смету (CustomEvent dente-add-services-to-invoice)
	const handleAddServicesToInvoice = useCallback(() => {
		onAddToInvoice?.(clinicalCalculation.services804n);

		try {
			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: {
						toothNumber: currentTooth,
						services: clinicalCalculation.services804n,
					},
				}),
			);
		} catch (err) {
			console.warn("dente-add-services-to-invoice dispatch fallback:", err);
		}

		const codes = clinicalCalculation.services804n
			.map((s) => s.code)
			.join(", ");
		showToast(`Услуги добавлены в смету (${codes})`, "success", 2500);
	}, [clinicalCalculation, currentTooth, onAddToInvoice]);

	// 12. 1-Клик физиологическая норма временного прикуса (Мандат 8e)
	const handleApplyPhysiologicalNorm = useCallback(() => {
		setFranklRating(4);
		onFranklChange?.(4);
		setOrthoFrenulumNormal(true);
		setOrthoNasalBreathing(true);
		setOrthoNoHarmfulHabits(true);

		const fullText = buildPhysiologicalNorm043Text();
		onApplyProtocolText?.(fullText);

		try {
			useVisitStore.getState().setVisitNoteForm((prev) => {
				const existing = prev.objectiveStatus?.trim() || "";
				return {
					...prev,
					objectiveStatus: existing ? `${existing}\n\n${fullText}` : fullText,
				};
			});
		} catch (err) {
			console.warn("useVisitStore update fallback:", err);
		}

		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							diagnosisIcd10:
								PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION.diagnosisIcd10,
							treatmentDescription:
								PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION.treatmentRu,
							statusLocalis:
								PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION.statusLocalisRu,
							recommendations:
								PEDIATRIC_PHYSIOLOGICAL_NORM_DEFINITION.recommendationsRu,
						},
						finding: {
							toothNumber: currentTooth,
							state: "Healthy",
							surfaces: [],
						},
						mode: "smart_append",
						immediate: true,
					},
				}),
			);
		} catch (err) {
			console.warn("dente-apply-soap-protocol dispatch fallback:", err);
		}

		setToothFindings({});
		setResorptionStages({});

		showToast(
			"1-клик: Физиологическая норма временного прикуса (интактен, тремы, диастемы) внесена в карту!",
			"success",
			3500,
		);
	}, [currentTooth, onApplyProtocolText, onFranklChange]);

	// 12b. 1-Клик адаптационный визит без сверления (Мандаты 8e, 8k)
	const handleApplyAdaptationVisit = useCallback(() => {
		setFranklRating(3);
		onFranklChange?.(3);
		setOrthoFrenulumNormal(true);
		setOrthoNasalBreathing(true);
		setOrthoNoHarmfulHabits(true);

		const fullText = buildAdaptationVisit043Text();
		onApplyProtocolText?.(fullText);

		try {
			useVisitStore.getState().setVisitNoteForm((prev) => {
				const existing = prev.objectiveStatus?.trim() || "";
				return {
					...prev,
					objectiveStatus: existing ? `${existing}\n\n${fullText}` : fullText,
				};
			});
		} catch (err) {
			console.warn("useVisitStore update fallback:", err);
		}

		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							diagnosisIcd10: "Z01.2",
							treatmentDescription:
								"Психологическая адаптация по методике Tell-Show-Do. Осмотр зубов в игровой форме («считаем зубки»). Очищение щеточкой с пастой, аппликация фторгеля. Ребенок спокоен, вручен подарок.",
							statusLocalis:
								"Временный прикус. Слизистая бледно-розовая, влажная. Осмотр в игровой форме.",
							recommendations:
								"Позитивное подкрепление. Домашняя гигиена с пастой 1000 ppm под контролем родителей. Повторный визит через 3-4 недели.",
						},
						finding: {
							toothNumber: currentTooth,
							state: "Healthy",
							surfaces: [],
						},
						mode: "smart_append",
						immediate: true,
					},
				}),
			);
		} catch (err) {
			console.warn("dente-apply-soap-protocol dispatch fallback:", err);
		}

		showToast(
			"1-клик: Адаптационный визит (Tell-Show-Do, игра, подарок, без сверления) внесен в карту!",
			"success",
			3500,
		);
	}, [currentTooth, onApplyProtocolText, onFranklChange]);

	// 12c. 1-Клик сменный прикус (постоянные моляры 16..46 прорезались, физиологическая смена резцов 71, 81)
	const handleApplyMixedDentitionPreset = useCallback(() => {
		setDentitionMode("mixed");
		setToothFindings((prev) => ({
			...prev,
			16: "Healthy",
			26: "Healthy",
			36: "Healthy",
			46: "Healthy",
			71: "Extracted",
			81: "Extracted",
		}));
		setResorptionStages((prev) => ({
			...prev,
			71: 100,
			81: 100,
		}));
		showToast(
			"1-клик: Сменный прикус применён (постоянные моляры 16, 26, 36, 46 интактны, смена резцов 71, 81)",
			"success",
			3000,
		);
	}, []);

	return (
		<section
			aria-label="Протокол детского стоматологического приёма в медицинской карте"
			className={`pediatric-protocol-widget rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-3.5 sm:p-5 pb-36 md:pb-5 shadow-xs transition ${className}`.trim()}
			data-testid="pediatric-protocol-widget"
		>
			{/* ВЕРХНЯЯ ШАПКА: АКТИВНЫЙ ЗУБ + 1-КЛИК НОРМА + 1-КЛИК АДАПТАЦИЯ + ТАКТИКА ФРАНКЛА + КНОПКА ПАРАМЕТРОВ */}
			<PediatricProtocolTopBar
				currentTooth={currentTooth}
				anatomicalToothName={anatomicalToothName}
				activeFrankl={activeFrankl}
				showDetailsAccordion={showDetailsAccordion}
				onApplyPhysiologicalNorm={handleApplyPhysiologicalNorm}
				onApplyAdaptationVisit={handleApplyAdaptationVisit}
				onOpenDiplomaModal={() => setIsDiplomaModalOpen(true)}
				onCycleFrankl={handleCycleFrankl}
				onToggleDetailsAccordion={() => setShowDetailsAccordion((p) => !p)}
			/>

			{/* ЭКСПРЕСС-СЕЛЕКТОР ШКАЛЫ ФРАНКЛА (1..4) */}
			<PediatricBehaviorCard
				franklRating={franklRating}
				activeFrankl={activeFrankl}
				onSelectFrankl={handleSelectFrankl}
			/>

			{/* ДЕТСКАЯ КАРТА ЗУБОВ: МОЛОЧНЫЙ / СМЕННЫЙ ПРИКУС И ОРТОДОНТИЧЕСКИЙ СКРИНИНГ */}
			<PediatricPrimaryTeethCard
				currentTooth={currentTooth}
				onSelectTooth={(t) => {
					setCurrentTooth(t);
					showToast(
						`Выбран зуб #${t} (${PEDIATRIC_TEETH_NAMES[t] ?? t})`,
						"info",
						1500,
					);
				}}
				dentitionMode={dentitionMode}
				onModeChange={setDentitionMode}
				toothFindings={toothFindings}
				resorptionStages={resorptionStages}
				onResorptionChange={(t, stage) => {
					setResorptionStages((prev) => ({ ...prev, [t]: stage }));
					showToast(
						`Зуб ${t}: стадия резорбции корня ${stage}%`,
						"info",
						1500,
					);
				}}
				onToothFindingChange={(t, finding) => {
					setToothFindings((prev) => ({ ...prev, [t]: finding }));
					showToast(`Зуб ${t}: статус изменен на «${finding}»`, "info", 1500);
				}}
				onSetAllHealthy={() => {
					setToothFindings({});
					setResorptionStages({});
					showToast("Все молочные зубы отмечены как интактные", "success", 2000);
				}}
				onApplyMixedDentitionPreset={handleApplyMixedDentitionPreset}
				orthoFrenulumNormal={orthoFrenulumNormal}
				setOrthoFrenulumNormal={setOrthoFrenulumNormal}
				orthoNasalBreathing={orthoNasalBreathing}
				setOrthoNasalBreathing={setOrthoNasalBreathing}
				orthoNoHarmfulHabits={orthoNoHarmfulHabits}
				setOrthoNoHarmfulHabits={setOrthoNoHarmfulHabits}
			/>

			{/* ПРОТОКОЛ СЕДАЦИИ ЗАКС (N2O/O2) */}
			<PediatricSedationProtocol
				sedation={sedation}
				onSedationChange={setSedation}
			/>

			{/* ШАГИ ЛЕЧЕНИЯ: 323-ФЗ, 6 КЛИНИЧЕСКИХ ПРЕСЕТОВ, СОМАТИКА, АНЕСТЕЗИЯ, ПОВЕРХНОСТИ, МАТЕРИАЛЫ */}
			<PediatricTreatmentSteps
				activePreset={activePreset}
				activePresetId={activePresetId}
				onSelectPreset={handleSelectPreset}
				isInvasiveProtocol={isInvasiveProtocol}
				representative={representative}
				onSignConsent323Fz={handleSignConsent323Fz}
				selectedSurfaces={selectedSurfaces}
				onToggleSurface={toggleSurface}
				onApplySurfacePreset={handleApplySurfacePreset}
				selectedMaterial={selectedMaterial}
				onSelectMaterial={setSelectedMaterial}
				representativeFullName={representativeFullName}
				representativePhone={representativePhone}
				patientPhone={patientPhone}
				representativeRole={representativeRole}
				patientAgeYears={patientAgeYears}
				patientWeightKg={patientWeightKg}
				somaticProfile={somaticProfile}
				allergies={allergies}
				onSomaticChange={(status, text) => {
					setSomaticStatus(status);
					setSomaticText(text);
				}}
				onRepresentativeChange={(rep, text) => {
					setRepresentative(rep);
					setRepresentativeText(text);
				}}
				onAnesthesiaCalculationChange={setAnesthesiaCalculation}
				onApplyAnesthesiaText={(text) => {
					setAnesthesiaText(text);
					showToast("Расчет анестезии применен к протоколу", "success", 2000);
				}}
			/>

			{/* СПОЙЛЕР ДЕТАЛЕЙ (БЫСТРЫЙ ВЫБОР ЗУБА, ПРЕВЬЮ 043/у) */}
			<PediatricProtocolDetailsAccordion
				show={showDetailsAccordion}
				currentTooth={currentTooth}
				onSelectTooth={(t) => {
					setCurrentTooth(t);
					showToast(
						`Выбран зуб #${t} (${PEDIATRIC_TEETH_NAMES[t] ?? t})`,
						"info",
						1500,
					);
				}}
				fullProtocolText043={clinicalCalculation.fullProtocolText043}
			/>

			{/* ДЕСКТОПНЫЙ ПЛАНШЕТ ДЕЙСТВИЙ (md:flex) */}
			<PediatricProtocolDesktopActionBar
				onInsertToForm043={handleInsertToForm043}
				onAddServicesToInvoice={handleAddServicesToInvoice}
				onOpenMemoModal={() => setIsMemoModalOpen(true)}
				onOpenDiplomaModal={() => setIsDiplomaModalOpen(true)}
				servicesCount={clinicalCalculation.services804n.length}
				diagnosisIcd10={clinicalCalculation.diagnosisIcd10}
				primaryService={clinicalCalculation.services804n[0]}
			/>

			{/* МОБИЛЬНЫЙ FLOATING BOTTOM BAR (APPLE HIG: THUMB ZONE & PRIMARY CTA >= 52px) */}
			<PediatricMobileBottomBar
				currentTooth={currentTooth}
				activePreset={activePreset}
				diagnosisIcd10={clinicalCalculation.diagnosisIcd10}
				servicesCount={clinicalCalculation.services804n.length}
				onInsertToForm043={handleInsertToForm043}
				onAddServicesToInvoice={handleAddServicesToInvoice}
				onOpenMemoModal={() => setIsMemoModalOpen(true)}
				onOpenDiplomaModal={() => setIsDiplomaModalOpen(true)}
			/>

			{/* МОДАЛКА ПАМЯТКИ РОДИТЕЛЯМ (АНТИ-МАТРЁШКА: ГЛУБИНА СТРОГО 1 ЧЕРЕЗ ПОРТАЛ) */}
			{isMemoModalOpen && (
				<PediatricParentMemoModal
					isOpen={isMemoModalOpen}
					onClose={() => setIsMemoModalOpen(false)}
					patientName={patientName}
					patientPhone={patientPhone}
					patientAgeYears={patientAgeYears}
					doctorName={doctorName}
					clinicName={clinicName}
					initialFrankl={franklRating}
					initialPulpotomy={
						activePresetId === "pulpotomy_primary"
							? { toothNumber: currentTooth }
							: undefined
					}
					initialSilvering={
						activePresetId === "silvering_deep_fluoridation"
							? { teethNumbers: [currentTooth] }
							: undefined
					}
					initialFissureSealing={
						activePresetId === "fissure_sealing"
							? { teethNumbers: [currentTooth] }
							: undefined
					}
					onApplyFrankl={(rating) => setFranklRating(rating)}
				/>
			)}

			{/* МОДАЛКА ДИПЛОМА ЗА ХРАБРОСТЬ (АНТИ-МАТРЁШКА: ГЛУБИНА СТРОГО 1 ЧЕРЕЗ ПОРТАЛ) */}
			{isDiplomaModalOpen && (
				<PediatricRewardsModal
					isOpen={isDiplomaModalOpen}
					onClose={() => setIsDiplomaModalOpen(false)}
					patientName={patientName}
					patientAgeYears={patientAgeYears}
					doctorName={doctorName}
					clinicName={clinicName}
				/>
			)}
		</section>
	);
};