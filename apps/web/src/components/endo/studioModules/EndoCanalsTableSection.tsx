/**
 * DENTE Dental CRM — Endodontic Canals Table & Cards Section
 * apps/web/src/components/endo/studioModules/EndoCanalsTableSection.tsx
 *
 * Декомпозированная секция разметки и управления анатомическими корневыми каналами (Мандаты 8e, 8am, Apple HIG).
 * Поддержка десктопной таблицы с быстрым вводом и сенсорных карточек Apple HIG для мобильных устройств.
 */

import React from "react";
import { SlidersHorizontal, Check, Trash2 } from "lucide-react";
import type { EndoCanalData } from "@dental/shared";
import {
	CANONICAL_MAF_SIZES,
	CURATED_ISO_MAF_OPTIONS,
	CURATED_SEALERS,
} from "../endodonticsCatalogData";

export interface EndoCanalsTableSectionProps {
	readonly activeTooth: number;
	readonly canals: readonly EndoCanalData[];
	readonly onApplyAllCanalsApex00: () => void;
	readonly onUpdateCanal: (id: string, field: keyof EndoCanalData, val: any) => void;
	readonly onToggleObliteration: (id: string) => void;
	readonly onAdjustLength: (id: string, delta: number) => void;
	readonly onUpdateCanalLength: (id: string, rawVal: number | string) => void;
	readonly onRemoveCanal: (id: string) => void;
}

