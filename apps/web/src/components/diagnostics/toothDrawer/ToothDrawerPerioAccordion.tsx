/**
 * ToothDrawerPerioAccordion.tsx — Сквозная связь одонтограммы с пародонтологией (Мандаты 8e, 8am).
 * Отображение глубины карманов (мм), степени подвижности (0..III) и кровоточивости BOP для выбранного зуба.
 * Автономные 1-клик нормы и перенос в дневник приёма.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Activity, ChevronDown, ChevronUp, ExternalLink, FileText, Check } from "lucide-react";
import { showToast } from "../../GlobalToast";
import { useVisitStore } from "../../../store/visitStore";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders";
import type { WarmAccordionSection } from "./toothDrawerTypes";

export interface ToothDrawerPerioAccordionProps {
	readonly toothNumber: number;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly activeSection: WarmAccordionSection;
	readonly toggleSection: (section: WarmAccordionSection) => void;
	readonly onInsertToProtocol?: ((text: string) => void) | undefined;
	readonly onOpenPerio?: ((toothNumber: number) => void) | undefined;
}

const DEPTH_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const MOBILITY_OPTIONS = [
	{ level: 0 as const, label: "0 (Норма)", desc: "Физиологическая" },
	{ level: 1 as const, label: "I ст.", desc: "Вестибуло-оральная < 1 мм" },
	{ level: 2 as const, label: "II ст.", desc: "Вестибуло-оральная + медио-дистальная > 1 мм" },
	{ level: 3 as const, label: "III ст.", desc: "Подвижность во всех плоскостях" },
] as const;

export const ToothDrawerPerioAccordion: React.FC<ToothDrawerPerioAccordionProps> = ({
	toothNumber,
	patientId,
	patientName,
	activeSection,
	toggleSection,
	onInsertToProtocol,
	onOpenPerio,
}) => {
	const isExpanded = activeSection === "perio";

	const [probingDepth, setProbingDepth] = useState<number>(2);
	const [mobility, setMobility] = useState<0 | 1 | 2 | 3>(0);
	const [hasBop, setHasBop] = useState<boolean>(false);
	const [hasCalculus, setHasCalculus] = useState<boolean>(false);

	// Чтение кэшированного статуса пародонта для активного зуба
	useEffect(() => {
		if (!patientId?.trim()) {
			setProbingDepth(2);
			setMobility(0);
			setHasBop(false);
			setHasCalculus(false);
			return;
		}

		try {
			const raw = localStorage.getItem(`dente_perio_cache_${patientId.trim()}`);
			if (raw) {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed.teeth)) {
					const match = parsed.teeth.find((t: { toothNumber?: number }) => t.toothNumber === toothNumber);
					if (match) {
						if (typeof match.mobility === "number") {
							setMobility(match.mobility as 0 | 1 | 2 | 3);
						}
						// Гидратация кэша SEPA: если match.distoBuccal равен undefined, маппим из массива сайтов SEPA (siteCode: "DV", etc.)
						const sepaSites: Array<{ siteCode?: string; probingDepthMm?: number; bleedingOnProbing?: boolean; calculus?: boolean }> =
							Array.isArray(match.sites)
								? (match.sites as Array<{ siteCode?: string; probingDepthMm?: number; bleedingOnProbing?: boolean; calculus?: boolean }>)
								: Array.isArray(parsed.sites)
									? (parsed.sites as Array<{ toothNumber?: number; siteCode?: string; probingDepthMm?: number; bleedingOnProbing?: boolean; calculus?: boolean }>).filter(
											(s) => s.toothNumber === toothNumber,
										)
									: [];
						const perioSites = [match.distoBuccal, match.midBuccal, match.mesioBuccal, match.distoLingual, match.midLingual, match.mesioLingual];
						const sites = perioSites.some((s) => s !== undefined) ? perioSites : sepaSites;

						const depths = sites.map((s) => s?.probingDepthMm).filter((d): d is number => typeof d === "number");
						if (depths.length > 0) {
							setProbingDepth(Math.max(...depths));
						}
						const anyBop = sites.some((s) => Boolean(s?.bleedingOnProbing));
						setHasBop(anyBop);
						const anyCalc = sites.some((s) => Boolean(s?.calculus));
						setHasCalculus(anyCalc);
					}
				}
			}
		} catch {
			// graceful fallback to defaults
		}
	}, [toothNumber, patientId]);

	// Сохранение обновлений пародонта в локальный кэш и бэкенд
	const persistPerioChange = useCallback(
		(newDepth: number, newMobility: 0 | 1 | 2 | 3, newBop: boolean, newCalc: boolean) => {
			if (!patientId?.trim()) return;
			try {
				const cacheKey = `dente_perio_cache_${patientId.trim()}`;
				const raw = localStorage.getItem(cacheKey);
				const existing = raw ? JSON.parse(raw) : { teeth: [] };
				const teethList = Array.isArray(existing.teeth) ? [...existing.teeth] : [];
				const idx = teethList.findIndex((t: { toothNumber?: number }) => t.toothNumber === toothNumber);

				const existingTooth = idx >= 0 ? teethList[idx] : null;
				const preservedFurcation = typeof existingTooth?.furcation === "number" ? existingTooth.furcation : 0;
				const isImplant = Boolean(existingTooth?.isImplant);
				const isMissing = Boolean(existingTooth?.isMissing);

				const findSepaSite = (code: string) => {
					if (Array.isArray(existingTooth?.sites)) {
						return existingTooth.sites.find((s: { siteCode?: string }) => s.siteCode === code);
					}
					return undefined;
				};

				const updateSite = (
					existingSite: { gingivalMarginMm?: number; plaque?: boolean; suppuration?: boolean } | undefined,
					sepaCode?: string,
				) => {
					const sepaMatch = sepaCode ? findSepaSite(sepaCode) : undefined;
					const gm = existingSite?.gingivalMarginMm ?? sepaMatch?.gingivalMarginMm;
					const prevGm = typeof gm === "number" ? gm : 0;
					const plaque = existingSite?.plaque ?? sepaMatch?.plaque ?? newBop;
					const supp = existingSite?.suppuration ?? sepaMatch?.suppuration ?? false;
					return {
						probingDepthMm: newDepth,
						gingivalMarginMm: prevGm,
						bleedingOnProbing: newBop,
						calculus: newCalc,
						plaque,
						suppuration: supp,
						calMm: newDepth + prevGm,
					};
				};

				const updatedTooth = {
					toothNumber,
					isMissing,
					isImplant,
					mobility: newMobility,
					furcation: preservedFurcation,
					distoBuccal: updateSite(existingTooth?.distoBuccal, "DV"),
					midBuccal: updateSite(existingTooth?.midBuccal, "V"),
					mesioBuccal: updateSite(existingTooth?.mesioBuccal, "MV"),
					distoLingual: updateSite(existingTooth?.distoLingual, "DL"),
					midLingual: updateSite(existingTooth?.midLingual, "L"),
					mesioLingual: updateSite(existingTooth?.mesioLingual, "ML"),
					sites: [
						{ toothNumber, siteCode: "DV", probingDepthMm: newDepth, bleedingOnProbing: newBop, calculus: newCalc },
						{ toothNumber, siteCode: "V", probingDepthMm: newDepth, bleedingOnProbing: newBop, calculus: newCalc },
						{ toothNumber, siteCode: "MV", probingDepthMm: newDepth, bleedingOnProbing: newBop, calculus: newCalc },
						{ toothNumber, siteCode: "DL", probingDepthMm: newDepth, bleedingOnProbing: newBop, calculus: newCalc },
						{ toothNumber, siteCode: "L", probingDepthMm: newDepth, bleedingOnProbing: newBop, calculus: newCalc },
						{ toothNumber, siteCode: "ML", probingDepthMm: newDepth, bleedingOnProbing: newBop, calculus: newCalc },
					],
				};

				if (idx >= 0) {
					teethList[idx] = updatedTooth;
				} else {
					teethList.push(updatedTooth);
				}

				localStorage.setItem(cacheKey, JSON.stringify({ ...existing, teeth: teethList, savedAt: new Date().toISOString() }));
			} catch {
				// safe cache fallback
			}

			// Тихое сохранение в бэкенд (Мандат 8aa)
			const existingToothMeta = (() => {
				try {
					const raw = localStorage.getItem(`dente_perio_cache_${patientId.trim()}`);
					if (!raw) return null;
					const parsed = JSON.parse(raw);
					return Array.isArray(parsed.teeth) ? parsed.teeth.find((t: { toothNumber?: number }) => t.toothNumber === toothNumber) : null;
				} catch { return null; }
			})();
			const furcGrade = typeof existingToothMeta?.furcation === "number" ? existingToothMeta.furcation : 0;
			const furcStr = furcGrade > 0 ? (furcGrade === 1 ? "I" : furcGrade === 2 ? "II" : "III") : "0";
			const furcationB = (existingToothMeta as { furcationBuccal?: string } | null)?.furcationBuccal ?? furcStr;
			const furcationL = (existingToothMeta as { furcationLingual?: string } | null)?.furcationLingual ?? furcStr;

			void fetch(`/api/periodontogram/${encodeURIComponent(patientId.trim())}`, {
				method: "POST",
				headers: getDenteAuthHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": crypto.randomUUID(),
				}),
				body: JSON.stringify({
					teeth: [{ toothNumber, isPresent: true, isImplant: Boolean(existingToothMeta?.isImplant), mobility: newMobility, furcationBuccal: furcationB, furcationLingual: furcationL }],
					sites: [
						{ toothNumber, siteCode: "DV", probingDepthMm: newDepth, bleedingOnProbing: newBop, calculus: newCalc },
						{ toothNumber, siteCode: "V", probingDepthMm: newDepth, bleedingOnProbing: newBop, calculus: newCalc },
						{ toothNumber, siteCode: "MV", probingDepthMm: newDepth, bleedingOnProbing: newBop, calculus: newCalc },
						{ toothNumber, siteCode: "DL", probingDepthMm: newDepth, bleedingOnProbing: newBop, calculus: newCalc },
						{ toothNumber, siteCode: "L", probingDepthMm: newDepth, bleedingOnProbing: newBop, calculus: newCalc },
						{ toothNumber, siteCode: "ML", probingDepthMm: newDepth, bleedingOnProbing: newBop, calculus: newCalc },
					],
				}),
			})
				.then(async (res) => {
					if (!res.ok) {
						const errData = await res.json().catch(() => null);
						showToast(errData?.message || "Ошибка сохранения статуса пародонта", "error");
					}
				})
				.catch((err) => {
					showToast(err instanceof Error ? err.message : "Ошибка сети при сохранении пародонта", "error");
				});
		},
		[toothNumber, patientId],
	);

	const handleDepthSelect = useCallback(
		(depth: number) => {
			setProbingDepth(depth);
			persistPerioChange(depth, mobility, hasBop, hasCalculus);
		},
		[mobility, hasBop, hasCalculus, persistPerioChange],
	);

	const handleMobilitySelect = useCallback(
		(lvl: 0 | 1 | 2 | 3) => {
			setMobility(lvl);
			persistPerioChange(probingDepth, lvl, hasBop, hasCalculus);
		},
		[probingDepth, hasBop, hasCalculus, persistPerioChange],
	);

	const handleToggleBop = useCallback(() => {
		const next = !hasBop;
		setHasBop(next);
		persistPerioChange(probingDepth, mobility, next, hasCalculus);
	}, [hasBop, probingDepth, mobility, hasCalculus, persistPerioChange]);

	const handleSetNorm = useCallback(() => {
		setProbingDepth(2);
		setMobility(0);
		setHasBop(false);
		setHasCalculus(false);
		persistPerioChange(2, 0, false, false);
		showToast(`✓ Зуб #${toothNumber}: пародонт в физиологической норме (2 мм, 0 ст.)`, "success");
	}, [toothNumber, persistPerioChange]);

	const clinicalNoteText = useMemo(() => {
		const bopStr = hasBop ? "BOP+ (кровоточивость при зондировании)" : "BOP- (кровоточивости нет)";
		const mobStr = mobility > 0 ? `подвижность ${mobility} степени` : "подвижность отсутствует (физиологическая)";
		const calcStr = hasCalculus ? ", поддесневой зубной камень" : "";
		return `Пародонтальный статус зуба #${toothNumber}: зубодесневой карман ${probingDepth} мм, ${mobStr}, ${bopStr}${calcStr}.`;
	}, [toothNumber, probingDepth, mobility, hasBop, hasCalculus]);

	const handleInsertToDiary = useCallback(() => {
		if (onInsertToProtocol) onInsertToProtocol(clinicalNoteText);
		try {
			useVisitStore.getState().setVisitNoteForm((prev) => {
				const existing = prev.objectiveStatus?.trim() || "";
				return {
					...prev,
					objectiveStatus: existing ? `${existing}\n\n${clinicalNoteText}` : clinicalNoteText,
				};
			});
		} catch {
			// safe
		}
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: { statusLocalis: clinicalNoteText, objectiveStatus: clinicalNoteText, mode: "smart_append" },
				}),
			);
		}
		showToast(`✓ Пародонтальный статус зуба #${toothNumber} перенесён в дневник`, "success");
	}, [clinicalNoteText, onInsertToProtocol, toothNumber]);

	const handleOpenStudio = useCallback(() => {
		if (onOpenPerio) {
			onOpenPerio(toothNumber);
		} else if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente:open-perio-modal", {
					detail: { patientId, patientName, initialSelectedTooth: toothNumber },
				}),
			);
		}
	}, [onOpenPerio, toothNumber, patientId, patientName]);

	const depthCategory = probingDepth <= 3 ? "norm" : probingDepth <= 5 ? "moderate" : "severe";

	return (
		<section className="dente-accordion-item" data-testid="tooth-perio-accordion">
			<button
				type="button"
				onClick={() => toggleSection("perio")}
				className={`dente-accordion-trigger ${isExpanded ? "expanded" : ""}`}
				data-testid="tooth-perio-accordion-trigger"
			>
				<div className="trigger-left min-w-0 flex-1">
					<div className="flex items-center gap-2 min-w-0">
						<Activity size={16} className="shrink-0 text-[var(--primary)]" />
						<span className="trigger-title truncate font-semibold text-xs text-[var(--ink)]">4. Пародонтология</span>
					</div>
					<span className="trigger-summary text-[11px] font-semibold pl-6 block sm:inline sm:pl-2">
						Карман: <strong className={depthCategory === "norm" ? "text-emerald-600 dark:text-emerald-400" : depthCategory === "moderate" ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}>{probingDepth} мм</strong>
						{" • "}
						Подв: <strong className={mobility === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>{mobility === 0 ? "0" : `${mobility} ст.`}</strong>
						{hasBop && <span className="ml-1 text-rose-500 font-bold">• BOP+</span>}
					</span>
				</div>
				<div className="trigger-right shrink-0">
					{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
				</div>
			</button>

			{isExpanded && (
				<div className="dente-accordion-content animate-in p-3 space-y-3 bg-[var(--paper)] text-[var(--ink)]">
					{/* Индикатор глубины зубодесневого кармана */}
					<div className="space-y-1.5" data-testid="perio-probing-depth-section">
						<div className="flex items-center justify-between text-xs">
							<span className="font-bold text-[var(--ink)]">Глубина зондирования (зубодесневой карман):</span>
							<span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${probingDepth <= 3 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : probingDepth <= 5 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"}`}>
								{probingDepth} мм ({probingDepth <= 3 ? "Норма" : probingDepth <= 5 ? "Средний карман" : "Глубокий карман"})
							</span>
						</div>
						<div className="grid grid-cols-9 gap-1">
							{DEPTH_OPTIONS.map((d) => (
								<button
									key={d}
									type="button"
									onClick={() => handleDepthSelect(d)}
									className={`min-h-[44px] sm:min-h-[36px] rounded-lg text-xs font-bold font-mono transition-all border cursor-pointer ${probingDepth === d ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs" : "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--primary)]"}`}
									data-testid={`perio-depth-btn-${d}`}
								>
									{d}
								</button>
							))}
						</div>
					</div>

					{/* Степень патологической подвижности зуба */}
					<div className="space-y-1.5" data-testid="perio-mobility-section">
						<div className="flex items-center justify-between text-xs">
							<span className="font-bold text-[var(--ink)]">Подвижность зуба (шкала Энтина):</span>
							<span className="text-[11px] text-[var(--muted)]">{MOBILITY_OPTIONS.find((m) => m.level === mobility)?.desc}</span>
						</div>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
							{MOBILITY_OPTIONS.map((m) => (
								<button
									key={m.level}
									type="button"
									onClick={() => handleMobilitySelect(m.level)}
									className={`min-h-[44px] sm:min-h-[36px] px-2 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${mobility === m.level ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs" : "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--primary)]"}`}
									data-testid={`perio-mobility-btn-${m.level}`}
									title={m.desc}
								>
									{m.label}
								</button>
							))}
						</div>
					</div>

					{/* Кровоточивость BOP и зубной камень */}
					<div className="flex items-center gap-2 flex-wrap pt-1">
						<button
							type="button"
							onClick={handleToggleBop}
							className={`min-h-[44px] sm:min-h-[36px] h-9 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer inline-flex items-center gap-1.5 ${hasBop ? "bg-rose-500 text-white border-rose-500 shadow-xs" : "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"}`}
							data-testid="perio-bop-toggle-btn"
						>
							<span className="w-2 h-2 rounded-full bg-current" />
							{hasBop ? "Кровоточивость BOP: Да (+)" : "Кровоточивость BOP: Нет (-)"}
						</button>

						<button
							type="button"
							onClick={() => {
								const next = !hasCalculus;
								setHasCalculus(next);
								persistPerioChange(probingDepth, mobility, hasBop, next);
							}}
							className={`min-h-[44px] sm:min-h-[36px] h-9 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer inline-flex items-center gap-1.5 ${hasCalculus ? "bg-amber-500 text-white border-amber-500 shadow-xs" : "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"}`}
							data-testid="perio-calculus-toggle-btn"
						>
							{hasCalculus ? "Зубной камень (+)" : "Зубной камень (-)"}
						</button>

						<button
							type="button"
							onClick={handleSetNorm}
							className="min-h-[44px] sm:min-h-[36px] h-9 px-3 rounded-lg text-xs font-semibold bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--line)] transition-colors cursor-pointer ml-auto"
							data-testid="perio-set-norm-btn"
							title="Установить норму (2 мм, 0 ст., без кровоточивости)"
						>
							<Check size={14} className="inline mr-1 text-emerald-600" />
							Норма
						</button>
					</div>

					{/* Действия: Вставить в дневник и Студия пародонтологии */}
					<div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--line)] flex-wrap">
						<button
							type="button"
							onClick={handleOpenStudio}
							className="min-h-[44px] sm:min-h-[36px] h-9 px-3 rounded-lg text-xs font-semibold bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--line)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
							data-testid="perio-open-studio-btn"
						>
							<ExternalLink size={14} />
							<span>Студия пародонтологии (карта)</span>
						</button>

						<button
							type="button"
							onClick={handleInsertToDiary}
							className="min-h-[44px] sm:min-h-[36px] h-9 px-3.5 rounded-lg text-xs font-bold bg-[var(--primary)] text-white hover:opacity-95 active:scale-98 inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
							data-testid="perio-insert-diary-btn"
						>
							<FileText size={14} />
							<span>Вставить в дневник</span>
						</button>
					</div>
				</div>
			)}
		</section>
	);
};
