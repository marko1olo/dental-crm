/**
 * DENTE Dental CRM — Canonical Endodontic Studio SSOT Modal
 * apps/web/src/components/endo/EndodonticStudioModal.tsx
 *
 * Монолитная студия эндодонтии и обработки корневых каналов (Мандаты 8e, 8n, 8am, 8wy).
 * Ровно ОДНА Primary CTA кнопка #0d9488 («✓ Зафиксировать протокол каналов»).
 * Автономия врача: кнопки сохранения и печати НИКОГДА не disabled.
 * Мобильная сенсорная эргономика Apple HIG (Bottom Sheet 36x5px, Natural Thumb Zone >= 44px).
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Activity, Check, ChevronDown, Copy, FileText, Plus, Printer, SlidersHorizontal, Trash2, X } from "lucide-react";
import type { EndoCanalData, EndoToothClinicalData } from "@dental/shared";
import { getToothAnatomicalNameRu } from "../../lib/clinicalProtocols";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	CANONICAL_ENDO_PROTOCOLS, CANONICAL_IRRIGATION_SOLUTIONS, CANONICAL_MAF_SIZES,
	CURATED_ISO_MAF_OPTIONS, CURATED_SEALERS, NITI_SYSTEM_OPTIONS,
	calculateEndoTreatmentCostKopecks, formatEndoPatientMemo, formatWorkingLengthDisplay,
	generateEndoProtocol043, getAnatomicalWorkingLength, getDefaultCanalsForTooth,
	sanitizeCanalsForSubmission, type EndoProtocolPresetId, type EndoStageStamp, type QuickCanalState,
} from "./endodonticsCatalogData";

export interface EndodonticStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly toothNumber?: number | undefined;
	readonly toothState?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly initialCanals?: readonly EndoCanalData[] | undefined;
	readonly initialIrrigation?: string | undefined;
	readonly initialRotarySystem?: string | undefined;
	readonly initialRadiologyControl?: string | undefined;
	readonly onInsertToProtocol?: (protocolText: string, canals: EndoCanalData[]) => void;
	readonly onSaveCanals?: (canals: EndoCanalData[], clinicalData: EndoToothClinicalData) => Promise<void> | void;
	readonly onSave?: (savedCanals: EndoCanalData[], noteText?: string) => void;
}

export function EndodonticStudioModal(props: EndodonticStudioModalProps) {
	const [activeTooth, setActiveTooth] = useState<number>(props.toothNumber || 16);
	const toothAnatomicalName = useMemo(() => getToothAnatomicalNameRu(activeTooth), [activeTooth]);

	const [canals, setCanals] = useState<EndoCanalData[]>(() => {
		if (props.initialCanals && props.initialCanals.length > 0) return [...props.initialCanals];
		return getDefaultCanalsForTooth(activeTooth);
	});

	const [activeProtocolId, setActiveProtocolId] = useState<EndoProtocolPresetId>("pulpitis_1visit");
	const [stageStamp, setStageStamp] = useState<EndoStageStamp>("COMPLETED");
	const [rotarySystem, setRotarySystem] = useState<string>(props.initialRotarySystem || NITI_SYSTEM_OPTIONS[0]);
	const [irrigation, setIrrigation] = useState<string>(props.initialIrrigation || CANONICAL_IRRIGATION_SOLUTIONS[0]);
	const [radiologyControl, setRadiologyControl] = useState<string>(
		props.initialRadiologyControl || "Радиовизиография: каналы гомогенно обтурированы до физиологического апекса",
	);
	const [isSaving, setIsSaving] = useState<boolean>(false);
	const [isLoadingFromDb, setIsLoadingFromDb] = useState<boolean>(false);
	const [copied, setCopied] = useState<boolean>(false);

	useEffect(() => {
		const targetTooth = props.toothNumber || 16;
		setActiveTooth(targetTooth);
		setCanals(props.initialCanals?.length ? [...props.initialCanals] : getDefaultCanalsForTooth(targetTooth));
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
		setCanals((prev) => [...prev, {
			id: `canal-${Date.now()}-${nextNum}`, canalName: `К${nextNum}`, referencePoint: "Бугор зуба",
			workingLengthMm: 21.0, masterApicalFile: "#25.04", taper: ".04 (Конусность 4%)",
			obturationTechnique: "Гуттаперча + Силер (AH Plus)", sealer: "AH Plus (эпоксидный герметик)",
		}]);
	}, [canals.length]);

	const removeCanal = useCallback((id: string) => {
		if (canals.length > 1) setCanals((prev) => prev.filter((c) => c.id !== id));
	}, [canals.length]);

	const applyCanonicalProtocol = useCallback((protoId: EndoProtocolPresetId) => {
		const proto = CANONICAL_ENDO_PROTOCOLS[protoId];
		if (!proto) return;
		setActiveProtocolId(protoId);
		setStageStamp(proto.stageStamp);
		setIrrigation(proto.irrigation);
		setRotarySystem(proto.rotarySystem);
		setCanals((prev) => prev.map((c) => ({
			...c, isObliterated: false,
			workingLengthMm: c.workingLengthMm > 0 ? c.workingLengthMm : getAnatomicalWorkingLength(activeTooth, c.canalName),
			obturationTechnique: proto.obturationTechnique, sealer: proto.defaultSealer,
		})));
		showToast(`Применён протокол: ${proto.title}`, "info", 1800);
	}, [activeTooth]);

	const applyAnatomicalNorm = useCallback(() => {
		setCanals(getDefaultCanalsForTooth(activeTooth));
		setStageStamp("COMPLETED");
		showToast(`Восстановлена анатомическая норма зуба #${activeTooth}`, "info", 1800);
	}, [activeTooth]);

	const quickCanalsState: QuickCanalState[] = useMemo(() => canals.map((c) => ({
		id: c.id, name: c.canalName, workingLengthMm: typeof c.workingLengthMm === "number" ? c.workingLengthMm : 21.0,
		masterApicalFile: c.masterApicalFile || "#25.04", taper: c.taper || ".04",
		obturationType: stageStamp === "TEMP_CAOH2" ? "temp_caoh2" : "gutta_sealer",
		sealer: c.sealer || "AH Plus", isObliterated: Boolean(c.isObliterated),
	})), [canals, stageStamp]);

	const generatedProtocolText = useMemo(() => {
		const protoDef = CANONICAL_ENDO_PROTOCOLS[activeProtocolId];
		if (protoDef) return protoDef.generateSoapNote({ activeTooth, toothAnatomicalName, canals: quickCanalsState });
		return generateEndoProtocol043({
			toothNumber: activeTooth,
			toothTitle: `Зуб FDI: #${activeTooth} ${toothAnatomicalName} [${stageStamp === "TEMP_CAOH2" ? "ВРЕМЕННАЯ ОБТУРАЦИЯ Ca(OH)2" : "ПОЛНАЯ ОБТУРАЦИЯ ДО АПЕКСА"}]`,
			canals, irrigation, rotarySystem, radiologyControl, notes: "",
		});
	}, [activeProtocolId, activeTooth, toothAnatomicalName, quickCanalsState, stageStamp, canals, irrigation, rotarySystem, radiologyControl]);

	const costEstimate = useMemo(() => calculateEndoTreatmentCostKopecks({
		toothNumber: activeTooth, canalsCount: canals.length, protocolId: activeProtocolId, withRvg: true,
	}), [activeTooth, canals.length, activeProtocolId]);

	const handleCopyText = useCallback(() => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(generatedProtocolText).then(() => {
				setCopied(true); showToast("Протокол скопирован в буфер обмена", "success", 1500);
				setTimeout(() => setCopied(false), 1500);
			});
		}
	}, [generatedProtocolText]);

	const handleCopyPatientMemo = useCallback(() => {
		const memo = formatEndoPatientMemo({
			clinicName: props.clinicName || "Стоматологическая клиника DENTE", clinicPhone: props.clinicPhone || "+7 (495) 123-45-67",
			patientName: props.patientName || "Пациент", doctorName: props.doctorName || "Лечащий врач",
			toothNumber: activeTooth, isPermanentObturation: stageStamp === "COMPLETED", isTemporaryCaOh2: stageStamp === "TEMP_CAOH2",
		});
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(memo).then(() => showToast("Памятка для пациента скопирована", "success", 2000));
		}
	}, [props.clinicName, props.clinicPhone, props.patientName, props.doctorName, activeTooth, stageStamp]);

	const handleCommitProtocol = useCallback(async () => {
		setIsSaving(true);
		const sanitized = sanitizeCanalsForSubmission(canals, activeTooth, stageStamp, getAnatomicalWorkingLength);
		const clinicalData: EndoToothClinicalData = {
			toothNumber: activeTooth, canals: sanitized, irrigation, rotarySystem, radiologyControl,
			apexLocator: "0.0 Apex", stageStamp, notes: "", updatedAt: new Date().toISOString(),
		};

		try {
			useVisitStore.getState().setVisitNoteForm((prev) => ({
				...prev,
				objectiveStatus: prev.objectiveStatus?.trim() ? `${prev.objectiveStatus.trim()}\n\n${generatedProtocolText}` : generatedProtocolText,
				treatmentPlan: prev.treatmentPlan?.trim() ? `${prev.treatmentPlan.trim()}\nЭндодонтическое лечение #${activeTooth}` : `Эндодонтическое лечение #${activeTooth}`,
			}));
		} catch { /* safe */ }

		try {
			if (typeof window !== "undefined" && costEstimate.services.length > 0) {
				window.dispatchEvent(new CustomEvent("dente-add-services-to-invoice", {
					detail: {
						toothNumber: activeTooth, teethNumbers: [activeTooth],
						services: costEstimate.services.map((s) => ({
							code: s.code, code804n: s.code, name: s.title, nameRu: s.title,
							price: Number(s.priceKopecks / 100n), priceRub: Number(s.priceKopecks / 100n),
							amountKopecks: Number(s.priceKopecks), quantity: s.quantity || 1, toothNumber: activeTooth, category: "Эндодонтия",
						})),
					},
				}));
			}
		} catch { /* soft */ }

		if (props.onSaveCanals) { try { await props.onSaveCanals(sanitized, clinicalData); } catch { /* ignore */ } }
		if (props.patientId) {
			fetch(`/api/patients/${props.patientId}/tooth-states/${activeTooth}/endo`, {
				method: "POST", headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ toothNumber: activeTooth, canals: sanitized, irrigation, rotarySystem, radiologyControl, apexLocator: "0.0 Apex", stageStamp, notes: "" }),
			}).catch(() => {});
		}
		if (props.onInsertToProtocol) props.onInsertToProtocol(generatedProtocolText, sanitized);
		if (props.onSave) props.onSave(sanitized, generatedProtocolText);

		setIsSaving(false);
		showToast(`Протокол каналов зуба #${activeTooth} успешно зафиксирован!`, "success", 2500);
		props.onClose();
	}, [canals, activeTooth, stageStamp, irrigation, rotarySystem, radiologyControl, generatedProtocolText, costEstimate, props]);

	if (!props.isOpen) return null;

	const modalContent = (
		<div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-x-clip" role="dialog" aria-modal="true" aria-label={`Эндодонтическая студия зуба ${activeTooth}`} data-testid="endodontic-studio-modal">
			<div className="relative w-full max-w-5xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 border-t sm:border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-t-[24px] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] max-w-full" data-testid="endo-canal-log-modal">
				<div className="w-9 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2 sm:hidden shrink-0" />
				<header className="flex items-center justify-between p-3.5 sm:p-4 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--surface,#f8fafc)] dark:bg-slate-900/80 shrink-0">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-10 h-10 rounded-xl bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] flex items-center justify-center font-bold text-sm shrink-0">#{activeTooth}</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<h2 className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] dark:text-white truncate">
									<span className="sm:hidden">Зуб #{activeTooth}: Эндодонтия</span>
									<span className="hidden sm:inline">Эндодонтическая студия: {toothAnatomicalName}</span>
								</h2>
								{props.toothState && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 truncate">{props.toothState}</span>}
								{isLoadingFromDb && <span className="text-[11px] text-teal-600 dark:text-teal-400 flex items-center gap-1 font-medium"><Activity size={12} className="animate-spin" /> Загрузка...</span>}
							</div>
							<p className="text-xs text-[var(--muted,#64748b)] hidden sm:block truncate">Канонический протокол инструментальной обработки, ирригации и 3D-обтурации каналов</p>
						</div>
					</div>
					<button type="button" onClick={props.onClose} className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer" aria-label="Закрыть"><X size={18} /></button>
				</header>

				<div className="p-3.5 sm:p-5 overflow-y-auto flex-1 space-y-3.5">
					<div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--surface,#f8fafc)] dark:bg-slate-800/40 border border-[var(--line,#e2e8f0)] dark:border-slate-800">
						<div className="flex items-center gap-1.5 flex-wrap">
							<button type="button" onClick={() => applyCanonicalProtocol("pulpitis_1visit")} className={`min-h-[44px] sm:min-h-[34px] h-9 sm:h-8 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${activeProtocolId === "pulpitis_1visit" ? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]" : "bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:bg-slate-100"}`}>Пульпит (1 визит)</button>
							<button type="button" onClick={() => applyCanonicalProtocol("periodontitis_temp")} className={`min-h-[44px] sm:min-h-[34px] h-9 sm:h-8 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${activeProtocolId === "periodontitis_temp" ? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]" : "bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:bg-slate-100"}`}>Периодонтит (Ca(OH)2)</button>
							<button type="button" onClick={() => applyCanonicalProtocol("retreatment_unsealing")} className={`min-h-[44px] sm:min-h-[34px] h-9 sm:h-8 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${activeProtocolId === "retreatment_unsealing" ? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)]" : "bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:bg-slate-100"}`}>Распломбировка</button>
							<button type="button" onClick={applyAnatomicalNorm} className="min-h-[44px] sm:min-h-[34px] h-9 sm:h-8 px-3 rounded-lg text-xs font-semibold bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:bg-slate-100 cursor-pointer" title="Восстановить анатомическую норму каналов по FDI">Норма (FDI)</button>
						</div>
						<button type="button" onClick={addCanal} className="min-h-[44px] sm:min-h-[34px] h-9 sm:h-8 px-3 rounded-lg text-xs font-semibold bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--teal,#0d9488)] border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center gap-1.5 cursor-pointer"><Plus size={14} /> Добавить канал</button>
					</div>

					<div className="border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl bg-[var(--paper,#ffffff)] dark:bg-slate-900/50 overflow-hidden shadow-xs">
						<div className="p-3 bg-[var(--surface,#f8fafc)] dark:bg-slate-800/60 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 flex items-center justify-between">
							<div className="flex items-center gap-2">
								<SlidersHorizontal size={14} className="text-[var(--teal,#0d9488)]" />
								<span className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-white">Корневые каналы зуба #{activeTooth}</span>
								<span className="text-[11px] text-[var(--muted,#64748b)]">({canals.length} {canals.length === 1 ? "канал" : "канала"})</span>
							</div>
							<span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Apex 0.0 активен</span>
						</div>

						{/* Desktop View */}
						<div className="hidden sm:block overflow-x-auto">
							<table className="w-full text-left border-collapse text-xs">
								<thead>
									<tr className="border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-[var(--muted,#64748b)]">
										<th className="p-2.5 font-bold">Канал</th><th className="p-2.5 font-bold">Склероз</th><th className="p-2.5 font-bold">Длина WL (мм)</th>
										<th className="p-2.5 font-bold">Мастер-файл MAF</th><th className="p-2.5 font-bold">Конусность</th><th className="p-2.5 font-bold">Обтурация и силер</th>
										<th className="p-2.5 text-center font-bold">Удалить</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[var(--line,#e2e8f0)] dark:divide-slate-800">
									{canals.map((c) => (
										<tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
											<td className="p-2.5 font-bold text-[var(--ink,#0f172a)] dark:text-white">
												<input type="text" value={c.canalName} onChange={(e) => updateCanal(c.id, "canalName", e.target.value)} className="w-16 px-1.5 py-1 rounded border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-transparent text-xs font-bold" />
											</td>
											<td className="p-2.5">
												<label className="inline-flex items-center gap-1 cursor-pointer">
													<input type="checkbox" checked={Boolean(c.isObliterated)} onChange={() => toggleObliteration(c.id)} className="rounded text-[var(--teal,#0d9488)] cursor-pointer" />
													<span className="text-[11px] text-[var(--muted,#64748b)]">Облит.</span>
												</label>
											</td>
											<td className="p-2.5">
												<div className="flex items-center gap-1">
													<button type="button" onClick={() => adjustLength(c.id, -0.5)} className="w-6 h-6 rounded border border-[var(--line,#cbd5e1)] dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">-</button>
													<input type="number" step="0.5" min="0" max="35" value={c.workingLengthMm || 0} onChange={(e) => updateCanal(c.id, "workingLengthMm", parseFloat(e.target.value) || 0)} className="w-14 px-1.5 py-1 rounded border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-transparent text-xs text-center font-bold" />
													<button type="button" onClick={() => adjustLength(c.id, 0.5)} className="w-6 h-6 rounded border border-[var(--line,#cbd5e1)] dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">+</button>
												</div>
											</td>
											<td className="p-2.5">
												<select value={c.masterApicalFile} onChange={(e) => updateCanal(c.id, "masterApicalFile", e.target.value)} className="px-1.5 py-1 rounded border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-transparent text-xs max-w-[140px] truncate cursor-pointer">
													{CANONICAL_MAF_SIZES.map((opt) => <option key={opt.label} value={opt.label}>{opt.label} ({opt.system})</option>)}
													{CURATED_ISO_MAF_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
												</select>
											</td>
											<td className="p-2.5">
												<select value={c.taper} onChange={(e) => updateCanal(c.id, "taper", e.target.value)} className="px-1.5 py-1 rounded border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-transparent text-xs max-w-[110px] truncate cursor-pointer">
													<option value=".04 (Конусность 4%)">.04 (4%)</option><option value=".06 (Конусность 6%)">.06 (6%)</option><option value=".02 (Конусность 2%)">.02 (2%)</option>
												</select>
											</td>
											<td className="p-2.5">
												<select value={c.sealer || "AH Plus (эпоксидный герметик)"} onChange={(e) => updateCanal(c.id, "sealer", e.target.value)} className="px-1.5 py-1 rounded border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-transparent text-xs max-w-[160px] truncate cursor-pointer">
													{CURATED_SEALERS.map((s) => <option key={s} value={s}>{s}</option>)}
												</select>
											</td>
											<td className="p-2.5 text-center">
												{canals.length > 1 && (<button type="button" onClick={() => removeCanal(c.id)} className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 inline-flex items-center justify-center cursor-pointer" title="Удалить"><Trash2 size={13} /></button>)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{/* Mobile Grouped Cards View (Apple HIG) */}
						<div className="sm:hidden p-3 divide-y divide-[var(--line,#e2e8f0)] dark:divide-slate-800 space-y-3">
							{canals.map((c) => (
								<div key={c.id} className="pt-3 first:pt-0 space-y-2.5">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<input type="text" value={c.canalName} onChange={(e) => updateCanal(c.id, "canalName", e.target.value)} className="w-16 px-2 py-1 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-xs font-bold" />
											<span className="text-xs font-bold text-[var(--teal,#0d9488)]">{c.isObliterated ? "ОБЛИТЕРИРОВАН" : `${c.workingLengthMm} мм`}</span>
										</div>
										<div className="flex items-center gap-2">
											<label className="flex items-center gap-1 text-[11px] text-[var(--muted,#64748b)]">
												<input type="checkbox" checked={Boolean(c.isObliterated)} onChange={() => toggleObliteration(c.id)} className="rounded text-[var(--teal,#0d9488)]" /><span>Склероз</span>
											</label>
											{canals.length > 1 && (<button type="button" onClick={() => removeCanal(c.id)} className="w-9 h-9 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center cursor-pointer"><Trash2 size={14} /></button>)}
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
										<div>
											<span className="text-[10px] text-[var(--muted,#64748b)] block mb-1">Мастер-файл MAF:</span>
											<select value={c.masterApicalFile} onChange={(e) => updateCanal(c.id, "masterApicalFile", e.target.value)} className="min-h-[44px] w-full px-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-xs font-medium">
												{CANONICAL_MAF_SIZES.map((opt) => <option key={opt.label} value={opt.label}>{opt.label}</option>)}
												{CURATED_ISO_MAF_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
											</select>
										</div>
										<div>
											<span className="text-[10px] text-[var(--muted,#64748b)] block mb-1">Силер / герметик:</span>
											<select value={c.sealer || "AH Plus (эпоксидный герметик)"} onChange={(e) => updateCanal(c.id, "sealer", e.target.value)} className="min-h-[44px] w-full px-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-xs font-medium">
												{CURATED_SEALERS.map((s) => <option key={s} value={s}>{s}</option>)}
											</select>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Клинические параметры */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
						<div className="p-3 rounded-2xl bg-[var(--surface,#f8fafc)] dark:bg-slate-800/40 border border-[var(--line,#e2e8f0)] dark:border-slate-800">
							<span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Машинная NiTi-система:</span>
							<select value={rotarySystem} onChange={(e) => setRotarySystem(e.target.value)} className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-xs text-[var(--ink,#0f172a)] dark:text-white">
								{NITI_SYSTEM_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
							</select>
						</div>
						<div className="p-3 rounded-2xl bg-[var(--surface,#f8fafc)] dark:bg-slate-800/40 border border-[var(--line,#e2e8f0)] dark:border-slate-800">
							<span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Ирригация и УЗ-активация:</span>
							<select value={irrigation} onChange={(e) => setIrrigation(e.target.value)} className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-xs text-[var(--ink,#0f172a)] dark:text-white">
								{CANONICAL_IRRIGATION_SOLUTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
							</select>
						</div>
						<div className="p-3 rounded-2xl bg-[var(--surface,#f8fafc)] dark:bg-slate-800/40 border border-[var(--line,#e2e8f0)] dark:border-slate-800">
							<span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Стоимость (BigInt копейки):</span>
							<div className="flex items-center justify-between text-xs pt-0.5">
								<span className="font-bold text-[var(--teal,#0d9488)]">{costEstimate.totalRubles.toLocaleString("ru-RU")} ₽</span>
								<span className="text-[10px] text-[var(--muted,#64748b)]">({costEstimate.services.length} усл.)</span>
							</div>
						</div>
					</div>

					{/* Разворачиваемый протокол приёма */}
					<details className="group border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl bg-[var(--surface,#f8fafc)] dark:bg-slate-800/30 overflow-hidden">
						<summary className="flex items-center justify-between p-3 cursor-pointer select-none text-xs font-bold text-[var(--ink,#0f172a)] dark:text-white list-none">
							<div className="flex items-center gap-2"><FileText size={14} className="text-[var(--teal,#0d9488)]" /><span>Сформированный клинический протокол эндодонтии</span></div>
							<ChevronDown size={14} className="text-[var(--muted,#64748b)] transition-transform duration-200 group-open:rotate-180" />
						</summary>
						<div className="p-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 space-y-2">
							<textarea readOnly rows={5} value={generatedProtocolText} className="w-full p-2.5 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-900 font-mono text-[11px] text-[var(--ink,#0f172a)] dark:text-white outline-none resize-none" />
							<div className="flex justify-end">
								<button type="button" onClick={handleCopyText} className="min-h-[36px] h-8 px-3 rounded-lg text-xs font-semibold bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center gap-1.5 cursor-pointer">
									<Copy size={13} /> {copied ? "Скопировано!" : "Скопировать текст"}
								</button>
							</div>
						</div>
					</details>
				</div>

				{/* 3. Footer — Ровно ОДНА Primary CTA кнопка #0d9488 («✓ Зафиксировать протокол каналов») */}
				<footer className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--surface,#f8fafc)] dark:bg-slate-900/90 shrink-0">
					<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
						<div className="grid grid-cols-2 sm:flex items-center gap-2">
							<button type="button" onClick={() => { if (typeof window !== "undefined") window.print(); }} data-testid="endo-print-worksheet-btn" className="secondary-button min-h-[50px] sm:min-h-[36px] h-11 sm:h-9 px-3 rounded-xl text-xs sm:text-sm font-bold bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer" title="Распечатать эндодонтическую карту (А4)"><Printer size={16} className="text-teal-600 dark:text-teal-400 shrink-0" /><span><span className="hidden sm:inline">Печать эндо-карты (А4)</span><span className="sm:hidden">Печать А4</span></span></button>
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
						<button type="button" data-testid="insert-endo-protocol-btn" onClick={handleCommitProtocol} className="primary-button flex-1 sm:flex-initial min-h-[50px] sm:min-h-[36px] h-11 sm:h-9 px-5 sm:px-6 rounded-xl text-xs sm:text-sm font-bold bg-[var(--teal,#0d9488)] hover:bg-[#0f766e] active:scale-98 text-white flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer whitespace-nowrap" title="Зафиксировать протокол каналов">
							<Check size={18} className="shrink-0" />
							<span>{isSaving ? "Сохранение..." : "Зафиксировать протокол каналов"}</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}

export default EndodonticStudioModal;
