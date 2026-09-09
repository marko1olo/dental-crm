import React from "react";
import {
	DentalMedicalCard043uForm,
	type DentalMedicalCard043uFormProps,
} from "./DentalMedicalCard043uForm";

export type OutpatientForm043EditorProps = DentalMedicalCard043uFormProps;

/**
 * OutpatientForm043Editor — Редактор Медицинской Карты стоматологического больного (Форма № 043/у).
 * 
 * МАНДАТЫ КЛИНИЧЕСКОЙ АВТОНОМИИ И ЭРГОНОМИКИ (THE HAMMER / AGENTS.md):
 * 1. Мандат 8e п. 3: 1-клик заполнение физиологической нормой («Соматически здоров / Физиологическая норма»).
 *    Врач правит только патологию!
 * 2. Мандат 8e п. 4: Никаких замков и начмедов, свобода правок через режим ревизии («Исправленному верить»).
 * 3. Мандат 8e п. 5: Печать Формы 043/у в любой момент (штамп «ЧЕРНОВИК» или «ПОДПИСАНО ВРАЧОМ» / «ИСПРАВЛЕННОМУ ВЕРИТЬ»).
 * 4. Мандат 8d п. 7: СТРОГО 0 эмодзи — исключительно векторные иконки Lucide.
 * 5. WCAG AAA темная тема (data-theme="dark"): zero glaring white patches.
 */
export const OutpatientForm043Editor: React.FC<OutpatientForm043EditorProps> = React.memo(
	function OutpatientForm043Editor(props) {
		return <DentalMedicalCard043uForm {...props} />;
	},
);

export default OutpatientForm043Editor;
export { DentalMedicalCard043uForm };
