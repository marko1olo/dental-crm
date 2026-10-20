/**
 * apps/web/src/components/settings/deepClinicalModules/ClinicalSafetyRulesCard.tsx
 *
 * Allergy alerts, somatic stop-factors, anesthetic dosages/tech-maps,
 * warehouse critical stock thresholds, chair intercom, and 54-FZ fiscal autonomy.
 */

import React from "react";
import { AlertCircle, Package, Radio, ShieldAlert, ShieldCheck, Volume2 } from "lucide-react";
import {
	calculateMaxArticaineCarpules,
	DEFAULT_SOMATIC_SAFETY_RULES,
	type DeepClinicalSettings,
	type DeepClinicalSubTab,
} from "./deepClinicalTypes";

export interface ClinicalSafetyRulesCardProps {
	activeSubTab: Exclude<DeepClinicalSubTab, "protocols">;
	settings: DeepClinicalSettings;
	onToggle: (key: keyof DeepClinicalSettings) => void;
	onUpdateSettings: (partial: Partial<DeepClinicalSettings>) => void;
	onAddPackageItem: () => void;
	onRemovePackageItem: (id: string) => void;
	onTestIntercom: () => void;
}

export function ClinicalSafetyRulesCard({
	activeSubTab,
	settings,
	onToggle,
	onUpdateSettings,
	onAddPackageItem,
	onRemovePackageItem,
	onTestIntercom,
}: ClinicalSafetyRulesCardProps) {
	const standardDosage = calculateMaxArticaineCarpules(70, false);
	const cardioDosage = calculateMaxArticaineCarpules(70, true);

	if (activeSubTab === "warehouse") {
		return (
			<div className="space-y-4 animate-fade-in" data-testid="clinical-safety-warehouse-card">
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
							onChange={() => onToggle("autoDeductAnestheticsPackage")}
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
												onClick={() => onRemovePackageItem(item.id)}
												className="text-red-500 hover:text-red-600 p-0.5 text-xs font-bold cursor-pointer"
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
								onClick={onAddPackageItem}
								className="mt-2 py-1.5 px-3 text-xs font-semibold rounded-xl border border-[var(--line)] hover:bg-[var(--line)] text-teal-600 dark:text-teal-400 cursor-pointer transition-colors"
							>
								+ Добавить препарат в техкарту
							</button>
						</div>
					)}
				</div>

				<div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] space-y-3">
					<h4 className="m-0 text-sm font-bold text-[var(--ink)] flex items-center gap-2">
						<ShieldAlert size={16} className="text-teal-600" aria-hidden="true" />
						Аллерго-тревоги, соматические стоп-факторы и дозировки анестетиков
					</h4>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
						{DEFAULT_SOMATIC_SAFETY_RULES.map((rule) => (
							<div
								key={rule.id}
								className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]/50 space-y-1"
							>
								<strong className="block text-xs font-bold text-[var(--ink)]">
									{rule.conditionLabel}
								</strong>
								<span className="block text-[11px] text-[var(--muted)]">
									{rule.anestheticConstraint}
								</span>
							</div>
						))}
					</div>
					<div className="text-[11px] text-[var(--muted)] pt-1 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-2">
						<span>
							Норма Артикаин 4% (70 кг): до {standardDosage.maxCarpules} карпул ({standardDosage.maxDoseMg} мг, {standardDosage.recommendedDilution})
						</span>
						<span>
							При кардио-риске: до {cardioDosage.maxCarpules} карпул ({cardioDosage.maxDoseMg} мг, {cardioDosage.recommendedDilution})
						</span>
					</div>
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
										onUpdateSettings({
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
										onUpdateSettings({
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
								Мягкий овердрафт склада (списание при временной нехватке)
							</strong>
							<span className="block text-[11px] text-[var(--muted)]">
								Приём пациента никогда не блокируется из-за задержки накладной поставщика
							</span>
						</div>
						<input
							type="checkbox"
							checked={settings.allowSoftNegativeStock}
							onChange={() => onToggle("allowSoftNegativeStock")}
							className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
						/>
					</label>
				</div>
			</div>
		);
	}

	if (activeSubTab === "intercom") {
		return (
			<div className="space-y-4 animate-fade-in" data-testid="clinical-safety-intercom-card">
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
							onChange={() => onToggle("intercomEnabled")}
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
									onClick={onTestIntercom}
									className="py-1 px-3 text-xs font-bold rounded-lg bg-teal-600 text-white hover:bg-teal-700 cursor-pointer transition-colors shadow-sm"
								>
									Проверить сигнал вызова
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4 animate-fade-in" data-testid="clinical-safety-fiscal-card">
			<div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] space-y-3">
				<h4 className="m-0 text-sm font-bold text-[var(--ink)] flex items-center gap-2">
					<ShieldCheck size={16} className="text-teal-600" aria-hidden="true" />
					Финансовая автономия врача и касса 54-ФЗ
				</h4>

				<div className="space-y-2.5 pt-1">
					<label className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--line)] hover:bg-[var(--line)]/20 cursor-pointer transition-colors">
						<div>
							<strong className="block text-xs text-[var(--ink)]">
								Экспресс-чеки без ИНН физлиц
							</strong>
							<span className="block text-[11px] text-[var(--muted)]">
								По закону 54-ФЗ для пациентов-физлиц ИНН не обязателен. Чек выбивается моментально.
							</span>
						</div>
						<input
							type="checkbox"
							checked={settings.simplifiedCashierWithoutInn}
							onChange={() => onToggle("simplifiedCashierWithoutInn")}
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
								onUpdateSettings({
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
							onChange={() => onToggle("enableFamilyWalletSharedBalance")}
							className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
						/>
					</label>
				</div>
			</div>
		</div>
	);
}
