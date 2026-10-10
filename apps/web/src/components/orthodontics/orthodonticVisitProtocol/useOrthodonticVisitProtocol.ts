import { useCallback, useEffect, useMemo, useRef } from "react";
import { showToast } from "../../GlobalToast";
import { useVisitStore } from "../../../store/visitStore";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import {
	TORQUE_PRESETS,
	type WorkhorseArchwireOption,
} from "../OrthoArchwireSelector";
import {
	ALIGNER_ATTACHMENT_PRESETS,
} from "../OrthoBracketProtocolSection";
import {
	calculateOrthodonticServices804n,
	formatOrthodonticPatientMemo,
	getRuDateString,
	type TargetArch,
	type OrthodonticVisitProtocolWidgetProps,
} from "../orthoProtocolTypes";
import { synthesizeOrthodonticProtocolText } from "../orthoProtocolSynthesis";
import {
	printOrthodonticCard,
	copyTextToClipboard,
	printPatientMemoA4,
} from "../orthoProtocolPrintUtils";
import { useOrthoClinicalPresets } from "../useOrthoClinicalPresets";
import { useOrthoProtocolState } from "../useOrthoProtocolState";
import {
	subscribeCephSyncChannel,
	type CephInsertToProtocolPayload,
} from "../cephStudioSyncChannel";
import type { OrthoControlsColumnProps } from "../OrthoControlsColumn";
import type { OrthoProtocolPreviewSectionProps } from "../OrthoProtocolPreviewSection";

export function syncOrthoBackendActions(
	patientId: string,
	selectedActions: string[],
	archwireMaterial: string,
	archwireSection: string,
	targetArch: string,
	notes: string,
	powerChainType: string,
	powerChainSpan: string,
) {
	const headers = {
		"Content-Type": "application/json",
		...denteAdminSecretRequestHeaders(),
	};
	if (selectedActions.includes("wire_change")) {
		fetch(`/api/orthodontics/${encodeURIComponent(patientId)}/archwire-change`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				material: archwireMaterial,
				section: archwireSection,
				arch: targetArch,
				note: notes,
			}),
		}).catch((err) => {
			console.warn("[Orthodontics] Archwire change backend sync error:", err);
		});
	}
	if (selectedActions.includes("ligature_change")) {
		fetch(`/api/orthodontics/${encodeURIComponent(patientId)}/ligatures-activate`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				powerChain: powerChainType === "short",
				powerChainSpan,
				note: notes,
			}),
		}).catch((err) => {
			console.warn("[Orthodontics] Ligatures activation backend sync error:", err);
		});
	}
}

