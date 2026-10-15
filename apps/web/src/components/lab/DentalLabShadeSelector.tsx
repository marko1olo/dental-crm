import React from "react";
import { DentalLabExpressShadeBar } from "./shades/DentalLabExpressShadeBar";
import { DentalLabPhotoAttachment } from "./shades/DentalLabPhotoAttachment";
import { DentalLabStratificationSection } from "./shades/DentalLabStratificationSection";

export interface DentalLabShadeSelectorProps {
	shadeSystem: "classical" | "3d_master" | "bleach";
	setShadeSystem: (system: "classical" | "3d_master" | "bleach") => void;
	shadeClassical: string;
	setShadeClassical: (s: string) => void;
	shade3dMaster: string;
	setShade3dMaster: (s: string) => void;
	shadeBleach: string;
	setShadeBleach: (s: string) => void;
	shadeCervical: string;
	setShadeCervical: (s: string) => void;
	shadeBody: string;
	setShadeBody: (s: string) => void;
	shadeIncisal: string;
	setShadeIncisal: (s: string) => void;
	shadeStump: string;
	setShadeStump: (s: string) => void;
	translucency: string;
	setTranslucency: (t: string) => void;
	mamelons: boolean;
	setMamelons: (m: boolean) => void;
	calcifications: boolean;
	setCalcifications: (c: boolean) => void;
	opalescence?: boolean;
	setOpalescence?: (o: boolean) => void;
	attachedImageUrl?: string | null;
	setAttachedImageUrl?: (url: string | null) => void;
}

export function DentalLabShadeSelector(props: DentalLabShadeSelectorProps) {
	const currentPrimary =
		props.shadeSystem === "3d_master" ? props.shade3dMaster : props.shadeSystem === "bleach" ? props.shadeBleach : props.shadeClassical;

	const handleSelectShade = (shade: string) => {
		if (props.shadeSystem === "classical") props.setShadeClassical(shade);
		else if (props.shadeSystem === "3d_master") props.setShade3dMaster(shade);
		else props.setShadeBleach(shade);
		props.setShadeBody(shade);
	};

	return (
		<div className="space-y-4">
			<DentalLabExpressShadeBar
				shadeSystem={props.shadeSystem} setShadeSystem={props.setShadeSystem}
				currentShade={currentPrimary} onSelectShade={handleSelectShade}
			/>

			<DentalLabPhotoAttachment
				currentShade={currentPrimary} attachedImageUrl={props.attachedImageUrl}
				setAttachedImageUrl={props.setAttachedImageUrl}
			/>

			<DentalLabStratificationSection
				currentPrimaryShade={currentPrimary}
				shadeCervical={props.shadeCervical} setShadeCervical={props.setShadeCervical}
				shadeBody={props.shadeBody} setShadeBody={props.setShadeBody}
				shadeIncisal={props.shadeIncisal} setShadeIncisal={props.setShadeIncisal}
				shadeStump={props.shadeStump} setShadeStump={props.setShadeStump}
				translucency={props.translucency} setTranslucency={props.setTranslucency}
			/>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
				<label className="min-h-[44px] inline-flex items-center gap-2 p-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] cursor-pointer">
					<input type="checkbox" checked={props.mamelons} onChange={(e) => props.setMamelons(e.target.checked)} className="w-4 h-4 accent-teal-600 rounded" data-testid="mamelons-checkbox" />
					<span className="font-semibold text-[11px]">Мамелоны края</span>
				</label>
				<label className="min-h-[44px] inline-flex items-center gap-2 p-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] cursor-pointer">
					<input type="checkbox" checked={props.calcifications} onChange={(e) => props.setCalcifications(e.target.checked)} className="w-4 h-4 accent-teal-600 rounded" data-testid="calcifications-checkbox" />
					<span className="font-semibold text-[11px]">Кальцификаты</span>
				</label>
				{props.setOpalescence && (
					<label className="min-h-[44px] inline-flex items-center gap-2 p-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] cursor-pointer">
						<input type="checkbox" checked={Boolean(props.opalescence)} onChange={(e) => props.setOpalescence?.(e.target.checked)} className="w-4 h-4 accent-teal-600 rounded" data-testid="opalescence-checkbox" />
						<span className="font-semibold text-[11px]">Опалесценция</span>
					</label>
				)}
			</div>
		</div>
	);
}
