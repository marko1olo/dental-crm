import React from "react";
import { X } from "lucide-react";
import { AnatomicalToothSVG } from "../../../odontogram/AnatomicalToothSVG";
import { getToothStatusMeta } from "./clinicalModalTypes";

export interface ClinicalModalHeaderProps {
	code: string;
	state: string;
	selectedSurfaces: string[];
	handleSelectSurface: (surf: string) => void;
	closeClinicalModal: () => void;
}

export const ClinicalModalHeader: React.FC<ClinicalModalHeaderProps> = ({
	code,
	state,
	selectedSurfaces,
	handleSelectSurface,
	closeClinicalModal,
}) => {
	const statusMeta = getToothStatusMeta(state);
	const toothNum = Number(code) || 16;
	const isMissing = state === "missing";

	return (
		<div className="_ccm-header">
			<div className="_ccm-header-left">
				<div className="_ccm-tooth-badge" aria-hidden="true">
					<div className="w-6 h-8 flex items-center justify-center overflow-hidden">
						<AnatomicalToothSVG
							number={toothNum}
							state={isMissing ? "Missing" : state === "treatment" ? "Root_Canal_Treated" : state === "done" ? "Filled" : "Healthy"}
							scale={0.38}
							showPeriodontalBoneLoss={false}
							showPulpAndCanals={state === "treatment" || state === "pulpitis"}
							showPeriapicalHalos={false}
							onClick={() => {}}
						/>
					</div>
				</div>
				<div className="_ccm-header-title-wrap">
					<span className="_ccm-tooth-title">Зуб {code}</span>
					<span className="_ccm-fdi-badge">FDI</span>
					<span className="_ccm-status-pill">
						<span className={`_ccm-status-dot ${statusMeta.dot}`} />
						<span>{statusMeta.label}</span>
					</span>
				</div>
			</div>

			<div className="_ccm-cavity-cluster">
				<span className="_ccm-cavity-label">Блэк:</span>
				<div className="_ccm-cavity-pills">
					{["O", "MO", "OD", "MOD", "V"].map((cavity) => {
						const isSelected = selectedSurfaces.includes(cavity);
						return (
							<button
								key={cavity}
								type="button"
								data-testid={`btn-cavity-${cavity.toLowerCase()}`}
								onClick={() => handleSelectSurface(cavity)}
								className={`_ccm-cavity-btn${isSelected ? " active" : ""}`}
								title={`Полость класса ${cavity}`}
							>
								{cavity}
							</button>
						);
					})}
				</div>
			</div>

			<button
				type="button"
				onClick={closeClinicalModal}
				className="_ccm-close-btn-icon cursor-pointer"
				aria-label="Закрыть модальное окно"
				title="Закрыть (Esc)"
			>
				<X className="w-3.5 h-3.5" />
			</button>
		</div>
	);
};
