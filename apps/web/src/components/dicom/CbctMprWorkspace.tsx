import type React from "react";
import { Cornerstone3DViewer } from "./Cornerstone3DViewer";

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

/**
 * CbctMprWorkspace — ультра-тонкий прозрачный фасад-делегат в канонический
 * 3D DICOM просмотрщик Cornerstone3DViewer (Закон Единого Неделимого Авторитета, Мандат 8s).
 */
export const CbctMprWorkspace: React.FC<CbctMprWorkspaceProps> = ({
	isOpen,
	patientId = null,
	authHeaders = {},
}) => {
	if (!isOpen) return null;
	return (
		<div className="cbct-mpr-workspace-modal fixed inset-0 z-50 flex items-center justify-center bg-black/80">
			<Cornerstone3DViewer imageIds={[]} patientId={patientId} authHeaders={authHeaders} />
		</div>
	);
};

export default CbctMprWorkspace;
