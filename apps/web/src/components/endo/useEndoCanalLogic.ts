import React, { useEffect, useMemo, useState } from "react";
import type { EndoCanalData, EndoToothClinicalData } from "@dental/shared";
import {
	type EndoStageStamp,
	applyAnatomicalWorkingLengths,
	applyCaOh2EndoProtocol,
	applyExpressApicalEndoProtocol,
	applyObturationPermanentProtocol,
	applyPeriodontitisDestructiveProtocol,
	applyPrimaryEndoProtocol,
	applyPulpitisObturationProtocol,
	applyPulpitisProtocol,
	applyRetreatmentEndoProtocol,
	applyStandardEndoProtocol,
	formatEndoPatientMemo,
	generateEndoProtocol043,
	getDefaultCanalsForTooth,
	OBTURATION_TECHNIQUE_OPTIONS,
	PRIMARY_ENDO_PRESET,
	REFERENCE_POINT_OPTIONS,
	TAPER_OPTIONS,
} from "./endoCanalConstants";
import { sanitizeCanalsForSubmission, renderIsoColorBadge } from "./endoCanalHelpers";
import { getToothAnatomicalNameRu } from "../../lib/clinicalProtocols043";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { showToast } from "../GlobalToast";
import { loadPersistedEndoCanals } from "../radiology/endoClinicalIntegrationBridge";
import { useVisitStore } from "../../store/visitStore";

export interface UseEndoCanalLogicProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly toothNumber: number;
	readonly patientId?: string | undefined;
	readonly initialCanals?: readonly EndoCanalData[] | undefined;
	readonly initialIrrigation?: string | undefined;
	readonly initialRotarySystem?: string | undefined;
	readonly initialRadiologyControl?: string | undefined;
	readonly onInsertToProtocol?: (
		(protocolText: string,
		canals: EndoCanalData[],
	) => void) | undefined;
	readonly onSaveCanals?: (
		(canals: EndoCanalData[],
		clinicalData: EndoToothClinicalData,
	) => Promise<void> | void) | undefined;
	readonly onSave?: ((savedCanals: EndoCanalData[], noteText?: string) => void) | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly patientName?: string | undefined;
}

