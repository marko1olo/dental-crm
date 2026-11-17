import React from "react";
import { CbctMprImplantStudioModal } from "./CbctMprImplantStudioModal";
import type { CbctStandaloneStudioViewProps } from "./standaloneStudio/types";
import type { ImagingStudy } from "../imaging/types";

export * from "./standaloneStudio/types";

export const CbctStandaloneStudioView: React.FC<CbctStandaloneStudioViewProps> = (props) => {
	const initialStudy: ImagingStudy | undefined = props.studyId
		? {
				id: props.studyId,
				title: "3D КЛКТ исследование",
				kind: "cbct",
				capturedAt: new Date().toISOString(),
		  }
		: undefined;

	return (
		<CbctMprImplantStudioModal
			isOpen={true}
			onClose={props.onClose ?? (() => { if (typeof window !== "undefined") window.close(); })}
			study={initialStudy}
			patientName={props.patientName || "Пациент КЛКТ"}
			patientId={props.patientId || "demo_cbct_patient"}
			initialStudioMode={props.initialStudioMode || props.initialMode}
			autoLoadDemo={props.autoLoadDemo ?? true}
		/>
	);
};

export default CbctStandaloneStudioView;
