import React, { useState, useEffect } from "react";
import { Camera, Compass } from "lucide-react";
import { BracesBracket } from "../icons/DentalIcons";
import { usePatientStore } from "../../store/patientStore";
import { OrthopedicsChairsidePanel } from "../orthopedics/OrthopedicsChairsidePanel";
import { OrthodonticPhotoProtocolModal } from "../diagnostics/OrthodonticPhotoProtocolModal";
import { OrthodonticMaterialsQuickSelector } from "./OrthodonticMaterialsQuickSelector";
import { OrthodonticVisitProtocolWidget } from "./OrthodonticVisitProtocolWidget";
import { CephalometricAnalysisModal } from "../radiology/CephalometricAnalysisModal";

/**
 * OrthodonticPerspectiveView — чистый фасад ортодонтического режима.
 * Делегирует рендер каноническому OrthopedicsChairsidePanel, а также предоставляет
 * доступ к фотопротоколу, протоколу визита и ТРГ-цефалометрии ортодонта (Мандат 8s: Закон Единого Неделимого Авторитета).
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
				if (window.location.hash.includes("ceph")) {
					setIsCephModalOpen(true);
				}
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
			<div className="flex items-center justify-between gap-2 px-2">
				<h2 className="text-base font-bold text-[var(--ink)]">
					Ортодонтия и Ортопедия у кресла
				</h2>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setIsCephModalOpen(true)}
						className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--paper)] border border-teal-500/40 text-teal-600 dark:text-teal-400 hover:bg-teal-50/50 dark:hover:bg-teal-950/30 transition-colors cursor-pointer min-h-[36px]"
						data-testid="btn-open-ortho-ceph-modal"
						title="Телерентгенография черепа (ТРГ) и цефалометрический анализ"
					>
						<Compass className="w-3.5 h-3.5" />
						ТРГ Цефалометрия
					</button>
					<button
						type="button"
						onClick={() => setIsPhotoModalOpen(true)}
						data-testid="btn-open-ortho-photo-modal"
						className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--line)] transition-colors cursor-pointer min-h-[36px]"
					>
						<Camera className="w-3.5 h-3.5" />
						Фотопротокол
					</button>
					<button
						type="button"
						onClick={() => setIsProtocolOpen(true)}
						data-testid="btn-open-ortho-protocol-widget"
						className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--line)] transition-colors cursor-pointer min-h-[36px]"
					>
						<BracesBracket className="w-3.5 h-3.5" />
						Протокол визита
					</button>
				</div>
			</div>

			<OrthopedicsChairsidePanel />

			<div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3">
				<h3 className="text-xs font-bold text-[var(--ink)] mb-2 flex items-center gap-1.5">
					<BracesBracket className="w-4 h-4 text-teal-600" />
					Быстрый выбор ортодонтических материалов (90% рынка РФ)
				</h3>
				<OrthodonticMaterialsQuickSelector
					compact
					selectedMaterialId={selectedMaterialId}
					onSelectMaterial={(material) => setSelectedMaterialId(material.id)}
				/>
			</div>

			<OrthodonticPhotoProtocolModal
				isOpen={isPhotoModalOpen}
				onClose={() => setIsPhotoModalOpen(false)}
				patientId={selectedPatientId || ""}
			/>

			<OrthodonticVisitProtocolWidget
				isOpen={isProtocolOpen}
				onClose={() => setIsProtocolOpen(false)}
				patientId={selectedPatientId || ""}
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
