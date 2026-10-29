/**
 * DENTE Dental CRM — Canonical Chairside Endodontic SSOT Modal
 * apps/web/src/components/endo/EndoCanalLogModal.tsx
 *
 * Полноэкранная модалка / Bottom Sheet на смартфонах по Apple HIG (Мандаты 8e, 8n, 8am, 8wy).
 * Ровно ОДНА Primary CTA кнопка #0d9488 («✓ Внести протокол эндодонтии в карту приёма»).
 * Автономия врача: кнопки сохранения и печати НИКОГДА не disabled.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Activity, Check, Copy, ExternalLink, Plus, Printer, SlidersHorizontal, Trash2, X, FileText, ChevronDown } from "lucide-react";
import type { EndoCanalData, EndoToothClinicalData } from "@dental/shared";
import { getToothAnatomicalNameRu } from "../../lib/clinicalProtocols";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	calculateEndoBillingAndMaterialsEstimate,
	formatEndoPatientMemo,
	formatWorkingLengthDisplay,
	generateEndoProtocol043,
	getAnatomicalWorkingLength,
	getDefaultCanalsForTooth,
	sanitizeCanalsForSubmission,
	applyCaOh2EndoProtocol,
	applyExpressApicalEndoProtocol,
	applyObturationPermanentProtocol,
	applyPeriodontitisDestructiveProtocol,
	applyPeriodontitisTempProtocol,
	applyPrimaryEndoProtocol,
	applyPulpitisObturationProtocol,
	applyPulpitisProtocol,
	applyPulpitisVisit1Protocol,
	applyRetreatmentEndoProtocol,
	applyStandardEndoProtocol,
	CANAL_NAME_OPTIONS,
	CAOH2_ENDO_PRESET,
	CURATED_ISO_MAF_OPTIONS,
	ENDO_SEALER_OPTIONS,
	EXPRESS_APICAL_OBTURATION_PRESET,
	MAF_ISO_OPTIONS,
	OBTURATION_PERMANENT_PRESET,
	OBTURATION_TECHNIQUE_OPTIONS,
	PERIODONTITIS_DESTRUCTIVE_PRESET,
	PERIODONTITIS_TEMP_PRESET,
	PRIMARY_ENDO_PRESET,
	PULPITIS_COMPLETE_PRESET,
	PULPITIS_OBTURATION_PRESET,
	PULPITIS_VISIT1_PRESET,
	QUICK_LENGTH_PRESETS,
	REFERENCE_POINT_OPTIONS,
	RETREATMENT_ENDO_PRESET,
	STANDARD_ENDO_PRESET,
	TAPER_OPTIONS,
	type EndoStageStamp,
} from "./endoCanalData";

export * from "./endoCanalData";

export interface EndoCanalLogModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly toothNumber: number;
	readonly toothState?: string | undefined;
	readonly patientId?: string | undefined;
	readonly initialCanals?: readonly EndoCanalData[] | undefined;
	readonly initialIrrigation?: string | undefined;
	readonly initialRotarySystem?: string | undefined;
	readonly initialRadiologyControl?: string | undefined;
	readonly onInsertToProtocol?: (protocolText: string, canals: EndoCanalData[]) => void;
	readonly onSaveCanals?: (canals: EndoCanalData[], clinicalData: EndoToothClinicalData) => Promise<void> | void;
	readonly onSave?: (savedCanals: EndoCanalData[], noteText?: string) => void;
	readonly clinicName?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly patientName?: string | undefined;
}

export function EndoCanalLogModal(props: EndoCanalLogModalProps) {
	const [activeTooth, setActiveTooth] = useState<number>(props.toothNumber || 16);
	const toothAnatomicalName = useMemo(() => getToothAnatomicalNameRu(activeTooth), [activeTooth]);

	const [canals, setCanals] = useState<EndoCanalData[]>(() => {
		if (props.initialCanals && props.initialCanals.length > 0) return [...props.initialCanals];
		return getDefaultCanalsForTooth(activeTooth);
	});

	const [stageStamp, setStageStamp] = useState<EndoStageStamp>("COMPLETED");
	const [rotarySystem, setRotarySystem] = useState<string>(props.initialRotarySystem || "WaveOne Gold / ProTaper Next");
	const [irrigation, setIrrigation] = useState<string>(props.initialIrrigation || "NaOCl 3% + EDTA 17% (УЗ-активация)");
	const [radiologyControl, setRadiologyControl] = useState<string>(props.initialRadiologyControl || "Радиовизиография: каналы гомогенно обтурированы до физиологического апекса");
	const [isSaving, setIsSaving] = useState<boolean>(false);
	const [isLoadingFromDb, setIsLoadingFromDb] = useState<boolean>(false);
	const [copied, setCopied] = useState<boolean>(false);

	useEffect(() => {
		setActiveTooth(props.toothNumber || 16);
		setCanals(props.initialCanals?.length ? [...props.initialCanals] : getDefaultCanalsForTooth(props.toothNumber || 16));
	}, [props.toothNumber, props.initialCanals]);

	useEffect(() => {
		if (!props.isOpen || !props.patientId || props.initialCanals?.length) return;
		let cancelled = false;
		setIsLoadingFromDb(true);
		fetch(`/api/patients/${props.patientId}/tooth-states/${activeTooth}/endo`, { headers: denteAdminSecretRequestHeaders() })
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (!cancelled && data?.clinicalData?.canals?.length) {
					setCanals(data.clinicalData.canals);
					if (data.clinicalData.rotarySystem) setRotarySystem(data.clinicalData.rotarySystem);
					if (data.clinicalData.irrigation) setIrrigation(data.clinicalData.irrigation);
					if (data.clinicalData.radiologyControl) setRadiologyControl(data.clinicalData.radiologyControl);
					if (data.clinicalData.stageStamp) setStageStamp(data.clinicalData.stageStamp);
				}
			})
			.catch(() => {})
			.finally(() => { if (!cancelled) setIsLoadingFromDb(false); });
		return () => { cancelled = true; };
	}, [props.isOpen, props.patientId, activeTooth, props.initialCanals]);

	const updateCanal = useCallback((id: string, field: keyof EndoCanalData, val: any) => {
		setCanals((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: val } : c)));
	}, []);

	const adjustLength = useCallback((id: string, delta: number) => {
		setCanals((prev) => prev.map((c) => {
			if (c.id !== id) return c;
			const cur = typeof c.workingLengthMm === "number" ? c.workingLengthMm : 21.0;
			return { ...c, workingLengthMm: Math.max(10, Math.min(35, Math.round((cur + delta) * 2) / 2)), isObliterated: false };
		}));
	}, []);

	const toggleObliteration = useCallback((id: string) => {
		setCanals((prev) => prev.map((c) => {
			if (c.id !== id) return c;
			const isOb = !c.isObliterated;
			return { ...c, isObliterated: isOb, workingLengthMm: isOb ? 0 : getAnatomicalWorkingLength(activeTooth, c.canalName) };
		}));
	}, [activeTooth]);

	const addCanal = useCallback(() => {
		const nextNum = canals.length + 1;
		setCanals((prev) => [...prev, { id: `canal-${Date.now()}-${nextNum}`, canalName: `К${nextNum}`, referencePoint: "Бугор зуба", workingLengthMm: 21.0, masterApicalFile: "ISO 25 (#25 красный)", taper: ".04 (Конусность 4%)", obturationTechnique: "Гуттаперча + Силер (AH Plus)", sealer: "AH Plus" }]);
	}, [canals.length]);

	const removeCanal = useCallback((id: string) => {
		if (canals.length > 1) setCanals((prev) => prev.filter((c) => c.id !== id));
	}, [canals.length]);

	const applyPreset = useCallback((type: "norm" | "pulpitis" | "caoh2" | "bio") => {
		if (type === "norm") {
			const res = applyExpressApicalEndoProtocol(canals, activeTooth);
			setCanals(res.canals); setRotarySystem(res.rotarySystem); setIrrigation(res.irrigation); setRadiologyControl(res.radiologyControl); setStageStamp("COMPLETED");
		} else if (type === "pulpitis") {
			const res = applyPulpitisProtocol(canals, activeTooth);
			setCanals(res.canals); setRotarySystem(res.rotarySystem); setRadiologyControl(res.radiologyControl); setStageStamp("COMPLETED");
		} else if (type === "caoh2") {
			const res = applyCaOh2EndoProtocol(canals, activeTooth);
			setCanals(res.canals); setIrrigation(res.irrigation); setStageStamp("TEMP_CAOH2");
		} else {
			const res = applyObturationPermanentProtocol(canals, activeTooth);
			setCanals(res.canals.map((c) => ({ ...c, sealer: "BioRoot RCS (биокерамика)", obturationTechnique: "Биокерамика (гуттаперча + биокерамический силер)" })));
			setStageStamp("COMPLETED");
		}
		showToast("Протокол успешно применён", "info", 1500);
	}, [canals, activeTooth]);

	const generatedProtocolText = useMemo(() => {
		return generateEndoProtocol043({
			toothNumber: activeTooth,
			toothTitle: `Зуб FDI: #${activeTooth} ${toothAnatomicalName} [${stageStamp === "TEMP_CAOH2" ? "ВРЕМЕННАЯ ОБТУРАЦИЯ Ca(OH)2" : "ПОЛНАЯ ОБТУРАЦИЯ ДО АПЕКСА"}]`,
			canals, irrigation, rotarySystem, radiologyControl, notes: "",
		});
	}, [activeTooth, toothAnatomicalName, stageStamp, canals, irrigation, rotarySystem, radiologyControl]);

	const handleCopyText = useCallback(() => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(generatedProtocolText).then(() => {
				setCopied(true); showToast("Протокол скопирован", "success", 1500); setTimeout(() => setCopied(false), 1500);
			});
		}
	}, [generatedProtocolText]);

	const handleCopyPatientMemo = useCallback(() => {
		const memo = formatEndoPatientMemo({
			clinicName: props.clinicName || "Клиника DENTE", clinicPhone: props.clinicPhone || "+7 (495) 123-45-67",
			patientName: props.patientName || "Пациент", doctorName: props.doctorName || "Лечащий врач",
			toothNumber: activeTooth, isPermanentObturation: stageStamp === "COMPLETED", isTemporaryCaOh2: stageStamp === "TEMP_CAOH2",
		});
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(memo).then(() => showToast("Памятка пациенту скопирована", "success", 2000));
		}
	}, [props.clinicName, props.clinicPhone, props.patientName, props.doctorName, activeTooth, stageStamp]);

	const handlePrintWorksheet = useCallback(() => {
		if (typeof window !== "undefined") window.print();
	}, []);

	const handleInsertToProtocol = useCallback(async () => {
		setIsSaving(true);
		const sanitized = sanitizeCanalsForSubmission(canals, activeTooth, stageStamp, getAnatomicalWorkingLength);
		const clinicalData: EndoToothClinicalData = { toothNumber: activeTooth, canals: sanitized, irrigation, rotarySystem, radiologyControl, apexLocator: "0.0 Apex", stageStamp, notes: "", updatedAt: new Date().toISOString() };

		try {
			useVisitStore.getState().setVisitNoteForm((prev) => ({
				...prev, objectiveStatus: prev.objectiveStatus?.trim() ? `${prev.objectiveStatus.trim()}\n\n${generatedProtocolText}` : generatedProtocolText,
				treatmentPlan: prev.treatmentPlan?.trim() ? `${prev.treatmentPlan.trim()}\nЭндодонтическое лечение #${activeTooth}` : `Эндодонтическое лечение #${activeTooth}`,
			}));
		} catch { /* safe */ }

		try {
			const billing = calculateEndoBillingAndMaterialsEstimate({ toothNumber: activeTooth, canals: sanitized, stageStamp, obturationTechnique: stageStamp === "TEMP_CAOH2" ? "Временная обтурация Ca(OH)2" : "Гуттаперча + Силер (AH Plus)", sealer: sanitized[0]?.sealer || "AH Plus" });
			if (typeof window !== "undefined" && billing.services804n.length > 0) {
				window.dispatchEvent(new CustomEvent("dente-add-services-to-invoice", { detail: { toothNumber: activeTooth, teethNumbers: [activeTooth], services: billing.services804n.map((s) => ({ code: s.code804n, code804n: s.code804n, name: s.title, nameRu: s.title, price: s.priceRub, priceRub: s.priceRub, quantity: s.quantity || 1, toothNumber: activeTooth, category: "Эндодонтия" })) } }));
			}
		} catch { /* soft */ }

		if (props.onSaveCanals) { try { await props.onSaveCanals(sanitized, clinicalData); } catch { /* ignore */ } }
		if (props.patientId) {
			fetch(`/api/patients/${props.patientId}/tooth-states/${activeTooth}/endo`, { method: "POST", headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ toothNumber: activeTooth, canals: sanitized, irrigation, rotarySystem, radiologyControl, apexLocator: "0.0 Apex", stageStamp, notes: "" }) }).catch(() => {});
		}
		if (props.onInsertToProtocol) props.onInsertToProtocol(generatedProtocolText, sanitized);
		if (props.onSave) props.onSave(sanitized, generatedProtocolText);
		setIsSaving(false);
		showToast(`Протокол эндодонтии #${activeTooth} внесён в карту приёма!`, "success", 2500);
		props.onClose();
	}, [canals, activeTooth, stageStamp, irrigation, rotarySystem, radiologyControl, generatedProtocolText, props]);

	if (!props.isOpen) return null;

	const modalContent = (
		<div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-x-clip" role="dialog" aria-modal="true" aria-label={`Эндодонтический журнал каналов зуба ${activeTooth}`} data-testid="endo-canal-log-modal">
			<div className="relative w-full max-w-5xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 border-t sm:border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-t-[24px] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] max-w-full">
				<div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2 sm:hidden shrink-0" />

				{/* 1. Header */}
				<header className="flex items-center justify-between p-3.5 sm:p-4 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--surface,#f8fafc)] dark:bg-slate-900/80 shrink-0">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-9 h-9 rounded-xl bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] flex items-center justify-center font-bold text-sm shrink-0">#{activeTooth}</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<h2 className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] dark:text-white truncate">
									<span className="sm:hidden">Зуб #{activeTooth}: Журнал каналов</span>
									<span className="hidden sm:inline">Эндодонтический журнал каналов: {toothAnatomicalName}</span>
								</h2>
								{props.toothState && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 truncate">{props.toothState}</span>}
								{isLoadingFromDb && <span className="text-[11px] text-teal-600 dark:text-teal-400 flex items-center gap-1 font-medium"><Activity size={12} className="animate-spin" /> Загрузка...</span>}
							</div>
							<p className="text-xs text-[var(--muted,#64748b)] hidden sm:block truncate">Анатомический протокол обработки и трёхмерной обтурации корневых каналов</p>
						</div>
					</div>
					<button type="button" onClick={props.onClose} className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer" aria-label="Закрыть"><X size={18} /></button>
				</header>

				{/* 2. Body */}
				<div className="p-3.5 sm:p-5 overflow-y-auto flex-1 space-y-3.5">
					<div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--surface,#f8fafc)] dark:bg-slate-800/40 border border-[var(--line,#e2e8f0)] dark:border-slate-800">
						<div className="flex items-center gap-1.5 flex-wrap">
							<button type="button" onClick={() => applyPreset("norm")} className="min-h-[44px] sm:min-h-[34px] h-9 sm:h-8 px-3 rounded-lg text-xs font-semibold bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 cursor-pointer">✓ Норма длины (FDI)</button>
							<button type="button" onClick={() => applyPreset("pulpitis")} className="min-h-[44px] sm:min-h-[34px] h-9 sm:h-8 px-3 rounded-lg text-xs font-semibold bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 cursor-pointer">Пульпит (1 визит)</button>
							<button type="button" onClick={() => applyPreset("caoh2")} className="min-h-[44px] sm:min-h-[34px] h-9 sm:h-8 px-3 rounded-lg text-xs font-semibold bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 cursor-pointer">Ca(OH)2 Временное</button>
							<button type="button" onClick={() => applyPreset("bio")} className="min-h-[44px] sm:min-h-[34px] h-9 sm:h-8 px-3 rounded-lg text-xs font-semibold bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 cursor-pointer">Биокерамика</button>
						</div>
						<button type="button" onClick={addCanal} className="min-h-[44px] sm:min-h-[34px] h-9 sm:h-8 px-3 rounded-lg text-xs font-semibold bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--teal,#0d9488)] border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center gap-1.5 cursor-pointer"><Plus size={14} /> Добавить канал</button>
					</div>

					<div className="border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl bg-[var(--paper,#ffffff)] dark:bg-slate-900/50 overflow-hidden shadow-xs">
						<div className="p-3 bg-[var(--surface,#f8fafc)] dark:bg-slate-800/60 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 flex items-center justify-between">
							<div className="flex items-center gap-2">
								<SlidersHorizontal size={14} className="text-[var(--teal,#0d9488)]" />
								<span className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-white">Корневые каналы зуба #{activeTooth}</span>
								<span className="text-[11px] text-[var(--muted,#64748b)]">({canals.length} к.)</span>
							</div>
						</div>

						{/* Desktop Table */}
						<div className="hidden sm:block overflow-x-auto">
							<table className="w-full text-left border-collapse text-xs">
								<thead>
									<tr className="border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-[var(--muted,#64748b)]">
										<th className="p-2.5 font-bold">Канал</th>
										<th className="p-2.5 font-bold">Склероз</th>
										<th className="p-2.5 font-bold">Репер</th>
										<th className="p-2.5 font-bold">Длина (мм)</th>
										<th className="p-2.5 font-bold">MAF / ISO</th>
										<th className="p-2.5 font-bold">Конусность</th>
										<th className="p-2.5 font-bold">Обтурация</th>
										<th className="p-2.5 font-bold">Силер</th>
										<th className="p-2.5 text-center font-bold">Удалить</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[var(--line,#e2e8f0)] dark:divide-slate-800">
									{canals.map((c) => (
										<tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
											<td className="p-2.5 font-bold text-[var(--ink,#0f172a)] dark:text-white"><input type="text" value={c.canalName} onChange={(e) => updateCanal(c.id, "canalName", e.target.value)} className="w-16 px-1.5 py-1 rounded border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-transparent text-xs font-bold" /></td>
											<td className="p-2.5"><input type="checkbox" checked={Boolean(c.isObliterated)} onChange={() => toggleObliteration(c.id)} className="rounded text-[var(--teal,#0d9488)] cursor-pointer" /></td>
											<td className="p-2.5"><select value={c.referencePoint || "Бугор зуба"} onChange={(e) => updateCanal(c.id, "referencePoint", e.target.value)} className="px-1.5 py-1 rounded border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-transparent text-xs max-w-[130px] truncate cursor-pointer">{REFERENCE_POINT_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select></td>
											<td className="p-2.5"><div className="flex items-center gap-1"><button type="button" onClick={() => adjustLength(c.id, -0.5)} className="w-6 h-6 rounded border border-[var(--line,#cbd5e1)] dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">-</button><input type="number" step="0.5" min="0" max="35" value={c.workingLengthMm || 0} onChange={(e) => updateCanal(c.id, "workingLengthMm", parseFloat(e.target.value) || 0)} className="w-14 px-1.5 py-1 rounded border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-transparent text-xs text-center font-bold" /><button type="button" onClick={() => adjustLength(c.id, 0.5)} className="w-6 h-6 rounded border border-[var(--line,#cbd5e1)] dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">+</button></div></td>
											<td className="p-2.5"><select value={c.masterApicalFile} onChange={(e) => updateCanal(c.id, "masterApicalFile", e.target.value)} className="px-1.5 py-1 rounded border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-transparent text-xs max-w-[130px] truncate cursor-pointer">{CURATED_ISO_MAF_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select></td>
											<td className="p-2.5"><select value={c.taper} onChange={(e) => updateCanal(c.id, "taper", e.target.value)} className="px-1.5 py-1 rounded border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-transparent text-xs max-w-[110px] truncate cursor-pointer">{TAPER_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select></td>
											<td className="p-2.5"><select value={c.obturationTechnique} onChange={(e) => updateCanal(c.id, "obturationTechnique", e.target.value)} className="px-1.5 py-1 rounded border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-transparent text-xs max-w-[140px] truncate cursor-pointer">{OBTURATION_TECHNIQUE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select></td>
											<td className="p-2.5"><select value={c.sealer || "AH Plus"} onChange={(e) => updateCanal(c.id, "sealer", e.target.value)} className="px-1.5 py-1 rounded border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-transparent text-xs max-w-[130px] truncate cursor-pointer">{ENDO_SEALER_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select></td>
											<td className="p-2.5 text-center">{canals.length > 1 && (<button type="button" onClick={() => removeCanal(c.id)} className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 inline-flex items-center justify-center cursor-pointer" title="Удалить"><Trash2 size={13} /></button>)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{/* Mobile Cards View */}
						<div className="sm:hidden p-3 divide-y divide-[var(--line,#e2e8f0)] dark:divide-slate-800 space-y-3">
							{canals.map((c) => (
								<div key={c.id} className="pt-3 first:pt-0 space-y-2.5">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<input type="text" value={c.canalName} onChange={(e) => updateCanal(c.id, "canalName", e.target.value)} className="w-16 px-2 py-1 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-xs font-bold" />
											<span className="text-xs font-bold text-[var(--teal,#0d9488)]">{c.isObliterated ? "ОБЛИТЕРИРОВАН" : `${c.workingLengthMm} мм`}</span>
										</div>
										<div className="flex items-center gap-2">
											<label className="flex items-center gap-1 text-[11px] text-[var(--muted,#64748b)]"><input type="checkbox" checked={Boolean(c.isObliterated)} onChange={() => toggleObliteration(c.id)} className="rounded text-[var(--teal,#0d9488)]" /><span>Склероз</span></label>
											{canals.length > 1 && (<button type="button" onClick={() => removeCanal(c.id)} className="w-8 h-8 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center cursor-pointer"><Trash2 size={14} /></button>)}
										</div>
									</div>
									<div className="flex items-center gap-2">
										<span className="text-[11px] text-[var(--muted,#64748b)] w-14">Длина:</span>
										<div className="flex items-center gap-1 flex-1">
											<button type="button" onClick={() => adjustLength(c.id, -0.5)} className="min-h-[44px] w-11 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 font-bold text-sm bg-[var(--paper,#ffffff)] dark:bg-slate-800 flex items-center justify-center cursor-pointer">-</button>
											<input type="number" step="0.5" value={c.workingLengthMm || 0} onChange={(e) => updateCanal(c.id, "workingLengthMm", parseFloat(e.target.value) || 0)} className="min-h-[44px] flex-1 px-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-center font-bold text-sm" />
											<button type="button" onClick={() => adjustLength(c.id, 0.5)} className="min-h-[44px] w-11 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 font-bold text-sm bg-[var(--paper,#ffffff)] dark:bg-slate-800 flex items-center justify-center cursor-pointer">+</button>
										</div>
									</div>
									<div className="grid grid-cols-2 gap-2">
										<div><span className="text-[10px] text-[var(--muted,#64748b)] block mb-1">MAF / ISO:</span><select value={c.masterApicalFile} onChange={(e) => updateCanal(c.id, "masterApicalFile", e.target.value)} className="min-h-[44px] w-full px-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-xs font-medium">{CURATED_ISO_MAF_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select></div>
										<div><span className="text-[10px] text-[var(--muted,#64748b)] block mb-1">Силер:</span><select value={c.sealer || "AH Plus"} onChange={(e) => updateCanal(c.id, "sealer", e.target.value)} className="min-h-[44px] w-full px-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-xs font-medium">{ENDO_SEALER_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select></div>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Клинические параметры */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
						<div className="p-3 rounded-2xl bg-[var(--surface,#f8fafc)] dark:bg-slate-800/40 border border-[var(--line,#e2e8f0)] dark:border-slate-800">
							<span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Машинная система NiTi:</span>
							<input type="text" value={rotarySystem} onChange={(e) => setRotarySystem(e.target.value)} className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-xs text-[var(--ink,#0f172a)] dark:text-white" />
						</div>
						<div className="p-3 rounded-2xl bg-[var(--surface,#f8fafc)] dark:bg-slate-800/40 border border-[var(--line,#e2e8f0)] dark:border-slate-800">
							<span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Ирригация и активация:</span>
							<input type="text" value={irrigation} onChange={(e) => setIrrigation(e.target.value)} className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-xs text-[var(--ink,#0f172a)] dark:text-white" />
						</div>
						<div className="p-3 rounded-2xl bg-[var(--surface,#f8fafc)] dark:bg-slate-800/40 border border-[var(--line,#e2e8f0)] dark:border-slate-800">
							<span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Рентген-контроль:</span>
							<input type="text" value={radiologyControl} onChange={(e) => setRadiologyControl(e.target.value)} className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-xs text-[var(--ink,#0f172a)] dark:text-white" />
						</div>
					</div>

					<details className="group border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl bg-[var(--surface,#f8fafc)] dark:bg-slate-800/30 overflow-hidden">
						<summary className="flex items-center justify-between p-3 cursor-pointer select-none text-xs font-bold text-[var(--ink,#0f172a)] dark:text-white list-none">
							<div className="flex items-center gap-2"><FileText size={14} className="text-[var(--teal,#0d9488)]" /><span>Сформированный клинический протокол эндодонтии</span></div>
							<ChevronDown size={14} className="text-[var(--muted,#64748b)] transition-transform duration-200 group-open:rotate-180" />
						</summary>
						<div className="p-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 space-y-2">
							<textarea readOnly rows={5} value={generatedProtocolText} className="w-full p-2.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-900 font-mono text-[11px] text-[var(--ink,#0f172a)] dark:text-white outline-none resize-none" />
							<div className="flex justify-end">
								<button type="button" onClick={handleCopyText} className="min-h-[36px] h-8 px-3 rounded-lg text-xs font-semibold bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center gap-1.5 cursor-pointer"><Copy size={13} /> {copied ? "Скопировано!" : "Скопировать текст"}</button>
							</div>
						</div>
					</details>
				</div>

				{/* 3. Footer */}
				<footer className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--surface,#f8fafc)] dark:bg-slate-900/90 shrink-0">
					<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
						<div className="grid grid-cols-2 sm:flex items-center gap-2">
							<button type="button" onClick={handlePrintWorksheet} data-testid="endo-print-worksheet-btn" className="secondary-button min-h-[50px] sm:min-h-[36px] h-11 sm:h-9 px-3 rounded-xl text-xs sm:text-sm font-bold bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer" title="Распечатать эндодонтическую карту (А4)"><Printer size={16} className="text-teal-600 dark:text-teal-400 shrink-0" /><span><span className="hidden sm:inline">Печать эндо-карты (А4)</span><span className="sm:hidden">Печать А4</span></span></button>
							<button type="button" onClick={handleCopyPatientMemo} data-testid="endo-copy-patient-memo-btn" className="secondary-button min-h-[50px] sm:min-h-[36px] h-11 sm:h-9 px-3 rounded-xl text-xs sm:text-sm font-bold bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer" title="Скопировать памятку для пациента"><Copy size={16} className="text-teal-600 dark:text-teal-400 shrink-0" /><span><span className="hidden sm:inline">Скопировать для пациента</span><span className="sm:hidden">Памятка</span></span></button>
						</div>
						<div className="flex items-center gap-2">
							<select value={stageStamp} onChange={(e) => setStageStamp(e.target.value as EndoStageStamp)} aria-label="Клинический штамп этапа лечения" className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-2.5 rounded-xl text-xs font-bold bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-white border border-[var(--line,#cbd5e1)] dark:border-slate-700 cursor-pointer">
								<option value="COMPLETED">ОБТУРИРОВАНО</option><option value="TEMP_CAOH2">ВРЕМЕННАЯ ОБТУРАЦИЯ</option><option value="DRAFT">ЧЕРНОВИК</option>
							</select>
							<button type="button" onClick={props.onClose} className="secondary-button min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer">Отмена</button>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button type="button" data-testid="insert-endo-protocol-btn" onClick={handleInsertToProtocol} className="primary-button flex-1 sm:flex-initial min-h-[50px] sm:min-h-[36px] h-11 sm:h-9 px-4 sm:px-6 rounded-xl text-xs sm:text-sm font-bold bg-[var(--teal,#0d9488)] hover:bg-[#0f766e] active:scale-98 text-white flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer whitespace-nowrap" title="Внести протокол эндодонтии в карту приёма">
							<Check size={18} className="shrink-0" />
							<span>{isSaving ? "Сохранение..." : (<><span className="hidden sm:inline">Внести протокол эндодонтии в карту приёма</span><span className="sm:hidden">Внести протокол</span></>)}</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}

export default EndoCanalLogModal;
