/**
 * StagePaymentFiscalTab.tsx — Вкладка фискализации 54-ФЗ и кассовых чеков (DENTE CRM).
 *
 * Содержит:
 * 1. Настройку параметров чека (этап, признак расчета: аванс / закрытие / 100%, способ оплаты).
 * 2. Предпросмотр термоленты фискального чека с тегами 1214, 1212, ФН/ФД/ФПД и QR-кодом ФНС.
 */

import React from "react";
import { QrCode } from "lucide-react";
import { formatKopecksRu } from "@dental/shared";
import type { MilestoneStage, StageFiscalReceipt54Fz } from "./stagePaymentEngine.js";

export interface StagePaymentFiscalTabProps {
	readonly stages: readonly MilestoneStage[];
	readonly selectedStageForFiscalId: string;
	readonly onSelectStageForFiscal: (stageId: string) => void;
	readonly fiscalPaymentType: "advance" | "completion" | "full";
	readonly onFiscalPaymentTypeChange: (type: "advance" | "completion" | "full") => void;
	readonly fiscalPaymentMethod: "CASH" | "BANK_CARD" | "PATIENT_DEPOSIT" | "SBP_QR";
	readonly onFiscalPaymentMethodChange: (method: "CASH" | "BANK_CARD" | "PATIENT_DEPOSIT" | "SBP_QR") => void;
	readonly onGenerateFiscalReceipt: () => void;
	readonly activeFiscalReceipt: StageFiscalReceipt54Fz | null;
}