export function useEndoCanalLogic({
	isOpen,
	onClose,
	toothNumber,
	patientId,
	initialCanals,
	initialIrrigation,
	initialRotarySystem,
	initialRadiologyControl,
	onInsertToProtocol,
	onSaveCanals,
	onSave,
	clinicName = "Стоматологическая клиника DENTE",
	clinicPhone = "",
	doctorName = "Врач-стоматолог-терапевт (эндодонтист)",
	patientName = "Пациент",
}: UseEndoCanalLogicProps) {
	const [activeTooth, setActiveTooth] = useState<number>(toothNumber);

	useEffect(() => {
		setActiveTooth(toothNumber);
	}, [toothNumber]);

	const [canals, setCanals] = useState<EndoCanalData[]>(() => {
		if (initialCanals && initialCanals.length > 0) {
			return initialCanals.map((c) => ({ ...c }));
		}
		return getDefaultCanalsForTooth(toothNumber);
	});

	const [irrigation, setIrrigation] = useState<string>(
		initialIrrigation || PRIMARY_ENDO_PRESET.irrigation,
	);
	const [rotarySystem, setRotarySystem] = useState<string>(
		initialRotarySystem || PRIMARY_ENDO_PRESET.rotarySystem,
	);
	const [radiologyControl, setRadiologyControl] = useState<string>(
		initialRadiologyControl || PRIMARY_ENDO_PRESET.radiologyControl,
	);
	const [copied, setCopied] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isLoadingFromDb, setIsLoadingFromDb] = useState(false);

	// Clinical Stage Stamp (Мандат 8e п. 3 — свобода сохранения на любом этапе)
	const [stageStamp, setStageStamp] = useState<EndoStageStamp>(() => {
		if (
			initialIrrigation?.toLowerCase().includes("ca(oh)2") ||
			initialRotarySystem?.toLowerCase().includes("ca(oh)2")
		) {
			return "TEMP_CAOH2";
		}
		return "COMPLETED";
	});

	// UI menus state (Мандаты 8c, 8d)
	const [isPresetsMenuOpen, setIsPresetsMenuOpen] = useState(false);
	const [isFooterMenuOpen, setIsFooterMenuOpen] = useState(false);

	// Анатомические подсказки названий каналов зуба FDI
	const suggestedCanalNames = useMemo(() => {
		const defaultCanals = getDefaultCanalsForTooth(activeTooth);
		const names = defaultCanals.map((dc) => dc.canalName);
		const extra =
			activeTooth >= 16 && activeTooth <= 28
				? ["MB1", "MB2", "DB", "P"]
				: activeTooth >= 36 && activeTooth <= 48
					? ["MB", "ML", "D", "DL"]
					: ["Main", "B", "L"];
		return Array.from(new Set([...names, ...extra])).slice(0, 5);
	}, [activeTooth]);

	const handleSwitchTooth = (newTooth: number) => {
		setActiveTooth(newTooth);
		const newCanals = getDefaultCanalsForTooth(newTooth);
		setCanals(newCanals);
		showToast(
			`Выбран зуб #${newTooth}. Анатомические каналы автозаполнены`,
			"info",
		);
	};

	// При смене номера зуба, переоткрытии окна или передаче initialCanals
	useEffect(() => {
		if (!isOpen) return;

		if (initialCanals && initialCanals.length > 0 && activeTooth === toothNumber) {
			setCanals(initialCanals.map((c) => ({ ...c })));
			if (initialIrrigation) setIrrigation(initialIrrigation);
			if (initialRotarySystem) setRotarySystem(initialRotarySystem);
			if (initialRadiologyControl) setRadiologyControl(initialRadiologyControl);
			return;
		}

		if (patientId) {
			let cancelled = false;
			setIsLoadingFromDb(true);

			fetch(`/api/patients/${patientId}/tooth-states/${activeTooth}/endo`, {
				headers: denteAdminSecretRequestHeaders(),
			})
				.then((res) => (res.ok ? res.json() : null))
				.then((data) => {
					if (cancelled) return;
					if (
						data?.success &&
						data?.clinicalData?.canals &&
						Array.isArray(data.clinicalData.canals) &&
						data.clinicalData.canals.length > 0
					) {
						setCanals(
							data.clinicalData.canals.map((c: EndoCanalData) => ({ ...c })),
						);
						if (data.clinicalData.irrigation) setIrrigation(data.clinicalData.irrigation);
						if (data.clinicalData.rotarySystem) setRotarySystem(data.clinicalData.rotarySystem);
						if (data.clinicalData.radiologyControl) setRadiologyControl(data.clinicalData.radiologyControl);
					} else {
						const cbctCanals = loadPersistedEndoCanals(patientId, activeTooth);
						if (cbctCanals && cbctCanals.length > 0) {
							setCanals(cbctCanals.map((c) => ({ ...c })));
						} else {
							setCanals(getDefaultCanalsForTooth(activeTooth));
						}
					}
				})
				.catch(() => {
					if (!cancelled) {
						const cbctCanals = loadPersistedEndoCanals(patientId, activeTooth);
						if (cbctCanals && cbctCanals.length > 0) {
							setCanals(cbctCanals.map((c) => ({ ...c })));
						} else {
							setCanals(getDefaultCanalsForTooth(activeTooth));
						}
					}
				})
				.finally(() => {
					if (!cancelled) setIsLoadingFromDb(false);
				});

			return () => {
				cancelled = true;
			};
		}

		const cbctCanals = loadPersistedEndoCanals(patientId, activeTooth);
		if (cbctCanals && cbctCanals.length > 0) {
			setCanals(cbctCanals.map((c) => ({ ...c })));
		} else {
			setCanals(getDefaultCanalsForTooth(activeTooth));
		}
		if (initialIrrigation) setIrrigation(initialIrrigation);
		if (initialRotarySystem) setRotarySystem(initialRotarySystem);
		if (initialRadiologyControl) setRadiologyControl(initialRadiologyControl);
	}, [
		isOpen,
		activeTooth,
		toothNumber,
		initialCanals,
		initialIrrigation,
		initialRotarySystem,
		initialRadiologyControl,
		patientId,
	]);

	// Listen for measured lengths from radiovisiograph endo-ruler tool
	useEffect(() => {
		if (!isOpen) return;

		const handleMeasuredWl = (e: Event) => {
			const customEvent = e as CustomEvent<{
				toothCode?: string;
				lengthMm: number;
			}>;
			const { toothCode, lengthMm } = customEvent.detail || {};
			if (toothCode && Number(toothCode) !== activeTooth) return;

			setCanals((prev) => {
				if (prev.length === 0) return prev;
				const updated = [...prev];
				const targetIdx = updated.findIndex(
					(c) => !c.workingLengthMm || Number(c.workingLengthMm) === 0,
				);
				const applyIdx = targetIdx >= 0 ? targetIdx : 0;
				if (updated[applyIdx]) {
					updated[applyIdx] = {
						...updated[applyIdx],
						workingLengthMm: Math.round(lengthMm * 2) / 2,
					};
				}
				return updated;
			});
			showToast(
				`Длина ${lengthMm.toFixed(1)} мм перенесена с визиографа в канал!`,
				"success",
			);
		};

		window.addEventListener("dente-endo-wl-measured", handleMeasuredWl);
		return () =>
			window.removeEventListener("dente-endo-wl-measured", handleMeasuredWl);
	}, [isOpen, activeTooth]);

	// Listen for 3D computed canals from CBCT Endo Compass / Web Worker
	useEffect(() => {
		if (!isOpen) return;

		const handleEndoCanalsUpdated = (e: Event) => {
			const customEvent = e as CustomEvent<{
				toothFdi?: number;
				patientId?: string;
				canals?: EndoCanalData[];
			}>;
			const { toothFdi, canals: updatedCanals } = customEvent.detail || {};
			if (toothFdi && toothFdi !== activeTooth) return;
			if (updatedCanals && updatedCanals.length > 0) {
				setCanals(updatedCanals.map((c) => ({ ...c })));
				showToast(
					`Параметры каналов зуба #${activeTooth} синхронизированы с 3D КЛКТ Компасом!`,
					"success",
				);
			}
		};

		window.addEventListener("dente-endo-canals-updated", handleEndoCanalsUpdated);
		return () =>
			window.removeEventListener("dente-endo-canals-updated", handleEndoCanalsUpdated);
	}, [isOpen, activeTooth]);

	// ESC to close
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	const handleCanalChange = (
		id: string,
		field: keyof EndoCanalData,
		value: string | number,
	) => {
		setCanals((prev) =>
			prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
		);
	};

	const handleCanalLengthInputChange = (id: string, rawVal: string) => {
		const trimmed = rawVal.trim();
		if (!trimmed) {
			setCanals((prev) =>
				prev.map((c) => (c.id === id ? { ...c, workingLengthMm: "" } : c)),
			);
			return;
		}
		const num = Number.parseFloat(trimmed);
		if (Number.isNaN(num) || !Number.isFinite(num)) return;
		const clamped = Math.max(0, Math.min(35, Math.round(num * 2) / 2));
		setCanals((prev) =>
			prev.map((c) => (c.id === id ? { ...c, workingLengthMm: clamped } : c)),
		);
	};

	const handleAdjustCanalLength = (id: string, delta: number) => {
		setCanals((prev) =>
			prev.map((c) => {
				if (c.id !== id) return c;
				const curr =
					typeof c.workingLengthMm === "number" && !Number.isNaN(c.workingLengthMm)
						? c.workingLengthMm
						: Number.parseFloat(String(c.workingLengthMm)) || 21.0;
				const next = Math.max(10, Math.min(35, Math.round((curr + delta) * 2) / 2));
				return { ...c, workingLengthMm: next };
			}),
		);
	};

	const handleSetCanalLength = (id: string, length: number) => {
		setCanals((prev) =>
			prev.map((c) => (c.id === id ? { ...c, workingLengthMm: length } : c)),
		);
	};

	// Клинические протоколы эндодонтии
	const handleApplyExpressApicalPreset = () => {
		const preset = applyExpressApicalEndoProtocol(canals, activeTooth);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		setStageStamp("COMPLETED");
		showToast("Обтурация канала (гуттаперча + силер): Каналы пройдены и обтурированы до апекса", "success");
	};

	const handleApplyCaOh2Protocol = () => {
		const preset = applyCaOh2EndoProtocol(canals, activeTooth);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		setStageStamp("TEMP_CAOH2");
		showToast("Протокол эндодонтического лечения: Временная повязка Ca(OH)2 (Каласепт)", "info");
	};

	const handleApplyPulpitisPreset = () => {
		const preset = applyPulpitisProtocol(canals, activeTooth);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		setStageStamp("COMPLETED");
		showToast("Протокол эндодонтического лечения: Эндодонтия пульпита в 1 визит (ProTaper F2 + AH Plus)", "success");
	};

	const handleApplyPrimaryEndoPreset = () => {
		const preset = applyPrimaryEndoProtocol(canals, activeTooth);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		setStageStamp("TEMP_CAOH2");
		showToast("Протокол эндодонтического лечения: Первичное эндо (ProTaper Gold + Metapex)", "success");
	};

	const handleApplyRetreatmentPreset = () => {
		const preset = applyRetreatmentEndoProtocol(canals, activeTooth);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		setStageStamp("TEMP_CAOH2");
		showToast("Протокол эндодонтического лечения: Повторное эндо (D-RaCe + ревизия)", "info");
	};

	const handleApplyObturationPreset = () => {
		const preset = applyObturationPermanentProtocol(canals, activeTooth);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		setStageStamp("COMPLETED");
		showToast("Обтурация канала (гуттаперча + силер): Постоянная обтурация (GuttaCore / AH Plus)", "success");
	};

	const handleApplyPulpitisObturationPreset = () => {
		const preset = applyPulpitisObturationProtocol(canals, activeTooth);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		setStageStamp("COMPLETED");
		showToast("Применен протокол: Пульпит 2-е посещение (AH Plus)", "success");
	};

	const handleApplyPeriodontitisDestructivePreset = () => {
		const preset = applyPeriodontitisDestructiveProtocol(canals, activeTooth);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		setStageStamp("TEMP_CAOH2");
		showToast("Применен протокол: Периодонтит деструктивный (Metapex 14 дн)", "info");
	};

	const handleApplyStandardProtocol = () => {
		const preset = applyStandardEndoProtocol(canals, activeTooth);
		setCanals(preset.canals);
		setIrrigation(preset.irrigation);
		setRotarySystem(preset.rotarySystem);
		setRadiologyControl(preset.radiologyControl);
		setStageStamp("COMPLETED");
		showToast("Применен стандартный протокол обтурации (ProTaper + AH Plus)", "success");
	};

	const handleApplyAnatomicalLengths = () => {
		const updated = applyAnatomicalWorkingLengths(canals, activeTooth);
		setCanals(updated);
		showToast(`Анатомическая длина каналов автозаполнена для зуба #${activeTooth}`, "info");
	};

	const handleAddCanal = () => {
		const newId = `canal-custom-${Date.now()}`;
		const defaultAnatomy = getDefaultCanalsForTooth(activeTooth);
		const existingNames = new Set(canals.map((c) => c.canalName.trim().toUpperCase()));
		const missingDefault = defaultAnatomy.find(
			(dc) => !existingNames.has(dc.canalName.trim().toUpperCase()),
		);

		const newCanal: EndoCanalData = {
			id: newId,
			canalName: missingDefault ? missingDefault.canalName : `Канал ${canals.length + 1}`,
			referencePoint: missingDefault ? missingDefault.referencePoint : REFERENCE_POINT_OPTIONS[0],
			workingLengthMm: missingDefault ? missingDefault.workingLengthMm : 21.0,
			masterApicalFile: missingDefault?.masterApicalFile || "ISO 25 (#25 красный)",
			taper: missingDefault?.taper || TAPER_OPTIONS[2],
			obturationTechnique:
				stageStamp === "TEMP_CAOH2"
					? "Временная обтурация Ca(OH)2 (Metapex / Calcept)"
					: OBTURATION_TECHNIQUE_OPTIONS[0],
		};
		setCanals((prev) => [...prev, newCanal]);
	};

	const handleRemoveCanal = (id: string) => {
		if (canals.length <= 1) {
			showToast("Должен оставаться хотя бы один корневой канал", "warning");
			return;
		}
		setCanals((prev) => prev.filter((c) => c.id !== id));
	};

	const handleResetToDefaults = () => {
		setCanals(getDefaultCanalsForTooth(activeTooth));
		showToast(`Параметры сброшены к стандарту зуба #${activeTooth}`, "info");
	};

	const toothAnatomicalName = getToothAnatomicalNameRu(activeTooth);

	const generatedProtocolText = useMemo(() => {
		let stampedTitle = toothAnatomicalName;
		if (stageStamp === "DRAFT") {
			stampedTitle = `${toothAnatomicalName} [ЧЕРНОВИК — КАНАЛЫ В ОБРАБОТКЕ]`;
		} else if (stageStamp === "TEMP_CAOH2") {
			stampedTitle = `${toothAnatomicalName} [ВРЕМЕННАЯ ОБТУРАЦИЯ Ca(OH)2]`;
		} else {
			stampedTitle = `${toothAnatomicalName} [ПОЛНАЯ ОБТУРАЦИЯ ДО АПЕКСА]`;
		}

		return generateEndoProtocol043({
			toothNumber: activeTooth,
			toothTitle: stampedTitle,
			canals: canals.map((c) => ({
				...c,
				workingLengthMm:
					typeof c.workingLengthMm === "number" && !Number.isNaN(c.workingLengthMm)
						? Math.round(c.workingLengthMm * 2) / 2
						: c.workingLengthMm,
			})),
			irrigation,
			rotarySystem,
			radiologyControl,
		});
	}, [
		activeTooth,
		toothAnatomicalName,
		canals,
		irrigation,
		rotarySystem,
		radiologyControl,
		stageStamp,
	]);

	const persistCanalsToBackend = async (
		clinicalData: EndoToothClinicalData,
	): Promise<boolean> => {
		if (onSaveCanals) {
			await onSaveCanals(canals, clinicalData);
			return true;
		}

		if (patientId) {
			try {
				const res = await fetch(
					`/api/patients/${patientId}/tooth-states/${activeTooth}/endo`,
					{
						method: "POST",
						headers: denteAdminSecretRequestHeaders({
							"Content-Type": "application/json",
						}),
						body: JSON.stringify({
							canals,
							irrigation,
							rotarySystem,
							radiologyControl,
						}),
					},
				);
				if (!res.ok) {
					showToast("Не удалось сохранить параметры каналов в БД", "error");
					return false;
				}
				return true;
			} catch {
				showToast("Ошибка сохранения параметров каналов в БД", "error");
				return false;
			}
		}

		return true;
	};

	const handleSaveCanalsOnly = async () => {
		setIsSaving(true);
		const effectiveCanals = sanitizeCanalsForSubmission(canals, activeTooth, stageStamp);
		const clinicalData: EndoToothClinicalData = {
			canals: effectiveCanals,
			irrigation,
			rotarySystem,
			radiologyControl,
			updatedAt: new Date().toISOString(),
		};

		try {
			const ok = await persistCanalsToBackend(clinicalData);
			if (ok) {
				showToast(
					`Параметры каналов зуба #${activeTooth} успешно сохранены в карту!`,
					"success",
				);
				onClose();
			}
		} finally {
			setIsSaving(false);
		}
	};

	const handleInsertToProtocol = async () => {
		setIsSaving(true);
		const effectiveCanals = sanitizeCanalsForSubmission(canals, activeTooth, stageStamp);
		const stampedTitle =
			stageStamp === "DRAFT"
				? `${toothAnatomicalName} [ЧЕРНОВИК — КАНАЛЫ В ОБРАБОТКЕ]`
				: stageStamp === "TEMP_CAOH2"
					? `${toothAnatomicalName} [ВРЕМЕННАЯ ОБТУРАЦИЯ Ca(OH)2]`
					: `${toothAnatomicalName} [ПОЛНАЯ ОБТУРАЦИЯ ДО АПЕКСА]`;
		const protocolTextToInsert = generateEndoProtocol043({
			toothNumber: activeTooth,
			toothTitle: stampedTitle,
			canals: effectiveCanals,
			irrigation,
			rotarySystem,
			radiologyControl,
		});
		const clinicalData: EndoToothClinicalData = {
			canals: effectiveCanals,
			irrigation,
			rotarySystem,
			radiologyControl,
			updatedAt: new Date().toISOString(),
		};

		try {
			await persistCanalsToBackend(clinicalData);
		} catch (err) {
			console.warn(
				"Background persistence failed, proceeding with protocol insertion",
				err,
			);
		} finally {
			setIsSaving(false);
		}

		try {
			useVisitStore.getState().setVisitNoteForm((prev) => {
				const existingObj = prev.objectiveStatus?.trim() || "";
				return {
					...prev,
					objectiveStatus: existingObj
						? `${existingObj}\n\n${protocolTextToInsert}`
						: protocolTextToInsert,
				};
			});
		} catch {
			// fallback
		}

		if (onInsertToProtocol) {
			onInsertToProtocol(protocolTextToInsert, effectiveCanals);
		}
		if (onSave) {
			onSave(effectiveCanals, protocolTextToInsert);
		}

		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: {
							treatmentDescription: protocolTextToInsert,
						},
						mode: "smart_append",
					},
				}),
			);
		} catch {
			// fallback
		}

		showToast(
			`Эндодонтический протокол для зуба #${activeTooth} сохранен и вставлен в карту 043/у!`,
			"success",
		);
		onClose();
	};

	const handleCopyText = async () => {
		try {
			await navigator.clipboard.writeText(generatedProtocolText);
			setCopied(true);
			showToast("Протокол скопирован в буфер обмена", "success");
			setTimeout(() => setCopied(false), 2500);
		} catch {
			showToast("Не удалось скопировать текст", "error");
		}
	};

	const handleCopyPatientMemo = async () => {
		try {
			const isPermanent = Boolean(
				stageStamp === "COMPLETED" ||
					canals.some((c) => c.obturationTechnique && c.obturationTechnique !== "none") ||
					radiologyControl.toLowerCase().includes("обтурирован"),
			);

			const isTemporaryCaOh2 = Boolean(
				stageStamp === "TEMP_CAOH2" ||
					!isPermanent ||
					irrigation.toLowerCase().includes("ca(oh)2") ||
					rotarySystem.toLowerCase().includes("ca(oh)2") ||
					canals.some((c) => c.notes?.toLowerCase().includes("ca(oh)2")),
			);

			const text = formatEndoPatientMemo({
				clinicName,
				clinicPhone,
				patientName,
				doctorName,
				toothNumber: activeTooth,
				toothAnatomicalNameRu: toothAnatomicalName,
				isTemporaryCaOh2,
				isPermanentObturation: isPermanent,
			});

			await navigator.clipboard.writeText(text);
			showToast(
				"Памятка по уходу после лечения каналов скопирована для пациента",
				"success",
			);
		} catch {
			showToast("Не удалось скопировать памятку для пациента", "error");
		}
	};

	const handlePrintWorksheet = () => {
		showToast("Отправка эндо-карты на печать...", "info");
		window.print();
	};

	return {
		activeTooth,
		toothAnatomicalName,
		canals,
		irrigation,
		setIrrigation,
		rotarySystem,
		setRotarySystem,
		radiologyControl,
		setRadiologyControl,
		copied,
		isSaving,
		isLoadingFromDb,
		stageStamp,
		setStageStamp,
		isPresetsMenuOpen,
		setIsPresetsMenuOpen,
		isFooterMenuOpen,
		setIsFooterMenuOpen,
		suggestedCanalNames,
		generatedProtocolText,
		handleSwitchTooth,
		handleCanalChange,
		handleCanalLengthInputChange,
		handleAdjustCanalLength,
		handleSetCanalLength,
		handleAddCanal,
		handleRemoveCanal,
		handleResetToDefaults,
		handleApplyExpressApicalPreset,
		handleApplyCaOh2Protocol,
		handleApplyPulpitisPreset,
		handleApplyPrimaryEndoPreset,
		handleApplyRetreatmentPreset,
		handleApplyObturationPreset,
		handleApplyPulpitisObturationPreset,
		handleApplyPeriodontitisDestructivePreset,
		handleApplyStandardProtocol,
		handleApplyAnatomicalLengths,
		handleSaveCanalsOnly,
		handleInsertToProtocol,
		handleCopyText,
		handleCopyPatientMemo,
		handlePrintWorksheet,
		renderIsoColorBadge,
	};
}
