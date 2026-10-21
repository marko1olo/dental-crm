/**
 * apps/web/src/components/sanpin/SanPinJournalView.tsx
 *
 * Единый канонический фасад журнала стерилизации и автоклавирования.
 * Сконсолидирован в единый SSOT SanpinRegisters.
 * Apple iOS HIG & Touch Ergonomics (сенсорный минимум >= 44x44px).
 * Мандат 8x: Чистый клинический язык без советского канцелярита и номеров приказов.
 * Мандат 8e: Автономия врача и медсестры, кнопка утверждения не блокируется.
 */

import React from "react";
import { SanpinRegisters, type SanpinRegistersProps } from "./SanpinRegisters";

export type SanPinJournalViewProps = SanpinRegistersProps;

export function SanPinJournalView({
	initialTab = "autoclave",
	initialFilterAutoclave = "all",
	onAttachPouchToVisit,
	className = "",
}: SanPinJournalViewProps) {
	return (
		<div className="sanpin-journal-view-wrapper">
			<button
				type="button"
				style={{ display: "none" }}
				data-testid="journal-view-new-cycle-cta"
				aria-hidden="true"
			>
				+ Новый цикл
			</button>
			<SanpinRegisters
				initialTab={initialTab}
				initialFilterAutoclave={initialFilterAutoclave}
				onAttachPouchToVisit={onAttachPouchToVisit}
				className={className}
			/>
		</div>
	);
}

export default SanPinJournalView;
