import { Sparkles, X } from "lucide-react";
import React, { useMemo } from "react";
import { sliceDomList } from "../../../utils/domVirtualizationHelper";
import { SoapTemplatesFilterBar } from "./SoapTemplatesFilterBar";
import { SoapTemplatesGrid } from "./SoapTemplatesGrid";
import { SoapTemplatesPreviewModal } from "./SoapTemplatesPreviewModal";
import type { SoapTemplatesDrawerProps } from "./types";

export const SoapTemplatesDrawer: React.FC<SoapTemplatesDrawerProps> = ({
	isTemplatesOpen,
	onClose,
	activeSpecialty,
	onSelectSpecialty,
	searchQuery,
	onSearchChange,
	protocols,
	templatesLimit,
	onShowMore,
	onApplyProtocol,
	previewProtocol,
	onSetPreviewProtocol,
}) => {
	const templatesSlice = useMemo(() => {
		return sliceDomList(protocols, templatesLimit, 0);
	}, [protocols, templatesLimit]);

	if (!isTemplatesOpen && !previewProtocol) {
		return null;
	}

	return (
		<>
			{isTemplatesOpen && (
				<div className="bg-[var(--paper-soft)] border-b border-[var(--line)] p-3 transition-all">
					<div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[var(--line)]">
						<div className="flex items-center gap-2">
							<Sparkles className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
							<span
								className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]"
								aria-label="Клинические протоколы (448 шаблонов)"
								title="Клинические протоколы (448 шаблонов)"
								data-catalog-source="Клинические протоколы СтАР"
							>
								Клинические протоколы приёма (448 шаблонов)
							</span>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 p-1 text-[var(--muted)] hover:text-[var(--ink)] rounded-lg cursor-pointer flex items-center justify-center"
							aria-label="Закрыть шаблоны"
						>
							<X className="w-4 h-4" />
						</button>
					</div>

					<SoapTemplatesFilterBar
						activeSpecialty={activeSpecialty}
						onSelectSpecialty={onSelectSpecialty}
						searchQuery={searchQuery}
						onSearchChange={onSearchChange}
					/>

					<SoapTemplatesGrid
						templatesSlice={templatesSlice}
						onApplyProtocol={onApplyProtocol}
						onSetPreviewProtocol={onSetPreviewProtocol}
						onShowMore={onShowMore}
					/>
				</div>
			)}

			<SoapTemplatesPreviewModal
				previewProtocol={previewProtocol}
				onClose={() => onSetPreviewProtocol(null)}
				onApplyProtocol={onApplyProtocol}
			/>
		</>
	);
};
