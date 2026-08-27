/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SEMD 130: СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ ДЛЯ НАЛОГОВОГО ОРГАНА
 * (КНД 1151156 / ПРИКАЗ МИНЗДРАВА И ФНС РОССИИ / CDA R2)
 * Kopeck-exact financial arithmetic and fiscal verification.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import type { CdaSemd130Params } from "./types.js";
export declare function generateSemd130Xml(params: CdaSemd130Params): string;
