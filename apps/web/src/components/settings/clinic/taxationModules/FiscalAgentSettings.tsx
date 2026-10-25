/**
 * apps/web/src/components/settings/clinic/taxationModules/FiscalAgentSettings.tsx
 *
 * OFD Operator, FFD Protocol, Offline FN Buffer & Fiscal Agent Settings.
 * Supports FFD 1.2 Tags 1057/1222 for Doctor Chair Rental & Dental Lab Settlements.
 */

import { HardDrive, ShieldCheck } from "lucide-react";
import type React from "react";
import type { Ffd12AgentSign } from "@dental/shared";
import { FISCAL_AGENT_OPTIONS, OFD_PROVIDER_OPTIONS } from "./TaxationCardTypes";

interface FiscalAgentSettingsProps {
	ofdProvider: string;
	ffdVersion: "1.2" | "1.05";
	autoSendReceipt: boolean;
	allowAutonomousBuffer: boolean;
	agentSign?: Ffd12AgentSign | "none";
	onChangeOfdProvider: (provider: string) => void;
	onChangeFfdVersion: (version: "1.2" | "1.05") => void;
	onToggleAutoSendReceipt: (autoSend: boolean) => void;
	onToggleAutonomousBuffer: (buffer: boolean) => void;
	onChangeAgentSign?: (sign: Ffd12AgentSign | "none") => void;
}

export const FiscalAgentSettings: React.FC<FiscalAgentSettingsProps> = ({
	ofdProvider, ffdVersion, autoSendReceipt, allowAutonomousBuffer, agentSign = "none",
	onChangeOfdProvider, onChangeFfdVersion, onToggleAutoSendReceipt, onToggleAutonomousBuffer, onChangeAgentSign,
}) => {
	return (
		<div className="space-y-3 pt-3 border-t border-[var(--line)]" data-testid="fiscal-agent-settings-section">
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
				<label className="space-y-1 block">
					<span className="text-[11px] font-semibold text-[var(--muted)] block">Оператор фискальных данных (ОФД)</span>
					<select
						aria-label="Оператор фискальных данных"
						data-testid="select-ofd-provider"
						value={ofdProvider}
						onChange={(e) => onChangeOfdProvider(e.target.value)}
						className="w-full h-9 px-2.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
					>
						{OFD_PROVIDER_OPTIONS.map((opt) => (
							<option key={opt.value} value={opt.value}>{opt.label}</option>
						))}
					</select>
				</label>

				<label className="space-y-1 block">
					<span className="text-[11px] font-semibold text-[var(--muted)] block">Формат фискальных документов</span>
					<select
						aria-label="Формат фискальных документов"
						data-testid="select-ffd-version"
						value={ffdVersion}
						onChange={(e) => onChangeFfdVersion(e.target.value === "1.05" ? "1.05" : "1.2")}
						className="w-full h-9 px-2.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
					>
						<option value="1.2">Формат чеков 1.2 (с маркировкой лекарств и имплантов)</option>
						<option value="1.05">Формат чеков 1.05 (базовый режим медуслуг)</option>
					</select>
				</label>

				<div className="flex flex-col justify-center space-y-1.5 py-0.5">
					<label className="flex items-center gap-2 text-xs text-[var(--ink)] cursor-pointer">
						<input type="checkbox" checked={autoSendReceipt} onChange={(e) => onToggleAutoSendReceipt(e.target.checked)} data-testid="checkbox-auto-send-receipt" className="rounded accent-teal-600" />
						<span>Электронный чек пациенту (SMS / Email)</span>
					</label>
					<label className="flex items-center gap-2 text-xs text-[var(--ink)] cursor-pointer">
						<input type="checkbox" checked={allowAutonomousBuffer} onChange={(e) => onToggleAutonomousBuffer(e.target.checked)} data-testid="checkbox-autonomous-buffer" className="rounded accent-teal-600" />
						<span>Офлайн-очередь ФН при обрыве ОФД</span>
					</label>
				</div>
			</div>

			{onChangeAgentSign && (
				<div className="pt-2 border-t border-[var(--line)]/50">
					<label className="space-y-1 block max-w-md">
						<span className="text-[11px] font-semibold text-[var(--muted)] block">Признак агента (для комиссий и лабораторий)</span>
						<select
							aria-label="Признак агента"
							data-testid="select-agent-sign"
							value={agentSign}
							onChange={(e) => onChangeAgentSign(e.target.value as Ffd12AgentSign | "none")}
							className="w-full h-9 px-2.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
						>
							{FISCAL_AGENT_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value}>{opt.label}</option>
							))}
						</select>
					</label>
				</div>
			)}

			<div className="px-3 py-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--muted)]">
				<span className="inline-flex items-center gap-1.5">
					<ShieldCheck size={14} className="text-[var(--teal)] shrink-0" />
					<span>Оплата физлиц принимается без обязательного ИНН плательщика.</span>
				</span>
				<span className="inline-flex items-center gap-1 font-mono text-[var(--ink)]">
					<HardDrive size={12} className="text-[var(--teal)] shrink-0" />
					<span>Сплит: Наличные · Карта · СБП · ДМС · Депозит</span>
				</span>
			</div>
		</div>
	);
};
