/**
 * PrescriptionPrintSheet.tsx — Canonical Printable Sheet (A5 Format, Clinic Credentials & Doctor Stamp)
 * DENTE Dental CRM (Doctor Autonomy Mandates 8e, 8n, 8x, 8am & Apple HIG).
 * Sweet Spot 200–250 lines. Clean CSS tokens, WCAG AAA.
 */

import React from "react";
import { CheckCircle2, ShieldCheck, QrCode } from "lucide-react";
import type { DentalOutpatientDrug } from "./prescriptionCatalogData";

export interface PrescriptionPrintSheetProps {
	readonly seriesNumber?: string;
	readonly clinicName?: string;
	readonly clinicAddress?: string;
	readonly clinicPhone?: string;
	readonly clinicOgrn?: string;
	readonly doctorName?: string;
	readonly doctorSpecialty?: string;
	readonly patientName?: string;
	readonly patientBirthDate?: string;
	readonly medicalCardNumber?: string;
	readonly prescriptionDate?: string;
	readonly items?: readonly (DentalOutpatientDrug | {
		id?: string;
		tradeName: string;
		latinName?: string;
		dispenseLatin?: string;
		signaRussian: string;
	})[];
	readonly validityDays?: string | number;
	readonly isMemoMode?: boolean;
	readonly isUkepSigned?: boolean;
	readonly className?: string;
}

