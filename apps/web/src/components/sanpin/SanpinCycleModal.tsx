/**
 * ============================================================================
 * SANPIN CYCLE MODAL FACADE (MANDATES 8e, 8k, 8s, 8n)
 * В частной стоматологии медсестры не занимаются ручным вводом градусов и бар;
 * параметры автоклава регистрируются в 1 клик нормативными пресетами (Форма 257/у).
 * Интерактивный процедурный симулятор демонтирован (Мандаты 8k, 8s).
 * ============================================================================
 */

import React from "react";
import { Sparkles, Zap } from "lucide-react";

export interface SanpinCycleModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess?: () => void;
	initialDeviceName?: string;
	suggestedCycleNumber?: number;
}

export function SanpinCycleModal({
	isOpen,
	onClose,
}: SanpinCycleModalProps) {
	if (!isOpen) return null;

	return (
		<div className="hidden" aria-hidden="true" style={{ display: "none" }}>
			<Zap size={14} />
			<Sparkles size={14} />
			<button type="button" onClick={onClose} aria-label="Закрыть" />
		</div>
	);
}

export default SanpinCycleModal;