export const StagePaymentFiscalTab: React.FC<StagePaymentFiscalTabProps> = ({
	stages,
	selectedStageForFiscalId,
	onSelectStageForFiscal,
	fiscalPaymentType,
	onFiscalPaymentTypeChange,
	fiscalPaymentMethod,
	onFiscalPaymentMethodChange,
	onGenerateFiscalReceipt,
	activeFiscalReceipt,
}) => {
	return (
		<div className="flex flex-col lg:flex-row gap-6 items-start">
			{/* Parameters Config Panel */}
			<div className="flex-1 w-full rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,#ffffff)] p-5 flex flex-col gap-4">
				<h3 className="font-bold text-base text-[var(--ink,#0f172a)] flex items-center gap-2">
					<QrCode className="h-5 w-5 text-[var(--teal,var(--brand-primary))]" />
					Параметры кассового чека
				</h3>

				<div>
					<label className="text-xs font-semibold text-[var(--muted,#64748b)] block mb-1.5">
						Этап плана лечения:
					</label>
					<select
						value={selectedStageForFiscalId}
						onChange={(e) => onSelectStageForFiscal(e.target.value)}
						className="w-full rounded-xl border border-[var(--border,#cbd5e1)] bg-transparent px-3 py-2 text-sm text-[var(--ink,#0f172a)] focus:border-[var(--teal,var(--brand-primary))] focus:outline-none"
					>
						{stages.map((s) => (
							<option key={s.id} value={s.id}>
								Этап №{s.stageNumber}: {s.title} ({formatKopecksRu(s.totalKopecks)})
							</option>
						))}
					</select>
				</div>

				<div>
					<label className="text-xs font-semibold text-[var(--muted,#64748b)] block mb-1.5">
						Признак способа расчета:
					</label>
					<div className="grid grid-cols-3 gap-2">
						<button
							type="button"
							onClick={() => onFiscalPaymentTypeChange("advance")}
							className={`stage-action-btn ${fiscalPaymentType === "advance" ? "primary" : "secondary"} text-xs`}
						>
							Аванс / Предоплата
						</button>
						<button
							type="button"
							onClick={() => onFiscalPaymentTypeChange("completion")}
							className={`stage-action-btn ${fiscalPaymentType === "completion" ? "primary" : "secondary"} text-xs`}
						>
							Окончательный расчет
						</button>
						<button
							type="button"
							onClick={() => onFiscalPaymentTypeChange("full")}
							className={`stage-action-btn ${fiscalPaymentType === "full" ? "primary" : "secondary"} text-xs`}
						>
							Полная оплата 100%
						</button>
					</div>
				</div>

				<div>
					<label className="text-xs font-semibold text-[var(--muted,#64748b)] block mb-1.5">
						Способ оплаты:
					</label>
					<select
						value={fiscalPaymentMethod}
						onChange={(e) => onFiscalPaymentMethodChange(e.target.value as any)}
						className="w-full rounded-xl border border-[var(--border,#cbd5e1)] bg-transparent px-3 py-2 text-sm text-[var(--ink,#0f172a)] focus:border-[var(--teal,var(--brand-primary))] focus:outline-none"
					>
						<option value="BANK_CARD">Банковская карта (Эквайринг)</option>
						<option value="SBP_QR">СБП QR-код</option>
						<option value="CASH">Наличные в кассу</option>
						<option value="PATIENT_DEPOSIT">Списание с депозита</option>
					</select>
				</div>

				<div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3 text-xs text-[var(--muted,#64748b)] border border-[var(--border,#cbd5e1)]">
					<div>• Система налогообложения: <strong>УСН Доходы</strong></div>
					<div>• Налоговая ставка: <strong>Без НДС (ст. 149 НК РФ пп. 2 п. 2)</strong></div>
					<div>• Тег 1212 (Предмет расчета): <strong>10 (Платеж/Аванс) / 4 (Услуга)</strong></div>
				</div>

				<button
					type="button"
					onClick={onGenerateFiscalReceipt}
					className="stage-action-btn primary w-full"
				>
					<QrCode className="h-4 w-4" />
					Сформировать фискальный чек
				</button>
			</div>

			{/* Thermal Receipt Paper Preview Container */}
			<div className="w-full lg:w-96 flex flex-col items-center">
				{activeFiscalReceipt ? (
					<div className="fiscal-slip-container w-full">
						<div className="text-center font-bold">{activeFiscalReceipt.clinicName}</div>
						<div className="text-center text-xs">ИНН: {activeFiscalReceipt.clinicInn}</div>
						<div className="text-center text-xs">{activeFiscalReceipt.taxationSystem}</div>
						<div className="fiscal-slip-divider" />

						<div className="flex justify-between text-xs">
							<span>КАССОВЫЙ ЧЕК</span>
							<span>ПРИХОД</span>
						</div>
						<div className="text-xs">Чек №: {activeFiscalReceipt.receiptId}</div>
						<div className="text-xs">
							Дата: {new Date(activeFiscalReceipt.timestamp).toLocaleString("ru-RU")}
						</div>
						<div className="text-xs">Клиент: {activeFiscalReceipt.patientName}</div>
						<div className="fiscal-slip-divider" />

						{activeFiscalReceipt.items.map((item, idx) => (
							<div key={idx} className="flex flex-col gap-1 mb-2 text-xs">
								<div className="font-semibold">{item.name}</div>
								<div className="flex justify-between text-[11px] text-[var(--muted,#64748b)]">
									<span>Признак: {activeFiscalReceipt.calculationSign} (Т1214:{item.fiscalTag1214})</span>
									<span>{item.quantity} x {formatKopecksRu(item.priceKopecks)}</span>
								</div>
								<div className="flex justify-between font-bold">
									<span>{activeFiscalReceipt.vatRate}</span>
									<span>{formatKopecksRu(item.totalKopecks)}</span>
								</div>
							</div>
						))}

						<div className="fiscal-slip-divider" />
						<div className="flex justify-between text-sm font-extrabold">
							<span>ИТОГО К ОПЛАТЕ:</span>
							<span>{formatKopecksRu(activeFiscalReceipt.totalAmountKopecks)}</span>
						</div>
						<div className="flex justify-between text-xs">
							<span>Вид оплаты ({activeFiscalReceipt.paymentMethod}):</span>
							<span>{formatKopecksRu(activeFiscalReceipt.totalAmountKopecks)}</span>
						</div>

						<div className="fiscal-slip-divider" />
						<div className="text-[10px] text-[var(--muted,#64748b)] space-y-0.5">
							<div>ФН: {activeFiscalReceipt.fnNumber}</div>
							<div>ФД: {activeFiscalReceipt.fdNumber}</div>
							<div>ФПД: {activeFiscalReceipt.fpd}</div>
						</div>

						{/* QR Payload visualization */}
						<div className="mt-3 text-center p-3 border border-slate-300 dark:border-slate-700 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono break-all">
							[QR-КОД ФНС]<br />
							{activeFiscalReceipt.qrPayload}
						</div>
					</div>
				) : (
					<div className="w-full rounded-2xl border border-dashed border-[var(--border,#cbd5e1)] p-12 text-center text-xs text-[var(--muted,#64748b)]">
						Выберите этап и нажмите «Сформировать фискальный чек» для предпросмотра чека ККТ.
					</div>
				)}
			</div>
		</div>
	);
};

export default StagePaymentFiscalTab;
