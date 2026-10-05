/**
 * apps/web/src/components/settings/DeepClinicalSettingsSection.tsx
 *
 * Rich Deep Clinical & Operational Settings Studio (Расширенные богатые настройки).
 * Authorities:
 * - Mandate 8e: Doctor Autonomy (No blocking barriers, free discounts, physiological norm).
 * - Mandate 8d: 7 Deadly Sins of UI (Zero cartoon emojis; strictly Lucide SVG icons).
 * - Mandate 8s: Friction-Killer over Reality Simulators.
 * - Mandate 8b: File line count strictly <= 800 lines.
 */

import React, { useState } from "react";
import {
	AlertCircle,
	ArrowRight,
	Bell,
	Check,
	CheckCircle2,
	ChevronDown,
	FileText,
	HardDrive,
	Layers,
	Package,
	Radio,
	RefreshCw,
	Save,
	ShieldAlert,
	ShieldCheck,
	Sliders,
	Sparkles,
	Volume2,
	Zap,
} from "lucide-react";
import {
	useDeepClinicalSettingsStore,
	type DeepClinicalSettings,
	type AnestheticPackageItem,
} from "../../store/deepClinicalSettingsStore";
import { showToast } from "../GlobalToast";

export function DeepClinicalSettingsSection() {
	const { settings, isSaving, updateSettings, applyPreset, saveToServer, resetToDefaults } =
		useDeepClinicalSettingsStore();

	const [activeSubTab, setActiveSubTab] = useState<
		"protocols" | "warehouse" | "intercom" | "fiscal"
	>("protocols");

	const handleToggle = (key: keyof DeepClinicalSettings) => {
		const currentVal = settings[key];
		if (typeof currentVal === "boolean") {
			updateSettings({ [key]: !currentVal });
		}
	};

	const handleAddPackageItem = () => {
		const newItem: AnestheticPackageItem = {
			id: `item-${Date.now()}`,
			name: "Расходный материал (новый)",
			quantity: 1,
			unit: "шт",
		};
		updateSettings({
			anestheticPackageItems: [...settings.anestheticPackageItems, newItem],
		});
		showToast("Позиция добавлена в технологическую карту", "info");
	};

	const handleRemovePackageItem = (id: string) => {
		if (settings.anestheticPackageItems.length <= 1) {
			showToast("В пакете должен оставаться хотя бы один препарат", "info");
			return;
		}
		updateSettings({
			anestheticPackageItems: settings.anestheticPackageItems.filter((i) => i.id !== id),
		});
	};

	const handleTestIntercom = () => {
		showToast("Сигнал интеркома: вызов ассистента в Кабинет 1 отправлен", "success");
	};

	return (
		<div className="deep-clinical-settings-shell space-y-6" data-testid="deep-clinical-settings">
			{/* Top Super-Header */}
			<div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-500/10 via-sky-500/10 to-transparent border border-teal-500/25 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-md">
						<Sliders size={22} aria-hidden="true" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h3 className="m-0 font-extrabold text-base sm:text-lg text-[var(--ink)]">
								Расширенные клинические настройки
							</h3>
							<span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30">
								Глубокая калибровка
							</span>
						</div>
						<p className="m-0 text-xs text-[var(--muted)] mt-0.5">
							Тонкая настройка протоколов ЭМК, технологических карт склада, интеркома и правил кассы
						</p>
					</div>
				</div>

				{/* 1-Click Preset Switcher Buttons */}
				<div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
					<button
						type="button"
						onClick={() => {
							applyPreset("solo");
							showToast("Применены расширенные параметры: Соло-врач", "success");
						}}
						className="px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-[var(--line)] text-[var(--ink)] transition-colors cursor-pointer"
						title="Пресет соло-врача (максимальная автономия)"
						data-testid="deep-preset-solo"
					>
						Соло-врач
					</button>
					<button
						type="button"
						onClick={() => {
							applyPreset("standard");
							showToast("Применены расширенные параметры: Стандартная клиника", "success");
						}}
						className="px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-[var(--line)] text-[var(--ink)] transition-colors cursor-pointer"
						title="Пресет стандартной клиники (2–4 кресла)"
						data-testid="deep-preset-standard"
					>
						Стандарт
					</button>
					<button
						type="button"
						onClick={() => {
							applyPreset("network");
							showToast("Применены расширенные параметры: Сеть / Enterprise", "success");
						}}
						className="px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-[var(--line)] text-[var(--ink)] transition-colors cursor-pointer"
						title="Пресет сетевого медицинского центра"
						data-testid="deep-preset-network"
					>
						Сеть
					</button>
				</div>
			</div>

			{/* Sub-Navigation Tabs */}
			<div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[var(--line)]">
				<button
					type="button"
					onClick={() => setActiveSubTab("protocols")}
					className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
						activeSubTab === "protocols"
							? "bg-teal-600 text-white shadow-sm"
							: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]"
					}`}
				>
					<FileText size={15} aria-hidden="true" />
					<span>Протоколы ЭМК и ИДС</span>
				</button>
				<button
					type="button"
					onClick={() => setActiveSubTab("warehouse")}
					className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
						activeSubTab === "warehouse"
							? "bg-teal-600 text-white shadow-sm"
							: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]"
					}`}
				>
					<Package size={15} aria-hidden="true" />
					<span>Склад и техкарты</span>
				</button>
				<button
					type="button"
					onClick={() => setActiveSubTab("intercom")}
					className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
						activeSubTab === "intercom"
							? "bg-teal-600 text-white shadow-sm"
							: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]"
					}`}
				>
					<Radio size={15} aria-hidden="true" />
					<span>Интерком и ассистенты</span>
				</button>
				<button
					type="button"
					onClick={() => setActiveSubTab("fiscal")}
					className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
						activeSubTab === "fiscal"
							? "bg-teal-600 text-white shadow-sm"
							: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]"
					}`}
				>
					<ShieldCheck size={15} aria-hidden="true" />
					<span>Касса и автономия</span>
				</button>
			</div>

			{/* TAB 1: PROTOCOLS */}
			{activeSubTab === "protocols" && (
				<div className="space-y-4 animate-fade-in">
					<div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] space-y-3">
						<h4 className="m-0 text-sm font-bold text-[var(--ink)] flex items-center gap-2">
							<ShieldAlert size={16} className="text-teal-600" aria-hidden="true" />
							Обязательность клинических тестов в карте приёма (Мандат 8e)
						</h4>
						<p className="m-0 text-xs text-[var(--muted)] leading-relaxed">
							По умолчанию система использует мягкие клинические предупреждения без блокировки кнопки «Сохранить приём».
						</p>

						<div className="space-y-2.5 pt-2">
							<label className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--line)] hover:bg-[var(--line)]/20 cursor-pointer transition-colors">
								<div>
									<strong className="block text-xs text-[var(--ink)]">
										Температурные пробы (холод/тепло) при пульпите (К04)
									</strong>
									<span className="block text-[11px] text-[var(--muted)]">
										Требовать фиксацию реакции зуба на температурный раздражитель
									</span>
								</div>
								<input
									type="checkbox"
									checked={settings.requireThermalTests}
									onChange={() => handleToggle("requireThermalTests")}
									className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
								/>
							</label>

							<label className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--line)] hover:bg-[var(--line)]/20 cursor-pointer transition-colors">
								<div>
									<strong className="block text-xs text-[var(--ink)]">
										Перкуссия зуба (вертикальная / горизонтальная)
									</strong>
									<span className="block text-[11px] text-[var(--muted)]">
										Требовать фиксацию данных перкуссии при заболеваниях периодонта
									</span>
								</div>
								<input
									type="checkbox"
									checked={settings.requirePercussionData}
									onChange={() => handleToggle("requirePercussionData")}
									className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
								/>
							</label>

							<label className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--line)] hover:bg-[var(--line)]/20 cursor-pointer transition-colors">
								<div>
									<strong className="block text-xs text-[var(--ink)]">
										Автозаполнение «✓ Соматически здоров / Норма»
									</strong>
									<span className="block text-[11px] text-[var(--muted)]">
										Мгновенный 1-тап пресет нормы для всех полей осмотра
									</span>
								</div>
								<input
									type="checkbox"
									checked={settings.autofillSoapNormalByDefault}
									onChange={() => handleToggle("autofillSoapNormalByDefault")}
									className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
								/>
							</label>
						</div>
					</div>

					<div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] space-y-3">
						<h4 className="m-0 text-sm font-bold text-[var(--ink)] flex items-center gap-2">
							<FileText size={16} className="text-teal-600" aria-hidden="true" />
							Шаблоны информированных добровольных согласий (ИДС)
						</h4>

						<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
							{[
								{
									key: "simplified_ambulatory",
									title: "Упрощенный (Амбулаторный)",
									desc: "Для соло-врача и регулярной терапии. 1 страница с подписью.",
								},
								{
									key: "standard_1051n",
									title: "Стандарт Минздрава 1051н",
									desc: "Регламентное согласие на первичное медицинское вмешательство.",
								},
								{
									key: "implant_extended",
									title: "Хирургия и Имплантация",
									desc: "Расширенный протокол рисков, гарантийных сроков и приживления.",
								},
							].map((t) => (
								<button
									key={t.key}
									type="button"
									onClick={() =>
										updateSettings({
											informedConsentTemplate:
												t.key as DeepClinicalSettings["informedConsentTemplate"],
										})
									}
									className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
										settings.informedConsentTemplate === t.key
											? "border-teal-500 bg-teal-500/10 text-[var(--ink)] ring-1 ring-teal-500"
											: "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:border-teal-500/40"
									}`}
								>
									<strong className="block text-xs font-bold text-[var(--ink)] mb-1">
										{t.title}
									</strong>
									<span className="block text-[11px] leading-snug">{t.desc}</span>
								</button>
							))}
						</div>
					</div>

					<div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] space-y-3">
						<h4 className="m-0 text-sm font-bold text-[var(--ink)] flex items-center gap-2">
							<HardDrive size={16} className="text-teal-600" aria-hidden="true" />
							Регламент хранения и архивации рентген-снимков и КТ
						</h4>

						<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
							<div>
								<span className="block text-xs font-bold text-[var(--ink)]">
									Срок гарантированного хранения DICOM-исследований
								</span>
								<span className="block text-[11px] text-[var(--muted)]">
									По истечении срока серии переводятся в холодный архив Vault
								</span>
							</div>

							<select
								value={settings.xrayRetentionPeriodYears}
								onChange={(e) =>
									updateSettings({
										xrayRetentionPeriodYears: Number(e.target.value),
									})
								}
								className="px-3 py-1.5 text-xs font-medium rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] cursor-pointer"
							>
								<option value={5}>5 лет (Амбулаторный минимум)</option>
								<option value={10}>10 лет (Рекомендуемый стандарт)</option>
								<option value={25}>25 лет (Бессрочный архив сети)</option>
							</select>
						</div>
					</div>
				</div>
			)}

			{/* TAB 2: WAREHOUSE & BOMS */}
			{activeSubTab === "warehouse" && (
				<div className="space-y-4 animate-fade-in">
					<div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] space-y-3">
						<div className="flex items-center justify-between gap-3">
							<div>
								<h4 className="m-0 text-sm font-bold text-[var(--ink)] flex items-center gap-2">
									<Package size={16} className="text-teal-600" aria-hidden="true" />
									Автоматическое пакетное списание анестетиков
								</h4>
								<p className="m-0 text-xs text-[var(--muted)]">
									При указании услуги анестезии все расходники списываются единым клиническим комплектом
								</p>
							</div>
							<input
								type="checkbox"
								checked={settings.autoDeductAnestheticsPackage}
								onChange={() => handleToggle("autoDeductAnestheticsPackage")}
								className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
							/>
						</div>

						{settings.autoDeductAnestheticsPackage && (
							<div className="pt-2 space-y-2">
								<div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
									Состав технологической карты (1 инъекция):
								</div>

								<div className="space-y-1.5">
									{settings.anestheticPackageItems.map((item) => (
										<div
											key={item.id}
											className="flex items-center justify-between gap-2 p-2 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]/50 text-xs"
										>
											<span className="font-medium text-[var(--ink)]">{item.name}</span>
											<div className="flex items-center gap-2">
												<span className="text-[var(--muted)]">
													{item.quantity} {item.unit}
												</span>
												<button
													type="button"
													onClick={() => handleRemovePackageItem(item.id)}
													className="text-red-500 hover:text-red-600 p-0.5 text-xs font-bold"
													title="Удалить позицию"
												>
													✕
												</button>
											</div>
										</div>
									))}
								</div>

								<button
									type="button"
									onClick={handleAddPackageItem}
									className="mt-2 py-1.5 px-3 text-xs font-semibold rounded-xl border border-[var(--line)] hover:bg-[var(--line)] text-teal-600 dark:text-teal-400 cursor-pointer transition-colors"
								>
									+ Добавить препарат в техкарту
								</button>
							</div>
						)}
					</div>

					<div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] space-y-3">
						<h4 className="m-0 text-sm font-bold text-[var(--ink)] flex items-center gap-2">
							<AlertCircle size={16} className="text-teal-600" aria-hidden="true" />
							Пороги критического остатка и автозаказ у поставщиков
						</h4>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
							<label className="block p-3 rounded-xl border border-[var(--line)]">
								<span className="block text-xs font-bold text-[var(--ink)] mb-1">
									Критический остаток анестетиков
								</span>
								<div className="flex items-center gap-2">
									<input
										type="number"
										value={settings.criticalStockThresholdCartridges}
										onChange={(e) =>
											updateSettings({
												criticalStockThresholdCartridges: Number(e.target.value),
											})
										}
										className="w-20 px-2 py-1 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
									/>
									<span className="text-xs text-[var(--muted)]">карпул (уведомлять начмеда)</span>
								</div>
							</label>

							<label className="block p-3 rounded-xl border border-[var(--line)]">
								<span className="block text-xs font-bold text-[var(--ink)] mb-1">
									Критический остаток перчаток
								</span>
								<div className="flex items-center gap-2">
									<input
										type="number"
										value={settings.criticalStockThresholdGloves}
										onChange={(e) =>
											updateSettings({
												criticalStockThresholdGloves: Number(e.target.value),
											})
										}
										className="w-20 px-2 py-1 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
									/>
									<span className="text-xs text-[var(--muted)]">пар (уведомлять сестру-хозяйку)</span>
								</div>
							</label>
						</div>

						<label className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--line)] hover:bg-[var(--line)]/20 cursor-pointer transition-colors mt-2">
							<div>
								<strong className="block text-xs text-[var(--ink)]">
									Мягкий овердрафт склада (Soft Negative Stock, Мандат 8e / 8k)
								</strong>
								<span className="block text-[11px] text-[var(--muted)]">
									Приём пациента никогда не блокируется из-за задержки накладной поставщика
								</span>
							</div>
							<input
								type="checkbox"
								checked={settings.allowSoftNegativeStock}
								onChange={() => handleToggle("allowSoftNegativeStock")}
								className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
							/>
						</label>
					</div>
				</div>
			)}

			{/* TAB 3: INTERCOM */}
			{activeSubTab === "intercom" && (
				<div className="space-y-4 animate-fade-in">
					<div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] space-y-3">
						<div className="flex items-center justify-between gap-3">
							<div>
								<h4 className="m-0 text-sm font-bold text-[var(--ink)] flex items-center gap-2">
									<Radio size={16} className="text-teal-600" aria-hidden="true" />
									Внутриклинический интерком и оповещения ассистентов
								</h4>
								<p className="m-0 text-xs text-[var(--muted)]">
									Мгновенный вызов персонала в кабинет без громкой связи и беготни по коридорам
								</p>
							</div>
							<input
								type="checkbox"
								checked={settings.intercomEnabled}
								onChange={() => handleToggle("intercomEnabled")}
								className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
							/>
						</div>

						{settings.intercomEnabled && (
							<div className="space-y-3 pt-2">
								<div>
									<span className="block text-xs font-bold text-[var(--ink)] mb-1.5">
										Готовые шаблоны мгновенного вызова ассистента:
									</span>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
										{settings.quickAssistantCallPresets.map((preset, i) => (
											<div
												key={i}
												className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]/50 flex items-center justify-between gap-2 text-xs"
											>
												<span className="font-medium text-[var(--ink)]">{preset}</span>
												<span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300">
													1 тап
												</span>
											</div>
										))}
									</div>
								</div>

								<div className="flex items-center justify-between pt-2 border-t border-[var(--line)]">
									<div className="flex items-center gap-2">
										<Volume2 size={16} className="text-teal-600" aria-hidden="true" />
										<span className="text-xs font-medium text-[var(--ink)]">
											Громкость звукового сигнала: {settings.soundVolume}%
										</span>
									</div>
									<button
										type="button"
										onClick={handleTestIntercom}
										className="py-1 px-3 text-xs font-bold rounded-lg bg-teal-600 text-white hover:bg-teal-700 cursor-pointer transition-colors shadow-sm"
									>
										Проверить сигнал вызова
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{/* TAB 4: FISCAL & AUTONOMY */}
			{activeSubTab === "fiscal" && (
				<div className="space-y-4 animate-fade-in">
					<div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] space-y-3">
						<h4 className="m-0 text-sm font-bold text-[var(--ink)] flex items-center gap-2">
							<ShieldCheck size={16} className="text-teal-600" aria-hidden="true" />
							Финансовая автономия врача и касса 54-ФЗ (Мандат 8e / 8n)
						</h4>

						<div className="space-y-2.5 pt-1">
							<label className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--line)] hover:bg-[var(--line)]/20 cursor-pointer transition-colors">
								<div>
									<strong className="block text-xs text-[var(--ink)]">
										Экспресс-чеки без ИНН физлиц (Мандат 8e)
									</strong>
									<span className="block text-[11px] text-[var(--muted)]">
										По закону 54-ФЗ для пациентов-физлиц ИНН не обязателен. Чек выбивается моментально.
									</span>
								</div>
								<input
									type="checkbox"
									checked={settings.simplifiedCashierWithoutInn}
									onChange={() => handleToggle("simplifiedCashierWithoutInn")}
									className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
								/>
							</label>

							<div className="p-3 rounded-xl border border-[var(--line)]">
								<div className="flex items-center justify-between mb-1">
									<strong className="text-xs text-[var(--ink)]">
										Лимит скидки врача без пароля руководителя
									</strong>
									<span className="text-xs font-bold text-teal-600">
										{settings.maxDoctorDiscountPercent}%
									</span>
								</div>
								<p className="m-0 text-[11px] text-[var(--muted)] mb-2">
									Врач может самостоятельно применить скидку (например, 100% при гарантийной переделке).
								</p>
								<input
									type="range"
									min={0}
									max={100}
									step={5}
									value={settings.maxDoctorDiscountPercent}
									onChange={(e) =>
										updateSettings({
											maxDoctorDiscountPercent: Number(e.target.value),
										})
									}
									className="w-full accent-teal-600 cursor-pointer"
								/>
							</div>

							<label className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--line)] hover:bg-[var(--line)]/20 cursor-pointer transition-colors">
								<div>
									<strong className="block text-xs text-[var(--ink)]">
										Семейный баланс и совместные кошельки родственников
									</strong>
									<span className="block text-[11px] text-[var(--muted)]">
										Разрешить списание депозитов членов семьи без разделения счетов
									</span>
								</div>
								<input
									type="checkbox"
									checked={settings.enableFamilyWalletSharedBalance}
									onChange={() => handleToggle("enableFamilyWalletSharedBalance")}
									className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
								/>
							</label>
						</div>
					</div>
				</div>
			)}

			{/* Bottom Action Footer */}
			<div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] flex flex-col sm:flex-row items-center justify-between gap-3">
				<button
					type="button"
					onClick={resetToDefaults}
					className="text-xs text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
				>
					Сбросить к заводским стандартам
				</button>

				<button
					type="button"
					onClick={() => void saveToServer()}
					disabled={isSaving}
					className="py-2.5 px-5 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
					data-testid="deep-settings-save-btn"
				>
					{isSaving ? (
						<>
							<RefreshCw size={14} className="animate-spin" aria-hidden="true" />
							<span>Сохраняем...</span>
						</>
					) : (
						<>
							<Save size={14} aria-hidden="true" />
							<span>Сохранить расширенные настройки</span>
						</>
					)}
				</button>
			</div>
		</div>
	);
}
