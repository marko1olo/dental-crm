import type { PrescriptionDoctorUkep } from "@dental/shared";
import React from "react";
import {
	AlertTriangle,
	FileText,
	QrCode,
	ShieldCheck,
} from "lucide-react";

export interface PrescriptionSheetPreviewProps {
	readonly customSeriesNumber: string;
	readonly penicillinConflict: boolean;
	readonly nsaidConflict: boolean;
	readonly anestheticConflict?: boolean;
	readonly ddiSafetyAudit?: { readonly drugInteractions: readonly any[] } | null | undefined;
	readonly withStampAndSignature: boolean;
	readonly clinic: string;
	readonly address: string;
	readonly phone: string;
	readonly ogrn: string;
	readonly inn: string;
	readonly licNum: string;
	readonly activeForm: "107-1u" | "148-1u-88";
	readonly prescriptionDate: string;
	readonly patientName: string;
	readonly patientBirth: string;
	readonly patientCard: string;
	readonly patientAddress?: string | undefined;
	readonly docName: string;
	readonly docSpecialty: string;
	readonly diary?: { readonly diagnosisIcd10?: string | null | undefined } | null | undefined;
	readonly activeItems: readonly {
		readonly id: string;
		readonly latinName: string;
		readonly dispenseLatin: string;
		readonly signaRussian: string;
		readonly tradeName: string;
	}[];
	readonly validityDays: string;
	readonly isChronicSpecialCare: boolean;
	readonly chronicPeriodicity: string;
	readonly isUkepSigned: boolean;
	readonly ukepSignature?: PrescriptionDoctorUkep | null | undefined;
}

function formatStampDateRu(isoString?: string | null): string {
	if (!isoString) return "";
	try {
		const d = new Date(isoString);
		if (Number.isNaN(d.getTime())) return isoString;
		return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
	} catch {
		return isoString;
	}
}

