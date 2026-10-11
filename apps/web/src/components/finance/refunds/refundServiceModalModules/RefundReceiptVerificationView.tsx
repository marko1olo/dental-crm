import React from "react";
import { CheckCircle2, Clock, QrCode } from "lucide-react";
import {
	generateThermalRefundReceiptText,
	type PartialRefundCalculationResult,
} from "@dental/shared";
import { generateQrCodeSvg } from "../../../portal/patientCabinet/patientCabinetEngine";
import type { RefundClinicInfo, RefundFiscalInfo } from "./types";

export interface RefundReceiptVerificationViewProps {
	readonly completedResult: PartialRefundCalculationResult;
	readonly clinicInfo: RefundClinicInfo;
	readonly receiptQrPayload: string;
	readonly fiscalInfo: RefundFiscalInfo | null;
}

export const RefundReceiptVerificationView: React.FC<RefundReceiptVerificationViewProps> = ({
	completedResult,
	clinicInfo,
	receiptQrPayload,
	fiscalInfo,
}) => {
	return (
		<div className="space-y-4">
			<div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
				<CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
				<div>
					<div className="font-bold text-sm">Возврат успешно проведен в кассе!</div>
					<div className="text-xs opacity-90">
						Чек «Возврат прихода» поставлен в фискальную очередь ОФД. Комиссия врача удержана.
					</div>
				</div>
			</div>

			<div className="flex flex-col sm:flex-row gap-4 items-start">
				{/* Thermal ASCII Receipt Paper */}
				<div className="flex-1 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-900 text-[var(--ink,#0f172a)] font-mono text-[11px] p-4 rounded-xl border border-[var(--border,#cbd5e1)] shadow-inner space-y-1 w-full whitespace-pre-wrap">
					{generateThermalRefundReceiptText(completedResult, clinicInfo)}
				</div>

				{/* QR Code & Verification */}
				<div className="w-full sm:w-56 flex flex-col items-center gap-3 p-4 rounded-xl border border-[var(--border,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-center">
					<div className="font-bold text-xs text-[var(--ink,#0f172a)] flex items-center gap-1.5">
						<QrCode className="w-4 h-4 text-teal-600" />
						<span>QR-код чека ФНС</span>
					</div>

					{receiptQrPayload ? (
						<div
							className="p-2 bg-white rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
							dangerouslySetInnerHTML={{
								__html: generateQrCodeSvg(receiptQrPayload, {
									size: 140,
									colorDark: "#0f172a",
									colorLight: "#ffffff",
								}),
							}}
						/>
					) : (
						<div className="w-[140px] h-[140px] p-2 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-dashed border-[var(--border,#e2e8f0)] flex flex-col items-center justify-center text-center text-[10px] text-[var(--muted,#64748b)]">
							<Clock className="w-6 h-6 mb-1 text-amber-500" />
							<span>Чек буферизован</span>
							<span className="font-mono mt-0.5 text-[9px]">{fiscalInfo?.queueId ? `№ ${fiscalInfo.queueId.slice(-8)}` : "Офлайн"}</span>
						</div>
					)}

					<div className="text-[10px] text-[var(--muted,#64748b)] font-mono">
						{fiscalInfo?.isOfflineBuffered ? (
							<>
								<div>
									Чек в очереди:{" "}
									<span className="font-bold text-[var(--ink,#0f172a)]">
										№ {fiscalInfo?.queueId || "Буферизован"}
									</span>
								</div>
								<span className="block text-amber-600 dark:text-amber-400 font-sans font-bold mt-0.5">
									(Отложенная фискализация / Буфер ОФД)
								</span>
							</>
						) : (
							<>
								{fiscalInfo?.fnSerial && <div>ФН: {fiscalInfo.fnSerial}</div>}
								<div>
									ФД: {fiscalInfo?.fiscalDocNumber || "—"} • ФПД: {fiscalInfo?.fiscalSign || "—"}
								</div>
								{fiscalInfo?.ofdUrl && (
									<a
										href={fiscalInfo.ofdUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="block text-teal-600 dark:text-teal-400 underline mt-1 font-sans font-medium hover:text-teal-700"
									>
										Проверить чек в ОФД ↗
									</a>
								)}
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
