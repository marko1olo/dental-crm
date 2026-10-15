/**
 * PrescriptionCockpitModal.tsx — Compact Prescription Coordinator Modal (Apple HIG & Doctor Autonomy)
 * Architecture: Decomposed coordinator <= 120 lines
 */

import React from "react";
import { createPortal } from "react-dom";
import { Pill, X, ShieldCheck } from "lucide-react";
import type { PrescriptionPrintModalProps } from "./PrescriptionPrintModal";
import { usePrescriptionCockpit } from "./usePrescriptionCockpit";
import { PrescriptionAllergyBanner } from "./PrescriptionAllergyBanner";
import { PrescriptionDrugCatalogSelector } from "./PrescriptionDrugCatalogSelector";
import { PrescriptionSheetPreview } from "./PrescriptionSheetPreview";
import { PrescriptionModalFooter } from "./PrescriptionModalFooter";
import { DENTAL_FAST_PRESCRIPTION_SETS } from "./prescriptionDataSets";

export const PrescriptionCockpitModal: React.FC<PrescriptionPrintModalProps> = (props) => {
	const c = usePrescriptionCockpit(props);
	if (!props.isOpen) return null;

	const content = (
		<div
			className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-black/65 backdrop-blur-md animate-in fade-in duration-200 prescription-form-107-modal"
			role="dialog" aria-modal="true" aria-label="Печать рецептурного бланка" data-testid="prescription-print-modal" id="prescription-form-107-modal"
		>
			<div className="flex flex-col w-full max-w-6xl h-[94vh] sm:h-auto sm:max-h-[94vh] rounded-t-[24px] sm:rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden">
				<div className="sm:hidden w-full flex justify-center pt-2.5 pb-1 bg-[var(--paper-soft)] shrink-0">
					<div className="w-10 h-1 rounded-full bg-[var(--line-strong)] opacity-60" />
				</div>

				<div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-3 min-w-0">
						<div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-subtle,var(--line))] text-[var(--teal)] shrink-0 shadow-sm">
							<Pill className="w-6 h-6" />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<h2 className="text-base sm:text-lg font-bold text-[var(--ink)]">Рецептурный модуль</h2>
								<span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-subtle,var(--line))]" data-statutory="Приказ № 1094н">
									Форма № 107-1/у
								</span>
								{c.isUkepSigned && (
									<span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
										<ShieldCheck className="w-3.5 h-3.5" /> УКЭП активна
									</span>
								)}
							</div>
							<p className="text-xs text-[var(--muted)] whitespace-normal break-words mt-0.5">
								<span>{c.patientName}</span> · <span>Карта: {c.patientCard}</span> · <span>Диагноз: {props.diary?.diagnosisIcd10 || "K02.1"}</span>
								{c.resolvedPatientAllergies && (
									<span className="ml-1 text-amber-700 dark:text-amber-300 font-semibold">
										· Аллергия: {Array.isArray(c.resolvedPatientAllergies) ? c.resolvedPatientAllergies.join(", ") : c.resolvedPatientAllergies}
									</span>
								)}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<div className="hidden md:flex p-0.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] shrink-0 gap-1 text-[11px]">
							<button type="button" onClick={() => c.setActiveForm("107-1u")} className={`h-6 px-2 rounded-md ${c.activeForm === "107-1u" ? "bg-[var(--teal-surface)] text-[var(--teal)] font-bold" : "text-[var(--muted)]"}`}>107-1/у</button>
							<button type="button" onClick={() => c.setActiveForm("148-1u-88")} className={`h-6 px-2 rounded-md ${c.activeForm === "148-1u-88" ? "bg-[var(--teal-surface)] text-[var(--teal)] font-bold" : "text-[var(--muted)]"}`} title="Специальная форма строгого учета">№ 148-1/у-88</button>
						</div>
						<button type="button" onClick={props.onClose} title="Закрыть" className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-all cursor-pointer"><X className="w-5 h-5" /></button>
					</div>
				</div>

				<div className="flex lg:hidden px-4 py-2 bg-[var(--paper-soft)] border-b border-[var(--line)] shrink-0">
					<div className="dente-segmented-bar w-full">
						<button type="button" onClick={() => c.setMobileTab("catalog")} className={`dente-segmented-item ${c.mobileTab === "catalog" ? "active" : ""}`} data-active={c.mobileTab === "catalog"}>Каталог и наборы</button>
						<button type="button" onClick={() => c.setMobileTab("preview")} className={`dente-segmented-item ${c.mobileTab === "preview" ? "active" : ""}`} data-active={c.mobileTab === "preview"}>Предпросмотр бланка</button>
					</div>
				</div>

				<PrescriptionAllergyBanner allergyConflicts={c.allergyConflicts} somaticWarnings={c.somaticWarnings} ddiInteractions={c.ddiSafetyAudit?.drugInteractions} onAddGastroprotection={c.handleAddOmeprazoleGastroprotection} />

				<div className="flex flex-col lg:flex-row flex-1 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-[var(--line)]">
					<PrescriptionDrugCatalogSelector
						className={c.mobileTab === "catalog" ? "flex" : "hidden lg:flex"}
						fastPresets={DENTAL_FAST_PRESCRIPTION_SETS} onApplyAndInsertToDiary={c.handleApplyAndInsertToDiary} onApplyAndPrint={c.handleApplyAndPrint}
						searchQuery={c.searchQuery} onSearchQueryChange={c.setSearchQuery} filteredCatalog={c.filteredCatalog}
						selectedDrugIds={c.selectedDrugIds} onToggleDrug={c.toggleDrug}
						isAddingCustom={c.isAddingCustom} onToggleAddingCustom={() => c.setIsAddingCustom(!c.isAddingCustom)}
						customTradeName={c.customTradeName} onCustomTradeNameChange={c.setCustomTradeName}
						customLatinRp={c.customLatinRp} onCustomLatinRpChange={c.setCustomLatinRp}
						customDispense={c.customDispense} onCustomDispenseChange={c.setCustomDispense}
						customSigna={c.customSigna} onCustomSignaChange={c.setCustomSigna} onAddCustomDrug={c.handleAddCustomDrug}
						customSeriesNumber={c.customSeriesNumber} onCustomSeriesNumberChange={c.setCustomSeriesNumber}
						validityDays={c.validityDays} onValidityDaysChange={(d) => { c.setValidityDays(d); c.setIsChronicSpecialCare(d === "365"); }}
						isChronicSpecialCare={c.isChronicSpecialCare} onToggleChronicSpecialCare={() => c.setIsChronicSpecialCare(!c.isChronicSpecialCare)}
						chronicPeriodicity={c.chronicPeriodicity} onChronicPeriodicityChange={c.setChronicPeriodicity}
						patientAddress={c.patientAddress} onPatientAddressChange={c.setPatientAddress}
						activeForm={c.activeForm} patientAllergies={c.resolvedPatientAllergies}
						patientWeightKg={c.patientWeightKg} onPatientWeightKgChange={c.setPatientWeightKg}
					/>
					<PrescriptionSheetPreview
						className={c.mobileTab === "preview" ? "flex" : "hidden lg:flex"}
						customSeriesNumber={c.customSeriesNumber} withStampAndSignature={c.withStampAndSignature}
						penicillinConflict={c.allergyConflicts.some((x) => x.type === "penicillin")}
						nsaidConflict={c.allergyConflicts.some((x) => x.type === "nsaid")}
						anestheticConflict={c.allergyConflicts.some((x) => x.type === "anesthetic")}
						ddiSafetyAudit={c.ddiSafetyAudit} clinic={c.clinic} address={c.address} phone={c.phone} ogrn={c.ogrn} inn={c.inn} licNum={c.licNum}
						activeForm={c.activeForm} prescriptionDate={c.prescriptionDate} patientName={c.patientName} patientBirth={c.patientBirth}
						patientCard={c.patientCard} patientAddress={c.patientAddress} docName={c.docName} docSpecialty={c.docSpecialty}
						diary={props.diary} activeItems={c.activeItems} validityDays={c.validityDays} isChronicSpecialCare={c.isChronicSpecialCare}
						chronicPeriodicity={c.chronicPeriodicity} isUkepSigned={c.isUkepSigned} ukepSignature={c.ukepSignature}
					/>
				</div>

				<PrescriptionModalFooter
					isMemoCopied={c.isMemoCopied} isUkepSigned={c.isUkepSigned} isSigningUkep={c.isSigningUkep} onCopyPatientMemo={c.handleCopyPatientMemo}
					onInsertToDiary={() => c.handleInsertToDiary()} onSignUkep={c.handleSignUkep} onPrintPatientMemo={c.handlePrintPatientMemo} onPrintPrescription={() => c.handlePrint()}
				/>
			</div>
		</div>
	);

	return props.disablePortal || typeof document === "undefined" ? content : createPortal(content, document.body);
};
