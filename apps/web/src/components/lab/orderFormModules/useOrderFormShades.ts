import { useState } from "react";

export function useOrderFormShades(initialAttachedImage: string | null = null) {
	const [shadeSystem, setShadeSystem] = useState<"classical" | "3d_master" | "bleach">("classical");
	const [shadeClassical, setShadeClassical] = useState<string>("A2");
	const [shade3dMaster, setShade3dMaster] = useState<string>("2M2");
	const [shadeBleach, setShadeBleach] = useState<string>("BL2");
	const [shadeCervical, setShadeCervical] = useState<string>("A3");
	const [shadeBody, setShadeBody] = useState<string>("A2");
	const [shadeIncisal, setShadeIncisal] = useState<string>("A1");
	const [shadeStump, setShadeStump] = useState<string>("");
	const [translucency, setTranslucency] = useState<string>("HT");
	const [mamelons, setMamelons] = useState<boolean>(false);
	const [calcifications, setCalcifications] = useState<boolean>(false);
	const [opalescence, setOpalescence] = useState<boolean>(false);
	const [attachedImageUrl, setAttachedImageUrl] = useState<string | null>(initialAttachedImage);

	return {
		shadeSystem,
		setShadeSystem,
		shadeClassical,
		setShadeClassical,
		shade3dMaster,
		setShade3dMaster,
		shadeBleach,
		setShadeBleach,
		shadeCervical,
		setShadeCervical,
		shadeBody,
		setShadeBody,
		shadeIncisal,
		setShadeIncisal,
		shadeStump,
		setShadeStump,
		translucency,
		setTranslucency,
		mamelons,
		setMamelons,
		calcifications,
		setCalcifications,
		opalescence,
		setOpalescence,
		attachedImageUrl,
		setAttachedImageUrl,
	};
}
