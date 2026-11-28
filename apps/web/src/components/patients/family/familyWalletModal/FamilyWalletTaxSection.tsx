/**
 * apps/web/src/components/patients/family/familyWalletModal/FamilyWalletTaxSection.tsx
 *
 * Налоговые справки ФНС (КНД 1151156 / Формат 1184043) для семейного депозита.
 * Выгрузка XML и печать справок на социальный налоговый вычет 13% НДФЛ для всех членов семьи.
 * Соответствует Приказу ФНС России от 08.11.2023 № ЕА-7-11/824@ и ст. 219 НК РФ.
 */

import { AlertCircle, Download, FileText, Loader2, Printer, RefreshCw, Users } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { money } from "../../../../AppHelpers";
import { denteClinicalReadHeaders } from "../../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../../services/logging/clientLogger";
import { useAppStore } from "../../../../store/appStore";
import { showToast } from "../../../GlobalToast";
import type { FamilyGroupDetails } from "./types";

export interface FamilyTaxCertificateItem {
	readonly certificateNumber: string;
	readonly taxYear: string;
	readonly payerPatientId: string;
	readonly payerFullName: string;
	readonly payerInn?: string | undefined;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly kinshipCode: string;
	readonly kinshipNameRu: string;
	readonly code01AmountRub: number;
	readonly code02AmountRub: number;
	readonly grandTotalRub: number;
	readonly estimated13PercentRefundRub: number;
	readonly xmlPayload: string;
	readonly xmlFileName: string;
	readonly signatoryName?: string | undefined;
}

export interface FamilyWalletTaxSectionProps {
	readonly familyData: FamilyGroupDetails | null;
	readonly patientId: string;
}

const AVAILABLE_TAX_YEARS = [
	new Date().getFullYear(),
	new Date().getFullYear() - 1,
	new Date().getFullYear() - 2,
];

