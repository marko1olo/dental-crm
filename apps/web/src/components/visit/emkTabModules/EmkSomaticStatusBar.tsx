import React from "react";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { SOMATIC_QUICK_CHIPS, type SomaticQuickChip } from "@dental/shared";

export interface EmkSomaticStatusBarProps {
	isNormActive: boolean;
	handleOneClickNorm: () => void;
	currentAnamnesis: string;
	handleToggleSomaticChip: (chip: SomaticQuickChip) => void;
}

export function EmkSomaticStatusBar({
	isNormActive: _isNormActive,
	handleOneClickNorm: _handleOneClickNorm,
	currentAnamnesis: _currentAnamnesis,
	handleToggleSomaticChip: _handleToggleSomaticChip,
}: EmkSomaticStatusBarProps) {
	// Mandates 8bi & 8y: Somatic status and allergies are rendered strictly once
	// in the patient header banner (0px duplicate clutter / no colored drug pill dumps in diary body).
	return null;
}
