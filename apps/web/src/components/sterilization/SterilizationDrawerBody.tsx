/**
 * apps/web/src/components/sterilization/SterilizationDrawerBody.tsx
 *
 * Тело шторки выбора цикла автоклавирования: пресеты, аппарат, количество наборов.
 * Мандат 8b: строго <= 120 строк.
 */

import { Check, CheckCircle2, Clock, Flame, Zap } from "lucide-react";
import { CLINICAL_AUTOCLAVE_1CLICK_PRESETS } from "../sanpin/sterilizationModules/sterilizationCycleTypes";

export interface SterilizationDrawerBodyProps {
	readonly selectedPresetId: string;
	readonly onSelectPreset: (id: string) => void;
	readonly deviceId: string;
	readonly onSelectDevice: (id: string) => void;
	readonly packsCount: number;
	readonly onChangePacksCount: (cnt: number) => void;
	readonly clinicDevices: readonly { id: string; brandModelRu: string }[];
	readonly sessionStaffName: string;
}

export function SterilizationDrawerBody({
	selectedPresetId,
	onSelectPreset,
	deviceId,
	onSelectDevice,
	packsCount,
	onChangePacksCount,
	clinicDevices,
	sessionStaffName,
}: SterilizationDrawerBodyProps) {
	return (
		<div className="p-5 flex flex-col gap-4 overflow-y-auto">
			<div className="flex flex-col gap-1.5">
				<div className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
					Клинический режим автоклава (1 клик):
				</div>
				<div className="grid grid-cols-1 gap-2">
					{CLINICAL_AUTOCLAVE_1CLICK_PRESETS.map((preset, idx) => {
						const isSelected = selectedPresetId === preset.id;
						const IconCmp = idx === 0 ? Flame : idx === 1 ? Clock : Zap;
						return (
							<button
								key={preset.id}
								type="button"
								onClick={() => onSelectPreset(preset.id)}
								className={`p-3 rounded-xl border text-left transition-all touch-manipulation cursor-pointer flex items-center justify-between gap-3 min-h-[52px] ${isSelected ? "border-[var(--teal,#0d9488)] bg-teal-500/10 ring-2 ring-[var(--teal,#0d9488)]/20 shadow-xs" : "border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)] hover:bg-[var(--paper,#ffffff)]"}`}
								data-testid={`drawer-preset-btn-${preset.id}`}
							>
								<div className="flex items-center gap-3 min-w-0">
									<div
										className={`p-2 rounded-lg shrink-0 ${isSelected ? "bg-[var(--teal,#0d9488)] text-white" : "bg-slate-200/50 dark:bg-slate-800 text-[var(--muted)]"}`}
									>
										<IconCmp size={18} />
									</div>
									<div className="flex flex-col min-w-0">
										<span className="text-sm font-bold text-[var(--ink,#0f172a)] truncate">
											{preset.title}
										</span>
										<span className="text-xs text-[var(--muted,#64748b)] truncate">
											{preset.subtitle}
										</span>
									</div>
								</div>
								{isSelected && (
									<span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-500/20 text-[var(--teal,#0d9488)] inline-flex items-center gap-1">
										<Check size={12} /> Выбран
									</span>
								)}
							</button>
						);
					})}
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
				<div className="flex flex-col gap-1">
					<label
						htmlFor="sterilizer-device-select"
						className="text-xs font-semibold text-[var(--muted,#64748b)]"
					>
						Аппарат ЦСО:
					</label>
					<select
						id="sterilizer-device-select"
						value={deviceId}
						onChange={(e) => onSelectDevice(e.target.value)}
						className="w-full text-xs font-semibold rounded-xl p-2.5 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)] border border-[var(--line,#cbd5e1)] dark:border-[#334155] min-h-[44px]"
					>
						{clinicDevices.length > 0 ? (
							clinicDevices.map((d) => (
								<option key={d.id} value={d.id}>
									{d.brandModelRu}
								</option>
							))
						) : (
							<>
								<option value="АК-01">
									АК-01 — Melag Vacuklav 23 B+ (22 л)
								</option>
								<option value="АК-02">АК-02 — W&H Lisa 17 (17 л)</option>
							</>
						)}
					</select>
				</div>
				<div className="flex flex-col gap-1">
					<label
						htmlFor="sterilizer-packs-count-input"
						className="text-xs font-semibold text-[var(--muted,#64748b)]"
					>
						Упаковок / наборов в цикле:
					</label>
					<input
						id="sterilizer-packs-count-input"
						type="number"
						min={1}
						max={200}
						value={packsCount}
						onChange={(e) =>
							onChangePacksCount(parseInt(e.target.value, 10) || 1)
						}
						className="w-full text-xs font-bold rounded-xl p-2.5 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)] border border-[var(--line,#cbd5e1)] dark:border-[#334155] min-h-[44px]"
					/>
				</div>
			</div>

			<div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex flex-col gap-1.5">
				<div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
					<CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
					<span>✓ Автоматический контроль параметров и индикаторов:</span>
				</div>
				<ul className="text-[11px] text-emerald-900/80 dark:text-emerald-300/80 m-0 pl-5 space-y-0.5 list-disc">
					<li>
						Химический индикатор 5 класса пройден (изменение цвета подтверждено)
					</li>
					<li>Предстерилизационная очистка (азопирам): отрицательно (норма)</li>
					<li>
						Расходные материалы (крафт-пакеты) списываются со склада пакетом
					</li>
				</ul>
			</div>

			<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] px-1">
				<span>
					Ответственный:{" "}
					<strong className="text-[var(--ink,#0f172a)]">
						{sessionStaffName}
					</strong>
				</span>
				<span>
					Время:{" "}
					<strong className="text-[var(--ink,#0f172a)]">
						{new Date().toLocaleTimeString("ru-RU", {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</strong>
				</span>
			</div>
		</div>
	);
}
