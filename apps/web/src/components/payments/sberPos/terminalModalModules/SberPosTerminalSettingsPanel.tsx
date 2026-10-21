import type {
	SberPosHardwareModel,
	SberPosTerminalConfig,
} from "@dental/shared";
import { CheckCheck } from "lucide-react";
import type React from "react";
import { showToast } from "../../../GlobalToast.js";
import {
	SBER_HARDWARE_PROFILES,
	saveSberTerminalConfig,
} from "../sberPosPresets.js";

export interface SberPosTerminalSettingsPanelProps {
	readonly config: SberPosTerminalConfig;
	readonly setConfig: React.Dispatch<
		React.SetStateAction<SberPosTerminalConfig>
	>;
	readonly setSavedConfig: React.Dispatch<
		React.SetStateAction<SberPosTerminalConfig | null>
	>;
}

export const SberPosTerminalSettingsPanel: React.FC<
	SberPosTerminalSettingsPanelProps
> = ({ config, setConfig, setSavedConfig }) => (
	<div className="p-4 border-b border-[var(--line,#e2e8f0)] bg-emerald-500/5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
		<div>
			<span className="font-semibold text-[var(--ink,#0f172a)] block mb-1">
				Модель терминала:
			</span>
			<select
				value={config.hardwareModel}
				onChange={(e) =>
					setConfig((prev) => ({
						...prev,
						hardwareModel: e.target.value as SberPosHardwareModel,
					}))
				}
				className="w-full h-9 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] px-2 text-xs font-medium text-[var(--ink,#0f172a)]"
			>
				{SBER_HARDWARE_PROFILES.map((p) => (
					<option key={p.id} value={p.id}>
						{p.modelName}
					</option>
				))}
			</select>
		</div>
		<div>
			<span className="font-semibold text-[var(--ink,#0f172a)] block mb-1">
				Хост и Порт драйвера:
			</span>
			<div className="flex gap-2">
				<input
					type="text"
					value={config.hostIp}
					onChange={(e) =>
						setConfig((prev) => ({ ...prev, hostIp: e.target.value }))
					}
					className="flex-1 h-9 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] px-2 text-xs font-mono"
				/>
				<input
					type="number"
					value={config.hostPort}
					onChange={(e) =>
						setConfig((prev) => ({ ...prev, hostPort: Number(e.target.value) }))
					}
					className="w-20 h-9 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] px-2 text-xs font-mono"
				/>
			</div>
		</div>
		<div>
			<span className="font-semibold text-[var(--ink,#0f172a)] block mb-1">
				TID / MID Сбербанка:
			</span>
			<div className="flex gap-2">
				<input
					type="text"
					value={config.terminalId}
					onChange={(e) =>
						setConfig((prev) => ({ ...prev, terminalId: e.target.value }))
					}
					placeholder="TID"
					className="w-24 h-9 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] px-2 text-xs font-mono"
				/>
				<input
					type="text"
					value={config.merchantId}
					onChange={(e) =>
						setConfig((prev) => ({ ...prev, merchantId: e.target.value }))
					}
					placeholder="MID"
					className="flex-1 h-9 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] px-2 text-xs font-mono"
				/>
			</div>
		</div>
		<div className="col-span-1 sm:col-span-3 flex items-center justify-between pt-2 border-t border-[var(--line,#e2e8f0)]">
			<span className="text-[11px] text-[var(--muted,#64748b)]">
				Параметры сохраняются локально для текущего рабочего места кассира.
			</span>
			<button
				type="button"
				data-testid="save-sber-config-btn"
				onClick={() => {
					saveSberTerminalConfig(config);
					setSavedConfig(config);
					showToast("Параметры терминала Сбербанк сохранены", "success");
				}}
				className="min-h-[36px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
			>
				<CheckCheck className="w-3.5 h-3.5" />
				<span>Сохранить параметры терминала</span>
			</button>
		</div>
	</div>
);
