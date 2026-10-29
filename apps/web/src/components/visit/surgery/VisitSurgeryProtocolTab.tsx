import type React from "react";
import "../../surgery/styles/surgery-cards.css";
import "../../surgery/styles/surgery-buttons.css";
import "../../surgery/styles/surgery-toolbar.css";
import "../../surgery/styles/surgery-overdraft-and-protocol.css";
import "../../surgery/styles/surgery-memo.css";
import { SURGICAL_OPERATION_NORMS, COMMON_SURGERY_TEETH } from "../../surgery/surgeryProtocols";
import { ImplantPassportModal } from "../../implants/ImplantPassportModal";
import { useVisitSurgeryState } from "./modules/useVisitSurgeryState";
import { VisitSurgeryHeader } from "./modules/VisitSurgeryHeader";
import { VisitSurgeryOverdraftBanner } from "./modules/VisitSurgeryOverdraftBanner";
import { VisitSurgeryToothSelector } from "./modules/VisitSurgeryToothSelector";
import { VisitSurgeryNormsGrid } from "./modules/VisitSurgeryNormsGrid";
import { VisitSurgeryCategoryCockpit } from "./modules/VisitSurgeryCategoryCockpit";
import { VisitSurgeryProtocolEditor } from "./modules/VisitSurgeryProtocolEditor";
import { VisitSurgeryFooterActions } from "./modules/VisitSurgeryFooterActions";
import { showToast } from "../../GlobalToast";

export interface VisitSurgeryProtocolTabProps {
	patientId?: string; patientName?: string; doctorId?: string; doctorName?: string;
	activeTooth?: number | null; onSelectActiveTooth?: (tooth: number | null) => void;
	onApplyToDiary?: ((text: string) => void) | undefined; onAddToInvoice?: ((service: any) => void) | undefined; className?: string | undefined;
}

export const VisitSurgeryProtocolTab: React.FC<VisitSurgeryProtocolTabProps> = ({
	patientId, patientName = "Пациент", doctorId, doctorName = "Врач-хирург",
	activeTooth, onSelectActiveTooth, onApplyToDiary, onAddToInvoice, className = "",
}) => {
	const s = useVisitSurgeryState(activeTooth ?? undefined);

	return (
		<section
			className={`visit-surgery-container max-w-full overflow-x-clip ${s.isSterileGloveMode ? "sterile-glove-active" : ""} ${className}`.trim()}
			data-testid="visit-surgery-protocol-tab"
			aria-label="Хирургический протокол и кокпит имплантолога"
		>
			<VisitSurgeryHeader
				effectiveTooth={s.effectiveTooth} isSterileGloveMode={s.isSterileGloveMode}
				onToggleSterileMode={() => s.setIsSterileGloveMode(!s.isSterileGloveMode)}
				onOpenImplantModal={() => s.setIsImplantModalOpen(true)}
			/>
			<VisitSurgeryOverdraftBanner overdraftStatus={s.overdraftStatus} onDismiss={() => s.setHasWarehouseDelay(false)} />
			<VisitSurgeryToothSelector effectiveTooth={s.effectiveTooth} commonTeeth={COMMON_SURGERY_TEETH} onSelectTooth={s.handleToothSelect} />
			<VisitSurgeryNormsGrid norms={SURGICAL_OPERATION_NORMS} selectedNormId={s.selectedNormId} onSelectNorm={s.handleNormClick} />
			<VisitSurgeryCategoryCockpit s={s} patientName={patientName} doctorName={doctorName} onAddToInvoice={onAddToInvoice} />
			<VisitSurgeryProtocolEditor
				protocolText={s.protocolText} onChangeText={s.setProtocolText}
				onCopy={() => { navigator.clipboard?.writeText(s.protocolText); showToast("Протокол операции скопирован", "success"); }}
			/>
			<VisitSurgeryFooterActions s={s} patientName={patientName} doctorName={doctorName} onAddToInvoice={onAddToInvoice} onApplyToDiary={onApplyToDiary} />
			{s.isImplantModalOpen && (
				<ImplantPassportModal
					isOpen={s.isImplantModalOpen}
					onClose={() => s.setIsImplantModalOpen(false)}
					initialTooth={s.effectiveTooth}
					patientName={patientName}
					patientId={patientId}
					doctorName={doctorName}
					doctorId={doctorId}
					onInsertIntoDiary={(text) => {
						s.setProtocolText((prev) => (prev ? `${prev}\n\n${text}` : text));
						onApplyToDiary?.(text);
					}}
					onSavePassport={(passport) => {
						onAddToInvoice?.({
							code: "SURG-IMP-01",
							name: `Операция установки дентального имплантата ${passport.brand} Ø${passport.diameterMm}x${passport.lengthMm}мм (Зуб #${passport.toothFdi})`,
							priceRub: passport.operationPriceRub,
							quantity: 1,
						});
					}}
				/>
			)}
		</section>
	);
};

export default VisitSurgeryProtocolTab;
