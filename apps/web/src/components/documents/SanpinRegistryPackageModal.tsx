import React, { useState } from "react";
import {
	type SanpinRegistryPackageModalProps,
	SanpinRegistryHeader,
	SanpinSterilityBanner,
	SanpinItemsList,
	SanpinRegistryFooter,
} from "./sanpinRegistry/index";

export type { SanpinRegistryPackageModalProps };

export function SanpinRegistryPackageModal({
	isOpen,
	onClose,
	patient,
	existingDocuments,
	onOpenSickLeaveEln,
	onOpenAutoclaveLog,
	onOpenAutoclaveLog257,
	onOpenEgiszRemd,
	onCreateDocument,
	onSelectDocumentKind,
	onOpenPsoJournal366,
	onOpenSanpinRegisters,
}: SanpinRegistryPackageModalProps): React.JSX.Element | null {
	const [sterilityVerified, setSterilityVerified] = useState(false);

	if (!isOpen) return null;

	const radiationDocs = (existingDocuments ?? []).filter(
		(d) => d?.kind === "radiation_dose_sheet",
	);

	return (
		<div
			className="document-package-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="sanpin-package-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="document-package-modal-card">
				<SanpinRegistryHeader patient={patient} onClose={onClose} />
				<div className="document-package-modal-body">
					<SanpinSterilityBanner
						patient={patient}
						sterilityVerified={sterilityVerified}
						setSterilityVerified={setSterilityVerified}
					/>
					<SanpinItemsList
						radiationDocs={radiationDocs}
						onOpenSickLeaveEln={onOpenSickLeaveEln}
						onOpenAutoclaveLog={onOpenAutoclaveLog || onOpenAutoclaveLog257}
						onOpenAutoclaveLog257={onOpenAutoclaveLog257 || onOpenAutoclaveLog}
						onOpenEgiszRemd={onOpenEgiszRemd}
						onOpenPsoJournal366={onOpenPsoJournal366}
						onSelectDocumentKind={onSelectDocumentKind}
						onCreateDocument={onCreateDocument}
						onClose={onClose}
					/>
				</div>
				<SanpinRegistryFooter onClose={onClose} />
			</div>
		</div>
	);
}
