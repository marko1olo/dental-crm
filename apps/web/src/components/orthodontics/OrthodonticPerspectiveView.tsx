import React, { useState, useEffect } from "react";
import { Camera, CheckCircle2, Compass } from "lucide-react";
import { BracesBracket } from "../icons/DentalIcons";
import { usePatientStore } from "../../store/patientStore";
import { OrthopedicsChairsidePanel } from "../orthopedics/OrthopedicsChairsidePanel";
import { OrthodonticPhotoProtocolModal } from "../diagnostics/OrthodonticPhotoProtocolModal";
import { OrthodonticMaterialsQuickSelector } from "./OrthodonticMaterialsQuickSelector";
import { OrthodonticVisitScreen } from "./OrthodonticVisitScreen";
import { CephalometricAnalysisModal } from "./CephalometricAnalysisModal";

/**
 * OrthodonticPerspectiveView — чистый фасад ортодонтического режима (Мандат 8b <= 120 строк).
 */
export function OrthodonticPerspectiveView() {
	const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
	const [isProtocolOpen, setIsProtocolOpen] = useState(false);
	const [isCephModalOpen, setIsCephModalOpen] = useState(false);
	const [selectedMaterialId, setSelectedMaterialId] = useState<string | undefined>();
	const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
	const patientName = usePatientStore((s) => s.patientCoreDraft?.fullName || "");

	useEffect(() => {
		const checkHash = () => {
			if (typeof window !== "undefined") {
				if (window.location.hash.includes("ceph")) setIsCephModalOpen(true);
				if (window.location.hash.includes("protocol") || window.location.hash.includes("ortho-protocol")) {
					setIsProtocolOpen(true);
				}
			}
		};
		checkHash();
		window.addEventListener("hashchange", checkHash);
		return () => window.removeEventListener("hashchange", checkHash);
	}, []);

	return (
		<div className="space-y-4">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-2">
				<h2 className="text-base font-bold text-[var(--ink)]">
					Ортодонтия и Ортопедия у кресла
				</h2>
				<div className="grid grid-cols-4 sm:flex sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
					<button
						type="button"
						onClick={() => setIsProtocolOpen(true)}
						className="secondary-button inline-flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 !rounded-xl text-[11px] sm:text-xs font-bold border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--primary)] cursor-pointer min-h-[44px] sm:min-h-[36px] whitespace-nowrap shadow-xs"
						data-testid="ortho-toolbar-norm-btn"
						title="1-клик фиксация нормы (Мандат 8e): Ортогнатический прикус, класс I, ВНЧС норма"
					>
						<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
						<span className="hidden sm:inline">Физиологический прикус (Норма)</span>
						<span className="sm:hidden">Норма</span>
					</button>
					<button
						type="button"
						onClick={() => setIsCephModalOpen(true)}
						className="secondary-button inline-flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 !rounded-xl text-[11px] sm:text-xs font-semibold cursor-pointer min-h-[44px] sm:min-h-[36px] whitespace-nowrap"
						data-testid="btn-open-ortho-ceph-modal"
						title="Телерентгенография черепа (ТРГ) и цефалометрический анализ"
					>
						<Compass className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
						<span className="hidden sm:inline">ТРГ Цефалометрия</span>
						<span className="sm:hidden">ТРГ</span>
					</button>
					<button
						type="button"
						onClick={() => setIsPhotoModalOpen(true)}
						data-testid="btn-open-ortho-photo-modal"
						className="secondary-button inline-flex items-center justify-center gap-1 px-1.5 sm:px-3 py-1.5 !rounded-xl text-[11px] sm:text-xs font-semibold cursor-pointer min-h-[44px] sm:min-h-[36px] whitespace-nowrap"
						title="Клинический фотопротокол ортодонта"
					>
						<Camera className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
						<span className="hidden sm:inline">Фотопротокол</span>
						<span className="sm:hidden">Фото</span>
					</button>
					<button
						type="button"
						onClick={() => setIsProtocolOpen(true)}
						data-testid="btn-open-ortho-protocol-widget"
						className="primary-button inline-flex items-center justify-center gap-1 px-1.5 sm:px-3.5 py-1.5 !rounded-xl text-[11px] sm:text-xs font-bold cursor-pointer min-h-[44px] sm:min-h-[36px] whitespace-nowrap shadow-xs"
						title="Протокол ортодонтического визита"
					>
						<BracesBracket className="w-3.5 h-3.5 text-white shrink-0" />
						<span className="hidden sm:inline">Протокол визита</span>
						<span className="sm:hidden">Визит</span>
					</button>
				</div>
			</div>

			<OrthopedicsChairsidePanel />

			<OrthodonticMaterialsQuickSelector
				compact
				selectedMaterialId={selectedMaterialId}
				onSelectMaterial={(material) => setSelectedMaterialId(material.id)}
			/>

			<OrthodonticPhotoProtocolModal
				isOpen={isPhotoModalOpen}
				onClose={() => setIsPhotoModalOpen(false)}
				patientId={selectedPatientId || ""}
			/>

			<OrthodonticVisitScreen
				isOpen={isProtocolOpen}
				onClose={() => setIsProtocolOpen(false)}
				patientId={selectedPatientId || ""}
				patientName={patientName || "Пациент"}
			/>

			<CephalometricAnalysisModal
				isOpen={isCephModalOpen}
				onClose={() => setIsCephModalOpen(false)}
				patientId={selectedPatientId || ""}
				patientName={patientName}
			/>
		</div>
	);
}
