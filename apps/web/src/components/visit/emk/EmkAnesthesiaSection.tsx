import {
	AlertTriangle,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Minus,
	Plus,
	ShieldCheck,
	Star,
	Syringe,
} from "lucide-react";
import React from "react";
import {
	calculateAnesthesiaCarpulesSafety,
	evaluateAnesthesiaRisk,
} from "../../../lib/clinicalProtocols043";
import { useDoctorPreferencesStore } from "../../../store/doctorPreferencesStore";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { showToast } from "../../GlobalToast";
import { appendClinicalText, type EmkSectionProps } from "./EmkTypes";

export function EmkAnesthesiaSection({
	visitNoteForm,
	updateVisitNoteField,
	isLocked: _isLocked,
	patientAge,
	patientGender: _patientGender,
}: EmkSectionProps) {
	const favoriteAnes = useDoctorPreferencesStore(
		(s) => s.preferences.favoriteAnesthetic,
	);

	// Clinical pharmacology mapping:
	// - Articaine 1:100k (Forte) -> "ultracain_ds_forte"
	// - Articaine 1:200k (Standard/sparing) -> "ultracain_ds"
	// - Mepivacaine 3% (Plain, zero adrenaline) -> "scandonest_3"
	const resolveDrugKeyFromPreference = React.useCallback(
		(key: string): string => {
			if (key === "scandonest_mepivacaine_3") return "scandonest_3";
			if (key === "articaine_200k") return "ultracain_ds";
			return "ultracain_ds_forte";
		},
		[],
	);

	const [selectedAnesDrugKey, setSelectedAnesDrugKey] = React.useState<string | null>(
		() => resolveDrugKeyFromPreference(favoriteAnes),
	);
	const [carpuleCount, setCarpuleCount] = React.useState<number>(1);
	const [patientWeightKg, setPatientWeightKg] = React.useState<number>(
		patientAge && patientAge < 14 ? 30 : 70,
	);

	// Update selected drug key when doctor preference updates
	React.useEffect(() => {
		setSelectedAnesDrugKey(resolveDrugKeyFromPreference(favoriteAnes));
	}, [favoriteAnes, resolveDrugKeyFromPreference]);

	const anesthesiaSafety = React.useMemo(() => {
		return calculateAnesthesiaCarpulesSafety({
			drugKey: selectedAnesDrugKey || undefined,
			carpulesCount: carpuleCount,
			patientWeightKg,
			patientAgeYears: patientAge ?? null,
		});
	}, [selectedAnesDrugKey, carpuleCount, patientWeightKg, patientAge]);

	const anamnesis = visitNoteForm?.anamnesis || "";
	const anesthesiaRisk = React.useMemo(() => {
		return evaluateAnesthesiaRisk(anamnesis, selectedAnesDrugKey || undefined);
	}, [anamnesis, selectedAnesDrugKey]);

	const [showDetailedMrd, setShowDetailedMrd] = React.useState<boolean>(false);

	const handleApplyPreset = (
		name: string,
		snippet: string,
		code804n = "A11.07.010",
		priceRub = 950,
	) => {
		const curr = visitNoteForm?.treatmentPlan || "";
		updateVisitNoteField(
			"treatmentPlan",
			appendClinicalText(curr, snippet, "\n\n"),
		);
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: {
						service: {
							id: `anes-${Date.now()}`,
							title: `Анестезия инфильтрационная (${name})`,
							code804n,
							priceRub,
						},
					},
				}),
			);
		}
		showToast(`Анестезия (${name}) внесена в протокол и счёт`, "success", 2500);
	};

	const handleQuickAntishockWriteoff = React.useCallback(async () => {
		try {
			fetch("/api/inventory/quick-writeoff-emergency-antishock", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					visitId: null,
					scenarioId: "anaphylactic_shock",
					notes: "Экстренное списание укладки «Антишок» из ЭМК",
				}),
			}).catch(() => {});
			showToast("🚨 Укладка «Антишок» списана (мягкий овердрафт). Протокол открыт.", "warning", 4500);
		} catch {
			showToast("🚨 Экстренная укладка «Антишок» списана", "info", 3000);
		}
		useUiSurfaceStore.getState().openPrimaryModal("emergency_rescue");
	}, []);

	const isUltracainDsFavorite = favoriteAnes === "articaine_200k";
	const isUltracainForteFavorite = favoriteAnes === "articaine_100k";
	const isScandonestFavorite = favoriteAnes === "scandonest_mepivacaine_3";

	return (
		<div className="flex flex-col gap-2.5 mt-1 min-w-0 max-w-full">
			{/* Быстрый протокол анестезии (пресеты) — чистый разделитель без двойных рамок (Анти-Матрёшка) */}
			<div className="flex items-center justify-between gap-2 flex-wrap pt-3 border-t border-[var(--line)] bg-transparent min-w-0">
				<div
					className="flex items-center gap-2 flex-wrap min-w-0"
					style={{ gap: "8px" }}
				>
					<span
						className="text-[11px] font-extrabold text-[var(--muted)] flex items-center gap-1 shrink-0"
						style={{ gap: "5px" }}
					>
						<Syringe
							size={13}
							className="text-[var(--teal,var(--brand-primary))]"
						/>
						<span>Анестезия:</span>
					</span>

					{/* 1. Ультракаин Д-С 1:200 000 (щадящий) */}
					<button
						type="button"
						onClick={() => {
							setSelectedAnesDrugKey("ultracain_ds");
							handleApplyPreset(
								"Ультракаин Д-С 1:200k, 1 карп.",
								"Анестезия: инфильтрационная Sol. Ultracaini D-S 1:200 000 — 1.7 мл (1 карпула). Аспирационная проба отрицательная. Обезболивание глубокое.",
								"A11.07.010",
								950,
							);
						}}
						style={{ padding: "6px 12px", gap: "6px" }}
						className={`dente-filter-chip min-h-[34px] h-8.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0 ${
							isUltracainDsFavorite
								? "bg-[var(--paper)] border-2 border-teal-600 text-[var(--ink)] font-bold"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)]"
						}`}
						data-testid="btn-anes-ultracain-ds"
						title="Внести стандартную анестезию 1:200 000 в протокол"
					>
						<Syringe size={13} className="text-teal-600 shrink-0" />
						<span>Ультракаин Д-С 1:200k (1 карп.)</span>
						{isUltracainDsFavorite && (
							<span
								className="text-[10px] text-teal-700 dark:text-teal-300 font-bold flex items-center gap-1"
								style={{ gap: "3px" }}
							>
								<Star size={10} className="fill-teal-500 text-teal-600" />
								<span>Выбор врача</span>
							</span>
						)}
					</button>

					{/* 2. Ультракаин Форте 1:100 000 (глубокий) */}
					<button
						type="button"
						onClick={() => {
							setSelectedAnesDrugKey("ultracain_ds_forte");
							handleApplyPreset(
								"Ультракаин Форте 1:100k, 1 карп.",
								"Анестезия: проводниковая/инфильтрационная Sol. Ultracaini D-S Forte 1:100 000 — 1.7 мл (1 карпула). Аспирационная проба отрицательная. Обезболивание глубокое.",
								"A11.07.011",
								1100,
							);
						}}
						style={{ padding: "6px 12px", gap: "6px" }}
						className={`dente-filter-chip min-h-[34px] h-8.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0 ${
							isUltracainForteFavorite
								? "bg-[var(--paper)] border-2 border-teal-600 text-[var(--ink)] font-bold"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)]"
						}`}
						data-testid="btn-anes-ultracain-ds-forte"
						title="Внести глубокую анестезию 1:100 000 в протокол"
					>
						<Syringe size={13} className="text-teal-600 shrink-0" />
						<span>Ультракаин Форте 1:100k (1 карп.)</span>
						{isUltracainForteFavorite && (
							<span
								className="text-[10px] text-teal-700 dark:text-teal-300 font-bold flex items-center gap-1"
								style={{ gap: "3px" }}
							>
								<Star size={10} className="fill-teal-500 text-teal-600" />
								<span>Выбор врача</span>
							</span>
						)}
					</button>

					{/* 3. Скандонест 3% (без адреналина) */}
					<button
						type="button"
						onClick={() => {
							setSelectedAnesDrugKey("scandonest_3");
							handleApplyPreset(
								"Скандонест 3% без адреналина, 1 карп.",
								"Анестезия: инфильтрационная Sol. Scandonest 3% (без адреналина) — 1.7 мл (1 карпула). Аспирационная проба отрицательная. Обезболивание достаточное.",
								"A11.07.010",
								1050,
							);
						}}
						style={{ padding: "6px 12px", gap: "6px" }}
						className={`dente-filter-chip min-h-[34px] h-8.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0 ${
							isScandonestFavorite
								? "bg-[var(--paper)] border-2 border-teal-600 text-[var(--ink)] font-bold"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)]"
						}`}
						data-testid="btn-anes-scandonest-3"
						title="Безадреналиновая анестезия для кардио-пациентов"
					>
						<Syringe size={13} className="text-teal-600 shrink-0" />
						<span>Скандонест 3% (без адреналина)</span>
						{isScandonestFavorite && (
							<span
								className="text-[10px] text-teal-700 dark:text-teal-300 font-bold flex items-center gap-1"
								style={{ gap: "3px" }}
							>
								<Star size={10} className="fill-teal-500 text-teal-600" />
								<span>Выбор врача</span>
							</span>
						)}
					</button>

					{/* 4. Без анестезии (0 ₽, фиксация лечения без анестезии) */}
					<button
						type="button"
						onClick={() => {
							setSelectedAnesDrugKey("");
							const currentPlan = visitNoteForm?.treatmentPlan || "";
							const noAnesNote = "Анестезия: не применялась (лечение без анестезии по согласию пациента).";
							if (updateVisitNoteField) {
								updateVisitNoteField(
									"treatmentPlan",
									appendClinicalText(currentPlan, noAnesNote, "\n\n"),
								);
							}
							showToast("Зафиксировано: лечение без анестезии", "info", 2500);
						}}
						style={{ padding: "6px 12px", gap: "6px" }}
						className="dente-filter-chip min-h-[34px] h-8.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--line-strong)] transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0"
						data-testid="btn-anes-none"
						title="Лечение без анестезии (0 ₽, без внесения услуги в чек)"
					>
						<CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
						<span>Без анестезии</span>
					</button>

					{/* 5. Экстренная помощь: 🚨 АНТИШОК (Приказ 786н / Мандаты 8e, 8n) */}
					<button
						type="button"
						onClick={handleQuickAntishockWriteoff}
						style={{ padding: "6px 12px", gap: "6px" }}
						className="dente-filter-chip min-h-[34px] h-8.5 px-3 py-1.5 rounded-lg text-xs font-black border border-rose-500/60 bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0 active:scale-98"
						data-testid="btn-anes-antishock-emergency"
						title="Экстренная аптечка «Антишок» (Приказ 786н): мгновенное списание реанимационного набора и открытие протокола неотложной помощи"
					>
						<span className="text-xs">🚨</span>
						<span>АНТИШОК</span>
					</button>

					{/* Кнопка раскрытия детального фармакологического расчета */}
					<button
						type="button"
						onClick={() => setShowDetailedMrd((prev) => !prev)}
						style={{ padding: "6px 12px", gap: "5px" }}
						className="dente-filter-chip min-h-[34px] h-8.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] transition-all cursor-pointer inline-flex items-center gap-1 shrink-0 ml-auto"
						title="Переключить детальный расчёт дозы по формулам Кларка/Янга"
						data-testid="btn-toggle-mrd-calculator"
					>
						<span>МРД / Вес</span>
						{showDetailedMrd ? (
							<ChevronUp size={13} />
						) : (
							<ChevronDown size={13} />
						)}
					</button>
				</div>
			</div>

			{/* Интерактивный калькулятор карпул и предельной безопасной дозы по весу (МРД) (свёрнут по умолчанию) */}
			{(showDetailedMrd ||
				anesthesiaSafety.isOverdose ||
				anesthesiaRisk.isWarningTriggered) && (
				<>
					<div
						className="flex items-center justify-between gap-2 flex-wrap p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs min-w-0"
						style={{ padding: "10px 14px", gap: "10px" }}
					>
						<div
							className="flex items-center gap-2 flex-wrap min-w-0"
							style={{ gap: "10px" }}
						>
							{/* Выбор веса */}
							<div
								className="flex items-center gap-1.5 shrink-0"
								style={{ gap: "6px" }}
							>
								<span className="text-[11px] font-bold text-[var(--muted)]">
									Вес:
								</span>
								{[15, 30, 50, 70, 85].map((w) => (
									<button
										key={w}
										type="button"
										onClick={() => setPatientWeightKg(w)}
										style={{ padding: "4px 10px" }}
										className={`min-h-[28px] px-2.5 py-1 rounded-md text-[11.5px] font-semibold border transition-all cursor-pointer ${
											patientWeightKg === w
												? "bg-teal-600 text-white border-teal-600 font-bold"
												: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-teal-600"
										}`}
									>
										{w} кг
									</button>
								))}
							</div>

							{/* Карпулы */}
							<div
								className="flex items-center gap-1.5 shrink-0 ml-1"
								style={{ gap: "6px" }}
							>
								<span className="text-[11px] font-bold text-[var(--muted)]">
									Карпул:
								</span>
								<button
									type="button"
									onClick={() =>
										setCarpuleCount((prev) => Math.max(0.5, prev - 0.5))
									}
									style={{ width: "28px", height: "28px" }}
									className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-md bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[var(--ink)] hover:border-teal-600 cursor-pointer"
									title="Уменьшить на 0.5 карпулы"
								>
									<Minus size={12} />
								</button>
								<span className="font-mono font-bold px-2 text-xs">
									{carpuleCount}
								</span>
								<button
									type="button"
									onClick={() => setCarpuleCount((prev) => prev + 0.5)}
									style={{ width: "28px", height: "28px" }}
									className="w-7 h-7 min-w-[28px] min-h-[28px] rounded-md bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[var(--ink)] hover:border-teal-600 cursor-pointer"
									title="Увеличить на 0.5 карпулы"
								>
									<Plus size={12} />
								</button>
							</div>

							{/* Индикатор безопасности МРД */}
							<span
								style={{ padding: "4px 10px", gap: "6px" }}
								className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border inline-flex items-center gap-1 shrink-0 min-h-[28px] ${
									anesthesiaSafety.isOverdose
										? "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/40"
										: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/40"
								}`}
								title={anesthesiaSafety.formattedSafetyNote}
							>
								{anesthesiaSafety.isOverdose ? (
									<>
										<AlertTriangle
											size={13}
											className="shrink-0 text-rose-500"
										/>
										<span>
											Передозировка! (max {anesthesiaSafety.maxSafeCarpules}{" "}
											карп.)
										</span>
									</>
								) : (
									<>
										<ShieldCheck
											size={13}
											className="shrink-0 text-emerald-500"
										/>
										<span>
											Безопасно ({carpuleCount} из max{" "}
											{anesthesiaSafety.maxSafeCarpules} карп. ·{" "}
											{anesthesiaSafety.safetyPercentage}%)
										</span>
									</>
								)}
							</span>
						</div>

						<button
							type="button"
							onClick={() =>
								handleApplyPreset(
									`${anesthesiaSafety.drugName} (${carpuleCount} карп.)`,
									anesthesiaSafety.formattedTreatmentSnippet,
								)
							}
							style={{ padding: "6px 14px", gap: "6px" }}
							className="dente-filter-chip min-h-[34px] h-8.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white border-teal-600 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0 ml-auto"
							title="Внести индивидуальный расчет анестезии в протокол"
						>
							<Syringe size={13} className="shrink-0" />
							<span>Внести в протокол</span>
						</button>
					</div>

					{/* Предупреждение о токсической передозировке (МРД превышена) */}
					{anesthesiaSafety.isOverdose && (
						<div
							className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 flex items-start justify-between gap-2.5 text-xs text-rose-950 dark:text-rose-200 min-w-0 max-w-full"
							role="alert"
							data-testid="anesthesia-overdose-toxicity-alert"
						>
							<div className="flex items-start gap-2 min-w-0 flex-1">
								<AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
								<div className="space-y-1 min-w-0 flex-1">
									<strong className="font-extrabold block text-rose-950 dark:text-rose-100 break-words">
										Опасность токсической передозировки: Превышена МРД (
										{carpuleCount} карп. &gt; max{" "}
										{anesthesiaSafety.maxSafeCarpules} карп.)
									</strong>
									<p className="m-0 leading-relaxed font-medium break-words">
										{anesthesiaSafety.formattedSafetyNote} Для пациента весом{" "}
										{patientWeightKg} кг максимальная безопасная доза составляет{" "}
										{anesthesiaSafety.maxSafeCarpules} карп.
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() =>
									setCarpuleCount(anesthesiaSafety.maxSafeCarpules)
								}
								data-testid="btn-anesthesia-clamp-safe-dose"
								className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-200 dark:bg-rose-800 text-rose-950 dark:text-rose-100 hover:bg-rose-300 dark:hover:bg-rose-700 shrink-0 cursor-pointer min-h-[30px]"
								title="Снизить дозу до максимально безопасной"
							>
								Снизить до {anesthesiaSafety.maxSafeCarpules} карп.
							</button>
						</div>
					)}

					{/* Предупреждение о кардиоваскулярном риске */}
					{anesthesiaRisk.isWarningTriggered && (
						<div
							className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 flex items-start justify-between gap-2.5 text-xs text-amber-950 dark:text-amber-200 min-w-0 max-w-full"
							role="alert"
						>
							<div className="flex items-start gap-2 min-w-0 flex-1">
								<AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
								<div className="space-y-1 min-w-0 flex-1">
									<strong className="font-extrabold block text-amber-950 dark:text-amber-100 break-words">
										Внимание: Группа кардиоваскулярного риска (Гипертония / ССЗ)
									</strong>
									<p className="m-0 leading-relaxed font-medium break-words">
										{anesthesiaRisk.warningMessage}
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => setSelectedAnesDrugKey("scandonest_3")}
								className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-200 dark:bg-amber-800 text-amber-950 dark:text-amber-100 hover:bg-amber-300 shrink-0 cursor-pointer min-h-[30px]"
							>
								Выбрать Скандонест 3%
							</button>
						</div>
					)}
				</>
			)}
		</div>
	);
}
