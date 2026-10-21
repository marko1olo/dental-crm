import React from "react";
import { formatKopecksRu } from "@dental/shared";
import type { StageFiscalReceipt54Fz } from "../stagePaymentEngine.js";

export interface ThermalReceiptSlipPreviewProps {
	readonly activeFiscalReceipt: StageFiscalReceipt54Fz | null;
}

export const ThermalReceiptSlipPreview: React.FC<ThermalReceiptSlipPreviewProps> = ({
	activeFiscalReceipt,
}) => {
	return (
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
							<div className="flex justify-between text-[11px] text-[var(--muted)]">
								<span>Формат: {activeFiscalReceipt.calculationSign}</span>
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
					<div className="text-[10px] text-[var(--muted)] space-y-0.5">
						<div>ФН: {activeFiscalReceipt.fnNumber}</div>
						<div>ФД: {activeFiscalReceipt.fdNumber}</div>
						<div>ФПД: {activeFiscalReceipt.fpd}</div>
					</div>

					{/* QR Payload visualization */}
					<div className="mt-3 text-center p-3 border border-[var(--line)] rounded-lg bg-[var(--paper-soft)] text-[var(--ink)] text-[10px] font-mono break-all">
						[QR-КОД ФНС]<br />
						{activeFiscalReceipt.qrPayload}
					</div>
				</div>
			) : (
				<div className="w-full rounded-2xl border border-dashed border-[var(--line)] p-12 text-center text-xs text-[var(--muted)]">
					Выберите этап и нажмите «Сформировать фискальный чек» для предпросмотра чека ККТ.
				</div>
			)}
		</div>
	);
};
