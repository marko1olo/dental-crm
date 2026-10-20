/**
 * PrescriptionUkepGostStamp.tsx — GOST R 7.0.97-2016 Visual Digital Signature Stamp
 */

import type { PrescriptionDoctorUkep } from "@dental/shared";
import { QrCode, ShieldCheck } from "lucide-react";
import type React from "react";

export interface PrescriptionUkepGostStampProps {
	readonly ukepSignature: PrescriptionDoctorUkep & {
		readonly validFrom?: string | null | undefined;
		readonly validTo?: string | null | undefined;
	};
}

function formatStampDateRu(isoString?: string | null): string {
	if (!isoString) return "";
	try {
		const d = new Date(isoString);
		return Number.isNaN(d.getTime())
			? isoString
			: d.toLocaleDateString("ru-RU", {
					day: "2-digit",
					month: "2-digit",
					year: "numeric",
				});
	} catch {
		return isoString;
	}
}

export const PrescriptionUkepGostStamp: React.FC<
	PrescriptionUkepGostStampProps
> = ({ ukepSignature }) => {
	const certValidFrom =
		ukepSignature.certificateValidFrom || ukepSignature.validFrom;
	const certValidTo = ukepSignature.certificateValidTo || ukepSignature.validTo;

	return (
		<div
			className="gost-prescription-stamp border-2 border-blue-800 dark:border-blue-400 rounded p-2 text-[8px] leading-tight text-blue-900 dark:text-blue-200 bg-blue-500/10 mt-1 page-break-inside-avoid"
			style={{
				fontFamily: "'PT Astra Sans', Arial, Helvetica, sans-serif",
				boxShadow: "0 1px 3px rgba(0, 51, 153, 0.08)",
			}}
		>
			<div className="flex items-center justify-between border-b border-blue-800/40 dark:border-blue-400/40 pb-1 mb-1">
				<div className="flex items-center gap-1.5">
					<ShieldCheck className="w-4 h-4 text-blue-800 dark:text-blue-300 shrink-0 inline" />
					<div>
						<div className="font-extrabold uppercase tracking-wide text-[8.5px]">
							ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ
						</div>
						<div className="text-[6.5px] font-semibold tracking-wider opacity-85 uppercase">
							СВЕДЕНИЯ О СЕРТИФИКАТЕ ЭЛЕКТРОННОЙ ПОДПИСИ
						</div>
					</div>
				</div>
				<QrCode className="w-8 h-8 text-blue-800 dark:text-blue-300 shrink-0 ml-2" />
			</div>
			<div className="flex flex-col gap-0.5 text-[7.5px]">
				<div>
					<span className="font-bold">Сертификат:</span>{" "}
					<span className="font-mono">
						{ukepSignature.certificateSerialNumber}
					</span>
				</div>
				<div>
					<span className="font-bold">Владелец:</span>{" "}
					<span>{ukepSignature.doctorFullName}</span>
				</div>
				{certValidFrom && certValidTo ? (
					<div>
						<span className="font-bold">Действителен:</span> с{" "}
						{formatStampDateRu(certValidFrom)} по{" "}
						{formatStampDateRu(certValidTo)}
					</div>
				) : null}
			</div>
		</div>
	);
};
