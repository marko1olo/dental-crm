import React from "react";
import { Copy, FileText } from "lucide-react";
import { RadiologyReferralPreviewDetails } from "../radiologyReferralPrintTemplate.js";
import type { CbctDiagnosticGoal, CbctReferralPartner, CbctScanFovProtocol } from "../radiologyProtocols.js";

export interface RadiologyReferralPreviewPaneProps {
	activeTab: "form" | "preview";
	referralNumber: string;
	clinic: string;
	license: string;
	phone: string;
	currentPartner: CbctReferralPartner;
	barcodeSvg: string;
	qrCodeSvg: string;
	patientFullName: string;
	patientBirth: string;
	patientCard: string;
	docName: string;
	currentFov: CbctScanFovProtocol;
	currentGoal: CbctDiagnosticGoal;
	targetTeethDisplay: string;
	diagnosisIcd10: string;
	isPregnancyExcluded: boolean;
	hasMetallicArtifacts: boolean;
	onCopyText: () => void;
}

export function RadiologyReferralPreviewPane({
	activeTab, referralNumber, clinic, license, phone, currentPartner,
	barcodeSvg, qrCodeSvg, patientFullName, patientBirth, patientCard,
	docName, currentFov, currentGoal, targetTeethDisplay, diagnosisIcd10,
	isPregnancyExcluded, hasMetallicArtifacts, onCopyText,
}: RadiologyReferralPreviewPaneProps) {
	return (
		<div className={`w-full md:w-1/2 p-5 md:p-6 bg-[var(--paper-soft)] overflow-y-auto flex flex-col gap-4 ${activeTab === "form" ? "hidden md:flex" : "flex"}`}>
			<div className="flex items-center justify-between">
				<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
					<FileText className="w-4 h-4 text-[var(--teal)]" />
					<span>Официальный бланк направления:</span>
				</span>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onCopyText}
						className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] transition-colors cursor-pointer"
						title="Копировать текст направления"
						data-testid="btn-copy-referral-text"
					>
						<Copy className="w-3.5 h-3.5" />
						<span>Текст</span>
					</button>
					<span className="text-xs font-mono font-bold text-[var(--teal)]">{referralNumber}</span>
				</div>
			</div>

			<div className="p-5 md:p-6 rounded-2xl border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] shadow-md font-sans leading-relaxed flex flex-col gap-3.5">
				<div className="border-b-2 border-[var(--line-strong,var(--line))] pb-2.5 flex justify-between items-start">
					<div>
						<div className="font-extrabold text-sm uppercase text-[var(--ink)]">{clinic}</div>
						<div className="text-xs text-[var(--muted)]">Лицензия: {license} · {phone}</div>
					</div>
					<div className="text-right">
						<div className="font-black text-sm text-[var(--teal)] uppercase tracking-tight">НАПРАВЛЕНИЕ НА КЛКТ</div>
						<div className="text-xs text-[var(--muted)] font-semibold">{currentPartner.nameRu}</div>
					</div>
				</div>

				<div className="flex items-center justify-between p-2 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
					<div className="overflow-hidden" dangerouslySetInnerHTML={{ __html: barcodeSvg }} data-testid="referral-barcode-preview" />
					<div className="flex items-center gap-2 text-right">
						<div className="text-[9px] text-[var(--muted)] leading-tight"><strong>QR-код КЛКТ</strong><br />для рентген-центра</div>
						<div className="w-12 h-12 shrink-0 border border-[var(--line)] rounded-lg overflow-hidden p-0.5 bg-white" dangerouslySetInnerHTML={{ __html: qrCodeSvg }} data-testid="referral-qrcode-preview" />
					</div>
				</div>

				<RadiologyReferralPreviewDetails
					patientFullName={patientFullName} patientBirth={patientBirth} patientCard={patientCard}
					docName={docName} currentFov={currentFov} currentGoal={currentGoal}
					targetTeethDisplay={targetTeethDisplay} diagnosisIcd10={diagnosisIcd10}
					isPregnancyExcluded={isPregnancyExcluded} hasMetallicArtifacts={hasMetallicArtifacts}
				/>
			</div>
		</div>
	);
}
