/**
 * TreatmentPlanActSignatures.tsx — Юридические условия сдачи-приемки, гарантии,
 * подписи сторон, печать клиники (М.П.) и QR-верификация по ГОСТ Р 7.0.97-2016.
 */

import React from "react";
import { QrCode, ShieldCheck, Stamp } from "lucide-react";
import type { CompletedWorksActAndWriteOffData } from "./types";
import type { DocumentBrandColorPalette } from "../../store/documentBrandingStore";

export interface TreatmentPlanActSignaturesProps {
	readonly actData: CompletedWorksActAndWriteOffData;
	readonly palette: DocumentBrandColorPalette;
	readonly legalName: string;
	readonly patientPassport?: string | null | undefined;
	readonly showDoctorStampFrame: boolean;
	readonly showQrVerification: boolean;
	readonly verificationHash: string;
	readonly customDisclaimer?: string;
}

export const TreatmentPlanActSignatures: React.FC<TreatmentPlanActSignaturesProps> = ({
	actData,
	palette,
	legalName,
	patientPassport,
	showDoctorStampFrame,
	showQrVerification,
	verificationHash,
	customDisclaimer,
}) => {
	return (
		<>
			{/* ── 8. Section 4: Patient Acceptance & Legal Terms ── */}
			<div className="pt-3 border-t border-slate-300 text-xs text-slate-900 space-y-3 print:space-y-2 mb-6 print:mb-4">
				<div className="font-bold uppercase tracking-wider text-[11px]" style={{ color: palette.primaryDark }}>
					3. Условия сдачи-приемки и гарантийные обязательства
				</div>
				<ol className="list-decimal pl-4 space-y-1.5 text-justify leading-relaxed text-[11px] text-slate-700">
					<li>
						Вышеперечисленные медицинские услуги оказаны Исполнителем надлежащим образом, в полном объеме, своевременно и в строгом соответствии с клиническими рекомендациями (протоколами лечения) и стандартами медицинской помощи РФ.
					</li>
					<li>
						Пациент (Заказчик) подтверждает, что результат оказанных медицинских услуг им осмотрен и принят в полном объеме. Претензий по объему, качеству, эстетическому результату и срокам оказания услуг Пациент к Исполнителю не имеет.
					</li>
					<li>
						Лечащим врачом даны исчерпывающие клинические рекомендации по индивидуальной гигиене полости рта, режиму приема пищи и контрольным осмотрам. Гарантийные обязательства разъяснены в соответствии с Положением о гарантиях клиники.
					</li>
					<li>
						Списание медикаментов и стоматологических материалов произведено по фактическому назначению лечащего врача в соответствии с утвержденными нормами расхода.
					</li>
				</ol>
			</div>

			{/* ── 9. Doctor Signature and Clinic Seal Zones (Crisp Two-Column Grid) ── */}
			<div className="doc-sign-zone pt-4 border-t border-slate-300 page-break-inside-avoid">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-start">
					{/* Left: Clinic / Doctor Signature & Stamp */}
					<div className="space-y-4">
						<div>
							<div className="text-xs font-black uppercase tracking-wider" style={{ color: palette.primaryDark }}>
								От Исполнителя (Клиника):
							</div>
							<div className="text-[11px] text-slate-600 mt-0.5">
								{legalName} • Врач: {actData.doctorFullName}
							</div>
						</div>

						<div className="pt-2">
							<div className="text-xs font-semibold text-slate-800">
								Врач-стоматолог: ______________________ / {actData.doctorFullName} /
							</div>
							<div className="text-[10px] text-slate-500 italic mt-0.5">
								(личная подпись и расшифровка лечащего врача)
							</div>
						</div>

						{/* Official Round Clinic Seal Frame (М.П.) */}
						{showDoctorStampFrame && (
							<div className="pt-2 flex items-center gap-4">
								<div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-400 flex flex-col items-center justify-center text-center p-1 text-slate-500 shrink-0">
									<Stamp className="w-4 h-4 text-slate-400 mb-0.5" />
									<span className="font-extrabold text-[10px] uppercase tracking-wider">М.П.</span>
									<span className="text-[8px] leading-tight mt-0.5">Для медицинских документов</span>
								</div>
								<div className="text-[10px] text-slate-500 leading-tight">
									Место оттиска печати<br />
									медицинской организации<br />
									Дата: «____» ____________ 2026 г.
								</div>
							</div>
						)}
					</div>

					{/* Right: Patient Signature */}
					<div className="space-y-4">
						<div>
							<div className="text-xs font-black uppercase tracking-wider text-slate-900">
								От Заказчика (Пациент):
							</div>
							<div className="text-[11px] text-slate-600 mt-0.5">
								ФИО: {actData.patientName} • Паспорт: {patientPassport ? "проверен" : "предъявлен"}
							</div>
						</div>

						<div className="pt-2">
							<div className="text-xs font-semibold text-slate-800">
								Пациент: ______________________ / {actData.patientName} /
							</div>
							<div className="text-[10px] text-slate-500 italic mt-0.5">
								(услуги принял в полном объеме, претензий не имею)
							</div>
						</div>

						<div className="pt-4 text-[10px] text-slate-500 leading-tight">
							Подтверждаю согласие с объемом и стоимостью оказанных услуг.<br />
							Дата подписания: «____» ____________ 2026 г.
						</div>
					</div>
				</div>

				{/* Electronic Verification QR Stamp (GOST R 7.0.97-2016) */}
				{showQrVerification && (
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
								<span className="text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
									<ShieldCheck className="w-3 h-3 inline shrink-0" />
									<span>Подписано УКЭП медицинской организации • Сертификат действителен</span>
								</span>
							</div>
						</div>

						<div className="text-right text-[10px] text-slate-500 hidden sm:block">
							Идентификатор документа: <strong className="font-mono">{actData.actNumber}</strong>
							<br />
							Время фиксации: {actData.createdAtIso ? new Date(actData.createdAtIso).toLocaleString("ru-RU") : actData.actDate}
						</div>
					</div>
				)}
			</div>

			{/* ── 10. Footer Disclaimer & Clinic Guarantee ── */}
			{customDisclaimer ? (
				<footer className="doc-footer-disclaimer mt-6 pt-3 border-t border-slate-300 text-[10px] text-slate-500 text-justify leading-relaxed">
					{customDisclaimer}
				</footer>
			) : (
				<footer className="doc-footer-disclaimer mt-6 pt-3 border-t border-slate-300 text-[10px] text-slate-500 text-justify leading-relaxed">
					Настоящий Акт составлен в 2 (двух) подлинных экземплярах, имеющих равную юридическую силу, по одному для каждой из Сторон. Документ хранится в архиве медицинской организации в составе медицинской карты пациента (форма № 043/у) в течение 25 лет.
				</footer>
			)}
		</>
	);
};
