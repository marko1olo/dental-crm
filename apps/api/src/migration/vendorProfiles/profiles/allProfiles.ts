import type { VendorProfile } from "../types.js";
import { identProfile } from "./ident.js";
import { dentalproProfile } from "./dentalpro.js";
import { infodentProfile } from "./infodent.js";
import { onecMedicineProfile } from "./onec.js";
import { stomxProfile } from "./stomx.js";
import { opendentalProfile, dentrixProfile } from "./foreignVendors.js";

/**
 * Профили. Состав колонок собран по выгрузкам и документации соответствующих
 * систем; для самописных баз работает обобщённый российский профиль, он же
 * покрывает «сохранить как CSV» из русского Excel.
 */
export const VENDOR_PROFILES: VendorProfile[] = [
	identProfile,
	dentalproProfile,
	infodentProfile,
	onecMedicineProfile,
	stomxProfile,
	opendentalProfile,
	dentrixProfile,
];