export const PrescriptionSheetPreview: React.FC<PrescriptionSheetPreviewProps> = ({
	customSeriesNumber,
	penicillinConflict,
	nsaidConflict,
	anestheticConflict = false,
	ddiSafetyAudit,
	withStampAndSignature,
	clinic,
	address,
	phone,
	ogrn,
	inn,
	licNum,
	activeForm,
	prescriptionDate,
	patientName,
	patientBirth,
	patientCard,
	patientAddress,
	docName,
	docSpecialty,
	diary,
	activeItems,
	validityDays,
	isChronicSpecialCare,
	chronicPeriodicity,
	isUkepSigned,
	ukepSignature,
}) => {
	return (
		<div className="w-full lg:w-1/2 p-4 sm:p-6 bg-[var(--paper-soft)] overflow-y-auto flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
					<FileText className="w-3.5 h-3.5 text-[var(--teal)]" />
					Живой предпросмотр (А5 / Высокая печать):
				</span>
				<span className="text-xs font-mono font-bold text-[var(--teal)]">
					{customSeriesNumber}
				</span>
			</div>

			{/* Allergy Warning Preview Strip */}
			{penicillinConflict && (
				<div data-testid="allergy-conflict-penicillin" className="p-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-900 dark:text-rose-200 text-xs flex items-center justify-between gap-2">
					<div className="flex items-center gap-2 min-w-0">
						<AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
						<span className="font-bold truncate">
							Внимание: выписан пенициллин при аллергии в анамнезе (Риск анафилаксии!)
						</span>
					</div>
					<span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-600 text-white shrink-0">
						Автономия врача (Печать доступна)
					</span>
				</div>
			)}
			{nsaidConflict && (
				<div data-testid="allergy-conflict-nsaid" className="p-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-900 dark:text-rose-200 text-xs flex items-center justify-between gap-2">
					<div className="flex items-center gap-2 min-w-0">
						<AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
						<span className="font-bold truncate">
							Внимание: выписан НПВС при аллергии на НПВС/аспирин в анамнезе
						</span>
					</div>
					<span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-600 text-white shrink-0">
						Автономия врача (Печать доступна)
					</span>
				</div>
			)}
			{anestheticConflict && (
				<div data-testid="allergy-conflict-anesthetic" className="p-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-900 dark:text-rose-200 text-xs flex items-center justify-between gap-2">
					<div className="flex items-center gap-2 min-w-0">
						<AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
						<span className="font-bold truncate">
							Внимание: выписан местный анестетик при аллергии на анестетики/лидокаин в анамнезе
						</span>
					</div>
					<span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-600 text-white shrink-0">
						Автономия врача (Печать доступна)
					</span>
				</div>
			)}

			{/* DDI Warning Preview Strip (Soft Amber) */}
			{ddiSafetyAudit && ddiSafetyAudit.drugInteractions.length > 0 && (
				<div className="p-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100 text-xs flex items-center justify-between gap-2">
					<div className="flex items-center gap-2 min-w-0">
						<AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
						<span className="font-bold truncate">
							Предостережение: обнаружено {ddiSafetyAudit.drugInteractions.length}{" "}
							{ddiSafetyAudit.drugInteractions.length === 1 ? "взаимодействие" : "взаимодействия"} (DDI)
						</span>
					</div>
					<span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-600 text-white shrink-0">
						Печать разрешена
					</span>
				</div>
			)}

			{/* Printable Physical Sheet Mockup */}
			<div className="p-5 sm:p-6 rounded-xl border border-[var(--line)] shadow-xl font-serif leading-relaxed flex flex-col gap-3 bg-[var(--paper-strong)] text-[var(--ink)]">
				{/* Form Official Header */}
				<div className="border-b-2 border-[var(--line)] pb-2 text-[10px] flex justify-between gap-2 text-[var(--ink)]">
					<div
						className={`w-7/12 p-1.5 rounded leading-tight transition-all ${
							withStampAndSignature
								? "border-2 border-blue-600 dark:border-blue-400 bg-blue-500/10 text-blue-900 dark:text-blue-200 shadow-xs"
								: "border border-dashed border-[var(--line)] text-[var(--muted)]"
						}`}
					>
						<div className={`font-bold uppercase text-[10px] ${withStampAndSignature ? "text-blue-900 dark:text-blue-200" : "text-[var(--ink)]"}`}>
							{clinic}
						</div>
						<div className="text-[9px]">Адрес: {address}</div>
						<div className="text-[9px]">Тел: {phone}</div>
						<div className="text-[9px]">ОГРН: {ogrn} · ИНН: {inn}</div>
						<div className="text-[8.5px] font-sans">Лицензия: № {licNum}</div>
						<div className={`text-[8px] font-bold italic mt-0.5 ${withStampAndSignature ? "text-blue-700 dark:text-blue-400" : "text-[var(--muted)]"}`}>
							{withStampAndSignature ? "ШТАМП МЕДИЦИНСКОЙ ОРГАНИЗАЦИИ" : "(Штамп медицинской организации)"}
						</div>
					</div>
					<div className="w-5/12 text-right leading-tight text-[9px] text-[var(--muted)]">
						<div>Министерство здравоохранения РФ</div>
						<div>Медицинская документация</div>
						<div className="font-bold text-[10px] mt-0.5 text-[var(--ink)]">
							{activeForm === "107-1u"
								? "Форма бланка № 107-1/у"
								: "Форма бланка № 148-1/у-88"}
						</div>
						<div className="text-[var(--muted)]">Приказ МЗ РФ № 1094н</div>
					</div>
				</div>

				{/* Title */}
				<div className="text-center my-0.5 text-[var(--ink)]">
					<div className={`font-extrabold text-base tracking-widest uppercase ${activeForm === "148-1u-88" ? "text-rose-600 dark:text-rose-400" : "text-[var(--ink)]"}`}>
						РЕЦЕПТ {activeForm === "148-1u-88" ? "(ПКУ)" : ""}
					</div>
					<div className="text-[10px] font-sans text-[var(--muted)]">
						Серия: <strong className="text-[var(--ink)]">{customSeriesNumber}</strong> от{" "}
						<strong className="text-[var(--ink)]">{new Date(prescriptionDate || Date.now()).toLocaleDateString("ru-RU")}</strong>
					</div>
				</div>

				{/* Patient and Doctor Meta */}
				<div className="border-b border-[var(--line)] pb-2 flex flex-col gap-0.5 text-[11px] leading-snug text-[var(--ink)]">
					<div>
						Ф.И.О. пациента: <strong>{patientName}</strong>
					</div>
					<div className="flex justify-between flex-wrap gap-1">
						<span>
							Дата рождения: <strong>{patientBirth}</strong>
						</span>
						<span>
							№ медкарты: <strong>{patientCard}</strong>
						</span>
					</div>
					{activeForm === "148-1u-88" && (
						<div>
							Адрес проживания: <strong>{patientAddress || "—"}</strong>
						</div>
					)}
					<div>
						Ф.И.О. лечащего врача: <strong>{docName}</strong> ({docSpecialty})
					</div>
					{diary?.diagnosisIcd10 && (
						<div className="text-[10px] text-[var(--muted)] font-sans">
							Диагноз (МКБ-10): <strong className="text-[var(--ink)]">{diary.diagnosisIcd10}</strong>
						</div>
					)}
				</div>

				{/* Prescribed Items (Rp.) */}
				<div className="flex flex-col gap-3 min-h-[110px] py-1.5 text-[var(--ink)]">
					{activeItems.length > 0 ? (
						activeItems.map((item, idx) => (
							<div key={item.id} className="font-serif text-[var(--ink)]">
								<div className="font-bold text-[11.5px] italic text-[var(--ink)]">
									{idx + 1}. {item.latinName}
								</div>
								<div className="ml-5 italic text-[11px] text-[var(--ink)] opacity-90">
									{item.dispenseLatin}
								</div>
								<div className="ml-5 text-[11px] font-sans font-medium text-[var(--ink)]">
									{item.signaRussian}
								</div>
								<div className="ml-5 text-[9.5px] font-sans text-[var(--muted)]">
									[Торговое наименование: <strong className="text-[var(--ink)]">{item.tradeName}</strong>]
								</div>
							</div>
						))
					) : (
						<div className="p-4 rounded-lg border border-dashed border-[var(--line)] text-center text-xs text-[var(--muted)] font-sans flex flex-col items-center justify-center min-h-[90px]">
							Выберите готовый пакет назначений слева или добавьте препарат
						</div>
					)}
				</div>

				{/* Footer Signatures and Stamp Circles */}
				<div className="border-t-2 border-[var(--line)] pt-2 text-[10px] flex justify-between items-end text-[var(--ink)]">
					<div className="flex flex-col gap-1 text-[var(--ink)]">
						<div>
							Срок действия рецепта:{" "}
							<u>
								<strong className="text-[var(--ink)]">
									{activeForm === "148-1u-88"
										? "15 дней (ПКУ)"
										: validityDays === "365"
											? "До 1 года (По специальному назначению)"
											: `${validityDays} дней`}
								</strong>
							</u>
						</div>
						{isChronicSpecialCare && (
							<div className="text-[9px] font-bold text-teal-700 dark:text-teal-400">
								По специальному назначению ({chronicPeriodicity})
							</div>
						)}
						<div className="mt-1 relative text-[var(--ink)]">
							{withStampAndSignature && (
								<div
									className="absolute -top-3 left-24 text-blue-700 dark:text-blue-400 font-serif italic text-base select-none pointer-events-none"
									style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive, serif", transform: "rotate(-3deg)" }}
								>
									{docName.replace(/^(Д-р|Врач)\s+/i, "")}
								</div>
							)}
							Подпись врача: ____________________ / {docName}
						</div>
						{activeForm === "148-1u-88" && (
							<div className="text-[var(--ink)]">Подпись зав. отделением: ____________________</div>
						)}
					</div>

					<div className="flex items-center gap-2">
						<div
							className={`w-11 h-11 rounded-full flex flex-col items-center justify-center font-bold text-[7px] text-center leading-tight transition-all ${
								withStampAndSignature
									? "border-2 border-blue-600 dark:border-blue-400 bg-blue-500/10 text-blue-900 dark:text-blue-200 shadow-xs"
									: "border border-dashed border-[var(--line)] text-[var(--muted)]"
							}`}
						>
							<span>ВРАЧ</span>
							<span className="text-[8px]">М.П.</span>
						</div>
						<div
							className={`w-12 h-12 rounded-full flex flex-col items-center justify-center font-bold text-[7px] text-center leading-tight transition-all ${
								withStampAndSignature
									? "border-2 border-double border-blue-600 dark:border-blue-400 bg-blue-500/10 text-blue-900 dark:text-blue-200 shadow-xs"
									: "border border-dashed border-teal-600 dark:border-teal-400 text-teal-800 dark:text-teal-300"
							}`}
						>
							<span className="text-[6px] uppercase">КЛИНИКА</span>
							<span>Для<br />рецептов</span>
						</div>
						{activeForm === "148-1u-88" && (
							<div className="w-10 h-10 border border-dashed border-rose-600 dark:border-rose-400 clip-path-tri flex items-center justify-center font-bold text-[7.5px] text-rose-700 dark:text-rose-300 text-center">
								СПЕЦ.
							</div>
						)}
					</div>
				</div>

				{/* Official GOST R 7.0.97-2016 Visual Digital Signature Stamp (УКЭП по ГОСТ Р 34.10-2012) */}
				{isUkepSigned && ukepSignature && (
					<div
						className="gost-prescription-stamp border-2 border-[#003399] rounded p-2 text-[8px] leading-tight text-[#003399] bg-[#f4f8ff] mt-2 page-break-inside-avoid"
						style={{
							fontFamily: "'PT Astra Sans', Arial, Helvetica, sans-serif",
							boxShadow: "0 1px 3px rgba(0, 51, 153, 0.08)",
						}}
					>
						<div className="flex items-center justify-between border-b border-[#003399] pb-1 mb-1">
							<div className="flex items-center gap-1.5">
								<ShieldCheck className="w-4 h-4 text-[#003399] shrink-0 inline" />
								<div>
									<div className="font-extrabold uppercase tracking-wide text-[8.5px]">
										ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ
									</div>
									<div className="text-[6.5px] font-semibold tracking-wider text-[#003399]/80 uppercase">
										СВЕДЕНИЯ О СЕРТИФИКАТЕ ЭП &bull; ГОСТ Р 34.10-2012
									</div>
								</div>
							</div>
							<QrCode className="w-8 h-8 text-[#003399] shrink-0 ml-2" />
						</div>
						<div className="flex flex-col gap-0.5 text-[7.5px] text-[#003399]">
							<div>
								<span className="font-bold">Сертификат:</span>{" "}
								<span className="font-mono">{ukepSignature.certificateSerialNumber}</span>
							</div>
							<div>
								<span className="font-bold">Владелец:</span>{" "}
								<span>{ukepSignature.doctorFullName}</span>
							</div>
							{(ukepSignature.certificateValidFrom || (ukepSignature as any).validFrom) &&
							(ukepSignature.certificateValidTo || (ukepSignature as any).validTo) ? (
								<div>
									<span className="font-bold">Действителен:</span> с{" "}
									{formatStampDateRu(ukepSignature.certificateValidFrom || (ukepSignature as any).validFrom)} по{" "}
									{formatStampDateRu(ukepSignature.certificateValidTo || (ukepSignature as any).validTo)}
								</div>
							) : null}
							{ukepSignature.signedAt ? (
								<div>
									<span className="font-bold">Подписан:</span>{" "}
									{formatStampDateRu(ukepSignature.signedAt)}
								</div>
							) : null}
							<div className="text-[6.5px] text-[#003399]/70 truncate mt-0.5">
								УЦ: {ukepSignature.certificateIssuer || "Головной УЦ Минцифры России (Квалифицированный)"}
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Patient Friendly Instruction Memo Card (Zero Latin Rp/Dtd/S) */}
			<div
				data-testid="patient-prescription-memo-card"
				className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] flex flex-col gap-2.5 font-sans shadow-sm"
			>
				<div className="flex items-center justify-between border-b border-[var(--line)] pb-2">
					<span className="text-xs font-bold uppercase tracking-wider text-[var(--teal)] flex items-center gap-1.5">
						<FileText className="w-3.5 h-3.5 text-[var(--teal)]" />
						Памятка пациенту (без латыни):
					</span>
					<span className="text-[10px] text-[var(--muted)]">Для понятного приёма дома</span>
				</div>

				<div className="flex flex-col gap-2 text-xs">
					{activeItems.length === 0 ? (
						<div className="text-[var(--muted)] italic py-1">Препараты не выбраны</div>
					) : (
						activeItems.map((item, idx) => {
							const cleanSigna = item.signaRussian
								.replace(/^(?:D\.?\s*)?S[.:]?\s*/i, "")
								.replace(/^(?:Rp[.:]?\s*)/i, "")
								.replace(/^(?:D\.?t\.?d\.?\s*N?\s*\d*\.?\s*)/i, "")
								.trim();
							return (
								<div
									key={item.id || idx}
									className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]/60 flex flex-col gap-1"
								>
									<div className="font-bold text-[var(--ink)] text-xs">
										{idx + 1}. {item.tradeName}
									</div>
									<div className="text-xs text-[var(--ink)]">
										<span className="font-semibold text-teal-700 dark:text-teal-400">Способ применения: </span>
										{cleanSigna}
									</div>
								</div>
							);
						})
					)}
				</div>

				<div className="text-[11px] text-[var(--muted)] border-t border-[var(--line)]/60 pt-2 leading-relaxed">
					При любых признаках непереносимости или аллергии немедленно свяжитесь с клиникой: <strong>{phone}</strong>.
				</div>
			</div>
		</div>
	);
};
