import type React from "react";
import { Suspense, lazy } from "react";
import { createPortal } from "react-dom";
import { BarChart2 } from "lucide-react";

const PerioStudioModal = lazy(() =>
	import("../../../perio/PerioStudioModal").then((m) => ({ default: m.PerioStudioModal }))
);

export interface VisitDiaryPerioStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | undefined;
	readonly patientFullName?: string | null;
	readonly doctorName?: string | null;
	readonly onInsertProtocol: (protocolText: string) => void;
}

export const VisitDiaryPerioStudioModal: React.FC<VisitDiaryPerioStudioModalProps> = ({
	isOpen,
	onClose,
	patientId,
	patientFullName,
	doctorName,
	onInsertProtocol,
}) => {
	if (!isOpen) return null;

	const content = (
		<Suspense
			fallback={
				<div className="fixed inset-0 z-[9995] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
					<div className="p-8 text-center text-sm text-[var(--muted)] flex items-center justify-center gap-2 bg-[var(--paper)] rounded-2xl border border-[var(--line)]">
						<BarChart2 className="w-5 h-5 animate-pulse text-teal-500" />
						<span>Загрузка кабинета пародонтологии...</span>
					</div>
				</div>
			}
		>
			<PerioStudioModal
				isOpen={isOpen}
				isModal={true}
				onClose={onClose}
				patientId={patientId || ""}
				patientName={patientFullName || undefined}
				doctorName={doctorName || undefined}
				onInsertToProtocol={onInsertProtocol}
			/>
		</Suspense>
	);

	if (typeof document !== "undefined") {
		return createPortal(content, document.body);
	}
	return content;
};
