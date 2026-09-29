import type React from "react";
import { lazy, Suspense, useEffect } from "react";
import { createPortal } from "react-dom";

const Cornerstone3DViewer = lazy(() =>
	import("./Cornerstone3DViewer").then((m) => ({ default: m.Cornerstone3DViewer })),
);

export interface CbctMprWorkspaceProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | null | undefined;
	readonly patientName?: string | undefined;
	readonly studyDate?: string | undefined;
	readonly voxelSpacing?: { readonly x: number; readonly y: number; readonly z: number } | undefined;
	readonly authHeaders?: Record<string, string> | undefined;
	readonly initialStudyFile?: File | null | undefined;
	readonly initialIsStudyLoaded?: boolean | undefined;
	readonly imageIds?: string[] | undefined;
}

export const CbctMprWorkspace: React.FC<CbctMprWorkspaceProps> = ({
	isOpen,
	onClose,
	patientId = null,
	patientName,
	studyDate,
	voxelSpacing,
	authHeaders = {},
	imageIds = [],
}) => {
	useEffect(() => {
		if (!isOpen) return;
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isOpen, onClose]);

	if (!isOpen) return null;
	const modalContent = (
		<div className="cbct-mpr-workspace-modal fixed inset-0 z-50 flex items-center justify-center bg-black/90">
			<Suspense fallback={<div className="p-8 text-xs text-cyan-400">Загрузка 3D-просмотрщика КТ...</div>}>
				<Cornerstone3DViewer
					imageIds={imageIds}
					patientId={patientId}
					patientName={patientName}
					studyDate={studyDate}
					voxelSpacing={voxelSpacing}
					authHeaders={authHeaders}
					onClose={onClose}
				/>
			</Suspense>
		</div>
	);
	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default CbctMprWorkspace;
