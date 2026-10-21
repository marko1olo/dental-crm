import React from "react";
import { QrCode, ShieldCheck } from "lucide-react";
import type { CompletedWorksActAndWriteOffData } from "../types.js";
import type { DocumentBrandColorPalette } from "../../../store/documentBrandingStore.js";

export interface ActQrVerificationStampProps {
	readonly actData: CompletedWorksActAndWriteOffData;
	readonly palette: DocumentBrandColorPalette;
	readonly verificationHash: string;
}

export const ActQrVerificationStamp: React.FC<ActQrVerificationStampProps> = ({
	actData,
	palette,
	verificationHash,
}) => {
	return (
		<div
			className="mt-6 p-3 rounded-xl border flex items-center justify-between gap-4 text-xs"
			style={{
				backgroundColor: palette.softBg,
				borderColor: palette.accentBorder,
			}}
		>
			<div className="flex items-center gap-3">
				<div className="w-12 h-12 bg-white p-1 border border-slate-300 rounded-lg flex items-center justify-center shrink-0 shadow-xs">
					<QrCode className="w-10 h-10 text-slate-900" />
				</div>
				<div className="doc-qr-meta text-[10px] leading-tight text-slate-700">
					<strong className="block text-slate-900" style={{ color: palette.primaryDark }}>
						Электронная верификация акта сдачи-приемки:
					</strong>
					<span className="font-mono text-[9px] block truncate max-w-sm text-slate-600 mt-0.5">
						{verificationHash}
					</span>
					{actData.isUkepSigned ? (
						<span className="text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
							<ShieldCheck className="w-3 h-3 inline shrink-0" />
							<span>
								Подписано электронной подписью медицинской организации • Сертификат действителен
								{actData.ukepCertSerial ? ` (${actData.ukepCertSerial})` : ""}
							</span>
						</span>
					) : actData.signingMethod === "pep_sms" ? (
						<span className="text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
							<ShieldCheck className="w-3 h-3 inline shrink-0" />
							<span>Подписано простой электронной подписью пациента (код подтверждения)</span>
						</span>
					) : actData.signingMethod === "stylus" ? (
						<span className="text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
							<ShieldCheck className="w-3 h-3 inline shrink-0" />
							<span>Подписано графической подписью на планшете • Хеш зафиксирован</span>
						</span>
					) : actData.status === "signed" || actData.status === "executed" ? (
						<span className="text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
							<ShieldCheck className="w-3 h-3 inline shrink-0" />
							<span>Подписано на бумажном носителе • Оригинал передан в архив</span>
						</span>
					) : (
						<span className="text-amber-800 font-medium flex items-center gap-1 mt-0.5">
							<ShieldCheck className="w-3 h-3 inline shrink-0 text-amber-600" />
							<span>Документ сформирован • Готов к подписанию на бумаге или электронно</span>
						</span>
					)}
				</div>
			</div>

			<div className="text-right text-[10px] text-slate-500 hidden sm:block">
				Идентификатор документа: <strong className="font-mono">{actData.actNumber}</strong>
				<br />
				Время фиксации: {actData.createdAtIso ? new Date(actData.createdAtIso).toLocaleString("ru-RU") : actData.actDate}
			</div>
		</div>
	);
};
