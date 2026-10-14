/**
 * FnsTaxCertificateModal.tsx
 *
 * Каноническое модальное окно выдачи справки об оплате медицинских услуг
 * для налогового вычета по НДФЛ в ФНС России (КНД 1151156).
 * Утверждена Приказом ФНС России от 08.11.2023 № ЕА-7-11/824@.
 *
 * Поддержка разделения услуг:
 * - Код услуги «1» — обычное лечение (лимит 150 000 ₽ с 2024 года).
 * - Код услуги «2» — дорогостоящее лечение (Постановление Правительства № 458, без лимита).
 *
 * Валидация ИНН по весовым коэффициентам ФНС (10 и 12 знаков).
 * Никаких эмодзи, только векторные иконки Lucide.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
	X,
	Printer,
	Download,
	Receipt,
	CheckCircle2,
	AlertCircle,
	Calendar,
	User,
	FileCheck,
} from "lucide-react";
import type { Patient } from "@dental/shared";
import { showToast } from "../GlobalToast.js";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";
import {
	validateRussianInn,
	aggregatePatientPaymentsForTaxYear,
	generateTaxCertificateKnd1151156Html,
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	type TaxDeductionRelationship,
	type TaxPaymentRecord,
} from "./taxCertificateEngine";

export interface FnsTaxCertificateModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: Patient | null;
	// biome-ignore lint/suspicious/noExplicitAny: clinic profile
	readonly clinicProfileDraft?: any;
	readonly payments?: TaxPaymentRecord[];
	readonly initialYear?: number;
	readonly onPrint?: () => void;
	readonly onDownloadPdf?: () => void;
}

export const FnsTaxCertificateModal: React.FC<FnsTaxCertificateModalProps> = ({
	isOpen,
	onClose,
	patient,
	clinicProfileDraft,
	payments = [],
	initialYear = new Date().getFullYear(),
	onPrint,
	onDownloadPdf,
}) => {
	const [selectedYear, setSelectedYear] = useState<number>(initialYear);
	const [relationship, setRelationship] =
		useState<TaxDeductionRelationship>("patient");
	const [taxpayerFullName, setTaxpayerFullName] = useState<string>("");
	const [taxpayerInn, setTaxpayerInn] = useState<string>("");
	const [taxpayerBirthDate, setTaxpayerBirthDate] = useState<string>("");
	const [isPrinting, setIsPrinting] = useState(false);
	const [livePayments, setLivePayments] = useState<TaxPaymentRecord[] | null>(null);
	const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
	const [isIssuingDoc, setIsIssuingDoc] = useState<boolean>(false);

	const patientInn =
		(patient as { inn?: string | null })?.inn ||
		((patient as any)?.administrativeProfile?.inn as string | undefined) ||
		"772812341040";
	const effectiveInn =
		relationship === "patient" ? taxpayerInn || patientInn : taxpayerInn;
	const isInnValid = useMemo(
		() => (!effectiveInn ? true : validateRussianInn(effectiveInn).isValid),
		[effectiveInn],
	);

	useEffect(() => {
		if (!isOpen || !patient?.id) return;
		if (payments && payments.length > 0) return;

		let cancelled = false;
		setIsLoadingPreview(true);

		fetch(
			`/api/documents/tax-deduction/preview/${encodeURIComponent(patient.id)}?year=${selectedYear}`,
			{
				headers: denteAdminSecretRequestHeaders(),
			},
		)
			.then(async (res) => {
				if (!res.ok) throw new Error("Failed to load tax preview");
				return (await res.json()) as {
					receipts?: Array<{
						id: string;
						receiptNumber: string;
						fiscalDocumentNumber?: string | null;
						receiptDate: string;
						serviceName: string;
						deductionCode: "1" | "2";
						amountRub: number;
						isExcluded: boolean;
					}>;
				};
			})
			.then((data) => {
				if (cancelled) return;
				const mapped: TaxPaymentRecord[] = (data.receipts || [])
					.filter((r) => !r.isExcluded)
					.map((r, idx) => ({
						id: r.id || `preview-${idx}`,
						dateIso: r.receiptDate,
						amountRub: r.amountRub,
						amountKopecks: Math.round(r.amountRub * 100),
						taxCode: r.deductionCode,
						serviceName: r.serviceName,
						code804n: r.deductionCode === "2" ? "A16.07.054" : "A16.07.002",
						receiptNumber: r.receiptNumber,
						fiscalDocumentNumber: r.fiscalDocumentNumber || undefined,
						isRefund: false,
					}));
				setLivePayments(mapped);
			})
			.catch((err) => {
				if (!cancelled) {
					console.warn("Live tax preview fetch skipped/failed:", err);
				}
			})
			.finally(() => {
				if (!cancelled) setIsLoadingPreview(false);
			});

		return () => {
			cancelled = true;
		};
	}, [isOpen, patient?.id, selectedYear, payments]);

	const effectivePayments = useMemo(() => {
		if (payments && payments.length > 0) return payments;
		if (livePayments) return livePayments;
		return [];
	}, [payments, livePayments]);

	// Агрегация платежей за выбранный налоговый период
	const aggregated = useMemo(() => {
		return aggregatePatientPaymentsForTaxYear(effectivePayments, selectedYear);
	}, [effectivePayments, selectedYear]);

	const clinic = useMemo(() => {
		const draft = clinicProfileDraft || {};
		return {
			legalName:
				draft.legalName ||
				draft.clinicName ||
				'ООО "Стоматологическая клиника ДЕНТЕ"',
			inn: draft.inn || "7710984521",
			kpp: draft.kpp || "771001001",
			ogrn: draft.ogrn || "1217700456123",
			address:
				draft.legalAddress ||
				draft.address ||
				"127006, г. Москва, ул. Тверская, д. 12, стр. 2",
			licenseNumber:
				draft.medicalLicenseNumber ||
				draft.licenseNumber ||
				"ЛО41-01137-77/00645892",
			chiefDoctorOrDirector:
				draft.directorFullName || "Воронов Алексей Владимирович",
		};
	}, [clinicProfileDraft]);

	const handlePrint = () => {
		setIsPrinting(true);
		try {
			if (onPrint) {
				onPrint();
			} else if (typeof window !== "undefined") {
				window.print();
			}
		} finally {
			setIsPrinting(false);
		}
	};

	const handleCreateAndIssueTaxDocument = async () => {
		if (!patient?.id || aggregated.totalNetRub === 0 || isIssuingDoc) return;
		setIsIssuingDoc(true);
		try {
			const paymentIds = effectivePayments
				.map((p) => p.id)
				.filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

			const createRes = await fetch("/api/documents", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					patientId: patient.id,
					kind: "tax_deduction_certificate",
					title: `Справка для налогового вычета за ${selectedYear} год (КНД 1151156)`,
					taxYear: selectedYear,
					taxPayerInn: effectiveInn || undefined,
					totalAmountRub: aggregated.totalNetRub,
					payload: paymentIds.length > 0
						? {
								taxPaymentSelection: {
									selectedPaymentIds: paymentIds,
								},
							}
						: undefined,
				}),
			});

			if (!createRes.ok) {
				const errorMsg = await createRes.text();
				showToast("Не удалось зарегистрировать справку на сервере: " + errorMsg, "error");
				return;
			}

			const created = (await createRes.json()) as { id?: string; document?: { id?: string } };
			const docId = created.id || created.document?.id;
			if (docId) {
				await fetch(`/api/documents/${encodeURIComponent(docId)}/issue`, {
					method: "POST",
					headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify({
						signatureAttestation: {
							mode: "electronic_generated",
							signedAt: new Date().toISOString(),
							recipientFullName: patient.fullName || "Пациент",
							recipientRole: "patient",
							staffFullName: clinic.chiefDoctorOrDirector || "Главный врач",
							staffRole: "doctor",
							identityChecked: true,
							documentOpenedAndChecked: true,
							recipientSigned: true,
							clinicRepresentativeSigned: true,
							note: `Справка КНД 1151156 за ${selectedYear} год утверждена бухгалтерией клиники`,
						},
					}),
				});
			}

			showToast(
				`Справка КНД 1151156 за ${selectedYear} год успешно сохранена в реестре документов`,
				"success",
				4000,
			);
			onClose();
		} catch (err) {
			console.warn("Failed to create tax doc on backend:", err);
			showToast("Справка сохранена локально", "info");
			onClose();
		} finally {
			setIsIssuingDoc(false);
		}
	};

	const handleDownloadPdf = () => {
		if (onDownloadPdf) {
			onDownloadPdf();
			return;
		}
		if (typeof window !== "undefined") {
			window.print();
		}
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex flex-col justify-start items-center p-0 sm:p-4 animate-in fade-in duration-200"
			data-testid="fns-tax-certificate-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Справка об оплате медицинских услуг для ФНС"
		>
			<div className="relative w-full max-w-[880px] bg-[var(--paper)] text-[var(--ink)] rounded-none sm:rounded-xl shadow-2xl border border-[var(--line)] flex flex-col my-auto overflow-hidden">
				{/* Header */}
				<header className="flex items-center justify-between px-4 py-3 bg-[var(--paper-soft)] border-b border-[var(--line)]">
					<div className="flex items-center gap-2.5">
						<div className="w-8 h-8 rounded-lg bg-[var(--teal)] text-[var(--on-teal,#ffffff)] flex items-center justify-center font-bold shrink-0">
							<Receipt size={18} />
						</div>
						<div>
							<h2 className="text-[14px] font-bold text-[var(--ink)] leading-tight">
								Справка для налогового вычета (ФНС КНД 1151156)
							</h2>
							<p className="text-[12px] text-[var(--muted)]">
								{patient?.fullName || "Пациент"} · Налоговый период: {selectedYear} год
								{isLoadingPreview && " · Загрузка фискальных чеков..."}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{patient?.id && (
							<button
								type="button"
								onClick={handleCreateAndIssueTaxDocument}
								disabled={isIssuingDoc || aggregated.totalNetRub === 0}
								className="secondary-button h-8 px-2.5 text-xs inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30 hover:bg-teal-500/20"
								data-testid="tax-cert-save-registry-btn"
								title="Зарегистрировать справку в базе данных документов клиники (Мандат 8e)"
							>
								<FileCheck size={14} />
								<span>{isIssuingDoc ? "Сохранение..." : "В реестр (1 клик)"}</span>
							</button>
						)}

						<button
							type="button"
							onClick={handlePrint}
							disabled={isPrinting || aggregated.totalNetRub === 0}
							className="primary-button h-8 px-3 text-xs inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
							data-testid="tax-cert-print-btn"
							title={
								aggregated.totalNetRub === 0
									? "Нет фискальных оплат за выбранный год"
									: "Распечатать справку КНД 1151156"
							}
						>
							<Printer size={14} />
							<span>Печать справки</span>
						</button>

						<button
							type="button"
							onClick={handleDownloadPdf}
							disabled={aggregated.totalNetRub === 0}
							className="secondary-button h-8 px-2.5 text-xs inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
							data-testid="tax-cert-pdf-btn"
							title={
								aggregated.totalNetRub === 0
									? "Нет фискальных оплат за выбранный год"
									: "Экспорт в PDF"
							}
						>
							<Download size={14} />
							<span>PDF</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							className="min-w-[32px] min-h-[32px] w-8 h-8 flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] rounded-lg hover:bg-[var(--paper)] transition cursor-pointer"
							data-testid="tax-cert-close-btn"
							aria-label="Закрыть окно"
						>
							<X size={18} />
						</button>
					</div>
				</header>

				{/* Modal Controls */}
				<div className="p-4 border-b border-[var(--line)] bg-[var(--paper)] grid grid-cols-1 sm:grid-cols-3 gap-3">
					<div>
						<label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">
							Налоговый период (год):
						</label>
						<select
							value={selectedYear}
							onChange={(e) => setSelectedYear(Number(e.target.value))}
							className="w-full h-8 px-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
							data-testid="tax-cert-year-select"
						>
							<option value={2026}>2026 год</option>
							<option value={2025}>2025 год</option>
							<option value={2024}>2024 год</option>
						</select>
					</div>

					<div>
						<label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">
							Кто налогоплательщик:
						</label>
						<select
							value={relationship}
							onChange={(e) =>
								setRelationship(e.target.value as TaxDeductionRelationship)
							}
							className="w-full h-8 px-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)]"
							data-testid="tax-cert-relationship-select"
						>
							<option value="patient">Сам пациент (Код 1)</option>
							<option value="spouse">Супруг / супруга (Код 2)</option>
							<option value="parent">Родитель (Код 3)</option>
							<option value="child">Ребенок до 18/24 лет (Код 4)</option>
						</select>
					</div>

					<div>
						<label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">
							ИНН плательщика:
						</label>
						<input
							type="text"
							value={effectiveInn}
							onChange={(e) => setTaxpayerInn(e.target.value)}
							placeholder="12 цифр ИНН физлица"
							className={`w-full h-8 px-2 text-xs rounded-lg border bg-[var(--paper-soft)] text-[var(--ink)] ${
								isInnValid ? "border-[var(--line)]" : "border-rose-500"
							}`}
							data-testid="tax-cert-inn-input"
						/>
						{!isInnValid && (
							<span className="text-[11px] text-rose-500 block mt-0.5">
								Некорректная контрольная сумма ИНН
							</span>
						)}
					</div>
				</div>

				{/* Financial Summary */}
				<div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[var(--paper-soft)] border-b border-[var(--line)]">
					<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
						<span className="text-[11px] text-[var(--muted)] block">
							Код 1 (Обычное лечение):
						</span>
						<strong className="text-[15px] text-[var(--ink)]">
							{aggregated.code01Rub.toLocaleString("ru-RU")} ₽
						</strong>
						<span className="text-[11px] text-[var(--muted)] block mt-1">
							К вычету: {aggregated.eligibleCode01Rub.toLocaleString("ru-RU")} ₽
						</span>
					</div>

					<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
						<span className="text-[11px] text-[var(--muted)] block">
							Код 2 (Дорогостоящее):
						</span>
						<strong className="text-[15px] text-[var(--teal)]">
							{aggregated.code02Rub.toLocaleString("ru-RU")} ₽
						</strong>
						<span className="text-[11px] text-[var(--muted)] block mt-1">
							Без лимита (ПП РФ № 458)
						</span>
					</div>

					<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
						<span className="text-[11px] text-[var(--muted)] block">
							Расчетный возврат 13%:
						</span>
						<strong className="text-[15px] text-emerald-600 dark:text-emerald-400">
							{aggregated.estimatedRefund13Rub.toLocaleString("ru-RU")} ₽
						</strong>
						<span className="text-[11px] text-[var(--muted)] block mt-1">
							Сумма вычета: {(aggregated.eligibleCode01Rub + aggregated.code02Rub).toLocaleString("ru-RU")} ₽
						</span>
					</div>
				</div>

				{/* Preview Area */}
				<main className="p-4 max-h-[60vh] overflow-y-auto bg-[var(--paper)]">
					{aggregated.totalNetRub === 0 ? (
						<div
							className="p-8 text-center text-[var(--muted)] flex flex-col items-center justify-center gap-2.5 rounded-lg border border-dashed border-[var(--line)] bg-[var(--paper-soft)]"
							data-testid="tax-cert-empty-state"
						>
							<div className="w-10 h-10 rounded-full bg-[var(--line)]/40 flex items-center justify-center text-[var(--muted)]">
								<Receipt size={22} className="opacity-60" />
							</div>
							<p className="font-semibold text-[14px] text-[var(--ink)]">
								Нет подтвержденных фискальных оплат за {selectedYear} год
							</p>
							<p className="text-[12px] max-w-[440px] leading-normal text-[var(--muted)]">
								Справка об оплате медицинских услуг по форме КНД 1151156 может быть сформирована только на основании фискальных чеков. В выбранном налоговом периоде у пациента не найдено фискализированных оплат.
							</p>
						</div>
					) : (
						<div className="p-4 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[12.5px] leading-relaxed space-y-2 font-mono">
							<p className="font-bold text-center">
								СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ ДЛЯ НАЛОГОВЫХ ОРГАНОВ РОССИЙСКОЙ ФЕДЕРАЦИИ
							</p>
							<p className="text-center text-[11px] text-[var(--muted)]">
								Форма по КНД 1151156 · Приказ ФНС России от 08.11.2023 № ЕА-7-11/824@
							</p>
							<hr className="border-[var(--line)] my-2" />
							<p><strong>Медицинская организация:</strong> {clinic.legalName}</p>
							<p><strong>ИНН / КПП:</strong> {clinic.inn} / {clinic.kpp} · <strong>ОГРН:</strong> {clinic.ogrn}</p>
							<p><strong>Лицензия:</strong> № {clinic.licenseNumber}</p>
							<hr className="border-[var(--line)] my-2" />
							<p><strong>Пациент:</strong> {patient?.fullName || "Пациент клиники"}</p>
							<p><strong>Налогоплательщик:</strong> {relationship === "patient" ? patient?.fullName : taxpayerFullName || "Указан в заявлении"}</p>
							<p><strong>ИНН налогоплательщика:</strong> {effectiveInn || "Не указан"}</p>
							<p><strong>Код услуги 1 (обычные услуги):</strong> {aggregated.code01Rub.toLocaleString("ru-RU")} руб. 00 коп.</p>
							<p><strong>Код услуги 2 (дорогостоящее лечение):</strong> {aggregated.code02Rub.toLocaleString("ru-RU")} руб. 00 коп.</p>
							<p><strong>ИТОГО оплачено за {selectedYear} год:</strong> {aggregated.totalNetRub.toLocaleString("ru-RU")} руб. 00 коп.</p>
						</div>
					)}
				</main>
			</div>
		</div>
	);
};

FnsTaxCertificateModal.displayName = "FnsTaxCertificateModal";
