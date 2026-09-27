/**
 * apps/web/src/components/settings/doctor/DoctorAnesthesiaDefaultsSection.tsx
 *
 * Чистая, прикладная панель быстрых дефолтов анестезии и карпульных игл за 1 клик.
 * Заменяет устаревший академический калькулятор токсичности по массе тела (Анти-блоат мандат).
 *
 * Инварианты проекта THE HAMMER:
 * - Часть 5 Пункт 1: КАТЕГОРИЧЕСКИЙ ЗАПРЕТ НА НАУЧНЫЙ БЛОАТ (NO USELESS BLOAT).
 * - CRM != Reality Simulator. Никаких ползунков веса, симуляций и математики ради вида.
 * - Мандат 8b: строго <= 800 строк на ЛЮБОЙ файл.
 * - Мандат 8d: ноль мультяшных эмодзи.
 * - Мандат 8e: врачебная автономия (1 клик = мгновенное сохранение).
 */

import React, { useMemo, useState } from "react";
import {
	Check,
	ChevronDown,
	Copy,
	HeartPulse,
	ShieldCheck,
	Sparkles,
	Syringe,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import {
	ANESTHETIC_OPTIONS,
	DENTAL_NEEDLE_OPTIONS,
	useDoctorPreferencesStore,
	type AnestheticKey,
	type DentalNeedleOption,
	type DentalNeedleType,
} from "../../../store/doctorPreferencesStore";
import {
	resolveAnestheticName,
	resolveNeedleName,
} from "../protocolSnippetHelpers";

/** Топ-4 ключевых анестетика стоматологической практики РФ/СНГ */
const PRIMARY_ANESTHETIC_KEYS: readonly AnestheticKey[] = [
	"articaine_200k",
	"articaine_100k",
	"septanest_100k",
	"scandonest_mepivacaine_3",
];

export function DoctorAnesthesiaDefaultsSection() {
	const preferences = useDoctorPreferencesStore((s) => s.preferences);
	const updatePreferences = useDoctorPreferencesStore((s) => s.updatePreferences);

	const [showAllAnesthetics, setShowAllAnesthetics] = useState(false);

	const selectedAnestheticKey = preferences.favoriteAnesthetic || "articaine_200k";
	const selectedNeedleKey = preferences.favoriteNeedleType || "septoject_30g_short";

	const handleSelectAnesthetic = (key: AnestheticKey) => {
		updatePreferences({ favoriteAnesthetic: key });
		const found = ANESTHETIC_OPTIONS.find((a) => a.key === key || a.id === key);
		showToast(`Анестетик по умолчанию: «${found?.name || key}»`, "success");
	};

	const handleSelectNeedle = (key: DentalNeedleType) => {
		updatePreferences({ favoriteNeedleType: key });
		const found = DENTAL_NEEDLE_OPTIONS.find((n) => n.key === key || n.id === key);
		showToast(`Карпульная игла по умолчанию: «${found?.title || key}»`, "success");
	};

	// Читаемые имена для живого сниппета Формы 043/у
	const currentAnestheticName = useMemo(() => {
		return resolveAnestheticName(selectedAnestheticKey);
	}, [selectedAnestheticKey]);

	const currentNeedleName = useMemo(() => {
		return resolveNeedleName(selectedNeedleKey);
	}, [selectedNeedleKey]);

	// Готовый клинический текст для Формы 043/у
	const liveAnesthesiaNote = useMemo(() => {
		const isCardio = selectedAnestheticKey === "scandonest_mepivacaine_3";
		const epiNote = isCardio
			? "без вазоконстриктора (соматически отягощенный статус / кардиопрофиль)"
			: "аспирационная проба (-)";

		return `Местная инфильтрационная/проводниковая анестезия: ${currentAnestheticName}, карпула 1.7 мл. Игла карпульная: ${currentNeedleName}. ${epiNote}. Обезболивание глубокое, наступило через 2–3 мин. Осложнений нет.`;
	}, [currentAnestheticName, currentNeedleName, selectedAnestheticKey]);

	const handleCopyLiveSnippet = () => {
		navigator.clipboard.writeText(liveAnesthesiaNote);
		showToast("Протокол анестезии скопирован в буфер для карты 043/у", "success");
	};

	// Разделение анестетиков на топ-4 и расширенный список
	const primaryAnesthetics = useMemo(() => {
		return PRIMARY_ANESTHETIC_KEYS.map((key) => {
			return (
				ANESTHETIC_OPTIONS.find((a) => a.key === key || a.id === key) || {
					id: key,
					key,
					name: key,
					title: key,
					manufacturer: "Стандарт",
					description: "",
					popularityRank: 1,
					isFavoriteDefault: false,
					badge: key,
				}
			);
		});
	}, []);

	const secondaryAnesthetics = useMemo(() => {
		return ANESTHETIC_OPTIONS.filter(
			(a) => !PRIMARY_ANESTHETIC_KEYS.includes(a.key as AnestheticKey),
		);
	}, []);

	return (
		<div
			className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-5"
			data-testid="doctor-anesthesia-defaults-section"
		>
			{/* Header */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
				<div className="flex items-center gap-2.5">
					<div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
						<Syringe size={18} />
					</div>
					<div>
						<h4 className="font-extrabold text-sm sm:text-base text-[var(--ink)] m-0">
							Быстрые дефолты анестезии и карпульных игл
						</h4>
						<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
							1-клик калибровка рабочего анестетика и типа игл. Автоматически подставляются в протокол 043/у.
						</p>
					</div>
				</div>

				<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30">
					<ShieldCheck size={13} className="text-teal-600 dark:text-teal-400" />
					1 клик = сохранено
				</span>
			</div>

			{/* 1. Выбор рабочего анестетика */}
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
						<Syringe size={14} className="text-teal-600" />
						<span>Основной рабочий анестетик (препарат выбора):</span>
					</label>
					<span className="text-[11px] text-[var(--muted)]">
						Подставляется при создании протокола в 1 клик
					</span>
				</div>

				{/* Главные 4 анестетика */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
					{primaryAnesthetics.map((drug) => {
						const isSelected = selectedAnestheticKey === drug.key;
						const isCardio = drug.key === "scandonest_mepivacaine_3";

						return (
							<button
								key={drug.key}
								type="button"
								onClick={() => handleSelectAnesthetic(drug.key as AnestheticKey)}
								className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-2 min-h-[96px] ${
									isSelected
										? "bg-[var(--paper)] border-teal-600 shadow-xs ring-2 ring-teal-500/40"
										: "bg-[var(--paper)] border-[var(--line)] hover:border-teal-500/60"
								}`}
								data-testid={`anesthetic-option-${drug.key}`}
							>
								<div className="flex items-start justify-between gap-1.5 w-full">
									<div className="min-w-0">
										<div className="flex items-center gap-1.5 flex-wrap">
											{isCardio ? (
												<span className="w-4 h-4 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
													<HeartPulse size={11} />
												</span>
											) : null}
											<span className="text-xs font-bold text-[var(--ink)] leading-snug">
												{drug.name}
											</span>
										</div>
										<span className="text-[10px] text-[var(--muted)] block mt-0.5">
											{drug.manufacturer}
										</span>
									</div>

									{isSelected ? (
										<span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
											<Check size={12} className="stroke-[3]" />
										</span>
									) : (
										<span className="w-5 h-5 rounded-full border border-[var(--line)] shrink-0" />
									)}
								</div>

								<p className="text-[11px] text-[var(--muted)] m-0 line-clamp-2 leading-relaxed">
									{drug.description}
								</p>

								<div className="flex items-center justify-between gap-1 pt-1.5 border-t border-[var(--line)]/50 text-[10px]">
									<span
										className={`font-semibold ${
											isCardio
												? "text-rose-600 dark:text-rose-400 font-bold"
												: "text-teal-700 dark:text-teal-300"
										}`}
									>
										{drug.badge}
									</span>
									{isSelected && (
										<span className="font-bold text-teal-700 dark:text-teal-300 bg-teal-500/10 px-1.5 py-0.2 rounded">
											Активен
										</span>
									)}
								</div>
							</button>
						);
					})}
				</div>

				{/* Дополнительные анестетики каталога РФ/СНГ (раскрывающийся список) */}
				{secondaryAnesthetics.length > 0 && (
					<div className="pt-1">
						<button
							type="button"
							onClick={() => setShowAllAnesthetics((prev) => !prev)}
							className="h-8 min-h-[32px] sm:h-[34px] px-3.5 rounded-lg text-xs font-semibold text-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] hover:border-teal-500/50 shadow-2xs transition-all inline-flex items-center gap-2 cursor-pointer select-none"
							data-testid="toggle-secondary-anesthetics-btn"
							title={showAllAnesthetics ? "Скрыть дополнительные препараты" : "Показать полный реестр анестетиков РФ/СНГ"}
						>
							<ChevronDown
								size={14}
								className={`text-teal-600 dark:text-teal-400 transition-transform duration-200 shrink-0 ${
									showAllAnesthetics ? "rotate-180" : ""
								}`}
							/>
							<span>
								{showAllAnesthetics
									? "Скрыть редкие анестетики"
									: `Показать другие анестетики каталога (${secondaryAnesthetics.length})`}
							</span>
						</button>

						{showAllAnesthetics && (
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2 pt-2 border-t border-[var(--line)]">
								{secondaryAnesthetics.map((drug) => {
									const isSelected = selectedAnestheticKey === drug.key;
									return (
										<button
											key={drug.key}
											type="button"
											onClick={() => handleSelectAnesthetic(drug.key as AnestheticKey)}
											className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-1.5 min-h-[72px] ${
												isSelected
													? "bg-[var(--paper)] border-teal-600 ring-2 ring-teal-500/40"
													: "bg-[var(--paper)] border-[var(--line)] hover:border-teal-500/60"
											}`}
										>
											<div className="flex items-start justify-between gap-1 w-full">
												<div>
													<span className="text-xs font-bold text-[var(--ink)] block">
														{drug.name}
													</span>
													<span className="text-[10px] text-[var(--muted)] block">
														{drug.manufacturer}
													</span>
												</div>
												{isSelected && (
													<span className="w-4 h-4 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
														<Check size={10} className="stroke-[3]" />
													</span>
												)}
											</div>
											<span className="text-[10px] text-[var(--muted)] line-clamp-1">
												{drug.description}
											</span>
										</button>
									);
								})}
							</div>
						)}
					</div>
				)}
			</div>

			{/* 2. Выбор любимого типа карпульных игл */}
			<div className="space-y-3 pt-2 border-t border-[var(--line)]">
				<div className="flex items-center justify-between">
					<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
						<Syringe size={14} className="text-teal-600" />
						<span>Любимый тип карпульных игл:</span>
					</label>
					<span className="text-[11px] text-[var(--muted)]">
						Автоматически списывается со склада в приёме
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
					{DENTAL_NEEDLE_OPTIONS.map((needle: DentalNeedleOption) => {
						const isSelected = selectedNeedleKey === needle.key;

						return (
							<button
								key={needle.key}
								type="button"
								onClick={() => handleSelectNeedle(needle.key)}
								className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-2 min-h-[96px] ${
									isSelected
										? "bg-[var(--paper)] border-teal-600 shadow-xs ring-2 ring-teal-500/40"
										: "bg-[var(--paper)] border-[var(--line)] hover:border-teal-500/60"
								}`}
								data-testid={`needle-option-${needle.key}`}
							>
								<div className="flex items-start justify-between gap-1.5 w-full">
									<div className="min-w-0">
										<span className="text-xs font-bold text-[var(--ink)] leading-snug block">
											{needle.title}
										</span>
										<span className="text-[10px] text-[var(--muted)] block mt-0.5">
											{needle.manufacturer}
										</span>
									</div>

									{isSelected ? (
										<span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
											<Check size={12} className="stroke-[3]" />
										</span>
									) : (
										<span className="w-5 h-5 rounded-full border border-[var(--line)] shrink-0" />
									)}
								</div>

								<p className="text-[11px] text-[var(--muted)] m-0 line-clamp-2 leading-relaxed">
									{needle.description}
								</p>

								<div className="flex items-center justify-between gap-1 pt-1.5 border-t border-[var(--line)]/50 text-[10px]">
									<span className="font-mono font-bold text-teal-700 dark:text-teal-300">
										{needle.gauge} • {needle.length}
									</span>
									<span className="font-medium text-[var(--muted)]">
										{needle.badge}
									</span>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* 3. Живой протокол анестезии для Формы 043/у */}
			<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-teal-500/30 space-y-2">
				<div className="flex items-center justify-between gap-2">
					<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
						<Sparkles size={14} className="text-teal-600" />
						<span>Фрагмент протокола анестезии для дневника 043/у (готовый текст)</span>
					</span>
					<button
						type="button"
						onClick={handleCopyLiveSnippet}
						className="text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline inline-flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
						title="Скопировать готовый текст для амбулаторной карты"
					>
						<Copy size={13} />
						<span>Копировать в ЕМК</span>
					</button>
				</div>
				<p className="text-xs text-[var(--ink)] m-0 leading-relaxed font-mono p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] select-all">
					{liveAnesthesiaNote}
				</p>
			</div>

			{/* 4. Справочник предельной токсичности и лимитов карпул (раскрывающийся аккордеон) */}
			<details className="group rounded-xl border border-[var(--line)] bg-[var(--paper)] overflow-hidden transition-all" data-testid="anesthesia-toxicity-reference">
				<summary className="p-3 text-xs font-bold text-[var(--ink)] cursor-pointer select-none flex items-center justify-between hover:bg-[var(--paper-soft)]">
					<div className="flex items-center gap-2">
						<HeartPulse size={15} className="text-rose-500" />
						<span>Справочник токсичности и лимитов карпул (Мандат 8k: справочная памятка)</span>
					</div>
					<span className="text-[11px] text-[var(--muted)] group-open:rotate-180 transition-transform">
						▼
					</span>
				</summary>
				<div className="p-3.5 pt-0 border-t border-[var(--line)] text-xs text-[var(--muted)] space-y-3">
					<p className="m-0 text-[11px] leading-relaxed">
						Расчёт безопасных пределов по массе тела взрослого пациента (клинические рекомендации Стоматологической Ассоциации России СтАР):
					</p>
					<div className="overflow-x-auto">
						<table className="w-full text-left text-xs border-collapse">
							<thead>
								<tr className="border-b border-[var(--line)] text-[var(--ink)] font-semibold">
									<th className="py-1.5 pr-2">Препарат</th>
									<th className="py-1.5 px-2">Концентрация</th>
									<th className="py-1.5 px-2">Макс. доза</th>
									<th className="py-1.5 px-2">50 кг</th>
									<th className="py-1.5 px-2">70 кг</th>
									<th className="py-1.5 pl-2">Кардио-лимит</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--line)]/50 text-[11px]">
								<tr>
									<td className="py-1.5 pr-2 font-bold text-[var(--ink)]">Артикаин (Убистезин/Септанест)</td>
									<td className="py-1.5 px-2 font-mono">4% (1:200k / 1:100k)</td>
									<td className="py-1.5 px-2 font-mono">7 мг/кг (макс 500 мг)</td>
									<td className="py-1.5 px-2 font-bold text-teal-700 dark:text-teal-300">до 5 карпул</td>
									<td className="py-1.5 px-2 font-bold text-teal-700 dark:text-teal-300">до 7 карпул</td>
									<td className="py-1.5 pl-2 text-rose-600 dark:text-rose-400 font-bold">макс 2 карпулы (1:200k)</td>
								</tr>
								<tr>
									<td className="py-1.5 pr-2 font-bold text-[var(--ink)]">Мепивакаин (Скандонест)</td>
									<td className="py-1.5 px-2 font-mono">3% (без адреналина)</td>
									<td className="py-1.5 px-2 font-mono">4.4 мг/кг (макс 300 мг)</td>
									<td className="py-1.5 px-2 font-bold text-teal-700 dark:text-teal-300">до 4 карпул</td>
									<td className="py-1.5 px-2 font-bold text-teal-700 dark:text-teal-300">до 5.5 карпул</td>
									<td className="py-1.5 pl-2 text-emerald-700 dark:text-emerald-300 font-bold">Препарат выбора</td>
								</tr>
								<tr>
									<td className="py-1.5 pr-2 font-bold text-[var(--ink)]">Лидокаин (Ксилостезин)</td>
									<td className="py-1.5 px-2 font-mono">2% (1:80k / 1:100k)</td>
									<td className="py-1.5 px-2 font-mono">4.4 мг/кг (макс 300 мг)</td>
									<td className="py-1.5 px-2 font-bold text-teal-700 dark:text-teal-300">до 4 карпул</td>
									<td className="py-1.5 px-2 font-bold text-teal-700 dark:text-teal-300">до 6 карпул</td>
									<td className="py-1.5 pl-2 text-amber-600 dark:text-amber-400 font-bold">макс 2 карпулы</td>
								</tr>
							</tbody>
						</table>
					</div>
					<div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-700 dark:text-rose-300 flex items-start gap-1.5">
						<HeartPulse size={14} className="shrink-0 mt-0.5" />
						<span>
							<strong>Кардиологический регламент:</strong> у пациентов с ИБС, гипертензией II-III ст. и аритмией суммарная доза экзогенного адреналина не должна превышать 0.04 мг (соответствует строго 2 карпулам 1:200 000). Всегда проводите аспирационную пробу.
						</span>
					</div>
				</div>
			</details>
		</div>
	);
}
