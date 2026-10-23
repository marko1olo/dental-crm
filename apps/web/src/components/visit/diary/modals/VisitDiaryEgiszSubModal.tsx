import React, { lazy, Suspense } from "react";

const EgiszRemdHubModal = lazy(() =>
	import("../../../egisz/EgiszRemdHubModal").then((m) => ({ default: m.EgiszRemdHubModal }))
);

export interface VisitDiaryEgiszSubModalProps {
	readonly showEgiszModal: boolean;
	readonly setShowEgiszModal: (val: boolean) => void;
}

export const VisitDiaryEgiszSubModal: React.FC<VisitDiaryEgiszSubModalProps> = ({
	showEgiszModal,
	setShowEgiszModal,
}) => {
	if (!showEgiszModal) return null;

	return (
		<Suspense fallback={null}>
			<EgiszRemdHubModal
				isOpen={showEgiszModal}
				onClose={() => setShowEgiszModal(false)}
				initialTab="clinical"
			/>
		</Suspense>
	);
};
