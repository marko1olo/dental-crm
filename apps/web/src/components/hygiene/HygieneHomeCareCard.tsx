/**
 * HygieneHomeCareCard.tsx — Персональная карта и памятка домашнего ухода за полостью рта
 * (Curaprox Ultra Soft 5460, монопучковая щетка, калибр межзубных ершиков, ирригатор, паста RDA < 50).
 *
 * (DOMAIN: CLINICAL HYGIENE, PATIENT HOME CARE & PREVENTION MEMO)
 *
 * Мандаты:
 * - 8e (Автономия врача): 1-клик пресеты рекомендаций под клиническую картину.
 * - 8k (CRM != тренажер кликанья): быстрое формирование красивой памятки пациенту без ручной печати 100 строк.
 * - 8n (Соло-врач): мгновенная печать бланка или отправка в WhatsApp без сложных настроек.
 */

import React, { memo, useCallback, useMemo, useState } from "react";
import {
	Check,
	Clipboard,
	Droplets,
	FileText,
	MessageCircle,
	Printer,
	RotateCcw,
	Send,
	Share2,
	Sparkles,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";

export interface HygieneHomeCareRecommendations {
	toothbrush: string;
	monotufts: string;
	interdentalBrushes: string;
	floss: string;
	irrigator: string;
	toothpaste: string;
	rinseOrGel: string;
	hygieneRecallMonths: number;
	customNotes?: string;
}

export const DEFAULT_STANDARD_HOME_CARE: HygieneHomeCareRecommendations = {
	toothbrush: "Зубная щетка Curaprox Ultra Soft 5460 (мягкая щетина Curen, чистка выметающими движениями 2 раза в день по 2-3 минуты)",
	monotufts: "Монопучковая щетка Curaprox CS 1006 (точечная дочистка фиссур моляров и десневой борозды)",
	interdentalBrushes: "Межзубные ёршики Curaprox Prime (калибр 0.6 мм синий для фронта, 0.7 мм красный для премоляров, 0.8 мм желтый для моляров)",
	floss: "Объемная вощеная нить Splat Dental Floss / Oral-B Pro-Expert (ежедневно перед вечерней чисткой)",
	irrigator: "Ирригатор полости рта Waterpik / Revyline (мощность 2-4, после чистки щеткой, 1 раз в день вечером)",
	toothpaste: "Низкоабразивная зубная паста с RDA < 50 и фторидами 1450 ppm (Curaprox Enzycal 1450 / Biorepair Total Protective Repair)",
	rinseOrGel: "Реминерализующий гель GC Tooth Mousse (аппликации горошиной на ночь после чистки, не споласкивать)",
	hygieneRecallMonths: 6,
	customNotes: "Исключить горизонтальные пилящие движения щеткой во избежание клиновидных дефектов эмали.",
};

export const CROWDING_ORTHO_HOME_CARE: HygieneHomeCareRecommendations = {
	toothbrush: "Ортодонтическая зубная щетка Curaprox CS 5460 Ortho с углублением под брекет-систему / ретейнеры",
	monotufts: "Монопучковая щетка Curaprox CS 1006 / 1009 — обязательная очистка вокруг каждого замка брекета и звеньев ретейнера",
	interdentalBrushes: "Межзубные ёршики увеличенного калибра Curaprox CPS Regular 1.1–1.4 мм для очистки пространства под дугой",
	floss: "Суперфлосс Oral-B Super Floss с жестким кончиком для продевания под ортодонтическую дугу",
	irrigator: "Ирригатор полости рта с ортодонтической насадкой (ежедневно после каждого приема пищи)",
	toothpaste: "Зубная паста с гидроксиапатитом и энзимами RDA < 50 (Biorepair / Curaprox)",
	rinseOrGel: "Ополаскиватель с аминофторидом Elmex Защита от кариеса или Curasept ADS",
	hygieneRecallMonths: 3,
	customNotes: "Контроль налета в зонах скученности каждые 3 месяца. Использовать индикатор налета PlaqSearch 1 раз в неделю.",
};

export const PERIODONTITIS_HOME_CARE: HygieneHomeCareRecommendations = {
	toothbrush: "Ультрамягкая щетка Curaprox Velvet 12460 или Curaprox CS 5460 (атравматичная очистка воспаленного края десны)",
	monotufts: "Монопучковая щетка CS 708 для бережной атравматичной гигиены обнаженных шеек корней",
	interdentalBrushes: "Калиброванные ершики Curaprox Perio Plus (0.7-1.1 мм) с мягким введением в межзубные промежутки",
	floss: "Флосс с хлоргексидином Curaprox DF 820",
	irrigator: "Ирригатор с пародонтологической насадкой с мягким резиновым кончиком Pik Pocket на минимальном давлении (1-2)",
	toothpaste: "Пародонтологическая паста Parodontax без лаурилсульфата / Biorepair Gum Protection RDA < 40",
	rinseOrGel: "Дентальный гель Метрогил Дента или Curasept ADS 0.20% курсом 7–10 дней на десневой край",
	hygieneRecallMonths: 3,
	customNotes: "Категорически исключить жесткие щетки и зубочистки. Повторный замер пародонтальных карманов через 3 месяца.",
};

export interface HygieneHomeCareCardProps {
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly onInsertToProtocol?: ((text: string) => void) | undefined;
	readonly readOnly?: boolean | undefined;
}

export const HygieneHomeCareCard: React.FC<HygieneHomeCareCardProps> = memo(({
	patientName = "Пациент",
	doctorName = "Врач-стоматолог",
	onInsertToProtocol,
	readOnly = false,
}) => {
	const [care, setCare] = useState<HygieneHomeCareRecommendations>(DEFAULT_STANDARD_HOME_CARE);
	const [activePreset, setActivePreset] = useState<"standard" | "ortho" | "perio">("standard");
	const [copyStatus, setCopyStatus] = useState<boolean>(false);
	const [insertStatus, setInsertStatus] = useState<boolean>(false);

	// Выбор пресета
	const handleSelectPreset = useCallback((preset: "standard" | "ortho" | "perio") => {
		setActivePreset(preset);
		if (preset === "standard") setCare(DEFAULT_STANDARD_HOME_CARE);
		else if (preset === "ortho") setCare(CROWDING_ORTHO_HOME_CARE);
		else if (preset === "perio") setCare(PERIODONTITIS_HOME_CARE);
		showToast("Рекомендации домашнего ухода обновлены", "info", 2500);
	}, []);

	// Формирование текста рекомендаций
	const formattedText = useMemo(() => {
		const lines = [
			`📋 ИНДИВИДУАЛЬНАЯ КАРТА ДОМАШНЕГО УХОДА И ГИГИЕНЫ ПОЛОСТИ РТА`,
			`Пациент: ${patientName}`,
			`Лечащий врач: ${doctorName}`,
			`Дата составления: ${new Date().toLocaleDateString("ru-RU")}`,
			"",
			"1. ОСНОВНАЯ ЗУБНАЯ ЩЕТКА:",
			`   ${care.toothbrush}`,
			"",
			"2. МОНОПУЧКОВАЯ ЩЕТКА:",
			`   ${care.monotufts}`,
			"",
			"3. МЕЖЗУБНЫЕ ЕРШИКИ (ИНТЕРДЕНТАЛЬНАЯ ГИГИЕНА):",
			`   ${care.interdentalBrushes}`,
			"",
			"4. ЗУБНАЯ НИТЬ (ФЛОСС):",
			`   ${care.floss}`,
			"",
			"5. ИРРИГАТОР ПОЛОСТИ РТА:",
			`   ${care.irrigator}`,
			"",
			"6. ЗУБНАЯ ПАСТА (RDA < 50):",
			`   ${care.toothpaste}`,
			"",
			"7. ДОПОЛНИТЕЛЬНЫЙ УХОД / РЕМ-ТЕРАПИЯ:",
			`   ${care.rinseOrGel}`,
			"",
			`8. ПОВТОРНЫЙ КОНТРОЛЬНЫЙ ОСМОТР И ПРОФГИГИЕНА: через ${care.hygieneRecallMonths} мес.`,
		];
		if (care.customNotes) {
			lines.push("", `ОСОБЫЕ УКАЗАНИЯ ВРАЧА: ${care.customNotes}`);
		}
		return lines.join("\n");
	}, [care, patientName, doctorName]);

	// Копирование в буфер
	const handleCopy = useCallback(() => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(formattedText);
			setCopyStatus(true);
			setTimeout(() => setCopyStatus(false), 2000);
			showToast("Памятка домашнего ухода скопирована в буфер", "success", 3000);
		}
	}, [formattedText]);

	// Вставка в медицинскую карту
	const handleInsertToCard = useCallback(() => {
		useVisitStore.getState().setVisitNoteForm((prev) => ({
			...prev,
			recommendations: prev.recommendations
				? `${prev.recommendations}\n\n${formattedText}`
				: formattedText,
		}));

		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					soap: formattedText,
					mode: "recommendations",
				},
			}),
		);

		onInsertToProtocol?.(formattedText);
		setInsertStatus(true);
		setTimeout(() => setInsertStatus(false), 2500);
		showToast("Рекомендации внесены в медицинскую карту!", "success", 3500);
	}, [formattedText, onInsertToProtocol]);

	// Отправка в WhatsApp
	const handleSendWhatsApp = useCallback(() => {
		const encoded = encodeURIComponent(formattedText);
		const waUrl = `https://wa.me/?text=${encoded}`;
		if (typeof window !== "undefined") {
			window.open(waUrl, "_blank", "noopener,noreferrer");
			showToast("Открываем WhatsApp для отправки памятки пациенту", "info", 3500);
		}
	}, [formattedText]);

	// Отправка в Telegram
	const handleSendTelegram = useCallback(() => {
		const encoded = encodeURIComponent(formattedText);
		const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "https://dente.clinic")}&text=${encoded}`;
		if (typeof window !== "undefined") {
			window.open(tgUrl, "_blank", "noopener,noreferrer");
			showToast("Открываем Telegram для отправки памятки пациенту", "info", 3500);
		}
	}, [formattedText]);

	// Печать красивой памятки А4
	const handlePrintMemo = useCallback(() => {
		const printWindow = window.open("", "_blank");
		if (!printWindow) {
			showToast("Всплывающее окно заблокировано браузером", "warning", 3500);
			return;
		}

		printWindow.document.write(`
			<!DOCTYPE html>
			<html lang="ru">
			<head>
				<meta charset="utf-8" />
				<title>Памятка домашней гигиены — ${patientName}</title>
				<style>
					@page { size: A4 portrait; margin: 15mm; }
					body {
						font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
						font-size: 11pt;
						line-height: 1.45;
						color: #1a202c;
						margin: 0;
						padding: 0;
					}
					.header {
						border-bottom: 2px solid #0d9488;
						padding-bottom: 8px;
						margin-bottom: 14px;
						display: flex;
						justify-content: space-between;
						align-items: flex-end;
					}
					.logo { font-size: 16pt; font-weight: 900; color: #0d9488; letter-spacing: 0.5px; }
					.sublogo { font-size: 8pt; color: #64748b; text-transform: uppercase; font-weight: bold; }
					.meta { font-size: 9pt; color: #475569; text-align: right; }
					h1 { font-size: 13pt; font-weight: 800; margin: 0 0 10px 0; color: #0f172a; }
					.item {
						margin-bottom: 10px;
						padding-bottom: 8px;
						border-bottom: 1px dashed #e2e8f0;
					}
					.item-title {
						font-size: 9pt;
						font-weight: 800;
						color: #0d9488;
						text-transform: uppercase;
						letter-spacing: 0.3px;
						margin-bottom: 2px;
					}
					.item-desc { font-size: 10pt; font-weight: 500; }
					.footer {
						margin-top: 18px;
						padding-top: 10px;
						border-top: 1px solid #cbd5e1;
						font-size: 8.5pt;
						color: #64748b;
						display: flex;
						justify-content: space-between;
					}
				</style>
			</head>
			<body>
				<div class="header">
					<div>
						<div class="logo">DENTE CLINIC</div>
						<div class="sublogo">Индивидуальная карта гигиены и профилактики</div>
					</div>
					<div class="meta">
						<div><strong>Пациент:</strong> ${patientName}</div>
						<div><strong>Дата:</strong> ${new Date().toLocaleDateString("ru-RU")}</div>
					</div>
				</div>

				<h1>РЕКОМЕНДАЦИИ ПО ДОМАШНЕМУ УХОДУ</h1>

				<div class="item">
					<div class="item-title">1. Основная зубная щетка</div>
					<div class="item-desc">${care.toothbrush}</div>
				</div>

				<div class="item">
					<div class="item-title">2. Монопучковая щетка (точечный уход)</div>
					<div class="item-desc">${care.monotufts}</div>
				</div>

				<div class="item">
					<div class="item-title">3. Межзубные ершики (калибр)</div>
					<div class="item-desc">${care.interdentalBrushes}</div>
				</div>

				<div class="item">
					<div class="item-title">4. Зубная нить (флосс)</div>
					<div class="item-desc">${care.floss}</div>
				</div>

				<div class="item">
					<div class="item-title">5. Ирригатор полости рта</div>
					<div class="item-desc">${care.irrigator}</div>
				</div>

				<div class="item">
					<div class="item-title">6. Зубная паста (контроль абразивности)</div>
					<div class="item-desc">${care.toothpaste}</div>
				</div>

				<div class="item">
					<div class="item-title">7. Реминерализующая терапия / Ополаскиватель</div>
					<div class="item-desc">${care.rinseOrGel}</div>
				</div>

				${care.customNotes ? `
				<div class="item">
					<div class="item-title">Особые указания лечащего врача</div>
					<div class="item-desc">${care.customNotes}</div>
				</div>
				` : ""}

				<div class="footer">
					<div><strong>Лечащий врач:</strong> ${doctorName}</div>
					<div><strong>Следующий осмотр:</strong> через ${care.hygieneRecallMonths} мес.</div>
				</div>

				<script>
					window.onload = function() {
						window.print();
					};
				</script>
			</body>
			</html>
		`);
		printWindow.document.close();
		showToast("Бланк памятки подготовлен для печати", "success", 3000);
	}, [care, patientName, doctorName]);

	return (
		<div className="flex flex-col gap-3 p-3.5 sm:p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-xs">
			{/* Шапка карточки */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[var(--line)]">
				<div className="flex items-center gap-2 min-w-0">
					<div className="p-1.5 rounded-lg bg-teal-500/15 text-teal-700 dark:text-teal-300 shrink-0">
						<Sparkles size={18} />
					</div>
					<div className="min-w-0 flex-1">
						<h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] truncate">
							Персональная карта домашнего ухода
						</h4>
						<p className="text-[11px] text-[var(--muted)] truncate">
							1-клик генерация рекомендаций, печать красивой памятки и отправка в WhatsApp
						</p>
					</div>
				</div>

				{/* Кнопки экспорта (Miller's Law <= 5 кнопок) */}
				<div className="flex items-center gap-1.5 flex-wrap shrink-0">
					<button
						type="button"
						onClick={handleInsertToCard}
						className="primary-button min-h-[36px] sm:h-8 px-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation truncate"
						title="Вставить рекомендации в дневник приёма"
						data-testid="hygiene-homecare-insert-btn"
					>
						{insertStatus ? <Check size={14} className="shrink-0" /> : <FileText size={14} className="shrink-0" />}
						<span className="truncate">{insertStatus ? "Внесено!" : "В карту"}</span>
					</button>

					<button
						type="button"
						onClick={handlePrintMemo}
						className="secondary-button min-h-[36px] sm:h-8 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] border border-[var(--line)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation truncate"
						title="Распечатать памятку пациента формата А4"
						data-testid="hygiene-homecare-print-btn"
					>
						<Printer size={14} className="shrink-0 text-teal-600 dark:text-teal-400" />
						<span className="truncate">Печать А4</span>
					</button>

					<button
						type="button"
						onClick={handleSendWhatsApp}
						className="secondary-button min-h-[36px] sm:h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation truncate"
						title="Отправить памятку в WhatsApp"
						data-testid="hygiene-homecare-whatsapp-btn"
					>
						<MessageCircle size={14} className="shrink-0" />
						<span className="truncate">WhatsApp</span>
					</button>

					<button
						type="button"
						onClick={handleSendTelegram}
						className="secondary-button min-h-[36px] sm:h-8 px-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation truncate"
						title="Отправить памятку в Telegram"
						data-testid="hygiene-homecare-telegram-btn"
					>
						<Send size={14} className="shrink-0" />
						<span className="truncate">Telegram</span>
					</button>

					<button
						type="button"
						onClick={handleCopy}
						className="secondary-button icon-button min-h-[36px] sm:h-8 w-8 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-all cursor-pointer touch-manipulation shrink-0"
						title="Скопировать текст памятки"
						aria-label="Скопировать"
						data-testid="hygiene-homecare-copy-btn"
					>
						{copyStatus ? <Check size={14} className="text-emerald-500" /> : <Clipboard size={14} />}
					</button>
				</div>
			</div>

			{/* Экспресс-пресеты под клиническую картину */}
			{!readOnly && (
				<div className="flex flex-col gap-2">
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="text-[11px] font-bold text-[var(--muted)] shrink-0">
							Пресеты под диагноз:
						</span>
						<button
							type="button"
							onClick={() => handleSelectPreset("standard")}
							className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer touch-manipulation truncate ${
								activePreset === "standard"
									? "primary-button bg-teal-600 text-white font-bold shadow-2xs"
									: "secondary-button bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--line)]/50"
							}`}
							data-testid="homecare-preset-standard-btn"
						>
							✓ Стандарт (Curaprox 5460 + ершики)
						</button>

						<button
							type="button"
							onClick={() => handleSelectPreset("ortho")}
							className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer touch-manipulation truncate ${
								activePreset === "ortho"
									? "primary-button bg-teal-600 text-white font-bold shadow-2xs"
									: "secondary-button bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--line)]/50"
							}`}
							data-testid="homecare-preset-ortho-btn"
						>
							Брекеты / Ретейнеры / Скученность
						</button>

						<button
							type="button"
							onClick={() => handleSelectPreset("perio")}
							className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer touch-manipulation truncate ${
								activePreset === "perio"
									? "primary-button bg-teal-600 text-white font-bold shadow-2xs"
									: "secondary-button bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--line)]/50"
							}`}
							data-testid="homecare-preset-perio-btn"
						>
							Пародонтит / Кровоточивость (Velvet + Perio)
						</button>
					</div>

					{/* 1-клик быстрый подбор щетки Curaprox и ершиков */}
					<div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[var(--line)]/50 text-[11px]">
						<span className="font-bold text-[var(--muted)] shrink-0">Щетка:</span>
						<button
							type="button"
							onClick={() => {
								setCare((prev) => ({
									...prev,
									toothbrush: "Зубная щетка Curaprox Soft 1560 (1560 щетинок Curen толщиной 0.15 мм для адаптации после жестких щеток)",
								}));
								showToast("Выбрана щетка Curaprox Soft 1560", "info", 1500);
							}}
							className="secondary-button px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--paper-soft)] hover:bg-teal-500/20 text-[var(--ink)] border border-[var(--line)] cursor-pointer"
						>
							1560 Soft
						</button>
						<button
							type="button"
							onClick={() => {
								setCare((prev) => ({
									...prev,
									toothbrush: "Зубная щетка Curaprox Ultra Soft 5460 (5460 ультратонких щетинок Curen 0.1 мм, бережная атравматичная чистка)",
								}));
								showToast("Выбрана щетка Curaprox Ultra Soft 5460", "info", 1500);
							}}
							className="secondary-button px-2 py-0.5 rounded text-[11px] font-bold bg-teal-500/15 hover:bg-teal-500/30 text-teal-800 dark:text-teal-300 border border-teal-500/30 cursor-pointer"
						>
							★ 5460 Ultra Soft
						</button>
						<button
							type="button"
							onClick={() => {
								setCare((prev) => ({
									...prev,
									toothbrush: "Зубная щетка Curaprox Velvet 12460 (12460 бархатных щетинок Curen 0.08 мм, максимум нежности при гиперчувствительности)",
								}));
								showToast("Выбрана щетка Curaprox Velvet 12460", "info", 1500);
							}}
							className="secondary-button px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--paper-soft)] hover:bg-teal-500/20 text-[var(--ink)] border border-[var(--line)] cursor-pointer"
						>
							12460 Velvet
						</button>

						<span className="font-bold text-[var(--muted)] shrink-0 ml-2">Ёршики:</span>
						<button
							type="button"
							onClick={() => {
								setCare((prev) => ({
									...prev,
									interdentalBrushes: "Межзубные ёршики Curaprox CPS 06 Prime (стержень 0.6 мм, щетина 2.2 мм — узкие межзубные промежутки фронта)",
								}));
								showToast("Выбран калибр Curaprox CPS 06", "info", 1500);
							}}
							className="secondary-button px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--paper-soft)] hover:bg-teal-500/20 text-[var(--ink)] border border-[var(--line)] cursor-pointer"
						>
							CPS 06 (0.6 мм)
						</button>
						<button
							type="button"
							onClick={() => {
								setCare((prev) => ({
									...prev,
									interdentalBrushes: "Межзубные ёршики Curaprox CPS 07 Prime (стержень 0.7 мм, щетина 2.5 мм — стандартные промежутки премоляров)",
								}));
								showToast("Выбран калибр Curaprox CPS 07", "info", 1500);
							}}
							className="secondary-button px-2 py-0.5 rounded text-[11px] font-bold bg-teal-500/15 hover:bg-teal-500/30 text-teal-800 dark:text-teal-300 border border-teal-500/30 cursor-pointer"
						>
							★ CPS 07 (0.7 мм)
						</button>
						<button
							type="button"
							onClick={() => {
								setCare((prev) => ({
									...prev,
									interdentalBrushes: "Межзубные ёршики Curaprox CPS 08 Prime (стержень 0.8 мм, щетина 3.2 мм — широкие промежутки моляров)",
								}));
								showToast("Выбран калибр Curaprox CPS 08", "info", 1500);
							}}
							className="secondary-button px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--paper-soft)] hover:bg-teal-500/20 text-[var(--ink)] border border-[var(--line)] cursor-pointer"
						>
							CPS 08 (0.8 мм)
						</button>
					</div>
				</div>
			)}

			{/* Сетка элементов ухода */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
				<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1 min-w-0">
					<span className="font-bold text-teal-700 dark:text-teal-400 text-[11px] truncate">
						1. Зубная щетка (основная)
					</span>
					<p className="text-[var(--ink)] text-xs leading-relaxed">{care.toothbrush}</p>
				</div>

				<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1 min-w-0">
					<span className="font-bold text-teal-700 dark:text-teal-400 text-[11px] truncate">
						2. Монопучковая щетка
					</span>
					<p className="text-[var(--ink)] text-xs leading-relaxed">{care.monotufts}</p>
				</div>

				<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1 min-w-0">
					<span className="font-bold text-teal-700 dark:text-teal-400 text-[11px] truncate">
						3. Межзубные ершики (калибр)
					</span>
					<p className="text-[var(--ink)] text-xs leading-relaxed">{care.interdentalBrushes}</p>
				</div>

				<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1 min-w-0">
					<span className="font-bold text-teal-700 dark:text-teal-400 text-[11px] truncate">
						4. Зубная нить (флосс)
					</span>
					<p className="text-[var(--ink)] text-xs leading-relaxed">{care.floss}</p>
				</div>

				<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1 min-w-0">
					<span className="font-bold text-teal-700 dark:text-teal-400 text-[11px] truncate">
						5. Ирригатор полости рта
					</span>
					<p className="text-[var(--ink)] text-xs leading-relaxed">{care.irrigator}</p>
				</div>

				<div className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1 min-w-0">
					<span className="font-bold text-teal-700 dark:text-teal-400 text-[11px] truncate">
						6. Зубная паста (RDA &lt; 50)
					</span>
					<p className="text-[var(--ink)] text-xs leading-relaxed">{care.toothpaste}</p>
				</div>
			</div>

			{/* Нижняя строчка: контрольный осмотр */}
			<div className="flex items-center justify-between text-xs pt-1.5 border-t border-[var(--line)]/60 flex-wrap gap-2">
				<span className="text-[11px] text-[var(--muted)]">
					Рекомендованный интервал профгигиены:
				</span>
				<span className="font-bold text-teal-700 dark:text-teal-400">
					через {care.hygieneRecallMonths} месяцев (напоминание в CRM)
				</span>
			</div>
		</div>
	);
});

HygieneHomeCareCard.displayName = "HygieneHomeCareCard";
