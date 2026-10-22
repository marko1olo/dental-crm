/**
 * VisitProtocolView.tsx — Канонический фасад клинического протокола приёма.
 * Декомпозирован по Мандату 8b (Layer 5: Тонкий фасад <= 120 строк).
 */

import React, { useCallback, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { showToast } from "../GlobalToast";
import { DentalLabOrderDrawer } from "../lab/DentalLabOrderDrawer";
import {
	ProtocolComplaintsAndAnamnesis,
	ProtocolHeader,
	ProtocolIcd10SelectorBar,
	ProtocolStatusLocalisAndDiagnosis,
	ProtocolTreatmentAndAnesthesiaSection,
	useVisitProtocolState,
} from "./visitProtocol";
import type { VisitProtocolData, VisitProtocolViewProps } from "./visitProtocol/types";

export type { VisitProtocolData, VisitProtocolViewProps } from "./visitProtocol/types";

export const VisitProtocolView: React.FC<VisitProtocolViewProps> = React.memo(function VisitProtocolView({
	isOpen = true, onClose, visitId, patientId, patientName = "Пациент",
	doctorName = "Врач-стоматолог", initialTooth = 16, initialDate, initialDiagnosis,
	onSaveProtocol, onPrint,
}) {
	const [isLabOrderOpen, setIsLabOrderOpen] = useState(false);
	const {
		protocol, setProtocol, selectedTooth, setSelectedTooth, lastSaved,
		setLastSaved, handleApplySomaticNorm, handleSelectIcd10Preset, handleApplyAnesthesia,
	} = useVisitProtocolState(visitId, patientId, initialTooth, initialDate, initialDiagnosis, onSaveProtocol);

	const handleSave = useCallback(() => {
		if (onSaveProtocol) onSaveProtocol(protocol);
		setLastSaved(new Date().toLocaleTimeString("ru-RU"));
		showToast("Протокол приёма сохранен в карту пациента", "success", 3000);
	}, [protocol, onSaveProtocol, setLastSaved]);

	const handlePrint = useCallback(() => {
		if (onPrint) onPrint();
		else if (typeof window !== "undefined") window.print();
	}, [onPrint]);

	const handleLabOrderSaved = useCallback((savedOrder: any) => {
		setIsLabOrderOpen(false);
		if (!savedOrder) return;
		const teeth = savedOrder.teethFdi ? (Array.isArray(savedOrder.teethFdi) ? savedOrder.teethFdi.join(", ") : savedOrder.teethFdi) : selectedTooth || "16";
		const mat = savedOrder.materialRu || savedOrder.constructionType || "Ортопедическая коронка";
		const shade = savedOrder.vitaShade || "A2";
		const ztlNote = `Наряд ЗТЛ оформлен: зуб ${teeth}, конструкция: ${mat}, цвет: ${shade}.`;
		setProtocol((prev) => ({ ...prev, treatmentProtocol: prev.treatmentProtocol ? `${prev.treatmentProtocol}\n${ztlNote}` : ztlNote }));
		showToast("Наряд ЗТЛ привязан к протоколу визита", "success");
	}, [selectedTooth, setProtocol]);

	if (!isOpen) return null;

	return (
		<div className="visit-protocol-view flex flex-col gap-3.5 p-3 sm:p-5 bg-[var(--paper)] rounded-2xl border border-[var(--glass-border)] text-[var(--ink)] shadow-xs print:p-0 print:border-none print:shadow-none" data-testid="visit-protocol-view-container">
			<ProtocolHeader date={protocol.date} patientName={patientName || "Пациент"} doctorName={doctorName || "Врач-стоматолог"} onOpenLabOrder={() => setIsLabOrderOpen(true)} onApplySomaticNorm={handleApplySomaticNorm} onPrint={handlePrint} onSave={handleSave} onClose={onClose} />
			<ProtocolIcd10SelectorBar selectedTooth={selectedTooth} onToothChange={setSelectedTooth} onSelectPreset={handleSelectIcd10Preset} />
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4" aria-label="Протокол приёма">
				{/* Блок: Жалобы пациента: и анамнез */}
				<ProtocolComplaintsAndAnamnesis complaints={protocol.complaints} anamnesis={protocol.anamnesis} onChangeComplaints={(c) => setProtocol({ ...protocol, complaints: c })} onChangeAnamnesis={(a) => setProtocol({ ...protocol, anamnesis: a })} />
				{/* Блок: Осмотр и зубная формула: и Клинический диагноз: */}
				<ProtocolStatusLocalisAndDiagnosis statusLocalis={protocol.statusLocalis} diagnosisIcd10={protocol.diagnosisIcd10} recommendations={protocol.recommendations} onChangeStatusLocalis={(s) => setProtocol({ ...protocol, statusLocalis: s })} onChangeDiagnosisIcd10={(d) => setProtocol({ ...protocol, diagnosisIcd10: d })} onChangeRecommendations={(r) => setProtocol({ ...protocol, recommendations: r })} />
			</div>
			<ProtocolTreatmentAndAnesthesiaSection treatmentProtocol={protocol.treatmentProtocol} deductedMaterials={protocol.deductedMaterials} onChangeTreatmentProtocol={(t) => setProtocol({ ...protocol, treatmentProtocol: t })} onApplyAnesthesia={handleApplyAnesthesia} />
			<div className="flex items-center justify-between text-[11px] text-[var(--muted)] pt-2 border-t border-[var(--glass-border)]">
				<span>Медицинская карта пациента • Протокол приёма</span>
				{lastSaved && <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /><span>Сохранено в {lastSaved}</span></span>}
			</div>
			{isLabOrderOpen && (
				<DentalLabOrderDrawer isOpen={isLabOrderOpen} onClose={() => setIsLabOrderOpen(false)} patientId={patientId || undefined} patientName={patientName || undefined} doctorName={doctorName || undefined} currentToothNumber={selectedTooth || initialTooth || "16"} initialToothFdi={selectedTooth || initialTooth || "16"} onOrderSaved={handleLabOrderSaved} />
			)}
		</div>
	);
});

VisitProtocolView.displayName = "VisitProtocolView";
export default VisitProtocolView;