function downloadXmlPayload(xmlContent: string, fileName: string) {
	try {
		const blob = new Blob([xmlContent], { type: "application/xml;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = fileName || "fns_tax_certificate.xml";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		showToast(`Файл ${fileName} выгружен для отправки в ФНС`, "success");
	} catch (err) {
		showToast("Не удалось сохранить файл XML", "error");
	}
}

function printTaxCertificateHtml(
	cert: FamilyTaxCertificateItem,
	clinicProfile?: { signatoryName?: string | null | undefined } | null | undefined,
) {
	try {
		const printWin = window.open("", "_blank");
		if (!printWin) {
			showToast("Разрешите всплывающие окна для печати справки", "error");
			return;
		}
		const signatoryName = cert.signatoryName ?? clinicProfile?.signatoryName ?? "Главный врач";
		const html = `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Справка об оплате медицинских услуг ${cert.certificateNumber}</title>
	<style>
		body { font-family: 'PT Astra Serif', 'Times New Roman', serif; margin: 20mm; font-size: 13pt; line-height: 1.4; color: #000; }
		h1 { text-align: center; font-size: 15pt; margin-bottom: 4mm; }
		.subtitle { text-align: center; font-size: 11pt; margin-bottom: 8mm; color: #444; }
		table { width: 100%; border-collapse: collapse; margin-top: 6mm; margin-bottom: 6mm; }
		th, td { border: 1px solid #333; padding: 6px 10px; font-size: 11pt; text-align: left; }
		th { background-color: #f0f0f0; }
		.total-row { font-weight: bold; background-color: #fafafa; }
		.signatures { margin-top: 15mm; display: flex; justify-content: space-between; }
		.stamp-area { margin-top: 10mm; border: 1px dashed #999; padding: 10px; text-align: center; font-size: 10pt; color: #666; }
	</style>
</head>
<body>
	<h1>СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ</h1>
	<div class="subtitle">Справка для налогового вычета (13% НДФЛ)</div>

	<p><strong>Номер справки:</strong> ${cert.certificateNumber}</p>
	<p><strong>Налоговый период (год):</strong> ${cert.taxYear}</p>
	<p><strong>Налогоплательщик (плательщик):</strong> ${cert.payerFullName} ${cert.payerInn ? `(ИНН: ${cert.payerInn})` : ""}</p>
	<p><strong>Пациент:</strong> ${cert.patientFullName} (${cert.kinshipNameRu})</p>

	<table>
		<thead>
			<tr>
				<th>Код услуги</th>
				<th>Вид стоматологического лечения</th>
				<th>Сумма расходов</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td>01</td>
				<td>Терапевтическое и амбулаторное стоматологическое лечение</td>
				<td>${cert.code01AmountRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td>
			</tr>
			<tr>
				<td>02</td>
				<td>Дорогостоящее лечение (имплантация, костная пластика по ПП РФ № 458)</td>
				<td>${cert.code02AmountRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td>
			</tr>
			<tr class="total-row">
				<td colspan="2">ИТОГО ОПЛАЧЕНО ЗА ГОД:</td>
				<td>${cert.grandTotalRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</td>
			</tr>
		</tbody>
	</table>

	<p><strong>Расчетный налоговый вычет 13% к возврату:</strong> ${cert.estimated13PercentRefundRub.toLocaleString("ru-RU")} ₽</p>

	<div class="stamp-area">
		М.П. Клиники DENTE • Официальный документ строгой отчетности
	</div>

	<div class="signatures">
		<div>Главный врач / Ответственное лицо: ____________ / ${signatoryName} /</div>
		<div>Дата выдачи: ${new Date().toLocaleDateString("ru-RU")}</div>
	</div>

	<script>window.onload = function() { window.print(); };</script>
</body>
</html>`;
		printWin.document.write(html);
		printWin.document.close();
		printWin.focus();
	} catch (err) {
		showToast("Не удалось открыть окно печати", "error");
	}
}

export const FamilyWalletTaxSection: React.FC<FamilyWalletTaxSectionProps> =
	React.memo(function FamilyWalletTaxSection({ familyData }) {
		const clinicProfile = useAppStore((s) => s.clinicProfileDraft);
		const [selectedYear, setSelectedYear] = useState<number>(AVAILABLE_TAX_YEARS[0] ?? new Date().getFullYear());
		const [loading, setLoading] = useState(false);
		const [error, setError] = useState<string | null>(null);
		const [certificates, setCertificates] = useState<readonly FamilyTaxCertificateItem[]>([]);

		const loadCertificates = useCallback(async (year: number) => {
			if (!familyData?.id) return;
			setLoading(true);
			setError(null);
			try {
				const res = await fetch(
					`/api/finance/family/${familyData.id}/tax-certificates?taxYear=${year}`,
					{
						headers: denteClinicalReadHeaders(),
					},
				);
				if (!res.ok) {
					let msg = `Ошибка сервера (${res.status})`;
					try {
						const data = (await res.json()) as { message?: string };
						if (data?.message) msg = data.message;
					} catch (parseErr) {
						clientLogger.warn("[FamilyWalletTaxSection] Non-JSON error response:", parseErr);
					}
					throw new Error(msg);
				}
				const raw = await res.json();
				const result = raw?.data ?? raw;
				setCertificates(Array.isArray(result?.certificates) ? result.certificates : []);
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : "Не удалось загрузить справки";
				setError(msg);
			} finally {
				setLoading(false);
			}
		}, [familyData?.id]);

		useEffect(() => {
			loadCertificates(selectedYear);
		}, [loadCertificates, selectedYear]);

		const totalCode01 = certificates.reduce((acc, c) => acc + c.code01AmountRub, 0);
		const totalCode02 = certificates.reduce((acc, c) => acc + c.code02AmountRub, 0);
		const totalGrand = certificates.reduce((acc, c) => acc + c.grandTotalRub, 0);
		const totalRefund13 = certificates.reduce((acc, c) => acc + c.estimated13PercentRefundRub, 0);

		return (
			<div className="flex flex-col gap-4" data-testid="family-wallet-tax-section">
				{/* Top Year Switcher & Header */}
				<div className="p-3.5 sm:p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal)]/10 text-[var(--teal)] flex items-center justify-center shrink-0">
							<FileText className="w-4 h-4" />
						</div>
						<div>
							<h3 className="text-xs sm:text-sm font-bold text-[var(--ink)] m-0">
								Справки для налогового вычета (13% НДФЛ)
							</h3>
							<p className="text-[11px] text-[var(--muted)] m-0">
								Оформить единую справку на вычет для семьи
							</p>
						</div>
					</div>

					<div className="flex items-center gap-1.5 self-start sm:self-auto">
						<span className="text-xs font-semibold text-[var(--muted)] mr-1">
							Год:
						</span>
						{AVAILABLE_TAX_YEARS.map((yr) => (
							<button
								key={yr}
								type="button"
								data-testid={`tax-year-btn-${yr}`}
								onClick={() => setSelectedYear(yr)}
								className={`min-h-[44px] sm:min-h-[32px] h-8 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer select-none ${
									selectedYear === yr
										? "bg-[var(--primary)] text-white shadow-xs"
										: "border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								{yr}
							</button>
						))}
					</div>
				</div>

				{/* Summary Family Benefit Card */}
				{certificates.length > 0 && (
					<div className="p-4 rounded-xl bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent border border-teal-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
						<div className="flex flex-col gap-1">
							<span className="text-xs font-semibold text-[var(--muted)]">
								Расходы семьи за {selectedYear} год:
							</span>
							<div className="flex items-baseline gap-2 flex-wrap">
								<span className="text-xl sm:text-2xl font-black text-[var(--ink)]">
									{money(totalGrand)}
								</span>
								<span className="text-xs text-[var(--muted)]">
									(Код 01: {money(totalCode01)} • Код 02: {money(totalCode02)})
								</span>
							</div>
						</div>

						<div className="p-2.5 px-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-left sm:text-right shadow-2xs shrink-0">
							<span className="text-xs font-medium text-[var(--ink-muted)] block">
								Возврат 13% семьи
							</span>
							<span className="text-lg sm:text-xl font-black text-[var(--success-ink)] block mt-0.5 font-mono">
								+{money(totalRefund13)}
							</span>
						</div>
					</div>
				)}

				{/* Loading State */}
				{loading && (
					<div className="p-8 flex flex-col items-center justify-center gap-2 bg-[var(--paper)] rounded-xl border border-[var(--line)] text-center">
						<Loader2 className="w-6 h-6 animate-spin text-[var(--teal)]" />
						<span className="text-xs text-[var(--muted)]">
							Формирование справок ФНС за {selectedYear} год...
						</span>
					</div>
				)}

				{/* Error State */}
				{!loading && error && (
					<div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 flex items-center justify-between gap-3 text-xs">
						<div className="flex items-center gap-2">
							<AlertCircle className="w-4 h-4 shrink-0" />
							<span>{error}</span>
						</div>
						<button
							type="button"
							onClick={() => loadCertificates(selectedYear)}
							className="px-2.5 py-1 rounded-lg bg-[var(--paper)] border border-rose-500/30 font-semibold cursor-pointer text-xs"
						>
							Повторить
						</button>
					</div>
				)}

				{/* Empty State */}
				{!loading && !error && certificates.length === 0 && (
					<div className="p-8 flex flex-col items-center justify-center text-center bg-[var(--paper)] rounded-xl border border-[var(--line)] shadow-2xs">
						<div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2">
							<Users className="w-6 h-6" />
						</div>
						<h4 className="text-sm font-bold text-[var(--ink)] m-0">
							Нет оплат за {selectedYear} год
						</h4>
						<p className="text-xs text-[var(--muted)] m-0 mt-1 max-w-sm">
							Справки для налогового вычета формируются автоматически на основе
							оплаченных приёмов родственников в выбранном календарном году.
						</p>
					</div>
				)}

				{/* Certificates List */}
				{!loading && !error && certificates.length > 0 && (
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between px-1">
							<span className="text-xs font-bold text-[var(--ink)]">
								Справки членов семьи ({certificates.length} шт.)
							</span>
							<button
								type="button"
								onClick={() => loadCertificates(selectedYear)}
								className="text-[11px] text-[var(--teal)] hover:underline inline-flex items-center gap-1 cursor-pointer"
							>
								<RefreshCw className="w-3 h-3" />
								<span>Обновить</span>
							</button>
						</div>

						<div className="border border-[var(--line)] rounded-xl divide-y divide-[var(--line)] bg-[var(--paper)] overflow-hidden shadow-2xs">
							{certificates.map((cert) => (
								<div
									key={cert.patientId}
									className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--paper-soft)] transition-colors"
									data-testid={`family-tax-cert-row-${cert.patientId}`}
								>
									<div className="min-w-0">
										<div className="flex items-center gap-2 flex-wrap">
											<span className="text-xs sm:text-sm font-bold text-[var(--ink)] truncate">
												{cert.patientFullName}
											</span>
											<span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-500/10 text-[var(--muted)] border border-[var(--line)]">
												{cert.kinshipNameRu}
											</span>
											<span className="text-[11px] font-mono text-[var(--teal)] font-semibold">
												{cert.certificateNumber}
											</span>
										</div>

										<div className="text-[11px] text-[var(--muted)] flex items-center gap-2 mt-1 flex-wrap">
											<span>Плательщик: {cert.payerFullName}</span>
											<span>•</span>
											<span>Код 01: {money(cert.code01AmountRub)}</span>
											{cert.code02AmountRub > 0 && (
												<>
													<span>•</span>
													<span className="font-semibold text-rose-600 dark:text-rose-400">
														Код 02: {money(cert.code02AmountRub)}
													</span>
												</>
											)}
										</div>
									</div>

									<div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--line)]">
										<div className="text-left sm:text-right">
											<span className="text-xs font-medium text-[var(--ink-muted)] block">
												К возврату 13%
											</span>
											<span className="text-sm sm:text-base font-bold text-[var(--success-ink)] font-mono block">
												+{money(cert.estimated13PercentRefundRub)}
											</span>
										</div>

										<div className="flex items-center gap-1.5 shrink-0">
											<button
												type="button"
												data-testid={`btn-download-xml-${cert.patientId}`}
												onClick={() => downloadXmlPayload(cert.xmlPayload, cert.xmlFileName)}
												className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
												title="Скачать официальный XML-файл для отправки в налоговую"
											>
												<Download className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
												<span className="hidden sm:inline">XML</span>
											</button>

											<button
												type="button"
												data-testid={`btn-print-tax-${cert.patientId}`}
												onClick={() => printTaxCertificateHtml(cert, clinicProfile)}
												className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
												title="Печать справки об оплате медицинских услуг"
											>
												<Printer className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
												<span className="hidden sm:inline">Печать</span>
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		);
	});
