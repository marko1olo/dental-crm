/**
 * apps/web/src/components/odontogram/OdontogramStudioModal.tsx
 *
 * DENTE Dental CRM — Canonical Odontogram Studio Modal & Chairside Fast-Stamp Bar.
 * Unified FDI Dental Formula (11-48 / 51-85) with Instant Pathologies Stamps,
 * 1-Click Intact Teeth (Mandate 8e), and 1-Click Visit Estimate Recommendations.
 * Exactly ONE Primary CTA #0d9488 (Mandate 8am), Apple HIG (Mandate 8b: Sweet Spot 350-480 lines).
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { X, Check, Sparkles, ShieldCheck, AlertCircle } from "lucide-react";
import {
	ADULT_TEETH_SSOT,
	PEDIATRIC_TEETH_SSOT,
	CLINICAL_STATUSES_SSOT,
	CANONICAL_5_SURFACES,
	createIntactDentition,
	getStatusDefinition,
	isUpperJawTooth,
	getToothStandardNameRu,
	type OdontogramDentitionMode,
	type OdontogramToothEntry,
} from "./odontogramCatalogData";

export interface OdontogramStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialTeeth?: Record<number, OdontogramToothEntry>;
	readonly onSaveTeeth?: (teeth: Record<number, OdontogramToothEntry>, addedEstimatesCount: number) => void;
	readonly patientName?: string;
	readonly visitId?: string;
}

export const OdontogramStudioModal: React.FC<OdontogramStudioModalProps> = ({
	isOpen,
	onClose,
	initialTeeth,
	onSaveTeeth,
	patientName = "Пациент приёма",
	visitId,
}) => {
	const [dentitionMode, setDentitionMode] = useState<OdontogramDentitionMode>("adult");
	const [teethData, setTeethData] = useState<Record<number, OdontogramToothEntry>>(() => {
		return initialTeeth && Object.keys(initialTeeth).length > 0 ? { ...initialTeeth } : createIntactDentition("adult");
	});

	const [activeStamp, setActiveStamp] = useState<string | null>("Caries");
	const [selectedToothNum, setSelectedToothNum] = useState<number | null>(16);
	const [activeQuadrantMobile, setActiveQuadrantMobile] = useState<number>(1);
	const [pendingEstimates, setPendingEstimates] = useState<Array<{ toothNum: number; serviceTitle: string; amountKopecks: number; code804n: string }>>([]);
	const [saveNotification, setSaveNotification] = useState<string | null>(null);

	useEffect(() => {
		if (initialTeeth && Object.keys(initialTeeth).length > 0) setTeethData({ ...initialTeeth });
	}, [initialTeeth]);

	const handleModeChange = useCallback((mode: OdontogramDentitionMode) => {
		setDentitionMode(mode);
		setTeethData((prev) => ({ ...createIntactDentition(mode), ...prev }));
	}, []);

	// МАНДАТ 8e: 1-клик сброс всех зубов в физиологическую норму
	const handleResetAllIntact = useCallback(() => {
		setTeethData(createIntactDentition(dentitionMode));
		setPendingEstimates([]);
		setSaveNotification("Все зубы отмечены как здоровые (интактные)");
		setTimeout(() => setSaveNotification(null), 3000);
	}, [dentitionMode]);

	// Нанесение штампа патологии на зуб в 1 клик
	const handleApplyStampToTooth = useCallback((toothNum: number) => {
		setSelectedToothNum(toothNum);
		if (!activeStamp) return;
		const statusDef = getStatusDefinition(activeStamp);

		setTeethData((prev) => {
			const current = prev[toothNum] || { toothNumber: toothNum, state: "Healthy", surfaces: [] };
			const nextState = current.state === activeStamp ? "Healthy" : activeStamp;
			const nextSurfaces = nextState === "Healthy" ? [] : current.surfaces.length > 0 ? current.surfaces : ["Occ"];
			return { ...prev, [toothNum]: { ...current, state: nextState, surfaces: nextSurfaces } };
		});

		if (statusDef.recommendedEstimate && activeStamp !== "Healthy") {
			const est = statusDef.recommendedEstimate;
			setPendingEstimates((prev) => [
				...prev.filter((i) => i.toothNum !== toothNum),
				{ toothNum, serviceTitle: `${est.serviceTitle} (зуб ${toothNum})`, amountKopecks: est.amountKopecks, code804n: est.code804n },
			]);
		} else if (activeStamp === "Healthy") {
			setPendingEstimates((prev) => prev.filter((i) => i.toothNum !== toothNum));
		}
	}, [activeStamp]);

	// Переключение поверхности активного зуба
	const handleToggleSurface = useCallback((surfaceId: string) => {
		if (!selectedToothNum) return;
		setTeethData((prev) => {
			const current = prev[selectedToothNum] || { toothNumber: selectedToothNum, state: "Healthy", surfaces: [] };
			const exists = current.surfaces.includes(surfaceId);
			const nextSurfaces = exists ? current.surfaces.filter((s) => s !== surfaceId) : [...current.surfaces, surfaceId];
			return {
				...prev,
				[selectedToothNum]: {
					...current,
					surfaces: nextSurfaces,
					state: current.state === "Healthy" && nextSurfaces.length > 0 ? "Caries" : current.state,
				},
			};
		});
	}, [selectedToothNum]);

	const handleSaveAndConfirm = useCallback(() => {
		onSaveTeeth?.(teethData, pendingEstimates.length);
		onClose();
	}, [teethData, pendingEstimates, onSaveTeeth, onClose]);

	const activeTeethList = useMemo(() => (dentitionMode === "pediatric" ? PEDIATRIC_TEETH_SSOT : ADULT_TEETH_SSOT), [dentitionMode]);
	const upperTeeth = useMemo(() => activeTeethList.filter(isUpperJawTooth), [activeTeethList]);
	const lowerTeeth = useMemo(() => activeTeethList.filter((num) => !isUpperJawTooth(num)), [activeTeethList]);
	const mobileQuadrantTeeth = useMemo(() => activeTeethList.filter((num) => Math.floor(num / 10) === activeQuadrantMobile), [activeTeethList, activeQuadrantMobile]);

	const selectedTooth = selectedToothNum ? teethData[selectedToothNum] : null;
	const selectedStatusDef = selectedTooth ? getStatusDefinition(selectedTooth.state) : null;

	const formattedVisitNum = useMemo(() => {
		if (!visitId) return "";
		const clean = visitId.replace(/^vis-|^visit-/, "");
		return `Приём № ${clean.slice(-4)}`;
	}, [visitId]);

	if (!isOpen) return null;

	const renderToothTile = (toothNum: number, isMobile = false) => {
		const tooth = teethData[toothNum] || { toothNumber: toothNum, state: "Healthy", surfaces: [] };
		const def = getStatusDefinition(tooth.state);
		const isSelected = selectedToothNum === toothNum;

		if (isMobile) {
			return (
				<button
					key={toothNum}
					type="button"
					data-testid={`tooth-cell-${toothNum}`}
					onClick={() => handleApplyStampToTooth(toothNum)}
					className={`w-full min-h-[56px] p-1.5 rounded-xl border flex flex-col items-center justify-between transition-all ${
						isSelected ? "ring-2 ring-[var(--teal)] border-[var(--teal)] shadow-xs" : "border-[var(--line)]"
					}`}
					style={{ backgroundColor: def.bgToken }}
				>
					<span className="text-sm font-bold leading-none">{toothNum}</span>
					<span className="text-xs font-semibold px-1 rounded" style={{ color: def.colorHex }}>{def.codeRu}</span>
					<span className="text-[10px] text-[var(--ink-muted)] truncate max-w-full">{tooth.surfaces.join("") || "норм"}</span>
				</button>
			);
		}

		return (
			<button
				key={toothNum}
				type="button"
				data-testid={`tooth-cell-${toothNum}`}
				onClick={() => handleApplyStampToTooth(toothNum)}
				title={`${toothNum}: ${def.labelRu}. Клик — нанести активный штамп.`}
				className={`h-16 rounded-lg border flex flex-col items-center justify-between p-1 transition-all hover:scale-105 active:scale-95 ${
					isSelected ? "ring-2 ring-[var(--teal)] border-[var(--teal)] shadow-md" : "border-[var(--line)]"
				}`}
				style={{ backgroundColor: def.bgToken }}
			>
				<span className="text-xs font-bold leading-none">{toothNum}</span>
				<div
					className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-2xs"
					style={{ backgroundColor: def.colorHex }}
				>
					{def.codeRu.slice(0, 1)}
				</div>
				<span className="text-[9px] font-medium text-[var(--ink-muted)] truncate">{tooth.surfaces.join("") || "—"}</span>
			</button>
		);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in" data-testid="odontogram-studio-modal">
			<div className="flex flex-col w-full h-full sm:h-auto sm:max-h-[92vh] max-w-6xl bg-[var(--paper)] text-[var(--ink)] sm:rounded-2xl border border-[var(--line)] shadow-2xl overflow-hidden box-border">
				{/* 1. Компактная шапка в 1 строку (Apple HIG, без многоточий) */}
				<header className="flex items-center justify-between px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-[var(--line)] bg-[var(--paper-strong)] shrink-0 gap-2">
					<div className="flex items-center gap-2 min-w-0 flex-1">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal-subtle)] text-[var(--teal)] flex items-center justify-center shrink-0">
							<ShieldCheck className="w-4 h-4" />
						</div>
						<div className="min-w-0">
							<h2 className="text-sm sm:text-base font-semibold leading-tight whitespace-nowrap">
								Зубная формула
							</h2>
							<p className="text-[11px] sm:text-xs text-[var(--ink-muted)] truncate">
								{patientName} {formattedVisitNum ? `· ${formattedVisitNum}` : ""}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
						<div className="hidden md:flex p-0.5 rounded-lg bg-[var(--paper-subtle)] border border-[var(--line)]">
							{(["adult", "pediatric", "mixed"] as const).map((m) => (
								<button
									key={m}
									type="button"
									onClick={() => handleModeChange(m)}
									className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${dentitionMode === m ? "bg-[var(--paper)] text-[var(--ink)] shadow-xs" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}
								>
									{m === "adult" ? "Постоянный (11–48)" : m === "pediatric" ? "Молочный (51–85)" : "Сменный"}
								</button>
							))}
						</div>

						<button
							type="button"
							data-testid="btn-reset-intact"
							onClick={handleResetAllIntact}
							title="Сбросить все зубы в соматическую норму (1 клик)"
							className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:px-3 text-xs font-medium rounded-lg bg-[var(--emerald-surface)] text-[var(--emerald-ink)] border border-[var(--emerald)] hover:opacity-90 active:scale-95 transition-all shrink-0"
						>
							<Sparkles className="w-3.5 h-3.5 text-[var(--emerald)]" />
							<span className="hidden sm:inline">Все зубы интактны</span>
							<span className="sm:hidden">Норма</span>
						</button>

						<button type="button" onClick={onClose} className="p-1.5 text-[var(--ink-muted)] hover:text-[var(--ink)] rounded-lg hover:bg-[var(--paper-subtle)] shrink-0" aria-label="Закрыть студию">
							<X className="w-5 h-5" />
						</button>
					</div>
				</header>

				{saveNotification && (
					<div className="px-4 py-1.5 text-xs font-medium bg-[var(--emerald-surface)] text-[var(--emerald-ink)] border-b border-[var(--emerald)] flex items-center justify-between">
						<span>{saveNotification}</span>
						<button type="button" onClick={() => setSaveNotification(null)} className="text-xs underline ml-2">Скрыть</button>
					</div>
				)}

				{/* 2. Панель быстрых штампов (One-Touch Stamp Bar: 1 клик на штамп -> клик по зубу) */}
				<div className="px-3 py-1.5 sm:px-4 sm:py-2 border-b border-[var(--line)] bg-[var(--paper)] flex items-center gap-1 sm:gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
					<span className="text-xs font-medium text-[var(--ink-muted)] mr-1 shrink-0">Штампы:</span>
					{CLINICAL_STATUSES_SSOT.map((status) => {
						const isSelected = activeStamp === status.key;
						return (
							<button
								key={status.key}
								type="button"
								data-testid={`stamp-btn-${status.key}`}
								onClick={() => setActiveStamp(isSelected ? null : status.key)}
								className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-medium border transition-all shrink-0 ${isSelected ? "border-current shadow-xs ring-1 ring-current" : "border-[var(--line)] hover:bg-[var(--paper-subtle)]"}`}
								style={{
									backgroundColor: isSelected ? status.bgToken : "transparent",
									color: isSelected ? status.colorHex : "inherit",
									borderColor: isSelected ? status.colorHex : undefined,
								}}
							>
								<span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: status.colorHex }} />
								<span className="font-semibold">{status.codeRu}</span>
								<span>{status.shortLabel}</span>
							</button>
						);
					})}
					{activeStamp && (
						<button type="button" onClick={() => setActiveStamp(null)} className="px-2 py-0.5 text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] underline shrink-0">
							Снять
						</button>
					)}
				</div>

				{/* 3. Рабочая область: зубные дуги и панель быстрого инспектора */}
				<div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[var(--paper)]">
					<div className="flex-1 p-3 sm:p-5 overflow-y-auto flex flex-col justify-start sm:justify-center items-center gap-3 sm:gap-4">
						{/* Мобильный селектор квадрантов по Apple HIG */}
						<div className="flex sm:hidden w-full items-center justify-between gap-1">
							<span className="text-xs font-medium text-[var(--ink-muted)]">Квадрант:</span>
							<div className="flex gap-1">
								{[1, 2, 3, 4].map((q) => (
									<button
										key={q}
										type="button"
										onClick={() => setActiveQuadrantMobile(q)}
										className={`px-3 py-1.5 text-xs font-semibold rounded-lg border min-w-[44px] min-h-[44px] flex items-center justify-center ${activeQuadrantMobile === q ? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-xs" : "bg-[var(--paper-subtle)] border-[var(--line)] text-[var(--ink)]"}`}
									>
										Q{q}
									</button>
								))}
							</div>
						</div>

						{/* Мобильный вид: аккуратная сетка 4x2 для зубов квадранта (тач-зона >= 44x44px) */}
						<div className="grid sm:hidden grid-cols-4 gap-1.5 w-full">
							{mobileQuadrantTeeth.map((num) => renderToothTile(num, true))}
						</div>

						{/* Десктопный вид: две анатомические дуги (верхняя и нижняя) */}
						<div className="hidden sm:flex flex-col gap-5 w-full max-w-4xl">
							<div className="flex flex-col gap-1 items-center">
								<span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">Верхняя челюсть</span>
								<div className="grid grid-cols-16 gap-1 w-full">{upperTeeth.map((num) => renderToothTile(num, false))}</div>
							</div>

							<div className="w-full h-px bg-[var(--line)] relative my-1">
								<span className="absolute left-1/2 -top-2 -translate-x-1/2 px-2 bg-[var(--paper)] text-[10px] font-medium text-[var(--ink-muted)]">
									Окклюзионная линия
								</span>
							</div>

							<div className="flex flex-col gap-1 items-center">
								<div className="grid grid-cols-16 gap-1 w-full">{lowerTeeth.map((num) => renderToothTile(num, false))}</div>
								<span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] mt-1">Нижняя челюсть</span>
							</div>
						</div>
					</div>

					{/* Правая зона: инспектор выбранного зуба и 1-клик смета */}
					<div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-[var(--line)] bg-[var(--paper-strong)] p-3 sm:p-4 flex flex-col justify-between shrink-0">
						{selectedTooth && selectedStatusDef ? (
							<div className="flex flex-col gap-3 sm:gap-4">
								<div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
									<div>
										<span className="text-xs font-medium text-[var(--ink-muted)]">Выбранный зуб:</span>
										<h3 className="text-xl font-bold leading-none">#{selectedTooth.toothNumber}</h3>
									</div>
									<div
										className="px-2.5 py-1 rounded-full text-xs font-semibold"
										style={{ backgroundColor: selectedStatusDef.bgToken, color: selectedStatusDef.colorHex, borderColor: selectedStatusDef.colorHex }}
									>
										{selectedStatusDef.labelRu}
									</div>
								</div>

								<div>
									<span className="text-xs font-semibold text-[var(--ink-muted)] block mb-1.5">Поверхности зуба:</span>
									<div className="grid grid-cols-5 gap-1.5">
										{CANONICAL_5_SURFACES.map((surf) => {
											const isSelected = selectedTooth.surfaces.includes(surf.id);
											return (
												<button
													key={surf.id}
													type="button"
													onClick={() => handleToggleSurface(surf.id)}
													title={`${surf.nameRu} (${surf.description})`}
													className={`py-1.5 px-1 text-xs font-bold rounded-md border text-center transition-colors ${isSelected ? "bg-[var(--teal)] text-white border-[var(--teal)] shadow-2xs" : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-subtle)]"}`}
												>
													{surf.shortRu}
												</button>
											);
										})}
									</div>
								</div>

								{selectedStatusDef.recommendedEstimate && (
									<div className="p-2.5 sm:p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-1.5 sm:gap-2">
										<div className="flex items-start gap-2">
											<Sparkles className="w-4 h-4 text-[var(--teal)] shrink-0 mt-0.5" />
											<div>
												<span className="text-xs font-semibold block text-[var(--ink)]">Рекомендация в смету:</span>
												<span className="text-xs text-[var(--ink-muted)] block leading-tight">{selectedStatusDef.recommendedEstimate.serviceTitle}</span>
											</div>
										</div>
										<div className="flex items-center justify-between mt-1 pt-1.5 border-t border-[var(--line)]">
											<span className="text-xs font-bold text-[var(--teal)]">
												{(selectedStatusDef.recommendedEstimate.amountKopecks / 100).toLocaleString("ru-RU")} ₽
											</span>
											<span className="text-[10px] text-[var(--ink-muted)] font-mono">{selectedStatusDef.recommendedEstimate.code804n}</span>
										</div>
									</div>
								)}

								<p className="text-[11px] text-[var(--ink-muted)] leading-relaxed">{getToothStandardNameRu(selectedTooth.toothNumber)}</p>
							</div>
						) : (
							<div className="flex flex-col items-center justify-center py-6 text-center text-[var(--ink-muted)]">
								<AlertCircle className="w-8 h-8 mb-2 opacity-50" />
								<p className="text-xs">Выберите зуб на схеме для детальной разметки поверхностей</p>
							</div>
						)}

						<div className="mt-3 pt-2 border-t border-[var(--line)]">
							{pendingEstimates.length > 0 && (
								<div className="mb-2 px-2.5 py-1.5 rounded-lg bg-[var(--teal-subtle)] text-[var(--teal-ink)] text-xs flex items-center justify-between">
									<span>Услуг в смету: {pendingEstimates.length}</span>
									<span className="font-bold">{(pendingEstimates.reduce((sum, item) => sum + item.amountKopecks, 0) / 100).toLocaleString("ru-RU")} ₽</span>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* 4. Нижняя панель действий (Floating Bottom Bar / Apple HIG): РОВНО 1 PRIMARY CTA */}
				<footer className="px-3.5 py-2.5 sm:px-4 sm:py-3 bg-[var(--paper-strong)] border-t border-[var(--line)] flex items-center justify-between shrink-0 gap-3">
					<div className="text-xs text-[var(--ink-muted)] truncate hidden sm:block">
						1-клик штампы · автономия врача · сохранение без блокировок
					</div>

					<div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
						<button
							type="button"
							onClick={onClose}
							className="px-3.5 py-2 text-sm font-medium rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-subtle)] transition-colors"
						>
							Отмена
						</button>

						{/* РОДНАЯ И ЕДИНСТВЕННАЯ PRIMARY CTA КНОПКА #0d9488 (Мандат 8am, 8e) */}
						<button
							type="button"
							data-testid="btn-save-odontogram-studio"
							onClick={handleSaveAndConfirm}
							className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl text-white shadow-md hover:opacity-95 active:scale-95 transition-all"
							style={{ backgroundColor: "var(--teal, #0d9488)" }}
						>
							<Check className="w-4 h-4" />
							<span>Сохранить зубную формулу</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

export default OdontogramStudioModal;