export function EndoCanalsTableSection(props: EndoCanalsTableSectionProps) {
	const {
		activeTooth,
		canals,
		onApplyAllCanalsApex00,
		onUpdateCanal,
		onToggleObliteration,
		onAdjustLength,
		onUpdateCanalLength,
		onRemoveCanal,
	} = props;

	return (
		<div className="border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl bg-[var(--paper,#ffffff)] dark:bg-slate-900/50 overflow-hidden shadow-xs">
			<div className="p-3 bg-[var(--surface,#f8fafc)] dark:bg-slate-800/60 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<SlidersHorizontal size={14} className="text-[var(--teal,#0d9488)]" />
					<span className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-white">Корневые каналы зуба #{activeTooth}</span>
					<span className="text-[11px] text-[var(--muted,#64748b)]">({canals.length} {canals.length === 1 ? "канал" : "канала"})</span>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onApplyAllCanalsApex00}
						data-testid="btn-endo-all-apex-00"
						className="btn-endo-all-apex-00 min-h-[36px] sm:min-h-[28px] h-8 sm:h-7 px-2.5 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
						title="Выставить 0.0 Apex на все каналы в 1 клик"
					>
						<Check size={13} className="text-emerald-600 dark:text-emerald-400" />
						<span>Все 0.0 (Apex)</span>
					</button>
				</div>
			</div>

			{/* Desktop View */}
			<div className="hidden sm:block overflow-x-auto">
				<table className="w-full text-left border-collapse text-xs">
					<thead>
						<tr className="border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-[var(--muted,#64748b)]">
							<th className="p-2.5 font-bold">Канал</th>
							<th className="p-2.5 font-bold">Склероз</th>
							<th className="p-2.5 font-bold">Длина WL</th>
							<th className="p-2.5 font-bold">Апекс</th>
							<th className="p-2.5 font-bold">Мастер-файл MAF</th>
							<th className="p-2.5 font-bold">Конусность</th>
							<th className="p-2.5 font-bold">Обтурация и силер</th>
							<th className="p-2.5 text-center font-bold">Удалить</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-[var(--line,#e2e8f0)] dark:divide-slate-800">
						{canals.map((c) => (
							<tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
								<td className="p-2.5 font-bold text-[var(--ink,#0f172a)] dark:text-white">
									<input
										type="text"
										value={c.canalName}
										onChange={(e) => onUpdateCanal(c.id, "canalName", e.target.value)}
										className="w-16 px-1.5 py-1 rounded border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-transparent text-xs font-bold"
									/>
								</td>
								<td className="p-2.5">
									<label className="inline-flex items-center gap-1 cursor-pointer">
										<input
											type="checkbox"
											checked={Boolean(c.isObliterated)}
											onChange={() => onToggleObliteration(c.id)}
											className="rounded text-[var(--teal,#0d9488)] cursor-pointer"
										/>
										<span className="text-[11px] text-[var(--muted,#64748b)]">Облит.</span>
									</label>
								</td>
								<td className="p-2.5">
									<div className="flex items-center gap-1">
										<button
											type="button"
											onClick={() => onAdjustLength(c.id, -0.5)}
											className="w-6 h-6 rounded border border-[var(--line,#cbd5e1)] dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
										>
											-
										</button>
										<input
											type="number"
											step="0.5"
											min="10"
											max="35"
											value={c.workingLengthMm || 0}
											onChange={(e) => onUpdateCanalLength(c.id, e.target.value)}
											className="w-14 px-1.5 py-1 rounded border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-transparent text-xs text-center font-bold"
										/>
										<button
											type="button"
											onClick={() => onAdjustLength(c.id, 0.5)}
											className="w-6 h-6 rounded border border-[var(--line,#cbd5e1)] dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
										>
											+
										</button>
									</div>
								</td>
								<td className="p-2.5">
									<select
										value={c.apexLocatorReading || "0.0 (Apex)"}
										onChange={(e) => onUpdateCanal(c.id, "apexLocatorReading", e.target.value)}
										className="px-1.5 py-1 rounded border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-transparent text-xs font-semibold text-emerald-600 dark:text-emerald-400 cursor-pointer"
									>
										<option value="0.0 (Apex)">0.0 Apex</option>
										<option value="-0.5 мм">-0.5 мм</option>
										<option value="+0.5 мм">+0.5 мм</option>
										<option value="-1.0 мм">-1.0 мм</option>
										<option value="За апексом">За апексом</option>
									</select>
								</td>
								<td className="p-2.5">
									<select
										value={c.masterApicalFile}
										onChange={(e) => onUpdateCanal(c.id, "masterApicalFile", e.target.value)}
										className="px-1.5 py-1 rounded border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-transparent text-xs max-w-[130px] truncate cursor-pointer"
									>
										{CANONICAL_MAF_SIZES.map((opt) => (
											<option key={opt.label} value={opt.label}>
												{opt.label} ({opt.system})
											</option>
										))}
										{CURATED_ISO_MAF_OPTIONS.map((opt) => (
											<option key={opt} value={opt}>
												{opt}
											</option>
										))}
									</select>
								</td>
								<td className="p-2.5">
									<select
										value={c.taper}
										onChange={(e) => onUpdateCanal(c.id, "taper", e.target.value)}
										className="px-1.5 py-1 rounded border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-transparent text-xs max-w-[110px] truncate cursor-pointer"
									>
										<option value=".04 (Конусность 4%)">.04 (4%)</option>
										<option value=".06 (Конусность 6%)">.06 (6%)</option>
										<option value=".02 (Конусность 2%)">.02 (2%)</option>
									</select>
								</td>
								<td className="p-2.5">
									<select
										value={c.sealer || "AH Plus (эпоксидный герметик)"}
										onChange={(e) => onUpdateCanal(c.id, "sealer", e.target.value)}
										className="px-1.5 py-1 rounded border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-transparent text-xs max-w-[150px] truncate cursor-pointer"
									>
										{CURATED_SEALERS.map((s) => (
											<option key={s} value={s}>
												{s}
											</option>
										))}
									</select>
								</td>
								<td className="p-2.5 text-center">
									{canals.length > 1 && (
										<button
											type="button"
											onClick={() => onRemoveCanal(c.id)}
											className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 inline-flex items-center justify-center cursor-pointer"
											title="Удалить"
										>
											<Trash2 size={13} />
										</button>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Mobile Grouped Cards View (Apple HIG) */}
			<div className="sm:hidden p-3 divide-y divide-[var(--line,#e2e8f0)] dark:divide-slate-800 space-y-3">
				{canals.map((c) => (
					<div key={c.id} className="pt-3 first:pt-0 space-y-2.5">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<input
									type="text"
									value={c.canalName}
									onChange={(e) => onUpdateCanal(c.id, "canalName", e.target.value)}
									className="w-16 px-2 py-1 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--surface,#f8fafc)] dark:bg-slate-800 text-xs font-bold"
								/>
								<span className="text-xs font-bold text-[var(--teal,#0d9488)]">
									{c.isObliterated ? "ОБЛИТЕРИРОВАН" : `${c.workingLengthMm} мм`}
								</span>
							</div>
							<div className="flex items-center gap-2">
								<label className="flex items-center gap-1 text-[11px] text-[var(--muted,#64748b)]">
									<input
										type="checkbox"
										checked={Boolean(c.isObliterated)}
										onChange={() => onToggleObliteration(c.id)}
										className="rounded text-[var(--teal,#0d9488)]"
									/>
									<span>Склероз</span>
								</label>
								{canals.length > 1 && (
									<button
										type="button"
										onClick={() => onRemoveCanal(c.id)}
										className="w-9 h-9 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center cursor-pointer"
									>
										<Trash2 size={14} />
									</button>
								)}
							</div>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-[11px] text-[var(--muted,#64748b)] w-14">Длина:</span>
							<div className="flex items-center gap-1 flex-1">
								<button
									type="button"
									onClick={() => onAdjustLength(c.id, -0.5)}
									className="min-h-[44px] w-11 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 font-bold text-sm bg-[var(--paper,#ffffff)] dark:bg-slate-800 flex items-center justify-center cursor-pointer"
								>
									-
								</button>
								<input
									type="number"
									step="0.5"
									min="10"
									max="35"
									value={c.workingLengthMm || 0}
									onChange={(e) => onUpdateCanalLength(c.id, e.target.value)}
									className="min-h-[44px] flex-1 px-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-center font-bold text-sm"
								/>
								<button
									type="button"
									onClick={() => onAdjustLength(c.id, 0.5)}
									className="min-h-[44px] w-11 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 font-bold text-sm bg-[var(--paper,#ffffff)] dark:bg-slate-800 flex items-center justify-center cursor-pointer"
								>
									+
								</button>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<div>
								<span className="text-[10px] text-[var(--muted,#64748b)] block mb-1">Апекслокатор:</span>
								<select
									value={c.apexLocatorReading || "0.0 (Apex)"}
									onChange={(e) => onUpdateCanal(c.id, "apexLocatorReading", e.target.value)}
									className="min-h-[44px] w-full px-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
								>
									<option value="0.0 (Apex)">0.0 Apex</option>
									<option value="-0.5 мм">-0.5 мм</option>
									<option value="+0.5 мм">+0.5 мм</option>
									<option value="-1.0 мм">-1.0 мм</option>
									<option value="За апексом">За апексом</option>
								</select>
							</div>
							<div>
								<span className="text-[10px] text-[var(--muted,#64748b)] block mb-1">Мастер-файл MAF:</span>
								<select
									value={c.masterApicalFile}
									onChange={(e) => onUpdateCanal(c.id, "masterApicalFile", e.target.value)}
									className="min-h-[44px] w-full px-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-xs font-medium"
								>
									{CANONICAL_MAF_SIZES.map((opt) => (
										<option key={opt.label} value={opt.label}>
											{opt.label}
										</option>
									))}
									{CURATED_ISO_MAF_OPTIONS.map((opt) => (
										<option key={opt} value={opt}>
											{opt}
										</option>
									))}
								</select>
							</div>
						</div>
						<div>
							<span className="text-[10px] text-[var(--muted,#64748b)] block mb-1">Силер / герметик:</span>
							<select
								value={c.sealer || "AH Plus (эпоксидный герметик)"}
								onChange={(e) => onUpdateCanal(c.id, "sealer", e.target.value)}
								className="min-h-[44px] w-full px-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-xs font-medium"
							>
								{CURATED_SEALERS.map((s) => (
									<option key={s} value={s}>
										{s}
									</option>
								))}
							</select>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
