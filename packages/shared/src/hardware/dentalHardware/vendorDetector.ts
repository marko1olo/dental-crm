/**
 * @dental/shared/hardware - Layer 1: Hardware Vendor Detection from Paths and File Names.
 *
 * Compliance: THE HAMMER, Mandates 2 (Zero Mocks), 8e (Doctor Autonomy), 8s (Anti-bloat), 8n (Solo Doctor Sovereignty).
 */

import type { DentalHardwareVendor } from "./types.js";

/**
 * Detects dental hardware vendor from full file path, folder path, or file name.
 */
export function detectHardwareVendorFromPath(targetPath: string): DentalHardwareVendor {
	if (!targetPath || typeof targetPath !== "string") {
		return "generic";
	}

	const normalized = targetPath.toLowerCase().replace(/\\/g, "/");

	// 1. Vatech (EzDent-i / EasyDent / EzSensor / PaX / Green)
	if (
		normalized.includes("ezdent") ||
		normalized.includes("easydent") ||
		normalized.includes("ezsensor") ||
		normalized.includes("vatech") ||
		normalized.includes("ez3d") ||
		normalized.includes("green16") ||
		normalized.includes("pax-i") ||
		normalized.includes(".vth") ||
		normalized.includes(".ezd")
	) {
		return "vatech";
	}

	// 2. Sirona (Sidexis / Orthophos / Galileos / XIOS)
	if (
		normalized.includes("sidexis") ||
		normalized.includes("sirona") ||
		normalized.includes("pdata") ||
		normalized.includes("slida") ||
		normalized.includes("orthophos") ||
		normalized.includes("galileos") ||
		normalized.includes("xios")
	) {
		return "sirona";
	}

	// 3. Planmeca (Romexis / ProSensor / ProMax / Dimaxis)
	if (
		normalized.includes("romexis") ||
		normalized.includes("planmeca") ||
		normalized.includes("prosensor") ||
		normalized.includes("promax") ||
		normalized.includes("dimaxis")
	) {
		return "planmeca";
	}

	// 4. Carestream / Trophy / Kodak (CS Imaging / RVG / CS 8100 / CS 9600 / CS 3600)
	if (
		normalized.includes("trophy") ||
		normalized.includes("carestream") ||
		normalized.includes("csimaging") ||
		normalized.includes("kodak") ||
		normalized.includes("rvg") ||
		normalized.includes("cs8100") ||
		normalized.includes("cs9600") ||
		normalized.includes("cs3600") ||
		normalized.includes("cs3700") ||
		normalized.includes("cs3800")
	) {
		return "carestream";
	}

	// 5. KaVo / Gendex / Instrumentarium / Soredex (VixWin / CliniView / OP300 / OP3D / Digora)
	if (
		normalized.includes("vixwin") ||
		normalized.includes("gendex") ||
		normalized.includes("cliniview") ||
		normalized.includes("digora") ||
		normalized.includes("instrumentarium") ||
		normalized.includes("soredex") ||
		normalized.includes("op300") ||
		normalized.includes("op3d") ||
		normalized.includes("kavo") ||
		normalized.includes("ondemand3d")
	) {
		return "kavo";
	}

	// 6. Woodpecker (i-Sensor H1/H2)
	if (
		normalized.includes("woodpecker") ||
		normalized.includes("isensor") ||
		normalized.includes("i-sensor")
	) {
		return "woodpecker";
	}

	// 7. Eighteeth (NanoPix 1/2)
	if (
		normalized.includes("eighteeth") ||
		normalized.includes("nanopix")
	) {
		return "eighteeth";
	}

	// 8. Owandy (QuickVision / Owandy-One)
	if (
		normalized.includes("owandy") ||
		normalized.includes("quickvision")
	) {
		return "owandy";
	}

	// 9. Xpect Vision (XVSensor CdTe direct photon counting)
	if (
		normalized.includes("xvsensor") ||
		normalized.includes("xpect") ||
		normalized.includes("mammo") ||
		normalized.includes("zraw")
	) {
		return "xpect_vision";
	}

	// 10. Handy (HandyDentist / HDR-500/600)
	if (
		normalized.includes("handydentist") ||
		normalized.includes("hdr-500") ||
		normalized.includes("hdr-600") ||
		normalized.includes("handy")
	) {
		return "handy";
	}

	// 11. Trident (I-View / Deep View)
	if (
		normalized.includes("trident") ||
		normalized.includes("iview") ||
		normalized.includes("i-view") ||
		normalized.includes("deepview")
	) {
		return "trident";
	}

	// 12. NewTom / MyRay (NNT / iRYS)
	if (
		normalized.includes("newtom") ||
		normalized.includes("myray") ||
		normalized.includes("nnt") ||
		normalized.includes("irys") ||
		normalized.includes("giano")
	) {
		return "newtom";
	}

	// 13. Morita (i-Dixel / Veraviewepocs / X800)
	if (
		normalized.includes("morita") ||
		normalized.includes("idixel") ||
		normalized.includes("i-dixel") ||
		normalized.includes("veraview") ||
		normalized.includes("x800")
	) {
		return "morita";
	}

	// 14. PointNix (Point 3D Combi / RealScan)
	if (
		normalized.includes("pointnix") ||
		normalized.includes("point3d") ||
		normalized.includes("realscan")
	) {
		return "pointnix";
	}

	// 15. Genoray (Papaya 3D / Triana)
	if (
		normalized.includes("genoray") ||
		normalized.includes("papaya") ||
		normalized.includes("triana") ||
		normalized.includes("smiledesigner")
	) {
		return "genoray";
	}

	// 16. Medit (Medit Link / i500 / i700 / i900)
	if (
		normalized.includes("meditlink") ||
		normalized.includes("medit")
	) {
		return "medit";
	}

	// 17. 3Shape (TRIOS / Dental Desktop)
	if (
		normalized.includes("3shape") ||
		normalized.includes("threeshape") ||
		normalized.includes("trios") ||
		normalized.includes("dentaldesktop")
	) {
		return "threeshape";
	}

	// 18. Shining 3D (Aoralscan)
	if (
		normalized.includes("shining3d") ||
		normalized.includes("shining") ||
		normalized.includes("aoralscan")
	) {
		return "shining3d";
	}

	// 19. Panda Scanner (BAMBOO)
	if (
		normalized.includes("pandascan") ||
		normalized.includes("panda") ||
		normalized.includes("bamboo")
	) {
		return "panda";
	}

	// 20. Alliedstar (AS 100/200)
	if (
		normalized.includes("alliedstar") ||
		normalized.includes("as100") ||
		normalized.includes("as200")
	) {
		return "alliedstar";
	}

	// 21. Runyes 3D Intraoral Scanner
	if (
		normalized.includes("runyes") ||
		normalized.includes("quickscan")
	) {
		return "runyes";
	}

	// 22. Kyocera Network Scanner
	if (
		normalized.includes("kyocera") ||
		normalized.includes("taskalfa") ||
		normalized.includes("ecosys")
	) {
		return "kyocera";
	}

	// 23. HP LaserJet / ScanJet
	if (
		normalized.includes("scanjet") ||
		normalized.includes("hp_scan") ||
		normalized.includes("laserjet")
	) {
		return "hp";
	}

	// 24. Canon MFP / Document Scanner
	if (
		normalized.includes("canoscan") ||
		normalized.includes("imagerunner") ||
		normalized.includes("imageformula")
	) {
		return "canon_scanner";
	}

	// 25. Xerox MFP
	if (
		normalized.includes("xerox") ||
		normalized.includes("workcentre") ||
		normalized.includes("versalink") ||
		normalized.includes("altalink")
	) {
		return "xerox";
	}

	// 26. Brother Scanner
	if (
		normalized.includes("brother") ||
		normalized.includes("dcp-") ||
		normalized.includes("mfc-")
	) {
		return "brother";
	}

	// 27. Pantum Network Document Scanner
	if (
		normalized.includes("pantum") ||
		normalized.includes("ptm")
	) {
		return "pantum";
	}

	// 28. Fujitsu / Avision Scanner
	if (
		normalized.includes("fujitsu") ||
		normalized.includes("scansnap") ||
		normalized.includes("avision") ||
		normalized.includes("fi-7160") ||
		normalized.includes("fi-")
	) {
		return "fujitsu_avision";
	}

	// 29. Canon Photo DSLR
	if (
		normalized.includes("canon_eos") ||
		normalized.includes("eos_utility") ||
		normalized.includes("100canon")
	) {
		return "canon_photo";
	}

	// 30. Nikon Photo DSLR
	if (
		normalized.includes("nikon") ||
		normalized.includes("100nikon") ||
		normalized.includes("camera_control")
	) {
		return "nikon_photo";
	}

	// 31. Sony Alpha Photo
	if (
		normalized.includes("sony") ||
		normalized.includes("imaging_edge") ||
		normalized.includes("100msdcf")
	) {
		return "sony_photo";
	}

	return "generic";
}
