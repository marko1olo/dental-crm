import React from "react";
import { Award, Check, ShieldCheck } from "lucide-react";
import {
	type CompletedWorksActParams,
	type CompiledActAndWarrantySummary,
} from "./invoiceEngine";

export interface PatientBillingActPreviewProps {
	readonly activeTab: "preview" | "details";
	readonly actParams: CompletedWorksActParams;
	readonly summary: CompiledActAndWarrantySummary;
}

export const PatientBillingActPreview: React.FC<PatientBillingActPreviewProps> = ({
	activeTab,
	actParams,
	summary,
}) => {
	if (activeTab === "preview") {
		return (
			<div className="border border-[var(--line)] rounded-2xl bg-[var(--paper)] text-[var(--ink)] p-4 sm:p-8 shadow-inner overflow-x-auto text-xs">
				{/* Printable Preview Sheet */}
				<div className="max-w-3xl mx-auto space-y-4 font-serif">
					{/* Header */}
					<div className="flex justify-between items-start border-b-2 border-[var(--ink)] pb-3">
						<div>
							<div className="font-sans font-bold text-sm uppercase text-[var(--ink)]">{actParams.clinic.legalName}</div>
							<div className="text-[11px] text-[var(--muted)]">Лицензия: № {actParams.clinic.licenseNumber} от {actParams.clinic.licenseDate} г.</div>
							<div className="text-[11px] text-[var(--muted)]">Адрес: {actParams.clinic.address}</div>
						</div>
						<div className="text-right text-[11px] text-[var(--muted)]">
							<div>ИНН: {actParams.clinic.inn} / КПП: {actParams.clinic.kpp}</div>
							<div>ОГРН: {actParams.clinic.ogrn}</div>
							<div>Тел: <strong className="text-[var(--ink)]">{actParams.clinic.phone}</strong></div>
						</div>
					</div>

					{/* Title */}
					<div className="text-center font-sans">
						<h2 className="text-sm sm:text-base font-black uppercase tracking-tight m-0 text-[var(--ink)]">
							АКТ ВЫПОЛНЕННЫХ РАБОТ И ГАРАНТИЙНЫЙ ТАЛОН № {summary.actNumber}
						</h2>
						<p className="text-[11px] text-[var(--muted)] m-0 mt-0.5">
							к Договору на оказание платных медицинских услуг № {actParams.contractNumber} • Дата: {new Date().toLocaleDateString("ru-RU")} г.
						</p>
					</div>

					{/* Requisites Table */}
					<table className="w-full border-collapse border border-[var(--line)] text-[11px] bg-[var(--paper)]">
						<tbody>
							<tr>
								<td className="p-1.5 bg-[var(--paper-soft)] font-bold border border-[var(--line)] w-1/4">Исполнитель (Клиника):</td>
								<td className="p-1.5 border border-[var(--line)] w-1/4">{actParams.clinic.legalName}</td>
								<td className="p-1.5 bg-[var(--paper-soft)] font-bold border border-[var(--line)] w-1/4">Пациент (Заказчик):</td>
								<td className="p-1.5 border border-[var(--line)] w-1/4 font-bold">{actParams.patient.fullName}</td>
							</tr>
							<tr>
								<td className="p-1.5 bg-[var(--paper-soft)] font-bold border border-[var(--line)]">Лечащий врач:</td>
								<td className="p-1.5 border border-[var(--line)]">{actParams.doctor.fullName}</td>
								<td className="p-1.5 bg-[var(--paper-soft)] font-bold border border-[var(--line)]">Паспорт / Медкарта:</td>
								<td className="p-1.5 border border-[var(--line)]">{actParams.patient.medicalCardNumber}</td>
							</tr>
						</tbody>
					</table>

					{/* Services Table */}
					<div>
						<div className="font-sans font-bold text-xs mb-1 uppercase text-[var(--ink)]">1. Оказанные медицинские услуги:</div>
						<table className="w-full border-collapse border border-[var(--line)] text-[11px] bg-[var(--paper)]">
							<thead>
								<tr className="bg-[var(--paper-soft)] font-bold">
									<th className="border border-[var(--line)] p-1 text-center w-8">№</th>
									<th className="border border-[var(--line)] p-1 text-center w-24">Код услуги</th>
									<th className="border border-[var(--line)] p-1 text-center w-14">Зуб</th>
									<th className="border border-[var(--line)] p-1 text-left">Наименование медицинской услуги</th>
									<th className="border border-[var(--line)] p-1 text-center w-12">Кол.</th>
									<th className="border border-[var(--line)] p-1 text-right w-20">Цена, ₽</th>
									<th className="border border-[var(--line)] p-1 text-right w-24">Сумма, ₽</th>
								</tr>
							</thead>
							<tbody>
								{summary.items.map((it, idx) => (
									<tr key={it.id || idx}>
										<td className="border border-[var(--line)] p-1 text-center font-mono">{idx + 1}</td>
										<td className="border border-[var(--line)] p-1 text-center font-mono text-[10px]">{it.code804n || "—"}</td>
										<td className="border border-[var(--line)] p-1 text-center font-bold">{it.toothNumber ? `№${it.toothNumber}` : "—"}</td>
										<td className="border border-[var(--line)] p-1 max-w-[280px]">
											<div className="flex items-center gap-1 min-w-0">
												<span className="truncate min-w-0" title={it.name}>{it.name}</span>
												{it.isWarranty && (
													<span
														data-testid={`badge-warranty-preview-${it.id}`}
														className="shrink-0 text-teal-700 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-500/30 rounded px-1.5 py-0.5 text-[10px] font-bold inline-flex items-center gap-1"
													>
														[ГАРАНТИЯ]
													</span>
												)}
											</div>
										</td>
										<td className="border border-[var(--line)] p-1 text-center font-mono">{it.quantity}</td>
										<td className="border border-[var(--line)] p-1 text-right font-mono">{it.priceRub.toFixed(2)}</td>
										<td className="border border-[var(--line)] p-1 text-right font-mono font-bold">
											{it.isWarranty ? "0.00" : (it.priceRub * it.quantity - (it.discountRub || 0)).toFixed(2)}
										</td>
									</tr>
								))}
								<tr className="bg-[var(--paper-soft)] font-bold">
									<td colSpan={6} className="border border-[var(--line)] p-1.5 text-right uppercase">Итого к оплате (Без НДС):</td>
									<td className="border border-[var(--line)] p-1.5 text-right font-mono text-sm">{summary.totalNetRubFormatted} ₽</td>
								</tr>
							</tbody>
						</table>
						<div className="mt-1 text-[11px] text-[var(--ink)]">
							<strong>Сумма прописью:</strong> <em>{summary.totalInWords}</em>.
						</div>
					</div>

					{/* Warranty Box */}
					<div className="border border-[var(--line)] p-2.5 rounded-lg bg-[var(--paper-soft)] space-y-1.5">
						<div className="font-sans font-bold text-xs uppercase flex items-center gap-1.5 text-[var(--ok-fg,#059669)]">
							<ShieldCheck className="w-4 h-4 text-[var(--ok-fg,#059669)] inline" />
							<span>2. Гарантийный талон и обязательства клиники (СтАР и <span className="whitespace-nowrap">Закон&nbsp;РФ №&nbsp;2300-1</span>):</span>
						</div>
						<table className="w-full border-collapse border border-[var(--line)] text-[10px] bg-[var(--paper)]">
							<thead>
								<tr className="bg-[var(--paper-soft)] font-bold">
									<th className="border border-[var(--line)] p-1 text-left">Категория лечения</th>
									<th className="border border-[var(--line)] p-1 text-center">Зубы</th>
									<th className="border border-[var(--line)] p-1 text-left">Гарантийный срок</th>
									<th className="border border-[var(--line)] p-1 text-left">Срок службы</th>
								</tr>
							</thead>
							<tbody>
								{summary.warrantyTerms.map((w, idx) => (
									<tr key={idx}>
										<td className="border border-[var(--line)] p-1 font-bold">{w.categoryName}</td>
										<td className="border border-[var(--line)] p-1 text-center font-mono">{w.teethDisplay}</td>
										<td className="border border-[var(--line)] p-1 text-[var(--ok-fg,#059669)] font-bold">{w.warrantyPeriodText}</td>
										<td className="border border-[var(--line)] p-1">{w.serviceLifeText}</td>
									</tr>
								))}
							</tbody>
						</table>
						<div className="text-[10px] text-[var(--muted)] leading-tight">
							Условия гарантии: строгое соблюдение гигиены полости рта, прохождение бесплатного профосмотра и профгигиены каждые 6 месяцев.
						</div>
					</div>

					{/* Signatures & Seal Zone */}
					<div className="grid grid-cols-2 gap-8 pt-4 border-t border-[var(--line)] text-[11px]">
						<div>
							<div className="font-bold">Исполнитель: {actParams.clinic.legalName}</div>
							<div>Врач-стоматолог: <strong>{actParams.doctor.fullName}</strong></div>
							<div className="border-b border-[var(--line)] mt-5 pb-0.5 flex justify-between text-[10px]">
								<span>Подпись: ________________</span>
								<span>/ {actParams.doctor.fullName} /</span>
							</div>
							<div className="flex items-center gap-3 mt-2">
								<div className="border-2 border-[var(--ok-fg,#059669)] text-[var(--ok-fg,#059669)] font-black text-xs px-2 py-0.5 rounded-sm uppercase transform -rotate-3 flex items-center gap-1">
									<Check size={12} className="stroke-[3]" /> ОПЛАЧЕНО
								</div>
								<div className="w-16 h-16 rounded-full border border-dashed border-[var(--line)] flex items-center justify-center text-[9px] text-[var(--muted)] text-center">
									М.П.<br />Клиники
								</div>
							</div>
						</div>
						<div>
							<div className="font-bold">Заказчик (Пациент):</div>
							<div>ФИО: <strong>{actParams.patient.fullName}</strong></div>
							<div className="border-b border-[var(--line)] mt-5 pb-0.5 flex justify-between text-[10px]">
								<span>Подпись: ________________</span>
								<span>/ {actParams.patient.fullName} /</span>
							</div>
							<div className="text-[9px] text-[var(--muted)] mt-2">
								Претензий по качеству и объему услуг не имею. С условиями гарантии ознакомлен.
							</div>
						</div>
					</div>

					{/* Clinic Stamp & Chief Doctor Info */}
					<div className="pt-2 border-t border-[var(--line)] flex justify-between text-[10px] text-[var(--muted)]">
						<div>
							<span>Форма документа:</span> Акт сдачи-приемки и гарантийный талон (Стандарты СтАР)
						</div>
						<div>
							<span className="text-[var(--muted)]">Главный врач:</span> {actParams.clinic.chiefDoctorName}
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Details Tab — Monolithic Flat Panels (Anti-Matryoshka)
	return (
		<div className="space-y-4">
			<div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] overflow-hidden shadow-xs">
				<div className="px-4 py-3 bg-[var(--paper-soft)] border-b border-[var(--line)] flex items-center gap-2 font-bold text-xs sm:text-sm text-[var(--ink)]">
					<Award className="w-4 h-4 text-[var(--teal,#0d9488)]" />
					<span>Гарантийные условия по позициям счета:</span>
				</div>
				<div className="divide-y divide-[var(--line)]/60 text-xs">
					{summary.warrantyTerms.map((term, idx) => (
						<div key={idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--paper-soft)]/50 transition-colors">
							<div className="space-y-1 flex-1 min-w-0">
								<div className="flex items-center gap-2">
									<strong className="text-[var(--teal,#0d9488)] text-xs sm:text-sm">{term.categoryName}</strong>
									<span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)]">
										{term.teethDisplay}
									</span>
								</div>
								<div className="text-[11px] text-[var(--muted)]">
									<span className="font-semibold text-[var(--ink)]">Условие:</span> {term.conditionsText}
								</div>
							</div>
							<div className="text-left sm:text-right shrink-0 space-y-0.5">
								<div className="text-[var(--ok-fg,#059669)] font-bold">
									Гарантия: {term.warrantyPeriodText}
								</div>
								<div className="text-[11px] text-[var(--muted)]">Срок службы: {term.serviceLifeText}</div>
							</div>
						</div>
					))}
				</div>
			</div>

			<div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-2 text-xs">
				<h4 className="font-bold text-xs uppercase tracking-wider text-[var(--muted)] m-0">
					Реквизиты медицинской лицензии и клиники:
				</h4>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
					<div>
						<span className="text-[var(--muted)]">Юр. лицо:</span> <strong>{actParams.clinic.legalName}</strong>
					</div>
					<div>
						<span className="text-[var(--muted)]">Лицензия:</span> <strong>№ {actParams.clinic.licenseNumber}</strong>
					</div>
					<div>
						<span className="text-[var(--muted)]">ИНН / ОГРН:</span> {actParams.clinic.inn} / {actParams.clinic.ogrn}
					</div>
					<div>
						<span className="text-[var(--muted)]">Главный врач:</span> {actParams.clinic.chiefDoctorName}
					</div>
				</div>
			</div>
		</div>
	);
};
