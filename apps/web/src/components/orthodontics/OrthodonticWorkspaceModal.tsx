/**
 * @dental/web/components/orthodontics/OrthodonticWorkspaceModal.tsx
 * Канонический рабочий стол ортодонта — Координатор модулей (Мандаты 8b sweet-spot, 8e, 8n, 8am, 8x).
 * Вкладки: [Визит и активация дуг | ТРГ Цефалометрия | Элайнеры].
 * Ровно 1 Primary CTA кнопка #0d9488 на видимый экран. На смартфонах — нативный Apple HIG Bottom Sheet.
 */

import React, { useState, useId, useMemo, useCallback } from "react";
import { showToast } from "../GlobalToast";
import {
	type CephLandmark16Key,
	type CephPoint2D,
	CANONICAL_CEPH_COORDINATES_PRESET,
	computeCephalometricMetrics,
	BRACKET_SYSTEMS_CATALOG,
	ARCHWIRES_CATALOG,
	DEFAULT_ALIGNER_STATE,
} from "./orthoCatalogData";
import { OrthoWorkspaceHeader } from "./workspaceModal/OrthoWorkspaceHeader";
import { OrthoVisitActivationTab } from "./workspaceModal/OrthoVisitActivationTab";
import { OrthoCephAnalysisTab } from "./workspaceModal/OrthoCephAnalysisTab";
import { OrthoAlignersTab } from "./workspaceModal/OrthoAlignersTab";
import { OrthoWorkspaceFooter } from "./workspaceModal/OrthoWorkspaceFooter";

export interface OrthodonticWorkspaceModalProps {
	isOpen?: boolean;
	onClose: () => void;
	patientId?: string;
	patientName?: string;
	doctorName?: string;
	initialTab?: "visit" | "ceph" | "aligners";
	onSaveProtocol?: (summary: {
		patientName: string;
		arch: string;
		bracketSystem: string;
		archwire: string;
		skeletalClass: string;
		anbAngle: number;
		totalRub: number;
		diaryText: string;
	}) => void;
}

