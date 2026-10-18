import { Sparkles, X } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";
import type { PersonalizedOfferResult } from "./analyticsWidgetData.js";
import { LostPatientOfferDetails } from "./lostPatientsModules/LostPatientOfferDetails";
import { LostPatientOfferFooter } from "./lostPatientsModules/LostPatientOfferFooter";
import type { LostPatientRow } from "./lostPatientsModules/lostPatientTypes";

export type { LostPatientRow };

export interface LostPatientOfferModalProps {
	readonly patient: LostPatientRow;
	readonly activeOffer: PersonalizedOfferResult;
	readonly copiedText: boolean;
	readonly onCopy: () => void;
	readonly onClose: () => void;
}

export const LostPatientOfferModal: React.FC<LostPatientOfferModalProps> = ({
	patient,
	activeOffer,
	copiedText,
	onCopy,
	onClose,
}) => {
	if (typeof document === "undefined") return null;

	return createPortal(
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="offer-modal-title"
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
		>
			<div className="w-full max-w-lg rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xl p-5 relative">
				<button
					type="button"
					onClick={onClose}
					className="absolute top-4 right-4 h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors flex items-center justify-center cursor-pointer"
					aria-label="Закрыть"
				>
					<X className="w-4 h-4" />
				</button>

				<div className="flex items-center gap-2.5 mb-3">
					<div className="p-2 rounded-lg bg-[var(--teal)] text-white shadow-sm">
						<Sparkles className="w-5 h-5" />
					</div>
					<div>
						<h4
							id="offer-modal-title"
							style={{ color: "var(--ink)" }}
							className="font-bold text-base leading-tight"
						>
							{activeOffer.title}
						</h4>
						<p className="text-xs text-[var(--muted)]">
							Индивидуальное предложение для {patient.patientName}
						</p>
					</div>
				</div>

				<LostPatientOfferDetails
					patient={patient}
					activeOffer={activeOffer}
				/>

				<LostPatientOfferFooter
					patient={patient}
					activeOffer={activeOffer}
					copiedText={copiedText}
					onCopy={onCopy}
					onClose={onClose}
				/>
			</div>
		</div>,
		document.body,
	);
};
export default LostPatientOfferModal;
