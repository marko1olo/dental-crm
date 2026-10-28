import React from "react";
import { Edit3 } from "lucide-react";
import type {
	XrayCbctReferralPregnancyStatus,
	XrayCbctReferralStudyType,
} from "@dental/shared";
import { XrayReferralFields } from "./xrayReferral/XrayReferralFields";

export interface XrayCbctReferralFormProps {
	renderClinicalToothRowsEditor?: (() => React.ReactNode) | undefined;
	inferredTreatmentArea?: string | null | undefined;
	normalizedXrayStudyType?: ((val: string) => XrayCbctReferralStudyType) | undefined;
	typedXrayStudyTypeOptions?: Array<{
		value: XrayCbctReferralStudyType;
		label: string;
	}> | undefined;
	normalizedXrayPriority?: ((val: string) => any) | undefined;
	normalizedXrayPregnancyStatus?: ((val: string) => XrayCbctReferralPregnancyStatus) | undefined;
	typedXrayPregnancyStatusOptions?: Array<{
		value: XrayCbctReferralPregnancyStatus;
		label: string;
	}> | undefined;
	activeDoctorFullName?: string | null | undefined;
}

export const XrayCbctReferralForm: React.FC<XrayCbctReferralFormProps> =
	React.memo(function XrayCbctReferralForm(props) {
		return (
			<article className="document-payload-card">
				<div>
					<h3>Направление на снимок</h3>
					<p>
						Вид исследования, область, клинический вопрос, показание и
						ограничения до рентгена или КЛКТ.
					</p>
				</div>
				<details className="document-manual-override">
					<summary
						style={{
							cursor: "pointer",
							fontWeight: 600,
							color: "var(--brand-700)",
							userSelect: "none",
						}}
					>
						<span
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
							}}
						>
							<Edit3 size={13} aria-hidden="true" />
							Ручная корректировка полей (развернуть)
						</span>
					</summary>
					<XrayReferralFields {...props} />
				</details>
			</article>
		);
	});
