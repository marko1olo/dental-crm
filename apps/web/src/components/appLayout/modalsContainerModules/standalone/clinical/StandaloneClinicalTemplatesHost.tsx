/**
 * StandaloneClinicalTemplatesHost — Честный хост клинических протоколов приёма (Мандат 8b <= 120 строк).
 * Позволяет открыть канонические протоколы (?protocols=1, #protocols) и генератор (?protocols=1&generator=1).
 */

import React, { useCallback } from "react";
import { ClinicalProtocolsCatalogModal } from "../../../../visit/clinicalCatalog/ClinicalProtocolsCatalogModal";
import type { VisitNoteFieldsPatch } from "../../../../visit/clinicalCatalog/clinicalProtocolsCatalog";

export const StandaloneClinicalTemplatesHost: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const handleApplyPatch = useCallback((patch: VisitNoteFieldsPatch, message: string) => {
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente:protocol-applied", { detail: { patch, message } }),
			);
		}
		onClose();
	}, [onClose]);

	return (
		<div
			className="w-full min-h-screen bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-soft,#0f172a)]"
			data-testid="clinical-templates-standalone-root"
		>
			<ClinicalProtocolsCatalogModal
				isOpen={true}
				onClose={onClose}
				activeTooth={16}
				onApplyPatch={handleApplyPatch}
			/>
		</div>
	);
};
