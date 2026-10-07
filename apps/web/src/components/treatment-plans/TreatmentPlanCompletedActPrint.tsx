/**
 * TreatmentPlanCompletedActPrint.tsx — Печатная форма Акта сдачи-приемки выполненных стоматологических работ
 * и Накладной на списание расходных материалов (ТМЦ).
 * Оформлена в журнальной полиграфической типографике согласно стандартам Минздрава РФ (Приказ 804н),
 * Постановлению Правительства РФ № 736 и ГОСТ Р 7.0.97-2016.
 */

import { type Kopecks, rublesToKopecks, sha256Hex } from "@dental/shared";
import {
	AlertTriangle,
	Award,
	Eye,
	EyeOff,
	FileCheck,
	Loader2,
	Package,
	Printer,
	TrendingUp,
	X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import {
	BRAND_COLOR_PALETTES,
	useDocumentBrandingStore,
} from "../../store/documentBrandingStore";
import { isMicroConsumable } from "./TreatmentPlanPresenterModal";
import type { CompletedWorksActAndWriteOffData } from "./types";
import "../../styles/premium-document-print.css";

import { TreatmentPlanActHeader } from "./TreatmentPlanActHeader";
import { TreatmentPlanActMaterialsTable } from "./TreatmentPlanActMaterialsTable";
import { TreatmentPlanActSignatures } from "./TreatmentPlanActSignatures";
import {
	formatMoneyExact,
	numberToWordsRu,
	pluralizeRu,
} from "./treatmentPlanActFormatters";

export { TreatmentPlanActHeader } from "./TreatmentPlanActHeader";
export { TreatmentPlanActMaterialsTable } from "./TreatmentPlanActMaterialsTable";
export { TreatmentPlanActSignatures } from "./TreatmentPlanActSignatures";
export {
	formatMoneyExact,
	numberToWordsRu,
	pluralizeRu,
} from "./treatmentPlanActFormatters";
export type TreatmentPlanActPrintData = CompletedWorksActAndWriteOffData;

export interface TreatmentPlanCompletedActPrintProps {
	readonly isOpen: boolean;
	readonly actData: CompletedWorksActAndWriteOffData;
	readonly clinicLegalName?: string;
	readonly clinicInn?: string;
	readonly clinicOgrn?: string;
	readonly clinicKpp?: string;
	readonly clinicAddress?: string;
	readonly clinicLicense?: string;
	readonly clinicPhone?: string;
	readonly clinicWebsite?: string;
	readonly clinicEmail?: string;
	readonly patientPassport?: string;
	readonly patientBirthDate?: string;
	readonly patientGender?: "male" | "female" | string;
	readonly patientPhone?: string;
	readonly patientAddress?: string;
	readonly patientSnils?: string;
	readonly patientOmsPolis?: string;
	readonly patientMedicalCardNumber?: string;
	readonly doctorSpecialty?: string;
	readonly doctorSnils?: string;
	readonly contractDate?: string;
	readonly onClose: () => void;
	readonly onConfirmExecuteWriteOff?: () => void;
	readonly isExecuting?: boolean;
}

export const TreatmentPlanCompletedActPrint: React.FC<
	TreatmentPlanCompletedActPrintProps
> = ({
	isOpen,
	actData,
	clinicLegalName,
	clinicInn,
	clinicOgrn,
	clinicKpp,
	clinicAddress,
	clinicLicense,
	clinicPhone,
	clinicWebsite,
	clinicEmail,
	patientPassport,
	patientBirthDate,
	patientGender,
	patientPhone,
	patientAddress,
	patientSnils,
	patientOmsPolis,
	patientMedicalCardNumber,
	doctorSpecialty,
	doctorSnils,
	contractDate,
	onClose,
	onConfirmExecuteWriteOff,
	isExecuting = false,
}) => {
	const branding = useDocumentBrandingStore();

	React.useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	const [showMicroConsumables, setShowMicroConsumables] =
		React.useState<boolean>(false);

	const { visibleProcedures, microConsumables } = React.useMemo(() => {
		const regular = actData.completedProcedures.filter(
			(it) => !isMicroConsumable(it),
		);
		const micro = actData.completedProcedures.filter((it) =>
			isMicroConsumable(it),
		);
		return {
			visibleProcedures: showMicroConsumables
				? actData.completedProcedures
				: regular,
			microConsumables: micro,
		};
	}, [actData.completedProcedures, showMicroConsumables]);

	const palette =
		BRAND_COLOR_PALETTES[branding.brandAccentColor] ||
		BRAND_COLOR_PALETTES.deep_teal;

	// Legal Clinic Requisites
	const legalName =
		clinicLegalName || branding.clinicLegalName || "Стоматологическая клиника";
	const inn = clinicInn || branding.clinicInn || "";
	const kpp = clinicKpp || "";
	const ogrn = clinicOgrn || branding.clinicOgrn || "";
	const address = clinicAddress || branding.clinicAddress || "";
	const license = clinicLicense || branding.licenseNumber || "";
	const phone = clinicPhone || branding.clinicPhone || "";
	const website = clinicWebsite || branding.clinicWebsite || "";
	const email = clinicEmail || "";

	// Patient Requisites
	const patientDob = patientBirthDate || "____________";
	const patientGenderText = patientGender
		? patientGender === "female"
			? "Женский"
			: "Мужской"
		: "—";
	const patientPass =
		patientPassport ||
		"Паспорт РФ: серия _____ № _______, выдан ____________________, дата: __________, код: ________";
	const patientRegAddress =
		patientAddress ||
		"________________________________________________________";
	const patientContactPhone = patientPhone || "____________________";
	const patientSnilsVal = patientSnils || "—";
	const patientOmsVal = patientOmsPolis || "—";
	const patientMedCard =
		patientMedicalCardNumber ||
		(actData.patientId.replace(/\D/g, "")
			? `МК-${actData.patientId.replace(/\D/g, "")}`
			: "б/н");

	// Doctor Requisites
	const doctorSpec = doctorSpecialty || "Врач-стоматолог";
	const doctorSnilsVal = doctorSnils || "—";

	// Contract Date
	const contractDateFormatted =
		contractDate ||
		(actData.createdAtIso
			? new Date(actData.createdAtIso).toLocaleDateString("ru-RU")
			: actData.actDate);

	// Calculated totals with exact kopecks
	const grossServicesRub = actData.completedProcedures.reduce(
		(acc, it) => acc + it.unitPriceRub * it.quantity,
		0,
	);
	const discountTotalRub = actData.completedProcedures.reduce(
		(acc, it) => acc + (it.discountRub || 0),
		0,
	);
	const netServicesRub = actData.totalServiceRub;
	const netServicesKopecks =
		actData.totalServiceKopecks || (rublesToKopecks(netServicesRub) as Kopecks);

	const netMaterialRub = actData.totalMaterialCostRub;
	const netMaterialKopecks =
		actData.totalMaterialCostKopecks ||
		(rublesToKopecks(netMaterialRub) as Kopecks);

	const servicesInWords = numberToWordsRu(
		netServicesRub,
		netServicesKopecks ? netServicesKopecks % 100 : 0,
	);
	const materialsInWords = numberToWordsRu(
		netMaterialRub,
		netMaterialKopecks ? netMaterialKopecks % 100 : 0,
	);

	const hasDeficit = actData.writtenOffMaterials.some((m) => m.isDeficit);

	// Canonical representation of completed act body for cryptographic verification
	const canonicalActPayload = useMemo(() => {
		return JSON.stringify({
			actNumber: actData.actNumber,
			actDate: actData.actDate,
			contractNumber: actData.contractNumber,
			patientId: actData.patientId,
			patientName: actData.patientName,
			doctorFullName: actData.doctorFullName,
			stageNumber: actData.stageNumber,
			stageTitle: actData.stageTitle,
			totalServiceRub: netServicesRub,
			totalServiceKopecks: netServicesKopecks,
			totalMaterialCostRub: netMaterialRub,
			totalMaterialCostKopecks: netMaterialKopecks,
			completedProcedures: actData.completedProcedures.map((p) => ({
				id: p.id,
				procedureName: p.name,
				code804n: p.code804n,
				toothNumber: p.toothNumber,
				quantity: p.quantity,
				unitPriceRub: p.unitPriceRub,
				discountRub: p.discountRub,
				totalRub: p.priceRub,
			})),
			writtenOffMaterials: actData.writtenOffMaterials.map((m) => ({
				id: m.id,
				materialName: m.materialName,
				order804nCode: m.order804nCode,
				quantityRequired: m.quantityRequired,
				unitCostRub: m.unitCostRub,
				totalCostRub: m.totalCostRub,
			})),
		});
	}, [
		actData,
		netServicesRub,
		netServicesKopecks,
		netMaterialRub,
		netMaterialKopecks,
	]);

	// Cryptographic verification hash (SHA-256 calculation compliant with GOST R 7.0.97-2016 via Web Crypto API)
	const [verificationHash, setVerificationHash] = useState<string>(() => {
		return `SHA-256: ${sha256Hex(canonicalActPayload)}`;
	});

	useEffect(() => {
		let isCancelled = false;
		async function updateHashWithWebCrypto() {
			try {
				if (typeof window !== "undefined" && window.crypto?.subtle?.digest) {
					const encoder = new TextEncoder();
					const data = encoder.encode(canonicalActPayload);
					const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
					const hashArray = Array.from(new Uint8Array(hashBuffer));
					const hex = hashArray
						.map((b) => b.toString(16).padStart(2, "0"))
						.join("");
					if (!isCancelled) {
						setVerificationHash(`SHA-256: ${hex}`);
					}
					return;
				}
			} catch (e) {
				console.warn(
					"[TreatmentPlanCompletedActPrint] Web Crypto API calculation failed, using fallback:",
					e,
				);
			}
			if (!isCancelled) {
				setVerificationHash(`SHA-256: ${sha256Hex(canonicalActPayload)}`);
			}
		}
		updateHashWithWebCrypto();
		return () => {
			isCancelled = true;
		};
	}, [canonicalActPayload]);

	if (!isOpen) return null;

	const handlePrint = () => {
		window.print();
	};

	return (
		<div
			className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-start justify-center p-2 sm:p-6 py-6 sm:py-8 print:p-0 print:static print:bg-white print:inset-auto print:overflow-visible print:block"
			data-testid="treatment-completed-act-print-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Печатная форма акта сдачи-приемки оказанных стоматологических услуг"
		>
			<div className="relative w-full max-w-5xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#0f172a)] dark:text-slate-100 rounded-3xl shadow-2xl overflow-hidden border border-[var(--line,#cbd5e1)] dark:border-slate-800 print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:bg-white print:text-black">
				{/* ── Top Action Bar (hidden on print) ── */}
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-950/80 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 print:hidden">
					<div className="flex items-center gap-3">
						<div
							className="p-2.5 rounded-2xl text-white shadow-sm shrink-0 flex items-center justify-center"
							style={{ backgroundColor: palette.primary }}
						>
							<FileCheck className="w-5 h-5" />
						</div>
						<div>
							<div className="flex items-center gap-2 flex-wrap">
								<span className="font-bold text-sm text-[var(--ink,#0f172a)] dark:text-white block">
									Акт сдачи-приемки и Накладная на списание ТМЦ
								</span>
								<span
									className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
										actData.status === "executed"
											? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
											: actData.status === "signed"
												? "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/40"
												: "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
									}`}
								>
									{actData.status === "executed"
										? "Списано на складе"
										: actData.status === "signed"
											? "Подписан пациентом"
											: "Черновик акта"}
								</span>
							</div>
							<span className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400">
								Акт № {actData.actNumber} • Этап {actData.stageNumber}:{" "}
								{actData.stageTitle}
							</span>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
						{onConfirmExecuteWriteOff && actData.status !== "executed" && (
							<button
								type="button"
								onClick={() => {
									if (!isExecuting) {
										onConfirmExecuteWriteOff();
									}
								}}
								aria-busy={isExecuting}
								className={`flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] flex-1 sm:flex-initial rounded-xl text-xs font-bold text-white shadow-md cursor-pointer transition-all ${
									hasDeficit
										? "bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 border border-amber-400/50"
										: "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
								}`}
								title={
									hasDeficit
										? "Позиции будут списаны с отрицательным остатком до оприходования накладной медсестрой"
										: "Провести списание расходных материалов ТМЦ"
								}
								data-testid="execute-act-writeoff-btn"
							>
								{isExecuting ? (
									<Loader2 className="w-4 h-4 shrink-0 animate-spin" />
								) : hasDeficit ? (
									<AlertTriangle className="w-4 h-4 shrink-0 text-yellow-200" />
								) : (
									<Package className="w-4 h-4 shrink-0" />
								)}
								<span>
									{isExecuting
										? "Проведение списания..."
										: hasDeficit
											? "Провести списание (Мягкий овердрафт склада)"
											: "Провести списание ТМЦ"}
								</span>
								{hasDeficit && !isExecuting && (
									<span className="px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-200 text-[10px] font-mono font-bold uppercase tracking-wider border border-amber-300/40">
										Овердрафт
									</span>
								)}
							</button>
						)}
						{microConsumables.length > 0 && (
							<button
								type="button"
								onClick={() => setShowMicroConsumables((prev) => !prev)}
								className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
								title={
									showMicroConsumables
										? "Сгруппировать мелкие расходники в один гигиенический комплект"
										: "Показать мелкие расходники (валики, слюноотсосы, перчатки) отдельными строками"
								}
								data-testid="toggle-micro-consumables-act-btn"
							>
								{showMicroConsumables ? (
									<EyeOff className="w-4 h-4" />
								) : (
									<Eye className="w-4 h-4" />
								)}
								<span>
									{showMicroConsumables
										? "Скрыть мелкие расходники"
										: `Расходники сгруппированы (${microConsumables.length})`}
								</span>
							</button>
						)}
						<button
							type="button"
							onClick={handlePrint}
							className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] flex-1 sm:flex-initial rounded-xl text-xs font-bold border transition-colors cursor-pointer"
							style={{
								borderColor: palette.accentBorder,
								backgroundColor: palette.softBg,
								color: palette.primaryDark,
							}}
							title="Распечатать официальный бланк акта (Ctrl+P)"
						>
							<Printer className="w-4 h-4" />
							<span>Печать бланка (Ctrl+P)</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="p-2.5 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
							aria-label="Закрыть окно печати акта"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* ── Printable Document Sheet Body & Desk Preview ── */}
				<div className="p-3 sm:p-6 lg:p-8 bg-slate-200/60 dark:bg-slate-950 flex justify-center overflow-x-auto print:p-0 print:bg-transparent print:overflow-visible">
					<div
						className={`premium-doc-sheet doc-palette-${branding.brandAccentColor} doc-density-${branding.layoutDensity} doc-font-${branding.fontFamily} p-4 sm:p-8 md:p-12 print:p-0 relative`}
						style={
							{
								"--doc-primary": palette.primary,
								"--doc-primary-dark": palette.primaryDark,
								"--doc-soft-bg": palette.softBg,
								"--doc-accent-border": palette.accentBorder,
								"--doc-border": "var(--line, #cbd5e1)",
								"--doc-ink": "var(--ink, #0f172a)",
								"--doc-muted": "var(--muted, #475569)",
								"--doc-paper": "var(--paper, #ffffff)",
							} as React.CSSProperties
						}
					>
						{/* Watermark: ЧЕРНОВИК if draft, ПОДПИСАНО ВРАЧОМ if signed/executed (Мандат 8e) */}
						<div
							className={
								actData.status === "signed" || actData.status === "executed"
									? "doc-watermark-signed"
									: "doc-watermark-draft"
							}
							aria-hidden="true"
							style={{
								position: "absolute",
								top: "50%",
								left: "50%",
								transform: "translate(-50%, -50%) rotate(-32deg)",
								fontSize:
									actData.status === "signed" || actData.status === "executed"
										? "50pt"
										: "64pt",
								fontWeight: 900,
								color:
									actData.status === "signed" || actData.status === "executed"
										? "rgba(16, 185, 129, 0.045)"
										: "rgba(15, 23, 42, 0.045)",
								textTransform: "uppercase",
								letterSpacing: "0.12em",
								pointerEvents: "none",
								zIndex: 0,
								whiteSpace: "nowrap",
								userSelect: "none",
							}}
						>
							{actData.status === "signed" || actData.status === "executed"
								? "ПОДПИСАНО ВРАЧОМ"
								: "ЧЕРНОВИК"}
						</div>

						{/* ── 1-4. Header, Official Banners & Requisites Matrix ── */}
						<TreatmentPlanActHeader
							actData={actData}
							palette={palette}
							headerStyle={branding.headerStyle}
							showClinicLogo={branding.showClinicLogo}
							logoUrl={branding.logoUrl}
							showClinicRequisites={branding.showClinicRequisites}
							clinicName={branding.clinicName}
							slogan={branding.slogan}
							legalName={legalName}
							inn={inn}
							kpp={kpp}
							ogrn={ogrn}
							address={address}
							license={license}
							phone={phone}
							website={website}
							email={email}
							patientDob={patientDob}
							patientGenderText={patientGenderText}
							patientPass={patientPass}
							patientRegAddress={patientRegAddress}
							patientContactPhone={patientContactPhone}
							patientSnilsVal={patientSnilsVal}
							patientOmsVal={patientOmsVal}
							patientMedCard={patientMedCard}
							doctorSpec={doctorSpec}
							doctorSnilsVal={doctorSnilsVal}
							contractDateFormatted={contractDateFormatted}
						/>

						{/* ── 5. Section 1: Itemized Treatment Table (Order 804n) ── */}
						<div className="doc-soap-section mb-6 print:mb-4">
							<div
								className="doc-soap-heading flex items-center justify-between p-2 rounded-t-lg font-black text-xs uppercase tracking-wider text-slate-900 border-b-2"
								style={{
									backgroundColor: palette.softBg,
									borderColor: palette.primary,
									color: palette.primaryDark,
								}}
							>
								<div className="flex items-center gap-2">
									<Award className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
									<span>
										1. Оказанные медицинские услуги (Клинический протокол)
									</span>
								</div>
								<span className="text-[11px] font-semibold lowercase opacity-90">
									Позиций:{" "}
									{visibleProcedures.length +
										(!showMicroConsumables && microConsumables.length > 0
											? 1
											: 0)}
								</span>
							</div>

							<div className="overflow-x-auto">
								<table className="w-full border-collapse border border-slate-300 text-xs">
									<thead>
										<tr className="bg-slate-100 text-slate-800 font-bold text-[11px]">
											<th className="border border-slate-300 p-2 text-center w-10">
												№
											</th>
											<th className="border border-slate-300 p-2 text-center w-24">
												Зуб / Область
											</th>
											<th className="border border-slate-300 p-2 text-left">
												Наименование медицинской услуги
											</th>
											<th className="border border-slate-300 p-2 text-center w-14">
												Кол-во
											</th>
											<th className="border border-slate-300 p-2 text-right w-24">
												Цена, ₽
											</th>
											<th className="border border-slate-300 p-2 text-right w-20">
												Скидка, ₽
											</th>
											<th className="border border-slate-300 p-2 text-right w-28">
												Итого, ₽
											</th>
										</tr>
									</thead>
									<tbody>
										{visibleProcedures.map((it, idx) => (
											<tr
												key={it.id || idx}
												className="hover:bg-slate-50 transition-colors border-b border-slate-300 text-xs"
											>
												<td className="border border-slate-300 p-2 text-center text-slate-500 font-mono text-[11px]">
													{idx + 1}
												</td>
												<td className="border border-slate-300 p-2 text-center">
													{it.toothNumber ? (
														<span
															className="px-2 py-0.5 rounded-md font-mono font-extrabold text-xs inline-block border"
															style={{
																backgroundColor: palette.softBg,
																borderColor: palette.accentBorder,
																color: palette.primaryDark,
															}}
														>
															№{it.toothNumber}
														</span>
													) : (
														<span className="text-slate-400 font-mono">—</span>
													)}
												</td>
												<td className="border border-slate-300 p-2 font-medium text-slate-900 leading-snug">
													<div className="flex items-baseline gap-1.5 flex-wrap">
														{it.code804n && (
															<span className="font-mono font-bold text-slate-700 shrink-0 text-[11px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700">
																{it.code804n}
															</span>
														)}
														<span className="font-semibold text-slate-900">
															{it.name}
														</span>
													</div>
													{it.clinicalRationale && (
														<div className="text-[11px] text-slate-500 italic mt-0.5">
															Клиническое показание: {it.clinicalRationale}
														</div>
													)}
												</td>
												<td className="border border-slate-300 p-2 text-center font-mono font-bold">
													{it.quantity}
												</td>
												<td className="border border-slate-300 p-2 text-right font-mono text-slate-700">
													{formatMoneyExact(it.unitPriceRub)}
												</td>
												<td className="border border-slate-300 p-2 text-right font-mono text-slate-500">
													{it.discountRub > 0
														? `-${formatMoneyExact(it.discountRub)}`
														: "0,00 ₽"}
												</td>
												<td className="border border-slate-300 p-2 text-right font-mono font-bold text-slate-950">
													{formatMoneyExact(it.priceRub)}
												</td>
											</tr>
										))}

										{!showMicroConsumables && microConsumables.length > 0 && (
											<tr className="bg-slate-50/80 transition-colors border-b border-slate-300 text-xs italic text-slate-600">
												<td className="border border-slate-300 p-2 text-center text-slate-400 font-mono text-[11px]">
													{visibleProcedures.length + 1}
												</td>
												<td className="border border-slate-300 p-2 text-center text-slate-400 font-mono">
													—
												</td>
												<td className="border border-slate-300 p-2 font-medium text-slate-800 leading-snug">
													<div className="flex items-baseline gap-1.5 flex-wrap">
														<span className="font-mono font-bold text-slate-500 shrink-0 text-[11px] bg-slate-100 px-1 py-0.5 rounded border border-slate-200 not-italic">
															A26.07.001
														</span>
														<span className="font-semibold text-slate-900 not-italic">
															Индивидуальный гигиенический и асептический
															комплект
														</span>
													</div>
													<div className="text-[11px] text-slate-500 not-italic mt-0.5">
														(валики, салфетки, перчатки, слюноотсосы, маски —{" "}
														{microConsumables.length} наим., включено в базовую
														стоимость оказанных услуг)
													</div>
												</td>
												<td className="border border-slate-300 p-2 text-center font-mono font-bold">
													1 компл.
												</td>
												<td className="border border-slate-300 p-2 text-right font-mono text-slate-600">
													0,00 ₽
												</td>
												<td className="border border-slate-300 p-2 text-right font-mono text-slate-500">
													0,00 ₽
												</td>
												<td className="border border-slate-300 p-2 text-right font-mono font-bold text-emerald-700 not-italic">
													Включено
												</td>
											</tr>
										)}

										{/* Subtotals & Breakdown */}
										<tr className="bg-slate-50 text-slate-700 text-xs font-semibold">
											<td
												colSpan={6}
												className="border border-slate-300 p-2 text-right"
											>
												Стоимость оказанных услуг без учета скидки:
											</td>
											<td className="border border-slate-300 p-2 text-right font-mono">
												{formatMoneyExact(grossServicesRub)}
											</td>
										</tr>
										{discountTotalRub > 0 && (
											<tr className="bg-slate-50 text-slate-700 text-xs font-semibold">
												<td
													colSpan={6}
													className="border border-slate-300 p-2 text-right text-emerald-700"
												>
													Сумма предоставленной скидки:
												</td>
												<td className="border border-slate-300 p-2 text-right font-mono text-emerald-700">
													-{formatMoneyExact(discountTotalRub)}
												</td>
											</tr>
										)}
										<tr
											className="font-extrabold text-xs"
											style={{
												backgroundColor: palette.softBg,
												color: palette.primaryDark,
											}}
										>
											<td
												colSpan={6}
												className="border border-slate-300 p-2.5 text-right text-xs uppercase tracking-wide"
											>
												ИТОГО СТОИМОСТЬ ОКАЗАННЫХ МЕДИЦИНСКИХ УСЛУГ (НДС НЕ
												ОБЛАГАЕТСЯ):
											</td>
											<td
												className="border border-slate-300 p-2.5 text-right font-mono text-sm font-black"
												style={{ color: palette.primaryDark }}
											>
												{formatMoneyExact(netServicesRub, netServicesKopecks)}
											</td>
										</tr>
									</tbody>
								</table>
							</div>

							{/* Amount in words banner (Official Russian Accounting Standard) */}
							<div className="p-2.5 bg-slate-50 border-x border-b border-slate-300 text-xs text-slate-800 rounded-b-lg">
								<strong>Сумма прописью:</strong> <em>{servicesInWords}</em>.{" "}
								<span className="text-[11px] text-slate-500">
									НДС не облагается в соответствии с пп. 2 п. 2 ст. 149 НК РФ
									(медицинские услуги).
								</span>
							</div>
						</div>

						{/* ── 6. Section 2: Material Write-off Specification (Warehouse BOM) ── */}
						<TreatmentPlanActMaterialsTable
							actData={actData}
							palette={palette}
							netMaterialRub={netMaterialRub}
							netMaterialKopecks={netMaterialKopecks}
							materialsInWords={materialsInWords}
							hasDeficit={hasDeficit}
						/>

						{/* ── 7. Section 3: Financial & Economic Summary Cards ── */}
						<div
							className="p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs mb-6 print:mb-4 shadow-xs"
							style={{
								backgroundColor: palette.softBg,
								borderColor: palette.accentBorder,
							}}
						>
							<div className="space-y-1">
								<span className="text-slate-600 block font-semibold text-[11px] uppercase tracking-wide">
									Стоимость услуг (Выручка этапа):
								</span>
								<strong
									className="text-base font-mono block"
									style={{ color: palette.primaryDark }}
								>
									{formatMoneyExact(netServicesRub, netServicesKopecks)}
								</strong>
								<span className="text-[10px] text-slate-500 block">
									Без НДС (ст. 149 НК РФ)
								</span>
							</div>

							<div className="space-y-1">
								<span className="text-slate-600 block font-semibold text-[11px] uppercase tracking-wide">
									Себестоимость ТМЦ этапа:
								</span>
								<strong className="text-base font-mono text-slate-900 block">
									{formatMoneyExact(netMaterialRub, netMaterialKopecks)}
								</strong>
								<span className="text-[10px] text-slate-500 block">
									По учетным ценам склада
								</span>
							</div>

							<div className="space-y-1">
								<span className="text-slate-600 block font-semibold text-[11px] uppercase tracking-wide">
									Валовая маржинальность этапа:
								</span>
								<strong className="text-base font-mono text-emerald-700 flex items-center gap-1.5">
									<TrendingUp className="w-5 h-5 shrink-0" />
									<span>
										{formatMoneyExact(actData.marginRub)} (
										{actData.marginPercent}%)
									</span>
								</strong>
								<span className="text-[10px] text-slate-500 block">
									Рентабельность медицинского этапа
								</span>
							</div>
						</div>

						{/* ── 8-10. Section 4: Terms, Signatures, Seal & QR Stamp ── */}
						<TreatmentPlanActSignatures
							actData={actData}
							palette={palette}
							legalName={legalName}
							patientPassport={patientPassport}
							showDoctorStampFrame={branding.showDoctorStampFrame}
							showQrVerification={branding.showQrVerification}
							verificationHash={verificationHash}
							customDisclaimer={branding.customDisclaimer}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};
