import { Award, Check, ChevronLeft, ChevronRight, Copy, FileText, ShieldCheck, Sparkles, X, Zap } from "lucide-react";
import React, { useMemo, useState, useRef, useEffect, memo } from "react";
import { showToast } from "../GlobalToast";
import type { ToothState } from "./ToothChart";
import {
	ClassicGostToothCell,
	type ClassicGostToothCellProps,
} from "./ClassicGostToothCell";
import {
	TOP_TEETH_MIXED,
	BOTTOM_TEETH_MIXED,
	UPPER_TEETH_PEDIATRIC,
	LOWER_TEETH_PEDIATRIC,
	UPPER_TEETH_ADULT,
	LOWER_TEETH_ADULT,
	GOST_TOOTH_STATES,
	calculateDmft,
	formatOdontogramTo043ProtocolText,
	getNextFocusedTooth,
	getToothStateFromHotkey,
	areClassicGostOdontogramPropsEqual,
	type ClassicGostOdontogramProps,
} from "./classicGostTypes";

// Re-export types and helpers for backwards compatibility
export * from "./classicGostTypes";
export * from "./ClassicGostToothCell";

export const ClassicGostOdontogram: React.FC<ClassicGostOdontogramProps> = memo(({
	teethData = [],
	pediatricMode,
	mixedDentition,
	topTeeth: customTopTeeth,
	bottomTeeth: customBottomTeeth,
	selectedTeeth = [],
	activeStamp,
	onToothClick,
	onQuickStateChange,
	useSurfaces = false,
	hideHeader = false,
	hideLegend = false,
	className = "",
}) => {
	const topList = useMemo(
		() =>
			customTopTeeth ??
			(mixedDentition
				? TOP_TEETH_MIXED
				: pediatricMode
					? UPPER_TEETH_PEDIATRIC
					: UPPER_TEETH_ADULT),
		[customTopTeeth, mixedDentition, pediatricMode],
	);

	const bottomList = useMemo(
		() =>
			customBottomTeeth ??
			(mixedDentition
				? BOTTOM_TEETH_MIXED
				: pediatricMode
					? LOWER_TEETH_PEDIATRIC
					: LOWER_TEETH_ADULT),
		[customBottomTeeth, mixedDentition, pediatricMode],
	);

	const topQ1 = useMemo(() => topList.slice(0, Math.ceil(topList.length / 2)), [topList]);
	const topQ2 = useMemo(() => topList.slice(Math.ceil(topList.length / 2)), [topList]);

	const bottomQ4 = useMemo(() => bottomList.slice(0, Math.ceil(bottomList.length / 2)), [bottomList]);
	const bottomQ3 = useMemo(() => bottomList.slice(Math.ceil(bottomList.length / 2)), [bottomList]);

	const toothStateMap = useMemo(() => {
		const map = new Map<number, (typeof teethData)[number]>();
		for (const t of teethData) {
			map.set(t.toothNumber, t);
		}
		return map;
	}, [teethData]);

	const dmftStats = useMemo(
		() => calculateDmft(teethData),
		[teethData],
	);

	const [isCopied, setIsCopied] = useState(false);

	const handleCopyProtocolText = () => {
		const text = formatOdontogramTo043ProtocolText(teethData, pediatricMode);
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(text).then(
				() => {
					setIsCopied(true);
					showToast(
						"Зубная формула скопирована для дневника приёма",
						"success",
					);
					setTimeout(() => setIsCopied(false), 2000);
				},
				() => {
					showToast("Не удалось скопировать в буфер обмена", "error");
				},
			);
		}
	};

	const digitBufferRef = useRef<{ buffer: string; timer: any }>({
		buffer: "",
		timer: null,
	});

	// Global high-speed keyboard listener for GOST grid
	useEffect(() => {
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			if (
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement ||
				target?.isContentEditable
			) {
				return;
			}

			// 1. Hotkey status assignment for selected teeth (applied to tooth whole without surfaces)
			if (selectedTeeth.length > 0 && onQuickStateChange) {
				const quickState = getToothStateFromHotkey(e.key);
				if (quickState) {
					e.preventDefault();
					onQuickStateChange(selectedTeeth, quickState, undefined);
					return;
				}
			}

			// 2. Digit 1-8 tooth navigation (Quadrant-aware & 2-digit FDI typing)
			if (/^[1-8]$/.test(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
				const digit = Number.parseInt(e.key, 10);
				const firstTooth = selectedTeeth[0];

				if (digitBufferRef.current.timer) {
					clearTimeout(digitBufferRef.current.timer);
				}

				const prevBuffer = digitBufferRef.current.buffer;
				if (prevBuffer.length === 1) {
					const firstDigit = Number.parseInt(prevBuffer, 10);
					const fdiCandidate = firstDigit * 10 + digit;
					digitBufferRef.current.buffer = "";
					const targetBtn = document.querySelector<HTMLButtonElement>(
						`[data-tooth-id="${fdiCandidate}"]`,
					);
					if (targetBtn) {
						e.preventDefault();
						targetBtn.focus();
						targetBtn.click();
						return;
					}
				}

				const quadrant = firstTooth ? Math.floor(firstTooth / 10) : 1;
				const isPediatricQuad = quadrant >= 5 && quadrant <= 8;
				if (!isPediatricQuad || digit <= 5) {
					const targetTooth = quadrant * 10 + digit;
					const targetBtn = document.querySelector<HTMLButtonElement>(
						`[data-tooth-id="${targetTooth}"]`,
					);
					if (targetBtn) {
						e.preventDefault();
						targetBtn.focus();
						targetBtn.click();
					}
				}

				digitBufferRef.current.buffer = e.key;
				digitBufferRef.current.timer = setTimeout(() => {
					digitBufferRef.current.buffer = "";
				}, 750);
				return;
			}

			// 3. Arrow Keys navigation
			const firstTooth = selectedTeeth[0];
			if (firstTooth !== undefined) {
				const dirMap: Record<
					string,
					"left" | "right" | "up" | "down" | "home" | "end"
				> = {
					ArrowLeft: "left",
					ArrowRight: "right",
					ArrowUp: "up",
					ArrowDown: "down",
					Home: "home",
					End: "end",
				};
				const navDir = dirMap[e.key];
				if (navDir) {
					e.preventDefault();
					const nextTooth = getNextFocusedTooth(firstTooth, navDir, pediatricMode);
					const nextEl = document.querySelector<HTMLButtonElement>(
						`[data-tooth-id="${nextTooth}"]`,
					);
					if (nextEl) {
						nextEl.focus();
						nextEl.click();
					}
				}
			} else if (
				e.key === "ArrowLeft" ||
				e.key === "ArrowRight" ||
				e.key === "ArrowUp" ||
				e.key === "ArrowDown"
			) {
				e.preventDefault();
				const initialTooth = pediatricMode ? 55 : 18;
				const initialEl = document.querySelector<HTMLButtonElement>(
					`[data-tooth-id="${initialTooth}"]`,
				);
				if (initialEl) {
					initialEl.focus();
					initialEl.click();
				}
			}
		};

		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => {
			if (digitBufferRef.current.timer) {
				clearTimeout(digitBufferRef.current.timer);
				digitBufferRef.current.timer = null;
			}
			window.removeEventListener("keydown", handleGlobalKeyDown);
		};
	}, [selectedTeeth, onQuickStateChange, pediatricMode, teethData]);

	const renderToothCell = (toothNumber: number, isUpper: boolean) => (
		<ClassicGostToothCell
			key={toothNumber}
			toothNumber={toothNumber}
			isUpper={isUpper}
			tooth={toothStateMap.get(toothNumber)}
			isSelected={selectedTeeth.includes(toothNumber)}
			selectedTeeth={selectedTeeth}
			activeStamp={activeStamp}
			onToothClick={onToothClick}
			onQuickStateChange={onQuickStateChange}
			useSurfaces={useSurfaces}
			pediatricMode={pediatricMode}
		/>
	);

	return (
		<div
			className={`tooth-chart-container classic-gost-mode flex flex-col gap-4 w-full px-4 sm:px-6 py-4 bg-[var(--odontogram-paper,#ffffff)] rounded-2xl border border-[var(--odontogram-border-subtle,#e2e8f0)] shadow-xs text-[var(--odontogram-ink)] ${className}`.trim()}
			data-testid="classic-gost-odontogram"
		>
			{!hideHeader && (
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--odontogram-border-subtle)]">
					<div className="flex items-center gap-2.5">
						<div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
							<FileText size={18} />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 className="text-base font-bold tracking-tight text-[var(--odontogram-ink)]">
									Зубная формула
								</h2>
								{pediatricMode && (
									<span className="text-xs px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950/70 text-pink-700 dark:text-pink-300 font-bold border border-pink-300 dark:border-pink-800">
										Детская
									</span>
								)}
							</div>
							<p className="text-xs text-[var(--odontogram-ink-muted)]">
								Медицинская карта стоматологического пациента
							</p>
						</div>
					</div>

					{/* Actions: Export to Form 043 Protocol & DMFT Score Card */}
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleCopyProtocolText}
							title="Скопировать формулу в дневник приёма"
							className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--odontogram-surface)] hover:bg-[var(--odontogram-surface-hover)] border border-[var(--odontogram-border-subtle)] text-[var(--odontogram-ink)] shadow-xs transition-colors cursor-pointer"
						>
							{isCopied ? (
								<Check size={14} className="text-emerald-500" />
							) : (
								<Copy size={14} className="text-[var(--odontogram-ink-muted)]" />
							)}
							<span>{isCopied ? "Скопировано!" : "В дневник приёма"}</span>
						</button>

						<div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-[var(--odontogram-surface)] border border-[var(--odontogram-border-subtle)] text-xs">
							<Award size={16} className="text-amber-500 shrink-0" />
							<div className="flex items-center gap-2">
								<span className="font-semibold text-[var(--odontogram-ink-muted)]">
									Индекс КПУ:
								</span>
								<strong className="font-black text-sm text-[var(--odontogram-ink)]">
									{dmftStats.dmftTotal}
								</strong>
								<span className="text-xs font-semibold text-[var(--odontogram-ink-muted)]">
									(К={dmftStats.decayed}, П={dmftStats.filled}, У=
									{dmftStats.missing})
								</span>
							</div>
							<span className="ml-1 hidden md:inline-block font-bold text-xs text-[var(--odontogram-ink-muted)]">
								· {dmftStats.severityLabel}
							</span>
						</div>
					</div>
				</div>
			)}

			{/* Quadrant Cross-Hair Grid (100% Symmetrical, Centered Layout) */}
			<div className="gost-scroll-container w-full overflow-x-auto flex justify-center py-2">
				<div className="inline-flex flex-col items-center gap-2 mx-auto">
					{/* UPPER JAW (Maxilla / Верхняя челюсть) */}
					<div className="w-fit flex flex-col items-center gap-1.5">
						<div className="w-full flex items-center justify-between text-xs font-bold text-[var(--odontogram-ink-muted)] px-1">
							<span className="text-left">
								{pediatricMode ? "Правая сторона (55 → 51)" : "Правая сторона (18 → 11)"}
							</span>
							<span className="text-center font-extrabold text-[var(--odontogram-ink)]">
								Верхняя челюсть (Maxilla)
							</span>
							<span className="text-right">
								{pediatricMode ? "Левая сторона (61 → 65)" : "Левая сторона (21 → 28)"}
							</span>
						</div>
						<div className="flex items-center justify-center gap-2">
							{/* Quadrant 1 */}
							<div className="flex items-center gap-1 bg-[var(--odontogram-surface)] p-1.5 rounded-xl border border-[var(--odontogram-border-subtle)] shadow-xs">
								{topQ1.map((num) => renderToothCell(num, true))}
							</div>

							{/* Sagittal Midline Separator (Tight 2px line) */}
							<div
								className="w-[2px] h-16 bg-indigo-500/50 dark:bg-indigo-400/50 rounded-full mx-1 shrink-0"
								title="Сагиттальная средняя линия"
							/>

							{/* Quadrant 2 */}
							<div className="flex items-center gap-1 bg-[var(--odontogram-surface)] p-1.5 rounded-xl border border-[var(--odontogram-border-subtle)] shadow-xs">
								{topQ2.map((num) => renderToothCell(num, true))}
							</div>
						</div>
					</div>

					{/* Occlusal Plane Cross Divider */}
					<div className="w-full flex items-center justify-center gap-3 my-1">
						<div className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent via-[var(--odontogram-border-strong)] to-[var(--odontogram-border-strong)]" />
						<span className="text-xs font-black uppercase tracking-wider text-[var(--odontogram-ink-muted)] px-2.5 py-0.5 rounded-full bg-[var(--odontogram-surface)] border border-[var(--odontogram-border-subtle)] whitespace-nowrap shadow-2xs">
							Окклюзионная плоскость
						</span>
						<div className="h-[1.5px] flex-1 bg-gradient-to-r from-[var(--odontogram-border-strong)] via-[var(--odontogram-border-strong)] to-transparent" />
					</div>

					{/* LOWER JAW (Mandible / Нижняя челюсть) */}
					<div className="w-fit flex flex-col items-center gap-1.5">
						<div className="flex items-center justify-center gap-2">
							{/* Quadrant 4 */}
							<div className="flex items-center gap-1 bg-[var(--odontogram-surface)] p-1.5 rounded-xl border border-[var(--odontogram-border-subtle)] shadow-xs">
								{bottomQ4.map((num) =>
									renderToothCell(num, false),
								)}
							</div>

							{/* Sagittal Midline Separator (Tight 2px line) */}
							<div
								className="w-[2px] h-16 bg-indigo-500/50 dark:bg-indigo-400/50 rounded-full mx-1 shrink-0"
								title="Сагиттальная средняя линия"
							/>

							{/* Quadrant 3 */}
							<div className="flex items-center gap-1 bg-[var(--odontogram-surface)] p-1.5 rounded-xl border border-[var(--odontogram-border-subtle)] shadow-xs">
								{bottomQ3.map((num) =>
									renderToothCell(num, false),
								)}
							</div>
						</div>
						<div className="w-full flex items-center justify-between text-xs font-bold text-[var(--odontogram-ink-muted)] px-1">
							<span className="text-left">
								{pediatricMode ? "Правая сторона (85 → 81)" : "Правая сторона (48 → 41)"}
							</span>
							<span className="text-center font-extrabold text-[var(--odontogram-ink)]">
								Нижняя челюсть (Mandible)
							</span>
							<span className="text-right">
								{pediatricMode ? "Левая сторона (71 → 75)" : "Левая сторона (31 → 38)"}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* 1-Click Express Clinical Presets (Mandates 8e, 8k, 8n: Distinct Solid 2px Borders & Clear Affordances) */}
			<div className="gost-presets-bar w-full flex flex-wrap items-center justify-between gap-2 p-2 bg-[var(--odontogram-surface)] border border-[var(--odontogram-border)] rounded-xl shadow-xs">
				<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--odontogram-ink)]">
					<Zap size={13} className="text-amber-500 shrink-0" />
					<span>Клинические экспресс-протоколы:</span>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<button
						type="button"
						data-testid="gost-preset-all-healthy"
						onClick={() => {
							if (onQuickStateChange) {
								const allTargetTeeth = [...topList, ...bottomList];
								onQuickStateChange(allTargetTeeth, "Healthy", undefined);
								showToast("Зубная формула: Все зубы здоровы / интактный зубной ряд (норма)", "success");
							}
						}}
						disabled={false}
						title="Установить всем зубам статус Здоров (Интактный ряд по умолчанию)"
						className="inline-flex items-center gap-1.5 px-2.5 py-1 h-7 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 active:bg-emerald-500/35 text-emerald-900 dark:text-emerald-100 border-2 border-emerald-500 dark:border-emerald-400 shadow-xs transition-all active:scale-97 cursor-pointer"
					>
						<ShieldCheck size={13} className="text-emerald-700 dark:text-emerald-300 shrink-0" />
						<span>Все здоровы</span>
						<span className="text-[11px] font-normal opacity-80">(Интактный)</span>
					</button>

					{!pediatricMode && (
						<button
							type="button"
							data-testid="gost-preset-wisdom-missing"
							onClick={() => {
								if (onQuickStateChange) {
									const wisdomTeeth = [18, 28, 38, 48];
									onQuickStateChange(wisdomTeeth, "Missing", undefined);
									showToast("Зубы мудрости (18, 28, 38, 48) отмечены как отсутствующие (0)", "info");
								}
							}}
							disabled={false}
							title="Отметить третьи моляры (18, 28, 38, 48) как отсутствующие (0)"
							className="inline-flex items-center gap-1.5 px-2.5 py-1 h-7 rounded-lg text-xs font-bold bg-zinc-500/15 hover:bg-zinc-500/25 active:bg-zinc-500/35 text-zinc-900 dark:text-zinc-100 border-2 border-zinc-400 dark:border-zinc-400 shadow-xs transition-all active:scale-97 cursor-pointer"
						>
							<X size={13} className="text-zinc-700 dark:text-zinc-300 shrink-0" />
							<span>Без 8-ок</span>
							<span className="text-[11px] font-normal opacity-80">(Отсутствуют)</span>
						</button>
					)}

					<button
						type="button"
						data-testid="gost-preset-prohygiene"
						onClick={() => {
							if (typeof window !== "undefined") {
								window.dispatchEvent(
									new CustomEvent("dente-apply-prohygiene-protocol", {
										detail: { immediate: true },
									}),
								);
							}
							showToast("Протокол профгигиены (A16.07.051) сформирован", "success");
						}}
						disabled={false}
						title="Сформировать протокол профессиональной гигиены полости рта (A16.07.051)"
						className="inline-flex items-center gap-1.5 px-2.5 py-1 h-7 rounded-lg text-xs font-bold bg-sky-500/15 hover:bg-sky-500/25 active:bg-sky-500/35 text-sky-900 dark:text-sky-100 border-2 border-sky-500 dark:border-sky-400 shadow-xs transition-all active:scale-97 cursor-pointer"
					>
						<Sparkles size={13} className="text-sky-700 dark:text-sky-300 shrink-0" />
						<span>Профгигиена</span>
						<span className="text-[11px] font-normal opacity-80">(Выполнена)</span>
					</button>
				</div>
			</div>

			{/* On-Screen Touch Keypad for Fast Status & Navigation Entry on Tablets & Mobile (rendered strictly when tooth is selected, saving 36px height) */}
			{selectedTeeth.length > 0 && (
				<div className="gost-touch-keypad w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 sm:p-3 bg-[var(--odontogram-surface)] border border-[var(--odontogram-border-subtle)] rounded-xl animate-in fade-in duration-150">
					<div className="flex items-center gap-2">
						<span className="text-xs font-bold text-[var(--odontogram-ink-muted)]">
							{`Выбрано: ${selectedTeeth.length === 1 ? `Зуб ${selectedTeeth[0]}` : `${selectedTeeth.length} зубов`}`}
						</span>
					</div>

					<div className="flex flex-wrap items-center gap-1.5">
						{Object.entries(GOST_TOOTH_STATES).map(([stateKey, meta]) => (
							<button
								key={stateKey}
								type="button"
								data-testid={`gost-keypad-btn-${stateKey}`}
								onClick={() => {
									if (onQuickStateChange) {
										onQuickStateChange(selectedTeeth, stateKey as ToothState, undefined);
									}
								}}
								disabled={false}
								title={`Установить: ${meta.nameRu} (${meta.abbr})`}
								className={`gost-keypad-btn ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder} hover:shadow-sm cursor-pointer`}
							>
								<span className="font-black text-sm">{meta.abbr}</span>
								<span className="hidden md:inline text-xs font-medium">{meta.nameRu}</span>
							</button>
						))}

						{/* Fast Navigation Buttons on Touchscreens */}
						<div className="flex items-center gap-1 ml-auto">
							<button
								type="button"
								data-testid="gost-keypad-nav-prev"
								onClick={() => {
									const firstSelected = selectedTeeth[0] ?? (topList[0] || 18);
									const prevTooth = getNextFocusedTooth(firstSelected, "left", pediatricMode);
									const el = document.querySelector<HTMLButtonElement>(`[data-tooth-id="${prevTooth}"]`);
									el?.focus();
									el?.click();
								}}
								title="Предыдущий зуб (влево)"
								className="gost-keypad-btn px-2 text-xs flex items-center justify-center cursor-pointer"
							>
								<ChevronLeft size={13} aria-hidden="true" />
							</button>
							<button
								type="button"
								data-testid="gost-keypad-nav-next"
								onClick={() => {
									const firstSelected = selectedTeeth[0] ?? (topList[0] || 18);
									const nextTooth = getNextFocusedTooth(firstSelected, "right", pediatricMode);
									const el = document.querySelector<HTMLButtonElement>(`[data-tooth-id="${nextTooth}"]`);
									el?.focus();
									el?.click();
								}}
								title="Следующий зуб (вправо)"
								className="gost-keypad-btn px-2 text-xs flex items-center justify-center cursor-pointer"
							>
								<ChevronRight size={13} aria-hidden="true" />
							</button>
						</div>
					</div>
				</div>
			)}

			{!hideLegend && (
				<div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-[var(--odontogram-border-subtle)] text-xs font-semibold">
					<span className="font-semibold text-[var(--odontogram-ink-muted)] mr-1">
						Обозначения:
					</span>
					{Object.entries(GOST_TOOTH_STATES).map(
						([stateKey, meta]) => (
							<span
								key={stateKey}
								className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--odontogram-surface)] border border-[var(--odontogram-border-subtle)]"
							>
								<strong
									className={`font-black ${meta.colorClass}`}
								>
									{meta.abbr}
								</strong>
								<span className="text-[var(--odontogram-ink)] font-medium">
									{meta.nameRu}
								</span>
							</span>
						)
					)}
				</div>
			)}
		</div>
	);
}, areClassicGostOdontogramPropsEqual);
ClassicGostOdontogram.displayName = "ClassicGostOdontogram";
