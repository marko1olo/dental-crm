import React, { useState } from "react";
import { Camera, FileText } from "lucide-react";
import { usePatientStore } from "../../store/patientStore";
import { OrthopedicsChairsidePanel } from "../orthopedics/OrthopedicsChairsidePanel";
import { OrthodonticPhotoProtocolModal } from "../diagnostics/OrthodonticPhotoProtocolModal";
import { OrthodonticVisitProtocolWidget } from "../orthodontics/OrthodonticVisitProtocolWidget";

/**
 * OrthodonticPerspectiveView — чистый фасад ортодонтического режима.
 * Делегирует рендер каноническому OrthopedicsChairsidePanel, а также предоставляет
 * доступ к фотопротоколу и протоколу визита ортодонта (Мандат 8s: Закон Единого Неделимого Авторитета).
 */
export function OrthodonticPerspectiveView() {
	const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
	const [isProtocolOpen, setIsProtocolOpen] = useState(false);
	const selectedPatientId = usePatientStore((s) => s.selectedPatientId);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-2 px-2">
				<h2 className="text-base font-bold text-[var(--ink)]">
					Ортодонтия и Ортопедия у кресла
				</h2>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setIsPhotoModalOpen(true)}
						className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--line)] transition-colors cursor-pointer min-h-[36px]"
					>
						<Camera className="w-3.5 h-3.5" />
						Фотопротокол
					</button>
					<button
						type="button"
						onClick={() => setIsProtocolOpen(true)}
						className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--line)] transition-colors cursor-pointer min-h-[36px]"
					>
						<FileText className="w-3.5 h-3.5" />
						Протокол визита
					</button>
				</div>
			</div>

			<OrthopedicsChairsidePanel />

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
		</div>
	);
}
