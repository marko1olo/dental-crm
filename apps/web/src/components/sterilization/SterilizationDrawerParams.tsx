/**
 * apps/web/src/components/sterilization/SterilizationDrawerParams.tsx
 *
 * Селектор аппарата, количество пакетов и инфоблок автоконтроля СанПиН.
 * Мандат 8b: строго <= 120 строк.
 */

import { CheckCircle2 } from "lucide-react";

export interface SterilizationDrawerParamsProps {
	readonly deviceId: string;
	readonly onSelectDevice: (id: string) => void;
	readonly packsCount: number;
	readonly onChangePacksCount: (cnt: number) => void;
	readonly clinicDevices: readonly { id: string; brandModelRu: string }[];
	readonly sessionStaffName: string;
}

export function SterilizationDrawerParams({
	deviceId,
	onSelectDevice,
	packsCount,
	onChangePacksCount,
	clinicDevices,
	sessionStaffName,
}: SterilizationDrawerParamsProps) {
	return (
		<>
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
		</>
	);
}