export const PrescriptionPrintSheet: React.FC<PrescriptionPrintSheetProps> = ({
	seriesNumber = "РЦ-849201",
	clinicName = "Стоматологическая клиника «ДЕНТЕ»",
	clinicAddress = "г. Москва, ул. Большая Полянка, д. 28, стр. 1",
	clinicPhone = "+7 (495) 215-55-40",
	clinicOgrn = "ОГРН 1157746123456 · Лицензия ЛО-77-01-019842",
	doctorName = "Д-р Соколов А. В.",
	doctorSpecialty = "Врач-стоматолог-терапевт",
	patientName = "Иванова Мария Сергеевна",
	patientBirthDate = "1988-04-12",
	medicalCardNumber = "К-4821",
	prescriptionDate = new Date().toLocaleDateString("ru-RU"),
	items = [],
	validityDays = "60",
	isMemoMode = false,
	isUkepSigned = true,
	className = "",
}) => {
	return (
		<div
			data-testid="prescription-print-sheet"
			className={`prescription-print-sheet max-w-full w-full bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--ink)] p-6 sm:p-8 rounded-2xl shadow-lg flex flex-col gap-4 select-text font-sans ${className}`}
			style={{ minHeight: "560px" }}
		>
			{/* Top Clinic Stamp & Official Header */}
			<div className="flex items-start justify-between border-b border-[var(--line)] pb-4 gap-4">
				<div className="flex flex-col gap-1 min-w-0">
					<div className="flex items-center gap-2">
						<span className="w-2.5 h-2.5 rounded-full bg-[var(--teal,#0d9488)] shrink-0" />
						<h3 className="text-sm font-bold tracking-tight text-[var(--ink)] uppercase truncate">
							{clinicName}
						</h3>
					</div>
					<p className="text-[11px] text-[var(--muted)] leading-tight">
						{clinicAddress} · Тел: {clinicPhone}
					</p>
					<p className="text-[10px] text-[var(--muted-soft,var(--muted))] font-mono">
						{clinicOgrn}
					</p>
				</div>

				<div className="flex flex-col items-end shrink-0 text-right">
					<div className="px-2.5 py-1 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-mono font-bold text-[var(--ink)]">
						{seriesNumber}
					</div>
					<span className="text-[11px] font-medium text-[var(--teal,#0d9488)] mt-1">
						{isMemoMode ? "Памятка пациента" : `Срок действия: ${validityDays} дней`}
					</span>
					<span className="text-[10px] text-[var(--muted)]">
						{prescriptionDate}
					</span>
				</div>
			</div>

			{/* Patient & Doctor Context Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs">
				<div className="flex flex-col gap-0.5">
					<span className="text-[10px] uppercase font-semibold text-[var(--muted)]">Пациент:</span>
					<span className="font-bold text-[var(--ink)] truncate">
						{patientName} {patientBirthDate ? `(${patientBirthDate})` : ""}
					</span>
					<span className="text-[11px] text-[var(--muted)]">
						Медицинская карта приёма: <strong className="text-[var(--ink)]">{medicalCardNumber}</strong>
					</span>
				</div>
				<div className="flex flex-col gap-0.5 sm:text-right">
					<span className="text-[10px] uppercase font-semibold text-[var(--muted)]">Лечащий врач:</span>
					<span className="font-bold text-[var(--ink)] truncate">{doctorName}</span>
					<span className="text-[11px] text-[var(--muted)] truncate">{doctorSpecialty}</span>
				</div>
			</div>

			{/* Document Title Banner */}
			<div className="text-center py-1 border-b border-[var(--line-subtle,var(--line))]">
				<h4 className="text-xs uppercase font-extrabold tracking-wider text-[var(--ink)]">
					{isMemoMode ? "РЕКОМЕНДАЦИИ ПО ПРИЕМУ МЕДИКАМЕНТОВ" : "РЕЦЕПТУРНЫЙ БЛАНК (НАЗНАЧЕНИЯ ВРАЧА)"}
				</h4>
			</div>

			{/* Prescribed Items (Rp. / Signa) */}
			<div className="flex flex-col gap-3 py-1 flex-1">
				{items.length === 0 ? (
					<div className="p-8 text-center text-xs text-[var(--muted)] border border-dashed border-[var(--line)] rounded-xl">
						Препараты не выбраны. Выберите экспресс-набор или медикамент из каталога.
					</div>
				) : (
					items.map((item, idx) => (
						<div
							key={item.id || idx}
							className="p-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-xs flex flex-col gap-1.5 shadow-sm"
						>
							<div className="flex items-center justify-between gap-2">
								<span className="font-bold text-sm text-[var(--ink)]">
									{idx + 1}. {item.tradeName}
								</span>
								{item.dispenseLatin && (
									<span className="text-xs font-mono font-semibold text-[var(--muted)]">
										{item.dispenseLatin}
									</span>
								)}
							</div>

							{!isMemoMode && item.latinName && (
								<div className="text-xs font-mono italic text-[var(--teal,#0d9488)] bg-[var(--paper-soft)] px-2 py-0.5 rounded border border-[var(--line-subtle,var(--line))]">
									{item.latinName}
								</div>
							)}

							<div className="text-xs text-[var(--ink-secondary,var(--ink))] bg-[var(--paper-soft)] p-2 rounded-lg border border-[var(--line)]">
								<strong className="text-[var(--ink)]">Способ применения (Signa): </strong>
								{item.signaRussian}
							</div>
						</div>
					))
				)}
			</div>

			{/* Patient Care Safety Footnote */}
			{isMemoMode && (
				<div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex flex-col gap-1">
					<span className="font-bold">⚠️ Памятка безопасности после визита:</span>
					<span>• Не греть щёку со стороны лечения, воздержаться от сауны и горячей ванны на 3 дня.</span>
					<span>• При выраженном нарастании отёка, боли или повышении температуры немедленно звоните в клинику.</span>
				</div>
			)}

			{/* Verification Bar: QR Code, Doctor Stamp & Electronic Signature */}
			<div className="mt-auto pt-4 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-4">
				{/* QR Code Verification for Pharmacy */}
				<div className="flex items-center gap-2.5">
					<div className="w-11 h-11 p-1 bg-white border border-[var(--line)] rounded-lg flex items-center justify-center text-slate-900">
						<QrCode className="w-9 h-9" />
					</div>
					<div className="flex flex-col text-[10px] text-[var(--muted)]">
						<span className="font-semibold text-[var(--ink)]">QR-верификация аптеки</span>
						<span>Проверка подлинности бланка</span>
					</div>
				</div>

				{/* Clinic Seal & Doctor Sign */}
				<div className="flex items-center gap-4">
					<div className="flex flex-col items-end text-right text-[11px]">
						<div className="flex items-center gap-1.5 text-[var(--teal,#0d9488)] font-semibold">
							<CheckCircle2 className="w-4 h-4" />
							<span>Печать клиники и подпись врача</span>
						</div>
						<span className="text-[10px] text-[var(--muted)] mt-0.5">
							М.П. Лечащего врача и клиники · Подпись: _______________
						</span>
					</div>

					{isUkepSigned && (
						<div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
							<ShieldCheck className="w-4 h-4 shrink-0" />
							<span>УКЭП подтверждена</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

PrescriptionPrintSheet.displayName = "PrescriptionPrintSheet";
