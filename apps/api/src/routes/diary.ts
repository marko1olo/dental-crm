/**
 * Facade for Diary Routes (Form 043/у, Signing Ceremonies, Revisions, Chief Physician Audits).
 * Decomposed into modular structure under ./diary/ following Mandate 8t & Decomposer protocol.
 *
 * Каноническое сообщение Мандата 8e при попытке повторного подписания:
 * Дневник этого приёма уже подписан и заблокирован, второй раз подписывать его не нужно. Если нужна правка, внесите её через ревизию («Исправленному верить») — прежний текст надёжно сохранится в истории версий.
 */

import { registerDiaryRoutes } from "./diary/index.js";

export { isDoctorOrClinicalSigner, registerDiaryRoutes } from "./diary/index.js";
export * from "./diary/index.js";

export default registerDiaryRoutes;
