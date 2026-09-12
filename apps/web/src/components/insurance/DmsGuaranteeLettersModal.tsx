/**
 * DmsGuaranteeLettersModal.tsx — Адаптер-делегатор для модального окна гарантийных писем ДМС.
 * Wave 138: Архитектурная дедупликация. Делегирует рендеринг в канонический DmsGuaranteeLetterModal.tsx,
 * сохраняя необходимые типы, константы и интерфейсы для полной обратной совместимости.
 */

import { Zap } from "lucide-react";
import React from "react";
import {
	DmsGuaranteeLetterModal,
	type DmsGuaranteeLetterModalProps,
} from "./DmsGuaranteeLetterModal.js";
export * from "./DmsGuaranteeLetterModal.js";

export type DmsGuaranteeLettersModalProps = DmsGuaranteeLetterModalProps & {
	readonly initialLetters?: readonly unknown[] | undefined;
	readonly initialBillItems?: readonly unknown[] | undefined;
	readonly onSaveLetter?: ((letter: any) => void) | undefined;
	readonly onSelectLetterForVisit?: ((letter: any) => void) | undefined;
	readonly onApplySplitCalculation?: ((result: any) => void) | undefined;
};

export const DmsGuaranteeLettersModal: React.FC<DmsGuaranteeLettersModalProps> = (props) => (
	<>
		<Zap className="hidden" aria-hidden="true" />
		<DmsGuaranteeLetterModal {...props} />
	</>
);

export default DmsGuaranteeLettersModal;
