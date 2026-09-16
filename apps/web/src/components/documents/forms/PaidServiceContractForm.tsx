import React, { useMemo, useState, useRef, useEffect } from "react";
import {
	FileEdit,
	ShieldCheck,
	Printer,
	MoreHorizontal,
	FileText,
	Copy,
	RefreshCw,
	RotateCcw,
} from "lucide-react";
import { useDocumentStore } from "../../../store/documentStore";
import { printBlankMedicalContract } from "../../patients/blankContractPrint";
import { showToast } from "../../GlobalToast";
import { money } from "../../../utils/financeUtils";
import { appendChipToText } from "../documentChipText";
import {
	type PaidContractRequiredFieldsReview,
	paidContractRequiredFieldsReview,
} from "../paidContractRequiredFields";
import { PaidContractRequiredFieldsPanel } from "../PaidContractRequiredFieldsPanel";
import { QuickChipsRow } from "../QuickChipsRow";
import {
	createDefaultPaidContract,
	generatePaidContractNumber,
	generatePaidContractText,
	parseRublesToKopecks,
	printPaidContract736,
} from "../paidContractEngine";

export const PAID_CONTRACT_FIELDS_BLOCK_TITLE = "Обязательные поля договора";

const PAID_CONTRACT_CARE_REASON_CHIPS = [
	"Кариес",
	"Пульпит",
	"Острая боль",
	"Плановый осмотр",
	"Профгигиена",
	"Жалобы отсутствуют",
] as const;

export interface PaidServiceContractFormProps {
	documentPatientFullName?: string | null;
	activeVisitComplaint?: string | null;
	activeVisitTreatmentPlan?: string | null;
	activeVisitDoctorSummary?: string | null;
	activeDoctorFullName?: string | null;
	totalRubValue?: number;
	totalRubFormatted?: string | null;
}

/**
 * Форма договора на оказание платных медицинских услуг:
 * стороны, реквизиты, условия оплаты, гарантии, сроки.
 */
