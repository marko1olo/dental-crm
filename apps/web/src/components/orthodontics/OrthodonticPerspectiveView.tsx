/**
 * @dental/web/components/orthodontics/OrthodonticPerspectiveView.tsx
 * Фасад перспективы ортодонтического приёма (Мандаты 8b <= 120 строк, 8e, 8aq).
 */

import React from "react";
import { OrthodonticStudioModal } from "./OrthodonticStudioModal";

export function OrthodonticPerspectiveView(props: {
	isOpen?: boolean;
	onClose?: () => void;
	patientName?: string;
	doctorName?: string;
}) {
	return (
		<OrthodonticStudioModal
			isOpen={props.isOpen ?? true}
			onClose={props.onClose ?? (() => {})}
			patientName={props.patientName}
			doctorName={props.doctorName}
		/>
	);
}

export default OrthodonticPerspectiveView;
