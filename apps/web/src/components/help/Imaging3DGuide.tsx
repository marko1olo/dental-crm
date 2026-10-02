/**
 * DENTE CRM — Imaging & 3D CBCT / DICOM Quick Guide
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Mandates 8e, 8n, 8x
 *
 * 1-Page Clinical Cheat Sheet:
 * - Multi-Planar Reconstruction (MPR): Axial, Coronal, Sagittal & Cross-Sections
 * - Panoramic OPTG synthetic curve reconstruction
 * - Instant Visiograph image intake (<50ms from hot folder)
 * - Measurement tools: Dental Caliper, Bone Ridge Height/Width, Safe Mandibular Canal 2mm zone
 * - Hotkeys (F7, Tab, R, W) & Interactive Imaging Diagnostics Tour
 */

import React from "react";
import {
	Box,
	Compass,
	Crosshair,
	Eye,
	Gamepad2,
	HelpCircle,
	Maximize2,
	Ruler,
	Sliders,
	Sparkles,
	Zap,
} from "lucide-react";
import { startDoctorTour } from "../workspace/DoctorClinicalTrainingTour";

export const Imaging3DGuide: React.FC = () => {
	const handleLaunchTour = () => {
		startDoctorTour("imaging_diagnostics");
	};

	return (
		<div className="space-y-4 text-xs text-[var(--ink)]">
			{/* Header summary banner */}
			<div className="p-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex items-start gap-2.5">
				<div className="p-1.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
					<Box size={18} />
				</div>
				<div className="flex-1 min-w-0">
					<div className="font-semibold text-sm text-[var(--ink)] flex items-center justify-between gap-2">
						<span>Снимки и 3D томография (КЛКТ)</span>
						<span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-300">
							Срезы MPR и Замер кости
						</span>
					</div>
					<div className="text-[var(--muted)] text-[11px] mt-1 leading-relaxed">
						Встроенная диагностическая станция клиники: мгновенный просмотр прицельных визиографических снимков и 3D томограмм (DICOM).
						Поддерживает срезы MPR, панораму, замер ширины альвеолярного гребня и безопасную зону до нижнечелюстного канала.
					</div>
				</div>
			</div>

			{/* 1. Зачем нужен этот раздел */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-1.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
					<Sparkles size={14} className="text-purple-500" />
					<span>Зачем нужен этот раздел</span>
				</div>
				<p className="text-[var(--muted)] text-[11px] leading-relaxed">
					Раздел позволяет врачу прямо у кресла поставить точный диагноз и спланировать имплантацию или эндодонтическое лечение без сторонних громоздких программ.
					Снимки с датчика открываются быстрее 50 миллисекунд прямо из рабочей папки рентген-аппарата.
				</p>
			</div>

			{/* 2. Пошаговая инструкция */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2.5">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Пошаговая инструкция для врача-рентгенолога и хирурга</span>
					<span className="text-[10px] text-[var(--muted)]">Работа со снимками</span>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								1
							</span>
							<span>Открытие снимка (F7)</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Нажмите <strong>F7</strong> или откройте миниатюру в карте пациента. Прицельный снимок открывается мгновенно, КЛКТ томограмма загружает 3D срезы.
						</p>
					</div>

					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								2
							</span>
							<span>Навигация по срезам (Tab)</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Переключайте проекции клавишей <strong>Tab</strong> (аксиальная, корональная, сагиттальная, панорамная). Колёсико мыши листает слои срезов по глубине.
						</p>
					</div>

					<div className="p-2.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)]/50 space-y-1.5">
						<div className="flex items-center gap-1.5 font-semibold text-[var(--ink)] text-[11px]">
							<span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center text-[10px] font-bold shrink-0">
								3
							</span>
							<span>Замеры и планирование</span>
						</div>
						<p className="text-[var(--muted)] text-[11px] leading-relaxed">
							Выберите инструмент <strong>«Линейка»</strong> для точного замера высоты и ширины кости. Программа подсвечивает безопасный отступ 2 мм от нервного канала.
						</p>
					</div>
				</div>
			</div>

			{/* Проекции MPR */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2.5">
				<div className="font-semibold text-xs text-[var(--ink)]">
					Анатомические проекции MPR и режимы
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
					<div className="p-2 rounded bg-[var(--paper-soft)] flex items-start gap-2">
						<Crosshair size={14} className="text-purple-500 shrink-0 mt-0.5" />
						<div>
							<strong className="text-[var(--ink)]">Аксиальный срез (Axial):</strong>
							<p className="text-[var(--muted)] text-[10px] mt-0.5">
								Горизонтальный вид челюсти сверху. Оценка формы зубной дуги и корней.
							</p>
						</div>
					</div>

					<div className="p-2 rounded bg-[var(--paper-soft)] flex items-start gap-2">
						<Sliders size={14} className="text-purple-500 shrink-0 mt-0.5" />
						<div>
							<strong className="text-[var(--ink)]">Корональный срез (Coronal):</strong>
							<p className="text-[var(--muted)] text-[10px] mt-0.5">
								Фронтальный срез. Видны гайморовы пазухи, дно носовой полости и апексы корней.
							</p>
						</div>
					</div>

					<div className="p-2 rounded bg-[var(--paper-soft)] flex items-start gap-2">
						<Compass size={14} className="text-purple-500 shrink-0 mt-0.5" />
						<div>
							<strong className="text-[var(--ink)]">Сагиттальный срез (Sagittal):</strong>
							<p className="text-[var(--muted)] text-[10px] mt-0.5">
								Боковой профильный срез. Идеален для оценки наклона резцов и височно-нижнечелюстного сустава (ВНЧС).
							</p>
						</div>
					</div>

					<div className="p-2 rounded bg-[var(--paper-soft)] flex items-start gap-2">
						<Eye size={14} className="text-purple-500 shrink-0 mt-0.5" />
						<div>
							<strong className="text-[var(--ink)]">Панорама и Кросс-секции:</strong>
							<p className="text-[var(--muted)] text-[10px] mt-0.5">
								Синтетическая ОПТГ по зубной дуге с серией перпендикулярных срезов шагом 1 мм под импланты.
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* 3. Горячие клавиши */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center justify-between">
					<span>Горячие клавиши (Hotkeys)</span>
					<span className="text-[10px] text-[var(--muted)]">Навигация в томографе</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Открыть раздел снимков:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-purple-600 dark:text-purple-400">
							F7
						</kbd>
					</div>
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Переключение проекции MPR:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-purple-600 dark:text-purple-400">
							Tab / Shift+Tab
						</kbd>
					</div>
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Сброс масштаба и центрирование:</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-purple-600 dark:text-purple-400">
							R
						</kbd>
					</div>
					<div className="flex items-center justify-between p-2 rounded bg-[var(--paper-soft)]">
						<span className="text-[var(--muted)]">Окно яркости / контраста (Window):</span>
						<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono font-bold text-purple-600 dark:text-purple-400">
							W
						</kbd>
					</div>
				</div>
			</div>

			{/* 4. Частые вопросы и ошибки */}
			<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-2">
				<div className="font-semibold text-xs text-[var(--ink)] flex items-center gap-1.5">
					<HelpCircle size={14} className="text-amber-500" />
					<span>Частые вопросы и как избежать затыков</span>
				</div>
				<ul className="text-[11px] text-[var(--muted)] space-y-1.5">
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Зависает ли программа на ИИ-анализе снимка?</strong>
						<span>Нет! Согласно Мандату 8e, снимок открывается моментально без принудительного запуска нейросетей. ИИ-помощник запускается только по отдельной кнопке врача.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Нужна ли внешняя программа для DICOM?</strong>
						<span>Нет, в DENTE встроен полноценный браузерный просмотрщик КТ с аппаратным WebGL ускорением на видеокарте.</span>
					</li>
					<li className="flex items-start gap-1.5">
						<strong className="text-[var(--ink)] shrink-0">• Как откалибровать линейку на прицельном снимке?</strong>
						<span>Зажмите Shift и проведите отрезок по известному ориентиру (длина коронки или штифта), система откалибрует масштаб до десятых долей миллиметра.</span>
					</li>
				</ul>
			</div>

			{/* 5. Интерактивная кнопка обучения */}
			<div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div className="space-y-0.5">
					<div className="font-semibold text-xs text-purple-800 dark:text-purple-200 flex items-center gap-1.5">
						<Gamepad2 size={16} className="text-purple-600 dark:text-purple-400" />
						<span>Интерактивный тренажёр: 3D Срезы и замер кости</span>
					</div>
					<p className="text-[11px] text-purple-700/80 dark:text-purple-300/80">
						Пройдите интерактивный тур по срезам реального томографического исследования с замером гребня.
					</p>
				</div>
				<button
					type="button"
					onClick={handleLaunchTour}
					className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
				>
					<Zap size={14} />
					<span>Запустить обучение</span>
				</button>
			</div>
		</div>
	);
};
