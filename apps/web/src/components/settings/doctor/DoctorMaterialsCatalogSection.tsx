/**
 * apps/web/src/components/settings/doctor/DoctorMaterialsCatalogSection.tsx
 *
 * Реестр 90% стоматологических материалов РФ/СНГ с 1-клик выбором
 * и автогенерацией персонализированного фрагмента протокола ЕМК (Форма 043/у).
 *
 * Инварианты:
 * - Мандат 8b: строго <= 800 строк.
 * - Мандат 8c: стеклянные панели var(--glass-panel), var(--glass-border), blur(12px).
 * - Мандат 8d: ноль мультяшных эмодзи.
 * - Мандат 8e: врачебная автономия (1 клик = автосохранение).
 */

import React, { useMemo, useState } from "react";
import {
	Activity,
	Check,
	Copy,
	Search,
	Sparkles,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
import {
	ADHESIVE_OPTIONS,
	ANESTHETIC_OPTIONS,
	COMPOSITE_OPTIONS,
	ETCHANT_OPTIONS,
	ISOLATION_OPTIONS,
	useDoctorPreferencesStore,
	type AdhesiveSystem,
	type AnestheticKey,
	type ClinicalMaterialOption,
	type CompositeMaterial,
	type EtchantGel,
	type IsolationType,
} from "../../../store/doctorPreferencesStore";
import { buildDoctorPersonalizedTherapySnippet } from "../protocolSnippetHelpers";

type MaterialCategoryTab = "composites" | "adhesives" | "anesthetics" | "isolation" | "etchants";

export interface DoctorMaterialsCatalogSectionProps {
	readonly className?: string | undefined;
}

export function DoctorMaterialsCatalogSection({ className = "" }: DoctorMaterialsCatalogSectionProps) {
	const preferences = useDoctorPreferencesStore((s) => s.preferences);
	const updatePreferences = useDoctorPreferencesStore((s) => s.updatePreferences);

	const [activeMaterialTab, setActiveMaterialTab] = useState<MaterialCategoryTab>("composites");
	const [materialSearchQuery, setMaterialSearchQuery] = useState<string>("");

	// Фильтрация материалов по поисковому запросу и активной вкладке
	const filteredMaterials = useMemo(() => {
		let list: readonly ClinicalMaterialOption[] = [];
		switch (activeMaterialTab) {
			case "composites":
				list = COMPOSITE_OPTIONS;
				break;
			case "adhesives":
				list = ADHESIVE_OPTIONS;
				break;
			case "anesthetics":
				list = ANESTHETIC_OPTIONS;
				break;
			case "isolation":
				list = ISOLATION_OPTIONS;
				break;
			case "etchants":
				list = ETCHANT_OPTIONS;
				break;
		}

		const q = materialSearchQuery.trim().toLowerCase();
		if (!q) return list;
		return list.filter(
			(m) =>
				m.name.toLowerCase().includes(q) ||
				m.title.toLowerCase().includes(q) ||
				m.manufacturer.toLowerCase().includes(q) ||
				m.description.toLowerCase().includes(q) ||
				(m.category && m.category.toLowerCase().includes(q)) ||
				(m.badge && m.badge.toLowerCase().includes(q)),
		);
	}, [activeMaterialTab, materialSearchQuery]);

	// Проверка, является ли материал выбранным по умолчанию
	const isMaterialSelected = (id: string): boolean => {
		switch (activeMaterialTab) {
			case "composites":
				return preferences.defaultComposite === id;
			case "adhesives":
				return preferences.defaultAdhesive === id;
			case "anesthetics":
				return preferences.favoriteAnesthetic === id;
			case "isolation":
				return preferences.defaultIsolation === id;
			case "etchants":
				return preferences.defaultEtchant === id;
		}
	};

	// 1-клик назначение любимого материала
	const handleSelectFavoriteMaterial = (item: ClinicalMaterialOption) => {
		switch (activeMaterialTab) {
			case "composites":
				updatePreferences({ defaultComposite: item.id as CompositeMaterial });
				break;
			case "adhesives":
				updatePreferences({ defaultAdhesive: item.id as AdhesiveSystem });
				break;
			case "anesthetics":
				updatePreferences({ favoriteAnesthetic: item.id as AnestheticKey });
				break;
			case "isolation":
				updatePreferences({ defaultIsolation: item.id as IsolationType });
				break;
			case "etchants":
				updatePreferences({ defaultEtchant: item.id as EtchantGel });
				break;
		}
		showToast(`Материал «${item.name}» выбран и подтягивается в протокол ЕМК`, "success");
	};

	// Персонализированный сниппет протокола ЕМК для предпросмотра
	const liveSoapSnippet = useMemo(() => {
		return buildDoctorPersonalizedTherapySnippet(preferences);
	}, [preferences]);

	const handleCopyLiveSnippet = () => {
		navigator.clipboard.writeText(liveSoapSnippet);
		showToast("Протокол ЕМК скопирован в буфер обмена", "success");
	};

	return (
		<div
			className={`p-3.5 sm:p-4 rounded-2xl bg-[var(--glass-panel,var(--paper-soft))] border border-[var(--glass-border,var(--line))] backdrop-blur-md space-y-3 shadow-xs ${className}`}
			data-testid="doctor-materials-catalog-section"
		>
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div>
					<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
						<Activity size={15} className="text-teal-600" />
						<span>Реестр клинических материалов (90% рынка РФ/СНГ) и изоляция</span>
					</label>
					<p className="m-0 text-[11px] text-[var(--muted)]">
						1-клик выбор любимого материала с автоматическим подтягиванием в протокол медицинской карты
					</p>
				</div>
				{/* Поиск материала */}
				<div className="relative min-w-[240px]">
					<Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
					<input
						type="text"
						value={materialSearchQuery}
						onChange={(e) => setMaterialSearchQuery(e.target.value)}
						placeholder="Поиск материала (Filtek, Asteria, Kerr...)"
						className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:border-teal-500"
					/>
				</div>
			</div>

			{/* Вкладки категорий материалов */}
			<div className="flex gap-1.5 flex-wrap border-b border-[var(--line)] pb-2">
				{[
					{ id: "composites" as const, label: `Композиты (${COMPOSITE_OPTIONS.length})` },
					{ id: "adhesives" as const, label: `Адгезивы (${ADHESIVE_OPTIONS.length})` },
					{ id: "anesthetics" as const, label: `Анестетики (${ANESTHETIC_OPTIONS.length})` },
					{ id: "isolation" as const, label: `Изоляция (${ISOLATION_OPTIONS.length})` },
					{ id: "etchants" as const, label: `Протравка (${ETCHANT_OPTIONS.length})` },
				].map((tab) => {
					const isActive = activeMaterialTab === tab.id;
					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveMaterialTab(tab.id)}
							className={`h-8 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border select-none ${
								isActive
									? "bg-teal-600 text-white border-teal-600 shadow-2xs"
									: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
							data-testid={`material-tab-${tab.id}`}
						>
							{tab.label}
						</button>
					);
				})}
			</div>

			{/* Сетка материалов */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
				{filteredMaterials.map((mat) => {
					const isSelected = isMaterialSelected(mat.id);
					return (
						<button
							key={mat.id}
							type="button"
							onClick={() => handleSelectFavoriteMaterial(mat)}
							className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-1.5 min-h-[96px] ${
								isSelected
									? "bg-[var(--paper)] border-teal-600 shadow-xs ring-2 ring-teal-500/40"
									: "bg-[var(--paper)] border-[var(--line)] hover:border-teal-500/60"
							}`}
							data-testid={`material-item-${mat.id}`}
						>
							<div className="flex items-start justify-between gap-1.5 w-full">
								<div className="min-w-0">
									<div className="flex items-center gap-1.5 flex-wrap">
										<span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]">
											#{mat.popularityRank}
										</span>
										<span className="text-xs font-bold text-[var(--ink)] leading-snug">
											{mat.name}
										</span>
									</div>
									<span className="text-[10px] text-[var(--muted)] block mt-0.5">
										{mat.manufacturer}
									</span>
								</div>
								{isSelected ? (
									<span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0" title="Выбран по умолчанию">
										<Check size={12} className="stroke-[3]" />
									</span>
								) : (
									<span className="w-5 h-5 rounded-full border border-[var(--line)] shrink-0" title="Нажмите для выбора" />
								)}
							</div>

							<p className="text-[11px] text-[var(--muted)] m-0 line-clamp-2 leading-relaxed">
								{mat.description}
							</p>

							<div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-[var(--line)]/50">
								<span className="text-[10px] font-medium text-teal-700 dark:text-teal-300">
									{mat.category || mat.generation || mat.badge || "Стандарт"}
								</span>
								{isSelected && (
									<span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.2 rounded">
										Любимый в ЕМК
									</span>
								)}
							</div>
						</button>
					);
				})}
			</div>

			{/* Живой протокол ЕМК (Форма 043/у) с подтягиванием любимых материалов врача */}
			<div className="p-3 rounded-xl bg-[var(--paper)] border border-teal-500/30 space-y-2 mt-2">
				<div className="flex items-center justify-between gap-2">
					<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
						<Sparkles size={14} className="text-teal-600" />
						<span>Автоматический фрагмент протокола ЕМК (Форма 043/у) с вашими материалами</span>
					</span>
					<button
						type="button"
						onClick={handleCopyLiveSnippet}
						className="text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
						title="Скопировать готовый текст для Формы 043/у"
					>
						<Copy size={12} />
						<span>Копировать</span>
					</button>
				</div>
				<p className="text-xs text-[var(--muted)] m-0 leading-relaxed font-mono p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] select-all">
					{liveSoapSnippet}
				</p>
			</div>
		</div>
	);
}

export default DoctorMaterialsCatalogSection;