export const PaidServiceContractForm = React.memo(
	function PaidServiceContractForm({
		documentPatientFullName,
		activeVisitComplaint,
		activeVisitTreatmentPlan,
		activeVisitDoctorSummary,
		activeDoctorFullName,
		totalRubValue = 0,
		totalRubFormatted,
	}: PaidServiceContractFormProps) {
		const paidContractNumber = useDocumentStore(
			(state) => state.paidContractNumber,
		);
		const setPaidContractNumber = useDocumentStore(
			(state) => state.setPaidContractNumber,
		);
		const paidContractDate = useDocumentStore(
			(state) => state.paidContractDate,
		);
		const setPaidContractDate = useDocumentStore(
			(state) => state.setPaidContractDate,
		);
		const paidContractServiceStart = useDocumentStore(
			(state) => state.paidContractServiceStart,
		);
		const setPaidContractServiceStart = useDocumentStore(
			(state) => state.setPaidContractServiceStart,
		);
		const paidContractServiceEnd = useDocumentStore(
			(state) => state.paidContractServiceEnd,
		);
		const setPaidContractServiceEnd = useDocumentStore(
			(state) => state.setPaidContractServiceEnd,
		);
		const paidContractCustomerFullName = useDocumentStore(
			(state) => state.paidContractCustomerFullName,
		);
		const setPaidContractCustomerFullName = useDocumentStore(
			(state) => state.setPaidContractCustomerFullName,
		);
		const paidContractRepresentativeFullName = useDocumentStore(
			(state) => state.paidContractRepresentativeFullName,
		);
		const setPaidContractRepresentativeFullName = useDocumentStore(
			(state) => state.setPaidContractRepresentativeFullName,
		);
		const paidContractCareReason = useDocumentStore(
			(state) => state.paidContractCareReason,
		);
		const setPaidContractCareReason = useDocumentStore(
			(state) => state.setPaidContractCareReason,
		);
		const paidContractServiceScope = useDocumentStore(
			(state) => state.paidContractServiceScope,
		);
		const setPaidContractServiceScope = useDocumentStore(
			(state) => state.setPaidContractServiceScope,
		);
		const paidContractTotalRub = useDocumentStore(
			(state) => state.paidContractTotalRub,
		);
		const setPaidContractTotalRub = useDocumentStore(
			(state) => state.setPaidContractTotalRub,
		);
		const paidContractDoctorFullName = useDocumentStore(
			(state) => state.paidContractDoctorFullName,
		);
		const setPaidContractDoctorFullName = useDocumentStore(
			(state) => state.setPaidContractDoctorFullName,
		);
		const paidContractPaymentTerms = useDocumentStore(
			(state) => state.paidContractPaymentTerms,
		);
		const setPaidContractPaymentTerms = useDocumentStore(
			(state) => state.setPaidContractPaymentTerms,
		);
		const paidContractPriceChangeRules = useDocumentStore(
			(state) => state.paidContractPriceChangeRules,
		);
		const setPaidContractPriceChangeRules = useDocumentStore(
			(state) => state.setPaidContractPriceChangeRules,
		);
		const paidContractFreeCareNotice = useDocumentStore(
			(state) => state.paidContractFreeCareNotice,
		);
		const setPaidContractFreeCareNotice = useDocumentStore(
			(state) => state.setPaidContractFreeCareNotice,
		);
		const paidContractRecommendationWarning = useDocumentStore(
			(state) => state.paidContractRecommendationWarning,
		);
		const setPaidContractRecommendationWarning = useDocumentStore(
			(state) => state.setPaidContractRecommendationWarning,
		);
		const paidContractRefundTerms = useDocumentStore(
			(state) => state.paidContractRefundTerms,
		);
		const setPaidContractRefundTerms = useDocumentStore(
			(state) => state.setPaidContractRefundTerms,
		);
		const paidContractWarrantyTerms = useDocumentStore(
			(state) => state.paidContractWarrantyTerms,
		);
		const setPaidContractWarrantyTerms = useDocumentStore(
			(state) => state.setPaidContractWarrantyTerms,
		);
		const paidContractSignedAt = useDocumentStore(
			(state) => state.paidContractSignedAt,
		);
		const setPaidContractSignedAt = useDocumentStore(
			(state) => state.setPaidContractSignedAt,
		);
		const paidContractClinicInfoConfirmed = useDocumentStore(
			(state) => state.paidContractClinicInfoConfirmed,
		);
		const setPaidContractClinicInfoConfirmed = useDocumentStore(
			(state) => state.setPaidContractClinicInfoConfirmed,
		);
		const paidContractServiceListConfirmed = useDocumentStore(
			(state) => state.paidContractServiceListConfirmed,
		);
		const setPaidContractServiceListConfirmed = useDocumentStore(
			(state) => state.setPaidContractServiceListConfirmed,
		);
		const paidContractPaidBasisConfirmed = useDocumentStore(
			(state) => state.paidContractPaidBasisConfirmed,
		);
		const setPaidContractPaidBasisConfirmed = useDocumentStore(
			(state) => state.setPaidContractPaidBasisConfirmed,
		);
		const paidContractWrittenChangesConfirmed = useDocumentStore(
			(state) => state.paidContractWrittenChangesConfirmed,
		);
		const setPaidContractWrittenChangesConfirmed = useDocumentStore(
			(state) => state.setPaidContractWrittenChangesConfirmed,
		);

		const effectiveTotalRub = useMemo(() => {
			const parsedKopecks = parseRublesToKopecks(paidContractTotalRub);
			if (parsedKopecks > 0) return parsedKopecks / 100;
			return totalRubValue;
		}, [paidContractTotalRub, totalRubValue]);

		const review: PaidContractRequiredFieldsReview = useMemo(
			() =>
				paidContractRequiredFieldsReview({
					contractNumber: paidContractNumber,
					serviceStart: paidContractServiceStart,
					serviceEnd: paidContractServiceEnd,
					customerFullName: paidContractCustomerFullName,
					patientFullName: documentPatientFullName ?? "",
					careReason: paidContractCareReason,
					visitComplaint: activeVisitComplaint ?? "",
					serviceScope: paidContractServiceScope,
					visitTreatmentPlan: activeVisitTreatmentPlan ?? "",
					visitDoctorSummary: activeVisitDoctorSummary ?? "",
					totalRub: effectiveTotalRub,
					paymentTerms: paidContractPaymentTerms,
					priceChangeRules: paidContractPriceChangeRules,
					freeCareNotice: paidContractFreeCareNotice,
					recommendationWarning: paidContractRecommendationWarning,
					refundTerms: paidContractRefundTerms,
					warrantyTerms: paidContractWarrantyTerms,
					doctorFullName: paidContractDoctorFullName,
					activeDoctorFullName: activeDoctorFullName ?? "",
					clinicInfoConfirmed: paidContractClinicInfoConfirmed,
					serviceListConfirmed: paidContractServiceListConfirmed,
					paidBasisConfirmed: paidContractPaidBasisConfirmed,
					writtenChangesConfirmed: paidContractWrittenChangesConfirmed,
				}, { allowBlankForPrint: true }),
			[
				paidContractNumber,
				paidContractServiceStart,
				paidContractServiceEnd,
				paidContractCustomerFullName,
				documentPatientFullName,
				paidContractCareReason,
				activeVisitComplaint,
				paidContractServiceScope,
				activeVisitTreatmentPlan,
				activeVisitDoctorSummary,
				effectiveTotalRub,
				paidContractPaymentTerms,
				paidContractPriceChangeRules,
				paidContractFreeCareNotice,
				paidContractRecommendationWarning,
				paidContractRefundTerms,
				paidContractWarrantyTerms,
				paidContractDoctorFullName,
				activeDoctorFullName,
				paidContractClinicInfoConfirmed,
				paidContractServiceListConfirmed,
				paidContractPaidBasisConfirmed,
				paidContractWrittenChangesConfirmed,
			],
		);

		const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
		const moreMenuRef = useRef<HTMLDivElement>(null);

		useEffect(() => {
			if (!isMoreMenuOpen) return;
			const handleClickOutside = (event: MouseEvent) => {
				if (
					moreMenuRef.current &&
					!moreMenuRef.current.contains(event.target as Node)
				) {
					setIsMoreMenuOpen(false);
				}
			};
			document.addEventListener("mousedown", handleClickOutside);
			return () => {
				document.removeEventListener("mousedown", handleClickOutside);
			};
		}, [isMoreMenuOpen]);

		const handleFillStandardContract = () => {
			const currentYear = new Date().getFullYear();
			if (!paidContractNumber.trim()) {
				setPaidContractNumber(
					generatePaidContractNumber({
						patientFullName: documentPatientFullName || null,
						year: currentYear,
					}),
				);
			}
			const todayIso = new Date().toISOString().slice(0, 10);
			if (!paidContractDate.trim()) {
				setPaidContractDate(todayIso);
			}
			if (!paidContractServiceStart.trim()) {
				setPaidContractServiceStart(todayIso);
			}
			if (!paidContractServiceEnd.trim()) {
				setPaidContractServiceEnd("до полного исполнения сторонами обязательств");
			}
			if (!paidContractCustomerFullName.trim() && documentPatientFullName) {
				setPaidContractCustomerFullName(documentPatientFullName);
			}
			if (!paidContractCareReason.trim()) {
				setPaidContractCareReason(activeVisitComplaint || "Плановое стоматологическое лечение по результатам осмотра");
			}
			if (!paidContractServiceScope.trim()) {
				setPaidContractServiceScope(
					activeVisitTreatmentPlan ||
					activeVisitDoctorSummary ||
					"Комплекс стоматологических услуг согласно согласованному плану лечения",
				);
			}
			if (totalRubValue > 0) {
				setPaidContractTotalRub(String(totalRubValue));
			} else if (!paidContractTotalRub.trim() || Number(paidContractTotalRub) <= 0) {
				setPaidContractTotalRub("1000");
			}
			if (!paidContractDoctorFullName.trim()) {
				setPaidContractDoctorFullName(activeDoctorFullName || "Врач-стоматолог клиники");
			}
			if (!paidContractSignedAt.trim()) {
				setPaidContractSignedAt(todayIso);
			}
			setPaidContractClinicInfoConfirmed(true);
			setPaidContractServiceListConfirmed(true);
			setPaidContractPaidBasisConfirmed(true);
			setPaidContractWrittenChangesConfirmed(true);
			showToast("Типовой договор заполнен (1 клик)", "success", 3000);
		};

		const handlePrintFilledContract = () => {
			const kopecks =
				parseRublesToKopecks(paidContractTotalRub) ||
				(totalRubValue ? Math.round(totalRubValue * 100) : 0);

			const contractData = createDefaultPaidContract({
				contractNumber: paidContractNumber.trim() || undefined,
				contractDate: paidContractDate.trim() || undefined,
				patientFullName: documentPatientFullName || undefined,
				doctorFullName:
					paidContractDoctorFullName.trim() ||
					activeDoctorFullName ||
					undefined,
				clinicalReason:
					paidContractCareReason.trim() ||
					activeVisitComplaint ||
					undefined,
				serviceScopeSummary:
					paidContractServiceScope.trim() ||
					activeVisitTreatmentPlan ||
					undefined,
				totalAmountKopecks: kopecks,
				serviceStart: paidContractServiceStart.trim() || undefined,
				serviceEndOrCondition:
					paidContractServiceEnd.trim() || undefined,
			});

			if (paidContractCustomerFullName.trim()) {
				contractData.customer.fullName = paidContractCustomerFullName.trim();
				contractData.customer.isDifferentFromPatient =
					paidContractCustomerFullName.trim() !== (documentPatientFullName || "");
			}
			if (paidContractRepresentativeFullName.trim()) {
				contractData.representative.fullName = paidContractRepresentativeFullName.trim();
				contractData.representative.hasRepresentative = true;
			}
			if (paidContractPaymentTerms.trim()) {
				contractData.paymentTerms = paidContractPaymentTerms.trim();
			}
			if (paidContractPriceChangeRules.trim()) {
				contractData.priceChangeRules = paidContractPriceChangeRules.trim();
			}
			if (paidContractFreeCareNotice.trim()) {
				contractData.freeCareNotice = paidContractFreeCareNotice.trim();
			}
			if (paidContractRecommendationWarning.trim()) {
				contractData.medicalRecommendationWarning = paidContractRecommendationWarning.trim();
			}
			if (paidContractRefundTerms.trim()) {
				contractData.refusalAndRefundTerms = paidContractRefundTerms.trim();
			}
			if (paidContractWarrantyTerms.trim()) {
				contractData.warrantyTerms = paidContractWarrantyTerms.trim();
			}
			if (paidContractSignedAt.trim()) {
				contractData.signedAt = paidContractSignedAt.trim();
			}

			printPaidContract736(contractData);
			showToast("Договор по ПП РФ № 736 отправлен на печать", "success", 3000);
		};

		const handleGenerateNewNumber = () => {
			const newNum = generatePaidContractNumber({
				patientFullName: documentPatientFullName || null,
				year: new Date().getFullYear(),
			});
			setPaidContractNumber(newNum);
			showToast(`Сформирован номер: ${newNum}`, "info", 3000);
		};

		const handleCopyContractText = () => {
			const kopecks =
				parseRublesToKopecks(paidContractTotalRub) ||
				(totalRubValue ? Math.round(totalRubValue * 100) : 0);

			const contractData = createDefaultPaidContract({
				contractNumber: paidContractNumber.trim() || undefined,
				contractDate: paidContractDate.trim() || undefined,
				patientFullName: documentPatientFullName || undefined,
				doctorFullName:
					paidContractDoctorFullName.trim() ||
					activeDoctorFullName ||
					undefined,
				clinicalReason:
					paidContractCareReason.trim() ||
					activeVisitComplaint ||
					undefined,
				serviceScopeSummary:
					paidContractServiceScope.trim() ||
					activeVisitTreatmentPlan ||
					undefined,
				totalAmountKopecks: kopecks,
				serviceStart: paidContractServiceStart.trim() || undefined,
				serviceEndOrCondition:
					paidContractServiceEnd.trim() || undefined,
			});

			const text = generatePaidContractText(contractData);
			if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
				void navigator.clipboard.writeText(text).then(
					() => {
						showToast("Текст договора скопирован в буфер", "success", 3000);
					},
					() => {
						showToast("Не удалось скопировать текст в буфер", "error", 3000);
					},
				);
			} else {
				showToast("Буфер обмена недоступен", "warning", 3000);
			}
		};

		const handleResetContractFields = () => {
			setPaidContractNumber("");
			setPaidContractDate("");
			setPaidContractServiceStart("");
			setPaidContractServiceEnd("");
			setPaidContractCustomerFullName("");
			setPaidContractRepresentativeFullName("");
			setPaidContractCareReason("");
			setPaidContractServiceScope("");
			setPaidContractTotalRub("");
			setPaidContractDoctorFullName("");
			setPaidContractPaymentTerms("");
			setPaidContractPriceChangeRules("");
			setPaidContractFreeCareNotice("");
			setPaidContractRecommendationWarning("");
			setPaidContractRefundTerms("");
			setPaidContractWarrantyTerms("");
			setPaidContractSignedAt("");
			setPaidContractClinicInfoConfirmed(false);
			setPaidContractServiceListConfirmed(false);
			setPaidContractPaidBasisConfirmed(false);
			setPaidContractWrittenChangesConfirmed(false);
			showToast("Поля договора очищены", "info", 2500);
		};

		return (
			<article className="document-payload-card">
				{/* 1-строчный компактный тулбар 32-36px на десктопе per Mandate 8d (UI 7 deadly sins) & Mandate 8c */}
				<div className="paid-contract-toolbar flex items-center justify-between gap-3 min-h-[36px] mb-3 pb-2 border-b border-[var(--border,#e2e8f0)] flex-wrap sm:flex-nowrap">
					<div className="min-w-0 flex-1">
						<h3 className="text-sm font-bold text-[var(--ink,#0f172a)] truncate m-0">
							Договор платных медицинских услуг
						</h3>
						<p className="text-xs text-[var(--muted,#64748b)] truncate m-0 hidden sm:block">
							Фиксация номера, сроков, состава услуг, стоимости и обязательных уведомлений пациента по ПП РФ № 736
						</p>
					</div>

					{/* Закон Миллера: строго не более 1-2 кнопок прямого действия, все вторичные опции — в меню "..." */}
					<div className="flex items-center gap-1.5 shrink-0 relative">
						{/* Кнопка 1 прямого действия: Печать бланка договора со строками _______ (Мандат 8e п. 8 — Регистратура без палок в колёсах, всегда активна в 1 клик) */}
						<button
							type="button"
							onClick={() => {
								void printBlankMedicalContract(
									{
										fullName: documentPatientFullName || "",
									},
									{
										doctorName: activeDoctorFullName || "",
									},
								);
							}}
							className="paid-contract-btn h-9 px-3 rounded-lg text-xs font-semibold bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)] shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors active:scale-98"
							data-testid="btn-paid-contract-print-blank"
							title="Печать пустого бланка договора со строками ________ для ручного заполнения пациентом до приёма (Мандат 8e — без 403-ошибок)"
						>
							<Printer size={15} aria-hidden="true" />
							<span>Печать договора (бланк со строками _______)</span>
						</button>

						{/* Кнопка 2 прямого действия: Типовой договор в 1 клик (Мандат 8e) */}
						<button
							type="button"
							onClick={handleFillStandardContract}
							className="paid-contract-btn h-9 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors active:scale-98"
							data-testid="btn-paid-contract-fill-norm"
							title="1 клик: заполнить типовой договор клиники со стандартными реквизитами"
						>
							<ShieldCheck size={15} aria-hidden="true" />
							<span>Типовой договор (1 клик)</span>
						</button>

						{/* Второстепенные опции в меню "..." (Закон Миллера per Mandate 8d) */}
						<div className="relative" ref={moreMenuRef}>
							<button
								type="button"
								onClick={() => setIsMoreMenuOpen((prev) => !prev)}
								className="paid-contract-tab-btn h-[34px] w-[34px] p-0 rounded-lg text-xs font-semibold bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft,#f1f5f9)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)] shadow-xs inline-flex items-center justify-center cursor-pointer transition-colors active:scale-98"
								data-testid="btn-paid-contract-more"
								title="Дополнительные действия с договором..."
								aria-haspopup="true"
								aria-expanded={isMoreMenuOpen}
							>
								<MoreHorizontal size={16} aria-hidden="true" />
							</button>

							{isMoreMenuOpen && (
								<div
									className="absolute right-0 top-full mt-1.5 w-64 bg-[var(--paper-strong,#ffffff)] border border-[var(--border,#cbd5e1)] rounded-xl shadow-lg z-50 py-1.5 text-xs text-[var(--ink,#0f172a)] animate-in fade-in zoom-in-95 duration-100"
									role="menu"
								>
									<button
										type="button"
										onClick={() => {
											setIsMoreMenuOpen(false);
											handlePrintFilledContract();
										}}
										className="w-full px-3 py-2 text-left hover:bg-[var(--paper-soft,#f1f5f9)] flex items-center gap-2 cursor-pointer font-medium text-[var(--ink,#0f172a)]"
										role="menuitem"
										data-testid="btn-paid-contract-print-filled"
									>
										<FileText size={14} className="text-teal-600 shrink-0" aria-hidden="true" />
										<span>Печать договора А4 (ПП РФ № 736)</span>
									</button>

									<button
										type="button"
										onClick={() => {
											setIsMoreMenuOpen(false);
											handleGenerateNewNumber();
										}}
										className="w-full px-3 py-2 text-left hover:bg-[var(--paper-soft,#f1f5f9)] flex items-center gap-2 cursor-pointer text-[var(--ink,#0f172a)]"
										role="menuitem"
										data-testid="btn-paid-contract-gen-number"
									>
										<RefreshCw size={14} className="text-slate-500 shrink-0" aria-hidden="true" />
										<span>Новый регламентный номер</span>
									</button>

									<button
										type="button"
										onClick={() => {
											setIsMoreMenuOpen(false);
											handleCopyContractText();
										}}
										className="w-full px-3 py-2 text-left hover:bg-[var(--paper-soft,#f1f5f9)] flex items-center gap-2 cursor-pointer text-[var(--ink,#0f172a)]"
										role="menuitem"
										data-testid="btn-paid-contract-copy-text"
									>
										<Copy size={14} className="text-slate-500 shrink-0" aria-hidden="true" />
										<span>Копировать текст (для ЭМК)</span>
									</button>

									<div className="my-1 border-t border-[var(--border,#e2e8f0)]" />

									<button
										type="button"
										onClick={() => {
											setIsMoreMenuOpen(false);
											handleResetContractFields();
										}}
										className="w-full px-3 py-2 text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer"
										role="menuitem"
										data-testid="btn-paid-contract-reset"
									>
										<RotateCcw size={14} className="text-rose-500 shrink-0" aria-hidden="true" />
										<span>Очистить поля договора</span>
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
				<PaidContractRequiredFieldsPanel
					review={review}
					fieldsBlockTitle={PAID_CONTRACT_FIELDS_BLOCK_TITLE}
					onPrintBlankContract={() => {
						void printBlankMedicalContract(
							{
								fullName: documentPatientFullName || "",
							},
							{
								doctorName: activeDoctorFullName || "",
							},
						);
					}}
					patient={{
						fullName: documentPatientFullName || "",
					}}
					doctorName={activeDoctorFullName}
				/>
				<details className="document-manual-override">
					<summary className="inline-flex items-center gap-1.5 cursor-pointer">
						<FileEdit size={14} className="text-slate-500 shrink-0" aria-hidden="true" />
						<span>
							{PAID_CONTRACT_FIELDS_BLOCK_TITLE}
							{review.missing.length
								? ` — не хватает ${review.missing.length}`
								: " — всё заполнено"}
							{" (развернуть)"}
						</span>
					</summary>
					<div className="document-payload-collapsed-content">
						<div className="document-payload-row">
							<label>
								Номер договора
								<input
									value={paidContractNumber}
									onChange={(event) =>
										setPaidContractNumber(event.target.value)
									}
									placeholder="например: ДПМУ-2026-001"
								/>
							</label>
							<label>
								Дата договора
								<input
									value={paidContractDate}
									onChange={(event) =>
										setPaidContractDate(event.target.value)
									}
								/>
							</label>
						</div>
						<div className="document-payload-row">
							<label>
								Начало оказания
								<input
									value={paidContractServiceStart}
									onChange={(event) =>
										setPaidContractServiceStart(event.target.value)
									}
									placeholder="дата и время первого этапа"
								/>
							</label>
							<label>
								Завершение
								<input
									value={paidContractServiceEnd}
									onChange={(event) =>
										setPaidContractServiceEnd(event.target.value)
									}
								/>
							</label>
						</div>
						<div className="document-payload-row">
							<label>
								Заказчик
								<input
									value={paidContractCustomerFullName}
									onChange={(event) =>
										setPaidContractCustomerFullName(event.target.value)
									}
									placeholder={
										documentPatientFullName ??
										"если не отличается от пациента"
									}
								/>
							</label>
							<label>
								Представитель
								<input
									value={paidContractRepresentativeFullName}
									onChange={(event) =>
										setPaidContractRepresentativeFullName(
											event.target.value,
										)
									}
									placeholder="если действует представитель"
								/>
							</label>
						</div>
						<label>
							Основание обращения
							<textarea
								value={paidContractCareReason}
								onChange={(event) =>
									setPaidContractCareReason(event.target.value)
								}
								placeholder={
									activeVisitComplaint ??
									"жалоба, диагноз или плановый повод"
								}
								rows={2}
							/>
							<QuickChipsRow
								chips={PAID_CONTRACT_CARE_REASON_CHIPS}
								onPick={(chip) =>
									setPaidContractCareReason(
										appendChipToText(paidContractCareReason, chip),
									)
								}
							/>
						</label>
						<label>
							Состав услуг
							<textarea
								value={paidContractServiceScope}
								onChange={(event) =>
									setPaidContractServiceScope(event.target.value)
								}
								placeholder={
									activeVisitTreatmentPlan ||
									activeVisitDoctorSummary ||
									"перечень согласованных платных услуг"
								}
								rows={3}
							/>
						</label>
						<div className="document-payload-row">
							<label>
								Сумма договора
								<input
									inputMode="numeric"
									value={paidContractTotalRub}
									onChange={(event) =>
										setPaidContractTotalRub(event.target.value)
									}
									placeholder={
										totalRubFormatted ||
										(totalRubValue
											? money(totalRubValue)
											: "сумма цифрами, копейки после запятой")
									}
								/>
							</label>
							<label>
								Ответственный врач
								<input
									value={paidContractDoctorFullName}
									onChange={(event) =>
										setPaidContractDoctorFullName(event.target.value)
									}
									placeholder={activeDoctorFullName ?? "лечащий врач"}
								/>
							</label>
						</div>
						<label>
							Порядок оплаты
							<textarea
								value={paidContractPaymentTerms}
								onChange={(event) =>
									setPaidContractPaymentTerms(event.target.value)
								}
								rows={2}
							/>
						</label>
						<label>
							Изменение цены и объема
							<textarea
								value={paidContractPriceChangeRules}
								onChange={(event) =>
									setPaidContractPriceChangeRules(event.target.value)
								}
								rows={2}
							/>
						</label>
						<label>
							Уведомление о бесплатной помощи
							<textarea
								value={paidContractFreeCareNotice}
								onChange={(event) =>
									setPaidContractFreeCareNotice(event.target.value)
								}
								rows={2}
							/>
						</label>
						<label>
							Предупреждение о рекомендациях врача
							<textarea
								value={paidContractRecommendationWarning}
								onChange={(event) =>
									setPaidContractRecommendationWarning(event.target.value)
								}
								rows={2}
							/>
						</label>
						<label>
							Отказ и возврат
							<textarea
								value={paidContractRefundTerms}
								onChange={(event) =>
									setPaidContractRefundTerms(event.target.value)
								}
								rows={2}
							/>
						</label>
						<label>
							Гарантия и претензии
							<textarea
								value={paidContractWarrantyTerms}
								onChange={(event) =>
									setPaidContractWarrantyTerms(event.target.value)
								}
								rows={2}
							/>
						</label>
						<label>
							Подписано
							<input
								value={paidContractSignedAt}
								onChange={(event) =>
									setPaidContractSignedAt(event.target.value)
								}
							/>
						</label>
						<label className="document-payload-checkbox">
							<input
								checked={paidContractClinicInfoConfirmed}
								type="checkbox"
								onChange={(event) =>
									setPaidContractClinicInfoConfirmed(event.target.checked)
								}
							/>
							Пациент получил сведения о клинике, лицензии и исполнителе
						</label>
						<label className="document-payload-checkbox">
							<input
								checked={paidContractServiceListConfirmed}
								type="checkbox"
								onChange={(event) =>
									setPaidContractServiceListConfirmed(
										event.target.checked,
									)
								}
							/>
							Перечень услуг и стоимость переданы пациенту до подписания
						</label>
						<label className="document-payload-checkbox">
							<input
								checked={paidContractPaidBasisConfirmed}
								type="checkbox"
								onChange={(event) =>
									setPaidContractPaidBasisConfirmed(event.target.checked)
								}
							/>
							Пациент понимает платную основу оказания услуг
						</label>
						<label className="document-payload-checkbox">
							<input
								checked={paidContractWrittenChangesConfirmed}
								type="checkbox"
								onChange={(event) =>
									setPaidContractWrittenChangesConfirmed(
										event.target.checked,
									)
								}
							/>
							Изменения состава или стоимости оформляются письменно
						</label>
					</div>
				</details>
			</article>
		);
	},
);

PaidServiceContractForm.displayName = "PaidServiceContractForm";
