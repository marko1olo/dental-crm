import { evaluateCabinetReadiness, type DentalAppointmentType } from "@dental/shared";
import { useMemo, useState } from "react";
import { showToast } from "../../GlobalToast.js";

export function useCabinetReadinessFormFields(selectedProfile: DentalAppointmentType, requiresCofferdam: boolean) {
	const [disinfectionCompleted, setDisinfectionCompleted] = useState(true);
	const [disinfectantBrand, setDisinfectantBrand] = useState("Бациллол АФ (спрей)");
	const [exposureMinutes, setExposureMinutes] = useState(3);
	const [turbineSterile, setTurbineSterile] = useState(true);
	const [contraAngleSterile, setContraAngleSterile] = useState(true);
	const [micromotorSterile, setMicromotorSterile] = useState(true);
	const [class5Verified, setClass5Verified] = useState(true);
	const [packageIntegrityVerified, setPackageIntegrityVerified] = useState(true);
	const [mirrorReady, setMirrorReady] = useState(true);
	const [probeReady, setProbeReady] = useState(true);
	const [tweezersReady, setTweezersReady] = useState(true);
	const [excavatorReady, setExcavatorReady] = useState(true);
	const [spatulaReady, setSpatulaReady] = useState(true);
	const [salivaConnected, setSalivaConnected] = useState(true);
	const [hveConnected, setHveConnected] = useState(true);
	const [filterChecked, setFilterChecked] = useState(true);
	const [rubberDamReady, setRubberDamReady] = useState(true);
	const [clampsReady, setClampsReady] = useState(true);
	const [forcepsReady, setForcepsReady] = useState(true);

	const evaluation = useMemo(() => {
		return evaluateCabinetReadiness({
			appointmentType: selectedProfile,
			surfaceDisinfection: { isCompleted: disinfectionCompleted, disinfectantBrand, exposureMinutes },
			handpiecesSterility: {
				isCompleted: turbineSterile && contraAngleSterile && class5Verified && packageIntegrityVerified,
				turbineHandpieceSterile: turbineSterile,
				contraAngleHandpieceSterile: contraAngleSterile,
				micromotorHandpieceSterile: micromotorSterile,
				class5IndicatorsVerified: class5Verified,
				packageIntegrityVerified,
			},
			sterileTray: {
				isCompleted: mirrorReady && probeReady && tweezersReady && excavatorReady && spatulaReady,
				mirrorReady, probeReady, tweezersReady, excavatorReady, spatulaPluggerReady: spatulaReady,
			},
			aspirationSystem: {
				isCompleted: salivaConnected && hveConnected && filterChecked,
				salivaEjectorConnected: salivaConnected, hveVacuumConnected: hveConnected, bacterialFilterChecked: filterChecked,
			},
			isolationCofferdam: {
				isCompleted: rubberDamReady && clampsReady && forcepsReady,
				rubberDamSheetReady: rubberDamReady, clampsReady, forcepsReady, isNotRequiredForProfile: !requiresCofferdam,
			},
		});
	}, [
		selectedProfile, disinfectionCompleted, disinfectantBrand, exposureMinutes,
		turbineSterile, contraAngleSterile, micromotorSterile, class5Verified, packageIntegrityVerified,
		mirrorReady, probeReady, tweezersReady, excavatorReady, spatulaReady,
		salivaConnected, hveConnected, filterChecked, rubberDamReady, clampsReady, forcepsReady, requiresCofferdam,
	]);

	const fillAllReady = (minExposure: number) => {
		setDisinfectionCompleted(true);
		setExposureMinutes(minExposure);
		setTurbineSterile(true); setContraAngleSterile(true); setMicromotorSterile(true);
		setClass5Verified(true); setPackageIntegrityVerified(true);
		setMirrorReady(true); setProbeReady(true); setTweezersReady(true);
		setExcavatorReady(true); setSpatulaReady(true);
		setSalivaConnected(true); setHveConnected(true); setFilterChecked(true);
		setRubberDamReady(true); setClampsReady(true); setForcepsReady(true);
		showToast("Все пункты чек-листа отмечены как проверенные и готовые", "info");
	};

	return {
		disinfectionCompleted, setDisinfectionCompleted, disinfectantBrand, setDisinfectantBrand, exposureMinutes, setExposureMinutes,
		turbineSterile, setTurbineSterile, contraAngleSterile, setContraAngleSterile, micromotorSterile, setMicromotorSterile,
		class5Verified, setClass5Verified, packageIntegrityVerified, setPackageIntegrityVerified,
		mirrorReady, setMirrorReady, probeReady, setProbeReady, tweezersReady, setTweezersReady,
		excavatorReady, setExcavatorReady, spatulaReady, setSpatulaReady,
		salivaConnected, setSalivaConnected, hveConnected, setHveConnected, filterChecked, setFilterChecked,
		rubberDamReady, setRubberDamReady, clampsReady, setClampsReady, forcepsReady, setForcepsReady,
		evaluation, fillAllReady,
	};
}