export const OrthodonticWorkspaceModal: React.FC<OrthodonticWorkspaceModalProps> = ({
	isOpen = true,
	onClose,
	patientName = "Смирнова Екатерина Андреевна",
	doctorName = "Д-р Соколов А. В.",
	initialTab = "visit",
	onSaveProtocol,
}) => {
	const titleId = useId();
	const [activeTab, setActiveTab] = useState<"visit" | "ceph" | "aligners">(initialTab);
	const [targetArch, setTargetArch] = useState<"both" | "upper" | "lower">("both");
	const [selectedBracketId, setSelectedBracketId] = useState<string>("damon_q2");
	const [selectedArchwireId, setSelectedArchwireId] = useState<string>("cuniti_014x025");
	const [selectedActions, setSelectedActions] = useState<Record<string, boolean>>({
		wire_change: true,
		ligature_change: false,
		power_chain: true,
		elastic_traction: false,
		rebracket: false,
		ipr: false,
	});

	// Состояние ТРГ-ориентиров (16 точек)
	const [cephPoints, setCephPoints] = useState<Record<CephLandmark16Key, CephPoint2D>>({
		...CANONICAL_CEPH_COORDINATES_PRESET,
	});

	// Состояние элайнеров
	const [alignerState, setAlignerState] = useState(DEFAULT_ALIGNER_STATE);

	// Живой тригонометрический расчет цефалометрии Штейнера/Шварца
	const cephMetrics = useMemo(() => computeCephalometricMetrics(cephPoints), [cephPoints]);

	// Расчет стоимости процедур
	const totalCostRub = useMemo(() => {
		let total = 0;
		const bracket = BRACKET_SYSTEMS_CATALOG.find((b) => b.id === selectedBracketId);
		const wire = ARCHWIRES_CATALOG.find((w) => w.id === selectedArchwireId);
		if (selectedActions.wire_change && wire) total += wire.priceRub;
		if (selectedActions.power_chain) total += 1800;
		if (selectedActions.rebracket && bracket) total += 1200;
		if (selectedActions.ipr) total += 1500;
		if (activeTab === "aligners") total = 4500;
		return total > 0 ? total : 2500;
	}, [selectedBracketId, selectedArchwireId, selectedActions, activeTab]);

	// 1-клик фиксация физиологической нормы (Мандат 8e)
	const handleApplyNorm = useCallback(() => {
		setCephPoints({ ...CANONICAL_CEPH_COORDINATES_PRESET });
		setSelectedActions({
			wire_change: true,
			ligature_change: false,
			power_chain: false,
			elastic_traction: false,
			rebracket: false,
			ipr: false,
		});
		showToast("Установлена физиологическая норма: I скелетный класс, плановая дуга", "success");
	}, []);

	// Переключение манипуляций
	const handleToggleAction = useCallback((actionId: string, checked: boolean) => {
		setSelectedActions((prev) => ({ ...prev, [actionId]: checked }));
	}, []);

	// Обновление состояния элайнеров
	const handleChangeAlignerState = useCallback((patch: Partial<typeof DEFAULT_ALIGNER_STATE>) => {
		setAlignerState((prev) => ({ ...prev, ...patch }));
	}, []);

	// Фиксация протокола (Единственный Primary CTA, Мандат 8am)
	const handleSave = useCallback(() => {
		const bracket = BRACKET_SYSTEMS_CATALOG.find((b) => b.id === selectedBracketId)?.nameRu || "Damon Q2";
		const wire = ARCHWIRES_CATALOG.find((w) => w.id === selectedArchwireId)?.nameRu || ".014x.025 CuNiTi";
		const diaryText = `Ортодонтический приём: ${
			targetArch === "both" ? "Верхняя и нижняя челюсти" : targetArch === "upper" ? "Верхняя челюсть" : "Нижняя челюсть"
		}. Брекеты ${bracket}, дуга ${wire}. ТРГ: ${cephMetrics.skeletalClassLabelRu}, ANB=${cephMetrics.anb}°, SNA=${cephMetrics.sna}°, SNB=${cephMetrics.snb}°. Стоимость активации: ${totalCostRub} ₽.`;

		if (onSaveProtocol) {
			onSaveProtocol({
				patientName,
				arch: targetArch,
				bracketSystem: bracket,
				archwire: wire,
				skeletalClass: cephMetrics.skeletalClass,
				anbAngle: cephMetrics.anb,
				totalRub: totalCostRub,
				diaryText,
			});
		}
		showToast("✓ Протокол активации и расчет успешно сохранены в карту", "success");
		onClose();
	}, [
		targetArch,
		selectedBracketId,
		selectedArchwireId,
		cephMetrics,
		totalCostRub,
		patientName,
		onSaveProtocol,
		onClose,
	]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-[10050] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto overflow-x-clip max-w-[100vw]"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			data-testid="orthodontic-workspace-modal"
		>
			<div className="relative w-full max-w-5xl bg-[var(--paper)] border border-[var(--line)] rounded-t-[24px] sm:rounded-2xl shadow-2xl flex flex-col h-[94vh] sm:h-[88vh] overflow-hidden overflow-x-clip animate-in fade-in zoom-in-95 duration-200">
				{/* Шапка и сегментный контрол */}
				<OrthoWorkspaceHeader
					titleId={titleId}
					patientName={patientName}
					doctorName={doctorName}
					activeTab={activeTab}
					onSelectTab={setActiveTab}
					onApplyNorm={handleApplyNorm}
					onClose={onClose}
					skeletalClass={cephMetrics.skeletalClass}
					alignerCurrentStep={alignerState.currentStep}
					alignerTotalSteps={alignerState.totalSteps}
				/>

				{/* Рабочее пространство вкладок */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-12 bg-[var(--paper)]">
					{activeTab === "visit" && (
						<OrthoVisitActivationTab
							targetArch={targetArch}
							onSelectArch={setTargetArch}
							selectedBracketId={selectedBracketId}
							onSelectBracket={setSelectedBracketId}
							selectedArchwireId={selectedArchwireId}
							onSelectArchwire={setSelectedArchwireId}
							selectedActions={selectedActions}
							onToggleAction={handleToggleAction}
							skeletalClassLabelRu={cephMetrics.skeletalClassLabelRu}
						/>
					)}

					{activeTab === "ceph" && (
						<OrthoCephAnalysisTab
							cephPoints={cephPoints}
							onChangePoints={setCephPoints}
							cephMetrics={cephMetrics}
						/>
					)}

					{activeTab === "aligners" && (
						<OrthoAlignersTab
							alignerState={alignerState}
							onChangeAlignerState={handleChangeAlignerState}
						/>
					)}
				</div>

				{/* Единый липкий нижний колонтитул (Natural Thumb Zone) — Ровно 1 Primary CTA */}
				<OrthoWorkspaceFooter
					totalCostRub={totalCostRub}
					onSave={handleSave}
				/>
			</div>
		</div>
	);
};

export default OrthodonticWorkspaceModal;