export function useOrthodonticVisitProtocol(props: OrthodonticVisitProtocolWidgetProps) {
	const {
		isOpen,
		onClose,
		patientId,
		patientName = "Пациент",
		clinicName = "Стоматологическая клиника DENTE",
		clinicPhone = "",
		doctorName = "Лечащий врач-ортодонт",
		selectedTooth = null,
		onSelectTooth,
		onIssueAlignerSet,
		onAddToInvoice,
	} = props;

	const state = useOrthoProtocolState(props);
	const {
		bracketSlot, setBracketSlot,
		bracketSystem, setBracketSystem,
		archwireMaterial, setArchwireMaterial,
		archwireSection, setArchwireSection,
		targetArch, setTargetArch,
		elasticScheme, setElasticScheme,
		elasticSize, setElasticSize,
		elasticWear,
		selectedActions, setSelectedActions,
		selectedTeeth, setSelectedTeeth,
		powerChainSpan, powerChainType,
		notes, setNotes,
		activePreset, setActivePreset,
		activeAttachmentPreset, setActiveAttachmentPreset,
		alignerSetIssued, setAlignerSetIssued,
		angleClass, setAngleClass,
		anbClass, setAnbClass,
		anbAngle, setAnbAngle,
		plateActivationTurns, setPlateActivationTurns,
		sagittalAnomaly, setSagittalAnomaly,
		sagittalGapMm, setSagittalGapMm,
		verticalAnomaly, setVerticalAnomaly,
		transversalAnomaly, setTransversalAnomaly,
		tmjStatus, setTmjStatus,
		isPhotoProtocolOpen, setIsPhotoProtocolOpen,
		isPhotoProtocolCompleted, setIsPhotoProtocolCompleted,
		isCephModalOpen, setIsCephModalOpen,
		stageFilter, setStageFilter,
		torquePreset, setTorquePreset,
		angulationPreset, setAngulationPreset,
		isSplitArchAligners, setIsSplitArchAligners,
		alignerStep, setAlignerStep,
		alignerTotal, setAlignerTotal,
		alignerStepUpper, setAlignerStepUpper,
		alignerTotalUpper, setAlignerTotalUpper,
		alignerStepLower, setAlignerStepLower,
		alignerTotalLower, setAlignerTotalLower,
		alignerDaysPerStep, setAlignerDaysPerStep,
	} = state;

	// Live synchronization with PostgreSQL 18 orthodontic progress
	useEffect(() => {
		if (!isOpen || !patientId) return;
		const activePid = patientId;
		let cancelled = false;

		async function loadOrthoProgress() {
			try {
				const res = await fetch(`/api/orthodontics/${encodeURIComponent(activePid)}/progress`, {
					headers: denteAdminSecretRequestHeaders(),
				});
				if (!res.ok) return;
				const data = await res.json();
				if (cancelled || !data) return;

				if (typeof data.currentAligner === "number" && data.currentAligner > 0) {
					setAlignerStep(data.currentAligner);
					setAlignerStepUpper(data.currentAligner);
					setAlignerStepLower(data.currentAligner);
				}
				if (typeof data.totalAligners === "number" && data.totalAligners > 0) {
					setAlignerTotal(data.totalAligners);
					setAlignerTotalUpper(data.totalAligners);
					setAlignerTotalLower(data.totalAligners);
				}
				if (typeof data.wearDaysPerAligner === "number" && data.wearDaysPerAligner > 0) {
					setAlignerDaysPerStep(data.wearDaysPerAligner);
				}
				if (data.archwire && typeof data.archwire === "string") {
					if (data.archwire.includes("NiTi")) setArchwireMaterial("NiTi");
					else if (data.archwire.includes("CuNiTi")) setArchwireMaterial("CuNiTi");
					else if (data.archwire.includes("SS")) setArchwireMaterial("SS");
					else if (data.archwire.includes("TMA")) setArchwireMaterial("TMA");
				}
			} catch (_e) {
				// Silently fall back to props/presets
			}
		}

		void loadOrthoProgress();
		return () => {
			cancelled = true;
		};
	}, [isOpen, patientId, setAlignerDaysPerStep, setAlignerStep, setAlignerStepLower, setAlignerStepUpper, setAlignerTotal, setAlignerTotalLower, setAlignerTotalUpper, setArchwireMaterial]);

	// Inter-tab BroadcastChannel listener for Cephalometrics Studio on second monitor
	useEffect(() => {
		const unsub = subscribeCephSyncChannel((msg) => {
			if (msg.type === "CEPH_INSERT_TO_PROTOCOL") {
				const payload = msg.payload as CephInsertToProtocolPayload;
				if (!payload) return;

				if (payload.protocolText) {
					setNotes((prev) => (prev ? `${prev}\n\n${payload.protocolText}` : payload.protocolText));
				}
				if (typeof payload.anbAngle === "number") {
					setAnbAngle(payload.anbAngle);
				}
				if (payload.skeletalClass) {
					if (payload.skeletalClass.includes("Class I") || payload.skeletalClass === "Class I") {
						setAnbClass("class_1");
					} else if (payload.skeletalClass.includes("Class II") || payload.skeletalClass === "Class II") {
						setAnbClass("class_2");
					} else if (payload.skeletalClass.includes("Class III") || payload.skeletalClass === "Class III") {
						setAnbClass("class_3");
					}
				}
				if (payload.growthPattern) {
					if (payload.growthPattern.includes("Dolicho") || payload.growthPattern.includes("Hyperdivergent")) {
						setVerticalAnomaly("open");
					} else if (payload.growthPattern.includes("Brachy") || payload.growthPattern.includes("Hypodivergent")) {
						setVerticalAnomaly("deep");
					}
				}
				if (typeof payload.u1SnAngle === "number") {
					if (payload.u1SnAngle > 106) {
						setTorquePreset("low");
					} else if (payload.u1SnAngle < 102) {
						setTorquePreset("high");
					} else {
						setTorquePreset("standard");
					}
				}

				showToast("Синхронизация ТРГ: Данные со 2-го монитора применены к плану лечения!", "success", 3500);
			}
		});

		return () => unsub();
	}, [setNotes, setAnbAngle, setAnbClass, setVerticalAnomaly, setTorquePreset]);

	// Clinical Presets & Lab Orders Custom Hook
	const presets = useOrthoClinicalPresets({
		patientName,
		selectedTeeth,
		isSplitArchAligners,
		alignerStep,
		alignerTotal,
		alignerStepUpper,
		alignerTotalUpper,
		alignerStepLower,
		alignerTotalLower,
		targetArch,
		setActivePreset,
		setTargetArch,
		setSelectedTeeth,
		setBracketSlot,
		setBracketSystem,
		setArchwireMaterial,
		setArchwireSection,
		setSelectedActions,
		setElasticScheme,
		setElasticSize,
		setElasticWear: state.setElasticWear,
		setNotes,
	});

	const handleSelectBracketSystem = useCallback(
		(newSystem: string) => {
			setBracketSystem(newSystem);
			if (newSystem === "damon_q2" || newSystem === "damon_clear") {
				setBracketSlot("0.022");
				if (torquePreset !== "damon_high" && torquePreset !== "damon_low" && torquePreset !== "damon_std") {
					setTorquePreset("damon_std");
				}
			} else if (newSystem === "mini_diamond") {
				setTorquePreset("roth");
			} else if (newSystem === "empower") {
				setTorquePreset("mbt");
				setBracketSlot("0.022");
			} else if (newSystem === "aligners") {
				setStageFilter("aligners");
				if (!activeAttachmentPreset) {
					setActiveAttachmentPreset("standard");
				}
			}
		},
		[torquePreset, activeAttachmentPreset, setBracketSystem, setBracketSlot, setTorquePreset, setStageFilter, setActiveAttachmentPreset],
	);

	const nextAlignerDateStr = useMemo(() => {
		const d = new Date();
		d.setDate(d.getDate() + alignerDaysPerStep);
		return getRuDateString(d);
	}, [alignerDaysPerStep]);

	const alignerProgressPercent = useMemo(() => {
		if (alignerTotal <= 0) return 0;
		return Math.min(100, Math.round((alignerStep / alignerTotal) * 100));
	}, [alignerStep, alignerTotal]);

	const handleSendAlignerReminder = useCallback(() => {
		const nextStepStr = isSplitArchAligners
			? `ВЧ №${Math.min(alignerTotalUpper, alignerStepUpper + 1)} / НЧ №${Math.min(alignerTotalLower, alignerStepLower + 1)}`
			: `№${Math.min(alignerTotal, alignerStep + 1)} из ${alignerTotal}`;
		const reminderText = `Здравствуйте, ${patientName}! Напоминание из клиники «${clinicName}»: плановая смена элайнера на каппу ${nextStepStr} запланирована на ${nextAlignerDateStr}. Режим ношения: 22 часа в сутки, чистка прохладной водой, фиксация с чувисами. При любых вопросах звоните${clinicPhone ? `: ${clinicPhone}` : ""}. Ваш лечащий врач: ${doctorName}.`;
		try {
			if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
				navigator.clipboard.writeText(reminderText).catch(() => {});
			}
			showToast(`Напоминание о смене каппы (${nextAlignerDateStr}) скопировано для мессенджера`, "success", 4000);
		} catch {
			showToast("Напоминание скопировано", "success");
		}
	}, [patientName, clinicName, isSplitArchAligners, alignerStep, alignerTotal, alignerStepUpper, alignerTotalUpper, alignerStepLower, alignerTotalLower, nextAlignerDateStr, clinicPhone, doctorName]);

	const handleSelectAttachmentPreset = (presetId: string) => {
		const preset = ALIGNER_ATTACHMENT_PRESETS.find((p) => p.id === presetId);
		if (!preset) return;
		setActiveAttachmentPreset(presetId);
		setActivePreset(null);
		setBracketSystem("aligners");
		setTargetArch("both");
		if (preset.teeth && preset.teeth.length > 0) setSelectedTeeth([...preset.teeth]);
		setNotes(preset.description);
		showToast(`${preset.shortLabel} выбран`, "info");
	};

	const handleIssueAlignerSetFromWidget = (count: number, days: number) => {
		setAlignerSetIssued({ count, days });
		setAlignerStep((prev) => Math.min(alignerTotal, prev + count));
		onIssueAlignerSet?.(count, days);

		if (patientId) {
			fetch(`/api/orthodontics/${encodeURIComponent(patientId)}/aligners/issue-set`, {
				method: "POST",
				headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
				body: JSON.stringify({ alignerCount: count, wearDaysPerAligner: days, totalAligners: alignerTotal }),
			}).catch((err) => {
				console.warn("[Orthodontics] Aligner set issuance backend sync error:", err);
			});
		}
		showToast(`Сдан сет элайнеров (${count} каппы на ${days} дн., режим 22 ч/сутки)`, "success");
	};

	const handleApplyAttachmentsProtocol = useCallback(() => {
		const currentPreset = ALIGNER_ATTACHMENT_PRESETS.find((p) => p.id === activeAttachmentPreset) || ALIGNER_ATTACHMENT_PRESETS[0];
		const textToAppend = currentPreset?.description || "Композитные аттачменты элайнеров зафиксированы/проверены по протоколу.";
		const alignerServices = calculateOrthodonticServices804n({ bracketSystem: "aligners", activeAttachmentPreset: activeAttachmentPreset || "standard", isAttachmentsOnly: true, selectedTooth: selectedTooth ?? undefined });

		try {
			const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
			if (setVisitNoteForm) {
				setVisitNoteForm((prev) => ({
					...prev,
					objectiveStatus: prev.objectiveStatus ? `${prev.objectiveStatus}\n\n${textToAppend}` : textToAppend,
					treatmentPlan: prev.treatmentPlan ? `${prev.treatmentPlan}\n\n[Ортодонтия] Элайнеры: ${currentPreset?.shortLabel || "контроль аттачментов"}` : `[Ортодонтия] Элайнеры: ${currentPreset?.shortLabel || "контроль аттачментов"}.`,
				}));
			}

			if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", {
					detail: { protocolText: `[Аттачменты элайнеров]\n${textToAppend}`, title: "Аттачменты элайнеров", soap: { objective: textToAppend, plan: `Элайнеры: ${currentPreset?.shortLabel || "контроль аттачментов"}` }, mode: "smart_append", immediate: true },
				}));
				window.dispatchEvent(new CustomEvent("dente-add-services-to-invoice", {
					detail: { services: alignerServices, toothNumber: selectedTooth ?? undefined, stageKind: "stage_ortho" },
				}));
			}
			onAddToInvoice?.(alignerServices);
			if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(textToAppend).catch(() => {});
			const codesList = alignerServices.map((s) => s.code).join(", ");
			showToast(`Аттачменты внесены в дневник приёма и ${alignerServices.length} услуг (${codesList}) начислены в смету!`, "success");
		} catch (_err) {
			showToast("Протокол скопирован в буфер обмена", "info");
			if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(textToAppend).catch(() => {});
		}
	}, [activeAttachmentPreset, selectedTooth, onAddToInvoice]);

	const handleSelectArch = (arch: TargetArch) => {
		setActivePreset(null);
		setTargetArch(arch);
		if (arch === "upper") setSelectedTeeth([17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27]);
		else if (arch === "lower") setSelectedTeeth([47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37]);
		else setSelectedTeeth([17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37]);
	};

	const handleToggleTooth = (tooth: number) => {
		setSelectedTeeth((prev) => prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth].sort((a, b) => a - b));
		onSelectTooth?.(tooth);
	};

	const handleToggleAction = (actionId: string) => {
		setSelectedActions((prev) => prev.includes(actionId) ? prev.filter((a) => a !== actionId) : [...prev, actionId]);
	};

	// Debounced autosave
	const isWidgetMountedRef = useRef(false);
	useEffect(() => {
		if (!isOpen) return;
		if (!isWidgetMountedRef.current) {
			isWidgetMountedRef.current = true;
			return;
		}
		const timer = setTimeout(() => {
			try {
				const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
				if (setVisitNoteForm && notes) {
					setVisitNoteForm((prev) => ({
						...prev,
						treatmentPlan: prev.treatmentPlan?.includes(notes) ? prev.treatmentPlan : prev.treatmentPlan ? `${prev.treatmentPlan}\n\n[Ортодонтия] ${notes}` : `[Ортодонтия] ${notes}`,
					}));
				}
			} catch {}
		}, 800);
		return () => clearTimeout(timer);
	}, [isOpen, notes]);

	const handleSelectWorkhorseArchwire = (wire: WorkhorseArchwireOption) => {
		setActivePreset(null);
		setArchwireMaterial(wire.material);
		setArchwireSection(wire.section);
		if (!selectedActions.includes("wire_change")) setSelectedActions((prev) => [...prev, "wire_change"]);
		showToast(`Установлена рабочая дуга ${wire.label}`, "info");
	};

	const handleElasticSizeInteraction = useCallback(() => {
		if (elasticScheme === "none") {
			setElasticScheme("class_ii");
			showToast("Схема эластиков: установлен «Класс II (по умолчанию)»", "info");
		}
	}, [elasticScheme, setElasticScheme]);

	const handleTogglePhotoProtocolCompleted = useCallback(() => {
		setIsPhotoProtocolCompleted((prev) => !prev);
		showToast(!isPhotoProtocolCompleted ? "Фотопротокол зафиксирован (8 ракурсов ABO подтверждены)" : "Статус фотопротокола сброшен", "info", 2500);
	}, [isPhotoProtocolCompleted, setIsPhotoProtocolCompleted]);

	const handleSetAnbNorm = useCallback(() => {
		setAnbClass("class_1");
		setAnbAngle(2.0);
		showToast("Норма: Скелетный класс I (ANB 2.0°)", "success", 2500);
	}, [setAnbClass, setAnbAngle]);

	const handleInsertCephToProtocol = useCallback((protocolText: string) => {
		setNotes((prev) => (prev ? `${prev}\n\n${protocolText}` : protocolText));
		setIsCephModalOpen(false);
		showToast("ТРГ цефалометрический протокол добавлен в дневник", "success", 3000);
	}, [setNotes, setIsCephModalOpen]);

	const handleSetAngleClassNorm = useCallback(() => {
		setAngleClass("class_1");
		setAnbClass("class_1");
		setAnbAngle(2.0);
		setElasticScheme("none");
		setNotes("Скелетный класс I по Энглю и Steiner (ANB 2.0°), соотношение моляров и клыков нейтральное. Патологии смыкания не выявлено (физиологическая норма).");
		showToast("Норма: Скелетный класс I / Физиологический прикус", "success", 2500);
	}, [setAngleClass, setAnbClass, setAnbAngle, setElasticScheme, setNotes]);

	const handleSetOcclusionNorm = useCallback(() => {
		setSagittalAnomaly("norm");
		setSagittalGapMm(2);
		setVerticalAnomaly("norm");
		setTransversalAnomaly("norm");
		showToast("Норма: Окклюзионные взаимоотношения в норме", "success", 2500);
	}, [setSagittalAnomaly, setSagittalGapMm, setVerticalAnomaly, setTransversalAnomaly]);

	const handleSetTmjNorm = useCallback(() => {
		setTmjStatus("norm");
		showToast("Норма: ВНЧС безболезненный, девиации нет", "success", 2500);
	}, [setTmjStatus]);

	const calculatedServices804n = useMemo(() => {
		return calculateOrthodonticServices804n({ selectedActions, bracketSystem, activeAttachmentPreset, selectedTooth, targetArch });
	}, [selectedActions, bracketSystem, activeAttachmentPreset, selectedTooth, targetArch]);

	// Protocol Text Synthesis (SOAP Form 043/u)
	const generatedProtocol = useMemo(() => {
		return synthesizeOrthodonticProtocolText({
			patientName,
			notes,
			angleClass,
			anbClass,
			anbAngle,
			sagittalAnomaly,
			sagittalGapMm,
			verticalAnomaly,
			transversalAnomaly,
			tmjStatus,
			isPhotoProtocolCompleted,
			bracketSlot,
			bracketSystem,
			archwireMaterial,
			archwireSection,
			targetArch,
			elasticScheme,
			elasticSize,
			elasticWear,
			selectedActions,
			selectedTeeth,
			powerChainSpan,
			powerChainType,
			activePreset,
			activeAttachmentPreset,
			alignerSetIssued,
			plateActivationTurns,
			torquePreset,
			angulationPreset,
			isSplitArchAligners,
			alignerStep,
			alignerTotal,
			alignerStepUpper,
			alignerTotalUpper,
			alignerStepLower,
			alignerTotalLower,
			alignerProgressPercent,
			nextAlignerDateStr,
			alignerDaysPerStep,
		});
	}, [patientName, notes, angleClass, anbClass, anbAngle, sagittalAnomaly, sagittalGapMm, verticalAnomaly, transversalAnomaly, tmjStatus, isPhotoProtocolCompleted, bracketSlot, bracketSystem, archwireMaterial, archwireSection, targetArch, elasticScheme, elasticSize, elasticWear, selectedActions, selectedTeeth, powerChainSpan, powerChainType, activePreset, activeAttachmentPreset, alignerSetIssued, plateActivationTurns, torquePreset, angulationPreset, isSplitArchAligners, alignerStep, alignerTotal, alignerStepUpper, alignerTotalUpper, alignerStepLower, alignerTotalLower, alignerProgressPercent, nextAlignerDateStr, alignerDaysPerStep]);

	const handleAddServicesToInvoice = useCallback(() => {
		if (calculatedServices804n.length === 0) {
			showToast("Нет выбранных ортодонтических манипуляций для начисления", "info");
			return;
		}
		onAddToInvoice?.(calculatedServices804n);
		try {
			if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente-add-services-to-invoice", {
					detail: { services: calculatedServices804n, toothNumber: selectedTooth ?? undefined, stageKind: "stage_ortho" },
				}));
			}
		} catch (err) {
			console.warn("dente-add-services-to-invoice dispatch error:", err);
		}
		const totalRub = calculatedServices804n.reduce((acc, s) => acc + s.priceRub, 0);
		const codesStr = calculatedServices804n.map((s) => s.code).join(", ");
		showToast(`Начислено ${calculatedServices804n.length} услуг (${codesStr}) на сумму ${totalRub} ₽`, "success", 3500);
	}, [calculatedServices804n, selectedTooth, onAddToInvoice]);

	// Apply to Form 043/u and invoice
	const handleApplyToVisitNote = useCallback(() => {
		const currentAttachmentObj = ALIGNER_ATTACHMENT_PRESETS.find((p) => p.id === activeAttachmentPreset);
		const servicesToDispatch = calculatedServices804n;
		const torqueObj = TORQUE_PRESETS.find((t) => t.id === torquePreset);

		try {
			const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
			if (setVisitNoteForm) {
				const planSummary = activeAttachmentPreset
					? `Элайнеры: ${isSplitArchAligners ? `ВЧ Каппа №${alignerStepUpper}/${alignerTotalUpper}, НЧ Каппа №${alignerStepLower}/${alignerTotalLower}` : `Каппа №${alignerStep}/${alignerTotal}`} (${currentAttachmentObj?.shortLabel || "аттачменты"})`
					: bracketSystem === "removable_plate"
						? `Пластинка с винтом (активация ${plateActivationTurns}/4 об.)`
						: `Дуга ${archwireMaterial} ${archwireSection}", торк ${torqueObj?.shortLabel || "Damon Std"}, ${elasticScheme !== "none" ? "эластики" : "активация"}`;

				setVisitNoteForm((prev) => ({
					...prev,
					complaint: prev.complaint ? `${prev.complaint}\n\n[Ортодонтия] ${notes}` : `Плановый ортодонтический приём. ${notes}`,
					objectiveStatus: prev.objectiveStatus ? `${prev.objectiveStatus}\n\n${generatedProtocol}` : generatedProtocol,
					treatmentPlan: prev.treatmentPlan ? `${prev.treatmentPlan}\n\n[Ортодонтия] ${planSummary}` : `Ортодонтическое лечение: ${planSummary}.`,
				}));
			}

			if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", {
					detail: { protocolText: generatedProtocol, title: "Ортодонтический протокол (брекеты & дуги)", angleClass },
				}));
				if (servicesToDispatch.length > 0) {
					window.dispatchEvent(new CustomEvent("dente-add-services-to-invoice", {
						detail: { services: servicesToDispatch, toothNumber: selectedTooth ?? undefined, stageKind: "stage_ortho" },
					}));
				}
			}

			if (servicesToDispatch.length > 0) onAddToInvoice?.(servicesToDispatch);
			if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(generatedProtocol).catch(() => {});

			const codesStr = servicesToDispatch.map((s) => s.code).join(", ");
			showToast(servicesToDispatch.length > 0 ? `Протокол сохранен в карту и ${servicesToDispatch.length} услуг (${codesStr}) добавлены в смету!` : "Ортодонтический протокол сохранен в медицинскую карту!", "success");

			if (patientId) {
				syncOrthoBackendActions(patientId, selectedActions, archwireMaterial, archwireSection, targetArch, notes, powerChainType, powerChainSpan);
			}

			onClose();
		} catch (_err) {
			showToast("Протокол скопирован в буфер обмена", "info");
			if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(generatedProtocol).catch(() => {});
		}
	}, [activeAttachmentPreset, calculatedServices804n, torquePreset, isSplitArchAligners, alignerStepUpper, alignerTotalUpper, alignerStepLower, alignerTotalLower, alignerStep, alignerTotal, bracketSystem, plateActivationTurns, archwireMaterial, archwireSection, elasticScheme, notes, generatedProtocol, angleClass, selectedTooth, onAddToInvoice, patientId, selectedActions, targetArch, powerChainType, powerChainSpan, onClose]);

	// Print Form 043/u & Patient Memo
	const handlePrintOrthodonticCard = useCallback(() => {
		printOrthodonticCard({ patientName, clinicName, doctorName, generatedProtocol });
	}, [clinicName, doctorName, patientName, generatedProtocol]);

	const handleCopyClipboard = () => copyTextToClipboard(generatedProtocol, "Протокол скопирован в буфер обмена");

	const handleCopyPatientMemo = useCallback(() => {
		const text = formatOrthodonticPatientMemo({
			clinicName, clinicPhone, doctorName, patientName, bracketSystem, archwireMaterial, archwireSection, targetArch, elasticScheme, elasticSize, elasticWear,
			isAligners: bracketSystem === "aligners" || Boolean(activeAttachmentPreset),
			currentAligner: isSplitArchAligners ? undefined : alignerStep,
			totalAligners: isSplitArchAligners ? undefined : alignerTotal,
			currentAlignerUpper: isSplitArchAligners ? alignerStepUpper : undefined,
			totalAlignersUpper: isSplitArchAligners ? alignerTotalUpper : undefined,
			currentAlignerLower: isSplitArchAligners ? alignerStepLower : undefined,
			totalAlignersLower: isSplitArchAligners ? alignerTotalLower : undefined,
			notes,
		});
		copyTextToClipboard(text, "Памятка пациенту по эластикам и уходу скопирована для мессенджера");
	}, [clinicName, clinicPhone, doctorName, patientName, bracketSystem, archwireMaterial, archwireSection, targetArch, elasticScheme, elasticSize, elasticWear, activeAttachmentPreset, isSplitArchAligners, alignerStep, alignerTotal, alignerStepUpper, alignerTotalUpper, alignerStepLower, alignerTotalLower, notes]);

	const handlePrintPatientMemo = useCallback(() => {
		const memoText = formatOrthodonticPatientMemo({
			clinicName, clinicPhone, doctorName, patientName, bracketSystem, archwireMaterial, archwireSection, targetArch, elasticScheme, elasticSize, elasticWear,
			isAligners: bracketSystem === "aligners" || Boolean(activeAttachmentPreset),
			currentAligner: isSplitArchAligners ? undefined : alignerStep,
			totalAligners: isSplitArchAligners ? undefined : alignerTotal,
			currentAlignerUpper: isSplitArchAligners ? alignerStepUpper : undefined,
			totalAlignersUpper: isSplitArchAligners ? alignerTotalUpper : undefined,
			currentAlignerLower: isSplitArchAligners ? alignerStepLower : undefined,
			totalAlignersLower: isSplitArchAligners ? alignerTotalLower : undefined,
			notes,
		});
		printPatientMemoA4({ patientName, clinicName, doctorName, clinicPhone, memoText });
	}, [clinicName, clinicPhone, doctorName, patientName, bracketSystem, archwireMaterial, archwireSection, targetArch, elasticScheme, elasticSize, elasticWear, activeAttachmentPreset, isSplitArchAligners, alignerStep, alignerTotal, alignerStepUpper, alignerTotalUpper, alignerStepLower, alignerTotalLower, notes]);

	const controlsColumnProps: OrthoControlsColumnProps = {
		stageFilter,
		setStageFilter,
		setBracketSystem,
		setArchwireMaterial,
		setArchwireSection,
		selectedActions,
		setSelectedActions,
		isPhotoProtocolOpen,
		setIsPhotoProtocolOpen,
		isPhotoProtocolCompleted,
		onTogglePhotoProtocolCompleted: handleTogglePhotoProtocolCompleted,
		isCephModalOpen,
		setIsCephModalOpen,
		anbClass,
		setAnbClass,
		anbAngle,
		setAnbAngle,
		onSetAnbNorm: handleSetAnbNorm,
		patientId,
		patientName,
		doctorName,
		clinicName,
		onInsertCephToProtocol: handleInsertCephToProtocol,
		activePreset,
		onPresetActivation: presets.handlePresetActivation,
		onPresetWireChange: presets.handlePresetWireChange,
		onPresetBonding: presets.handlePresetBonding,
		onPresetDebonding: presets.handlePresetDebonding,
		onPresetAlignerLabOrder: presets.handlePresetAlignerLabOrder,
		onPresetRetainerLabOrder: presets.handlePresetRetainerLabOrder,
		onPresetPlateLabOrder: presets.handlePresetPlateLabOrder,
		onPresetSplintLabOrder: presets.handlePresetSplintLabOrder,
		alignerStep,
		alignerTotal,
		angleClass,
		setAngleClass,
		onSetAngleClassNorm: handleSetAngleClassNorm,
		sagittalAnomaly,
		setSagittalAnomaly,
		sagittalGapMm,
		setSagittalGapMm,
		verticalAnomaly,
		setVerticalAnomaly,
		transversalAnomaly,
		setTransversalAnomaly,
		onSetOcclusionNorm: handleSetOcclusionNorm,
		tmjStatus,
		setTmjStatus,
		onSetTmjNorm: handleSetTmjNorm,
		targetArch,
		onSelectArch: handleSelectArch,
		selectedTeeth,
		onToggleTooth: handleToggleTooth,
		setSelectedTeeth,
		bracketSlot,
		setBracketSlot,
		bracketSystem,
		onSelectBracketSystem: handleSelectBracketSystem,
		plateActivationTurns,
		setPlateActivationTurns,
		activeAttachmentPreset,
		onSelectAttachmentPreset: handleSelectAttachmentPreset,
		isSplitArchAligners,
		setIsSplitArchAligners,
		setAlignerStep,
		setAlignerTotal,
		alignerStepUpper,
		setAlignerStepUpper,
		alignerTotalUpper,
		setAlignerTotalUpper,
		alignerStepLower,
		setAlignerStepLower,
		alignerTotalLower,
		setAlignerTotalLower,
		alignerDaysPerStep,
		setAlignerDaysPerStep,
		nextAlignerDateStr,
		alignerProgressPercent,
		onSendAlignerReminder: handleSendAlignerReminder,
		onIssueAlignerSet: handleIssueAlignerSetFromWidget,
		onApplyAttachmentsProtocol: handleApplyAttachmentsProtocol,
		alignerSetIssuedCount: alignerSetIssued?.count,
		archwireMaterial,
		archwireSection,
		onSelectWorkhorseArchwire: handleSelectWorkhorseArchwire,
		torquePreset,
		setTorquePreset,
		angulationPreset,
		setAngulationPreset,
		elasticScheme,
		setElasticScheme,
		elasticSize,
		setElasticSize,
		onElasticSizeInteraction: handleElasticSizeInteraction,
		onToggleAction: handleToggleAction,
	};

	const previewSectionProps: OrthoProtocolPreviewSectionProps = {
		generatedProtocol,
		onPrintOrthodonticCard: handlePrintOrthodonticCard,
		onCopyClipboard: handleCopyClipboard,
		onCopyPatientMemo: handleCopyPatientMemo,
		onPrintPatientMemo: handlePrintPatientMemo,
		onAddServicesToInvoice: handleAddServicesToInvoice,
		onApplyToVisitNote: handleApplyToVisitNote,
		onClose,
		calculatedServicesCount: calculatedServices804n.length,
	};

	return {
		state,
		presets,
		controlsColumnProps,
		previewSectionProps,
		calculatedServices804n,
		generatedProtocol,
		handlePrintOrthodonticCard,
		handleAddServicesToInvoice,
		handleApplyToVisitNote,
		handleCopyClipboard,
		handleCopyPatientMemo,
		handlePrintPatientMemo,
		handleSendAlignerReminder,
		nextAlignerDateStr,
		alignerProgressPercent,
	};
}
