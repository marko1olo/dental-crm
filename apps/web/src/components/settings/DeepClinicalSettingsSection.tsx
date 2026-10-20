/**
 * apps/web/src/components/settings/DeepClinicalSettingsSection.tsx
 *
 * Rich Deep Clinical & Operational Settings Studio (Расширенные богатые настройки).
 * Authorities:
 * - Mandate 8e: Doctor Autonomy (No blocking barriers, free discounts, physiological norm).
 * - Mandate 8d: 7 Deadly Sins of UI (Zero cartoon emojis; strictly Lucide SVG icons).
 * - Mandate 8s: Friction-Killer over Reality Simulators.
 * - Mandate 8b: File line count strictly <= 500 lines (facade <= 250 lines).
 */

import React, { useState } from "react";
import {
	FileText,
	Package,
	Radio,
	RefreshCw,
	Save,
	ShieldCheck,
	Sliders,
} from "lucide-react";
import {
	useDeepClinicalSettingsStore,
	type AnestheticPackageItem,
	type DeepClinicalSettings,
} from "../../store/deepClinicalSettingsStore";
import { showToast } from "../GlobalToast";
import { ClinicalProtocolDefaultsCard } from "./deepClinicalModules/ClinicalProtocolDefaultsCard";
import { ClinicalSafetyRulesCard } from "./deepClinicalModules/ClinicalSafetyRulesCard";
import type { DeepClinicalSubTab } from "./deepClinicalModules/deepClinicalTypes";

export function DeepClinicalSettingsSection() {
	const { settings, isSaving, updateSettings, applyPreset, saveToServer, resetToDefaults } =
		useDeepClinicalSettingsStore();

	const [activeSubTab, setActiveSubTab] = useState<DeepClinicalSubTab>("protocols");

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

			{activeSubTab === "protocols" ? (
				<ClinicalProtocolDefaultsCard
					settings={settings}
					onToggle={handleToggle}
					onUpdateSettings={updateSettings}
				/>
			) : (
				<ClinicalSafetyRulesCard
					activeSubTab={activeSubTab}
					settings={settings}
					onToggle={handleToggle}
					onUpdateSettings={updateSettings}
					onAddPackageItem={handleAddPackageItem}
					onRemovePackageItem={handleRemovePackageItem}
					onTestIntercom={handleTestIntercom}
				/>
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
