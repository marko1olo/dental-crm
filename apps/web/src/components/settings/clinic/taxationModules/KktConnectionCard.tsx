/**
 * apps/web/src/components/settings/clinic/taxationModules/KktConnectionCard.tsx
 *
 * KKT Fiscal Register Hardware Binding Component.
 */

import { Printer } from "lucide-react";
import type React from "react";
import { BRANCH_OPTIONS, KKM_MODEL_OPTIONS } from "./TaxationCardTypes";

interface KktConnectionCardProps {
	kkmActive: boolean;
	kkmModel: string;
	kkmSerialNumber: string;
	branchId: string;
	cashBoxName: string;
	onToggleKkmActive: (active: boolean) => void;
	onChangeKkmModel: (model: string) => void;
	onChangeSerialNumber: (serial: string) => void;
	onChangeBranch: (branchId: string) => void;
	onChangeCashBoxName: (name: string) => void;
}

export const KktConnectionCard: React.FC<KktConnectionCardProps> = ({
	kkmActive,
	kkmModel,
	kkmSerialNumber,
	branchId,
	cashBoxName,
	onToggleKkmActive,
	onChangeKkmModel,
	onChangeSerialNumber,
	onChangeBranch,
	onChangeCashBoxName,
}) => {
	return (
		<div className="space-y-2.5 pt-3 border-t border-[var(--line)]" data-testid="kkt-connection-card-section">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<Printer size={14} className="text-[var(--teal)] shrink-0" />
					<span>Фискальный регистратор ККТ и привязка к кассе:</span>
				</span>
				<label className="inline-flex items-center gap-1.5 text-xs text-[var(--ink)] cursor-pointer">
					<input
						type="checkbox"
						checked={kkmActive}
						onChange={(e) => onToggleKkmActive(e.target.checked)}
						data-testid="checkbox-kkm-active"
						className="rounded accent-teal-600"
					/>
					<span>Кассовый аппарат активен</span>
				</label>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
				<label className="space-y-1 block">
					<span className="text-[11px] font-semibold text-[var(--muted)] block">Модель кассового аппарата (ККТ)</span>
					<select
						aria-label="Модель ККТ"
						data-testid="select-kkm-model"
						value={kkmModel}
						onChange={(e) => onChangeKkmModel(e.target.value)}
						className="w-full h-9 px-2.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
					>
						{KKM_MODEL_OPTIONS.map((opt) => (
							<option key={opt.value} value={opt.value}>{opt.label}</option>
						))}
					</select>
				</label>

				<label className="space-y-1 block">
					<span className="text-[11px] font-semibold text-[var(--muted)] block">Заводской номер ККТ / ФН</span>
					<input
						type="text"
						aria-label="Заводской номер ККТ"
						data-testid="input-kkm-serial"
						value={kkmSerialNumber}
						onChange={(e) => onChangeSerialNumber(e.target.value)}
						placeholder="00108204958112"
						className="w-full h-9 px-2.5 text-xs font-mono rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
					/>
				</label>

				<label className="space-y-1 block">
					<span className="text-[11px] font-semibold text-[var(--muted)] block">Подразделение / Кассовый узел</span>
					<select
						aria-label="Подразделение кассы"
						data-testid="select-kkm-branch"
						value={branchId}
						onChange={(e) => onChangeBranch(e.target.value)}
						className="w-full h-9 px-2.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
					>
						{BRANCH_OPTIONS.map((opt) => (
							<option key={opt.value} value={opt.value}>{opt.label}</option>
						))}
					</select>
				</label>

				<label className="space-y-1 block">
					<span className="text-[11px] font-semibold text-[var(--muted)] block">Наименование кассы в учёте</span>
					<input
						type="text"
						aria-label="Наименование кассы"
						data-testid="input-cashbox-name"
						value={cashBoxName}
						onChange={(e) => onChangeCashBoxName(e.target.value)}
						placeholder="Основная касса"
						className="w-full h-9 px-2.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
					/>
				</label>
			</div>
		</div>
	);
};
