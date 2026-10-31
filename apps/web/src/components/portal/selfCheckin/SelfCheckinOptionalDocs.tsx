/**
 * SelfCheckinOptionalDocs.tsx
 * (DOMAIN: PORTAL & SELF-CHECKIN KIOSK)
 *
 * Collapsible regulatory documents and health questionnaire links:
 * - Hand signature route
 * - Somatic questionnaire route
 * - 1-click physiological norm preset (Mandate 8e)
 */

import React, { memo } from "react";
import { Zap } from "lucide-react";

export interface SelfCheckinOptionalDocsProps {
	readonly showOptionalDocs: boolean;
	readonly setShowOptionalDocs: (show: boolean) => void;
	readonly onGoToConsents: () => void;
	readonly onGoToSomatic: () => void;
	readonly onApplyPhysiologicalNorm: () => void;
}

export const SelfCheckinOptionalDocs: React.FC<SelfCheckinOptionalDocsProps> = memo(({
	showOptionalDocs,
	setShowOptionalDocs,
	onGoToConsents,
	onGoToSomatic,
	onApplyPhysiologicalNorm,
}) => {
	return (
		<div className="mt-2">
			<button
				type="button"
				className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline text-center w-full cursor-pointer"
				onClick={() => setShowOptionalDocs(!showOptionalDocs)}
			>
				{showOptionalDocs ? "Скрыть документы" : "Нормативные документы и анкета здоровья"}
			</button>

			{showOptionalDocs && (
				<div
					className="mt-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2 text-slate-600 dark:text-slate-300"
					style={{ backgroundColor: "var(--paper-soft, var(--paper))" }}
				>
					<p style={{ margin: 0 }}>
						При чекине в 1 касание согласие на медицинское вмешательство и обработку персональных данных подтверждается простой электронной подписью (ПЭП) по номеру телефона с фиксацией в медицинской карте.
					</p>
					<div className="flex flex-wrap gap-2 pt-1">
						<button
							type="button"
							className="text-teal-600 dark:text-teal-400 font-bold underline cursor-pointer"
							onClick={onGoToConsents}
							title="Открыть бланки согласий для персональной росписи"
						>
							Открыть бланк подписи вручную
						</button>
						<span>·</span>
						<button
							type="button"
							className="text-teal-600 dark:text-teal-400 font-bold underline cursor-pointer"
							onClick={onGoToSomatic}
							title="Открыть анкету здоровья для заполнения"
						>
							Заполнить соматическую анкету
						</button>
						<span>·</span>
						<button
							type="button"
							className="text-emerald-600 dark:text-emerald-400 font-bold underline cursor-pointer flex items-center gap-1"
							onClick={() => {
								onApplyPhysiologicalNorm();
								onGoToSomatic();
							}}
							title="Открыть анкету здоровья с предзаполненной физиологической нормой (хронических патологий нет)"
						>
							<Zap size={13} />
							<span>Норма по умолчанию</span>
						</button>
					</div>
				</div>
			)}
		</div>
	);
});

SelfCheckinOptionalDocs.displayName = "SelfCheckinOptionalDocs";
