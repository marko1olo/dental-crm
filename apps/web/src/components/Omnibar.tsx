import { AnimatePresence, motion } from "framer-motion";
import {
	Banknote,
	Calendar,
	Camera,
	CheckCircle2,
	FileText,
	MessageSquare,
	Search,
	Settings,
	Sparkles,
	Stethoscope,
	Users,
	X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAppStore } from "../store/appStore";
import { WorkspaceActionsSlot } from "./workspaceActions/WorkspaceActions";
import { workspaceActionsLabels } from "./workspaceActions/workspaceActionsLabels";

export function Omnibar() {
	const { isOmnibarOpen, setOmnibarOpen, setCurrentView } = useAppStore();
	const [query, setQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);

	const commands = [
		{
			id: "nav-shift",
			title: "Смена",
			icon: <Calendar />,
			category: "Навигация",
			action: () => setCurrentView("shift"),
		},
		{
			id: "nav-schedule",
			title: "Расписание",
			icon: <Calendar />,
			category: "Навигация",
			action: () => setCurrentView("schedule"),
		},
		{
			id: "nav-patients",
			title: "Пациенты",
			icon: <Users />,
			category: "Навигация",
			action: () => setCurrentView("patients"),
		},
		{
			id: "nav-imaging",
			title: "Снимки",
			icon: <Camera />,
			category: "Навигация",
			action: () => setCurrentView("imaging"),
		},
		{
			id: "nav-visit",
			title: "Прием",
			icon: <Stethoscope />,
			category: "Навигация",
			action: () => setCurrentView("visit"),
		},
		{
			id: "nav-documents",
			title: "Документы",
			icon: <FileText />,
			category: "Навигация",
			action: () => setCurrentView("documents"),
		},
		{
			id: "nav-finance",
			title: "Финансы",
			icon: <Banknote />,
			category: "Навигация",
			action: () => setCurrentView("finance"),
		},
		{
			id: "nav-communications",
			title: "Связь",
			icon: <MessageSquare />,
			category: "Навигация",
			action: () => setCurrentView("communications"),
		},
		{
			id: "nav-settings",
			title: "Настройки",
			icon: <Settings />,
			category: "Навигация",
			action: () => setCurrentView("settings"),
		},

		{
			id: "action-new-patient",
			title: "Создать карточку пациента",
			icon: <Users />,
			category: "Быстрые действия",
			action: () => {
				setCurrentView("patients");
			},
		},
		{
			id: "action-new-appointment",
			title: "Новая запись на прием",
			icon: <Calendar />,
			category: "Быстрые действия",
			action: () => {
				setCurrentView("schedule");
			},
		},
		{
			id: "action-waitlist-quickfill",
			title: "Лист ожидания и быстрая запись (Автозаполнение)",
			icon: <Calendar />,
			category: "Быстрые действия",
			action: () => {
				setCurrentView("schedule");
			},
		},
		{
			id: "action-start-shift",
			title: "Начать смену (Владелец)",
			icon: <CheckCircle2 />,
			category: "Быстрые действия",
			action: () => {
				setCurrentView("shift");
			},
		},
		{
			id: "action-copilot",
			title: "Клинический Copilot (ИИ-ассистент)",
			icon: <Sparkles className="text-[var(--teal)]" />,
			category: "Быстрые действия",
			action: () => {
				if (typeof window !== "undefined") {
					if (window.__denteCopilot) {
						window.__denteCopilot.open();
					} else {
						window.dispatchEvent(new CustomEvent("dente:toggle-copilot"));
					}
				}
			},
		},
	];

	const filteredCommands = (commands ?? []).filter(
		(cmd) =>
			(cmd?.title ?? "").toLowerCase().includes((query ?? "").toLowerCase()) ||
			(cmd?.category ?? "").toLowerCase().includes((query ?? "").toLowerCase()),
	);

	useEffect(() => {
		if (!isOmnibarOpen) {
			setQuery("");
			setSelectedIndex(0);
			return;
		}
		setTimeout(() => inputRef.current?.focus(), 50);

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setOmnibarOpen(false);
			} else if (e.key === "ArrowDown") {
				e.preventDefault();
				setSelectedIndex((prev) =>
					prev < (filteredCommands ?? []).length - 1 ? prev + 1 : prev,
				);
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
			} else if (e.key === "Enter") {
				e.preventDefault();
				if (filteredCommands?.[selectedIndex]) {
					filteredCommands[selectedIndex].action();
					setOmnibarOpen(false);
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOmnibarOpen, filteredCommands, selectedIndex, setOmnibarOpen]);

	useEffect(() => {
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setOmnibarOpen(!isOmnibarOpen);
			}
		};
		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => window.removeEventListener("keydown", handleGlobalKeyDown);
	}, [isOmnibarOpen, setOmnibarOpen]);

	/* Кнопка поиска живёт в слоте `search` группы действий рабочей области, в
     обычном потоке страницы, и НИЧЕГО не перекрывает. Раньше она портировалась
     в body своим `position: fixed` островом с z-index 9998; затем — в плавающий
     док, который пытался «уступать» контенту под собой и по геометрии не мог:
     именно эта кнопка была замерена сидящей на `<label>Email</label>` формы
     пациента при 1600x1100 (доля перекрытия 0.443 < порога 0.5, подъёма нет),
     и `document.elementFromPoint` в центре подписи возвращал её, а не поле.
     Обоснование и удаление механизма —
     `workspaceActions/workspaceActionsPlacement.ts`.

     Портал в body для раскрытого окна поиска обязателен и остаётся.
     Omnibar монтируется внутри <section class="workspace">, у которой задан
     backdrop-filter. ИСТОЧНИК, чтобы это больше не искали: `premium.css:147`
     перечисляет `.workspace` первым селектором правила, объявляющего на
     `premium.css:172` `backdrop-filter: var(--glass-blur) saturate(180%)`, где
     `--glass-blur: blur(12px)` (`premium.css:14/60/106` — по одному объявлению
     на тему). Браузер приводит это к `blur(12px) saturate(1.8)`, поэтому поиск
     по литералу «saturate(1.8)» в styles/*.css НИЧЕГО НЕ НАХОДИТ, хотя свойство
     реально применено. Проверено на живой странице: вычисленный
     `backdrop-filter` у `section.workspace` равен `blur(12px) saturate(1.8)` на
     390x844, 840x900 и 1600x1100 (`scratch/probe-corner-reserve.mjs`).
     Ненулевой backdrop-filter создаёт контейнерный блок для потомков с
     position: fixed, поэтому `fixed inset-0` растягивался по секции, а не по
     экрану.
     Замерено, scratch/probe-fixed-containing-block.mjs:
       окно 1600x1100 — секция ровно 1100 высотой, попадание в угол было
         правильным ПО СОВПАДЕНИЮ;
       окно 390x844 — секция 1637 высотой, элемент оказывался на y=1532,
         то есть ниже окна.
     Раскрытое окно поиска — модальный слой, а не сегмент группы действий,
     поэтому оно не переезжает в неё: у группы слой ниже модальных окон по
     шкале main.css. */
	return (
		<>
			{/* Кнопка не снимается с экрана, когда окно поиска открыто, и не
          выезжает анимацией. Она сегмент группы: исчезающий сегмент дёргал бы
          всю строку топбара, а выезд снизу был жестом плавающего угла, которого
          больше нет. Состояние читается с самой кнопки — `aria-expanded`
          подсвечивает её, пока окно открыто. */}
			<WorkspaceActionsSlot slot="search">
				<button
					type="button"
					onClick={() => setOmnibarOpen(!isOmnibarOpen)}
					aria-expanded={isOmnibarOpen}
					className="dnt-actions__control"
					title={workspaceActionsLabels.search.title}
				>
					<Search className="dnt-actions__control-icon" aria-hidden="true" />
					<span className="dnt-actions__control-text">
						<span className="dnt-actions__control-label">
							{workspaceActionsLabels.search.label}
						</span>
						<span className="dnt-actions__control-hint">
							{workspaceActionsLabels.search.hint}
						</span>
					</span>
				</button>
			</WorkspaceActionsSlot>
			{typeof document !== "undefined" &&
				createPortal(
					<AnimatePresence>
					{isOmnibarOpen && (
						<div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4 pointer-events-auto">
							{/* Backdrop */}
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.15 }}
								className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
								onClick={() => setOmnibarOpen(false)}
							/>

							{/* Omnibar Dialog */}
							<motion.div
								initial={{ opacity: 0, scale: 0.95, y: -10 }}
								animate={{ opacity: 1, scale: 1, y: 0 }}
								exit={{ opacity: 0, scale: 0.95, y: -10 }}
								transition={{ duration: 0.15, ease: "easeOut" }}
								role="dialog"
								aria-modal="true"
								aria-label="Быстрый поиск и команды"
								className="relative w-full max-w-2xl bg-[var(--paper)] shadow-2xl rounded-2xl overflow-hidden border border-[var(--line)] flex flex-col text-[var(--ink)]"
								style={{ maxHeight: "60vh" }}
							>
								{/* Header/Input */}
								<div className="flex items-center px-4 border-b border-[var(--line)]">
									<Search className="w-5 h-5 text-[var(--muted)] mr-3" />
									<input
										ref={inputRef}
										type="text"
										className="flex-1 h-14 bg-transparent border-none outline-none text-lg text-[var(--ink)] placeholder-[var(--muted)]"
										placeholder="Поиск по разделам или действиям..."
										value={query}
										onChange={(e) => {
											setQuery(e.target.value);
											setSelectedIndex(0);
										}}
									/>
									<button
										type="button"
										onClick={() => setOmnibarOpen(false)}
										className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-[var(--paper-soft)] rounded-lg transition-colors text-[var(--muted)] hover:text-[var(--ink)]"
										aria-label="Закрыть омнибар"
									>
										<X className="w-5 h-5" />
									</button>
								</div>

								{/* Results */}
								<div
									className="overflow-y-auto p-2"
									style={{ maxHeight: "calc(60vh - 56px)" }}
								>
									{(filteredCommands ?? []).length === 0 ? (
										<div className="p-8 text-center text-[var(--muted)]">
											Ничего не найдено
										</div>
									) : (
										<div className="flex flex-col gap-1">
											{(filteredCommands ?? []).map((cmd, idx) => {
												// Quick check if category changed to add a header
												const showCategory =
													idx === 0 ||
													filteredCommands[idx - 1]?.category !== cmd?.category;
												return (
													<React.Fragment key={cmd.id}>
														{showCategory && (
															<div className="px-3 pt-3 pb-1 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
																{cmd.category}
															</div>
														)}
														<button
															type="button"
															className={`w-full text-left flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl cursor-pointer transition-colors ${
																idx === selectedIndex
																	? "bg-[var(--teal-surface)] text-[var(--teal-dark)]"
																	: "text-[var(--ink)] hover:bg-[var(--paper-soft)]"
															}`}
															onClick={() => {
																cmd.action();
																setOmnibarOpen(false);
															}}
															onMouseEnter={() => setSelectedIndex(idx)}
														>
															<div
																className={`flex items-center justify-center w-8 h-8 rounded-lg ${idx === selectedIndex ? "bg-[var(--teal-soft)] text-[var(--teal-dark)]" : "bg-[var(--paper-soft)] text-[var(--muted)]"}`}
															>
																{React.cloneElement(
																	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
																	cmd.icon as React.ReactElement<any>,
																	{ size: 16 },
																)}
															</div>
															<span className="font-medium">{cmd.title}</span>

															{idx === selectedIndex && (
																<span className="ml-auto text-xs text-[var(--teal)] font-medium">
																	↵ Выбрать
																</span>
															)}
														</button>
													</React.Fragment>
												);
											})}
										</div>
									)}
								</div>

								{/* Footer */}
								<div className="bg-[var(--paper-soft)] px-4 py-2 border-t border-[var(--line)] flex items-center justify-between text-xs text-[var(--muted)]">
									<div className="flex items-center gap-4">
										<span className="flex items-center gap-1">
											<kbd className="font-sans px-1.5 py-0.5 bg-[var(--paper)] border border-[var(--line)] rounded text-[10px] font-semibold text-[var(--ink)] shadow-sm">
												↑
											</kbd>
											<kbd className="font-sans px-1.5 py-0.5 bg-[var(--paper)] border border-[var(--line)] rounded text-[10px] font-semibold text-[var(--ink)] shadow-sm">
												↓
											</kbd>
											<span>навигация</span>
										</span>
										<span className="flex items-center gap-1">
											<kbd className="font-sans px-1.5 py-0.5 bg-[var(--paper)] border border-[var(--line)] rounded text-[10px] font-semibold text-[var(--ink)] shadow-sm">
												↵
											</kbd>
											<span>выбрать</span>
										</span>
									</div>
									<div className="flex items-center gap-1">
										<span>DENTE OS</span>
									</div>
								</div>
							</motion.div>
						</div>
					)}
				</AnimatePresence>,
				document.body,
			)}
		</>
	);
}
