/**
 * apps/web/src/components/settings/deepClinicalModules/ClinicalProtocolDefaultsCard.tsx
 *
 * Default examination templates, physiological norm 1-tap autofill, ICD-10 protocol
 * snippets, informed consent (IDS) templates, and DICOM/X-ray archive retention.
 */

import React from "react";
import { CheckCircle2, FileText, HardDrive, ShieldAlert } from "lucide-react";
import {
	DEFAULT_ICD10_PROTOCOL_TEMPLATES,
	INFORMED_CONSENT_TEMPLATES,
	type DeepClinicalSettings,
} from "./deepClinicalTypes";

export interface ClinicalProtocolDefaultsCardProps {
	settings: DeepClinicalSettings;
	onToggle: (key: keyof DeepClinicalSettings) => void;
	onUpdateSettings: (partial: Partial<DeepClinicalSettings>) => void;
}

export function ClinicalProtocolDefaultsCard({
	settings,
	onToggle,
	onUpdateSettings,
}: ClinicalProtocolDefaultsCardProps) {
	return (
		<div className="space-y-4 animate-fade-in" data-testid="clinical-protocol-defaults-card">
			<div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] space-y-3">
				<h4 className="m-0 text-sm font-bold text-[var(--ink)] flex items-center gap-2">
					<ShieldAlert size={16} className="text-teal-600" aria-hidden="true" />
					Обязательность клинических тестов в карте приёма
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
							onChange={() => onToggle("requireThermalTests")}
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
							onChange={() => onToggle("requirePercussionData")}
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
							onChange={() => onToggle("autofillSoapNormalByDefault")}
							className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
						/>
					</label>
				</div>
			</div>

			<div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] space-y-3">
				<h4 className="m-0 text-sm font-bold text-[var(--ink)] flex items-center gap-2">
					<CheckCircle2 size={16} className="text-teal-600" aria-hidden="true" />
					Базовые шаблоны осмотра и автоподстановки физиологической нормы
				</h4>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
					{DEFAULT_ICD10_PROTOCOL_TEMPLATES.map((tpl) => (
						<div
							key={tpl.code}
							className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]/50 space-y-1.5"
						>
							<div className="flex items-center justify-between gap-2">
								<strong className="text-xs font-bold text-[var(--ink)]">
									{tpl.diagnosisTitle}
								</strong>
								<span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 shrink-0">
									Гарантия {tpl.defaultWarrantyMonths} мес.
								</span>
							</div>
							<p className="m-0 text-[11px] text-[var(--muted)] leading-snug">
								{tpl.physiologicalNormSnippet}
							</p>
						</div>
					))}
				</div>
			</div>

			<div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] space-y-3">
				<h4 className="m-0 text-sm font-bold text-[var(--ink)] flex items-center gap-2">
					<FileText size={16} className="text-teal-600" aria-hidden="true" />
					Шаблоны информированных добровольных согласий (ИДС)
				</h4>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
					{INFORMED_CONSENT_TEMPLATES.map((t) => {
						const isSelected = settings.informedConsentTemplate === t.key;
						return (
							<button
								key={t.key}
								type="button"
								onClick={() =>
									onUpdateSettings({
										informedConsentTemplate: t.key,
									})
								}
								className={`text-left rounded-xl border transition-all cursor-pointer overflow-hidden flex flex-col ${
									isSelected
										? "bg-[var(--paper)] border-2 border-teal-600 text-[var(--ink)] shadow-xs"
										: "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:border-teal-500/40"
								}`}
							>
								<div className="px-3 py-2 border-b border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-2 w-full">
									<strong className="text-xs font-bold text-[var(--ink)]">
										{t.title}
									</strong>
									{isSelected && (
										<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-600 text-white shrink-0">
											Активен
										</span>
									)}
								</div>
								<span className="px-3 py-2 block text-[11px] leading-snug text-[var(--muted)] w-full">
									{t.desc}
								</span>
							</button>
						);
					})}
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
							onUpdateSettings({
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
	);
}
