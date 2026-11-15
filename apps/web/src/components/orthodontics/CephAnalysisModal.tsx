/**
 * @dental/web/components/orthodontics/CephAnalysisModal.tsx
 *
 * DENTE Dental CRM — Каноническое модальное окно цефалометрического анализа ТРГ (Мандаты 8b, 8e, 8am).
 * Методики Шварца, Стейнера, Твида и Рикеттса. Мягкая подложка, отсутствие слепящих белых пятен в Dark Mode,
 * векторные плоскости и интеграция с протоколом ортодонтии.
 */

import React, { lazy, Suspense } from "react";
import { SAMPLE_TRG_CEPHALOGRAM_URL } from "./CephalometricCanvas";
import { lazyWithRetry } from "../../lib/lazyWithRetry";

const CephalometricAnalysisModalUI = lazyWithRetry(() =>
	import("../radiology/cephModal/CephalometricAnalysisModalUI").then((m) => ({ default: m.CephalometricAnalysisModal })),
);

export interface CephAnalysisModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string;
	readonly patientName?: string;
	readonly initialImageUrl?: string;
	readonly onApplyAnalysis?: (results: {
		trgValues: Record<string, number>;
		summaryText?: string;
	}) => void;
}

export const CephAnalysisModal: React.FC<CephAnalysisModalProps> = ({
	isOpen,
	onClose,
	patientId = "pat-ortho-studio",
	patientName = "Пациент ортодонтического приёма",
	initialImageUrl = SAMPLE_TRG_CEPHALOGRAM_URL,
	onApplyAnalysis,
}) => {
	if (!isOpen) return null;

	return (
		<Suspense fallback={null}>
			<CephalometricAnalysisModalUI
				isOpen={isOpen}
				onClose={onClose}
				patientId={patientId}
				patientName={patientName}
				initialImageUrl={initialImageUrl}
				onApplyAnalysis={onApplyAnalysis}
			/>
		</Suspense>
	);
};

export default CephAnalysisModal;
