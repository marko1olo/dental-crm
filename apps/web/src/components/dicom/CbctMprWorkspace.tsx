import type React from "react";
import { lazy, Suspense, useEffect } from "react";

const Cornerstone3DViewer = lazy(() =>
	import("./Cornerstone3DViewer").then((m) => ({ default: m.Cornerstone3DViewer })),
);

export interface CbctMprWorkspaceProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | null;
	readonly patientName?: string;
	readonly studyDate?: string;
	readonly voxelSpacing?: { readonly x: number; readonly y: number; readonly z: number };
	readonly authHeaders?: Record<string, string>;
	readonly initialStudyFile?: File | null;
	readonly initialIsStudyLoaded?: boolean;
}

export const CbctMprWorkspace: React.FC<CbctMprWorkspaceProps> = ({
	isOpen, onClose, patientId = null, patientName, studyDate, voxelSpacing, authHeaders = {},
}) => {
	useEffect(() => {
		if (!isOpen) return;
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isOpen, onClose]);

	if (!isOpen) return null;
	return (
		<div className="cbct-mpr-workspace-modal fixed inset-0 z-50 flex items-center justify-center bg-black/90">
			<Suspense fallback={<div className="p-8 text-xs text-cyan-400">Загрузка 3D-просмотрщика КТ...</div>}>
				<Cornerstone3DViewer imageIds={[]} patientId={patientId} patientName={patientName} studyDate={studyDate} voxelSpacing={voxelSpacing} authHeaders={authHeaders} onClose={onClose} />
			</Suspense>
		</div>
	);
};

export default CbctMprWorkspace;
