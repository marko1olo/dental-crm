import React from "react";
import type { DocumentKind } from "@dental/shared";
import { FilePlus, Printer } from "lucide-react";

interface MobileDocumentsFloatingBarProps {
	onDirectPrintPrimaryIntake?: (() => void) | undefined;
	onOpenPrimaryIntakeModal?: (() => void) | undefined;
	onOpenCreateDocumentModal?: ((kind: DocumentKind) => void) | undefined;
	triggerTactile: () => void;
}

export function MobileDocumentsFloatingBar({
	onDirectPrintPrimaryIntake,
	onOpenPrimaryIntakeModal,
	onOpenCreateDocumentModal,
	triggerTactile,
}: MobileDocumentsFloatingBarProps) {
	return (
		<div
			className="fixed bottom-[calc(56px+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 px-3 py-2 bg-[var(--paper,#ffffff)]/90 backdrop-blur-md border-t border-[var(--line,#e2e8f0)] flex items-center gap-2 shadow-lg"
			data-testid="mobile-documents-floating-bar"
		>
			<button
				type="button"
				onClick={() => {
					triggerTactile();
					if (onDirectPrintPrimaryIntake) {
						onDirectPrintPrimaryIntake();
					} else if (onOpenPrimaryIntakeModal) {
						onOpenPrimaryIntakeModal();
					}
				}}
				className="primary-button flex-1 h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold shadow-md cursor-pointer transition active:scale-[0.98]"
				data-testid="btn-mobile-primary-intake"
			>
				<Printer size={18} aria-hidden="true" />
				<span>Пакет приёма в 1 клик</span>
			</button>

			{onOpenCreateDocumentModal && (
				<button
					type="button"
					onClick={() => {
						triggerTactile();
						onOpenCreateDocumentModal("paid_medical_services_contract");
					}}
					className="secondary-button h-12 px-4 rounded-xl flex items-center justify-center gap-1.5 text-sm font-semibold border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] cursor-pointer transition active:scale-[0.98]"
					data-testid="btn-mobile-create-doc"
					title="Создать новый бланк"
				>
					<FilePlus size={18} aria-hidden="true" className="text-[var(--teal,#0d9488)]" />
					<span>+ Бланк</span>
				</button>
			)}
		</div>
	);
}
