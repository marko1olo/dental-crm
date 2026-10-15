import React from 'react';
import { ShieldAlert } from 'lucide-react';
import type { AnestheticDrugId } from '../anesthesiaCatalog';
import type { SafetyWarningState } from './types';

export interface AnesthesiaSafetyStopperAlertProps {
	disabled: boolean;
	safetyWarning: SafetyWarningState;
	onSelectDrug: (drugId: AnestheticDrugId) => void;
	onDismissWarning: () => void;
	onConfirmWarningOverride: (count: number) => void;
}

export function AnesthesiaSafetyStopperAlert({
	disabled,
	safetyWarning,
	onSelectDrug,
	onDismissWarning,
	onConfirmWarningOverride,
}: AnesthesiaSafetyStopperAlertProps) {
	return (
		<div className="anesthesia-safety-stopper-alert" role="alert">
			<div className="stopper-alert-content">
				<ShieldAlert size={20} className="stopper-icon text-amber-500 shrink-0" />
				<div>
					<div className="stopper-title">{safetyWarning.title}</div>
					<div className="stopper-text">{safetyWarning.text}</div>
				</div>
			</div>
			<div className="stopper-actions">
				<button
					type="button"
					className="stopper-btn-switch min-h-[44px]"
					onClick={() => {
						onDismissWarning();
						onSelectDrug('mepivacaine_plain');
						onConfirmWarningOverride(1.0);
					}}
					title="Быстро переключиться на безопасный Мепивакаин 3% без вазоконстриктора"
				>
					Ввести Скандонест 3% (безопасно)
				</button>
				<button
					type="button"
					disabled={disabled}
					data-testid="btn-anesthesia-confirm-override"
					className="px-3 py-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors cursor-pointer active:scale-98 shadow-xs"
					onClick={() => {
						const count = safetyWarning.carpulesCount ?? 1.0;
						onDismissWarning();
						onConfirmWarningOverride(count);
					}}
					title="Применить клиническое суждение врача и внести препарат в медицинскую карту"
				>
					Всё равно внести (врачебное решение)
				</button>
				<button type="button" className="stopper-btn-dismiss min-h-[44px]" onClick={onDismissWarning}>
					Закрыть
				</button>
			</div>
		</div>
	);
}
