import { clinicNotIdentifiedMessage } from "../../../utils/clinicSessionRefusal.js";

export const DIARY_CLINIC_UNKNOWN_READ_MESSAGE = clinicNotIdentifiedMessage(
	"дневник приёма не открыть",
);
export const DIARY_CLINIC_UNKNOWN_REVISIONS_MESSAGE = clinicNotIdentifiedMessage(
	"историю правок дневника не показать",
);
export const DIARY_CLINIC_UNKNOWN_SAVE_MESSAGE = clinicNotIdentifiedMessage(
	"дневник приёма не сохранить",
	"набранный текст остаётся на экране, не закрывайте приём",
);
export const DIARY_CLINIC_UNKNOWN_SIGN_MESSAGE = clinicNotIdentifiedMessage(
	"подписать дневник нельзя",
	"набранный текст остаётся на экране",
);
export const DIARY_CLINIC_UNKNOWN_REVISE_MESSAGE = clinicNotIdentifiedMessage(
	"исправить подписанный дневник нельзя",
);

export const DIARY_NOT_FOUND_REVISIONS_MESSAGE =
	"Дневник этого приёма не найден в этой клинике, поэтому истории правок у него нет. Так бывает, если страница приёма открыта давно и дневник с тех пор удалён или заведён заново. Откройте приём заново и посмотрите историю ещё раз.";
export const DIARY_NOT_FOUND_REVISE_MESSAGE =
	"Дневник этого приёма не найден в этой клинике, исправлять нечего. Так бывает, если страница приёма открыта давно и дневник с тех пор удалён или заведён заново. Откройте приём заново и повторите исправление.";

export const DIARY_ALREADY_LOCKED_CANONICAL_MESSAGE =
	"Дневник этого приёма уже подписан и заблокирован, второй раз подписывать его не нужно. Если нужна правка, внесите её через ревизию («Исправленному верить») — прежний текст надёжно сохранится в истории версий.";

export const DIARY_SIGNING_ROLE_MESSAGE =
	"Дневник приёма подписывает только врач или администратор клиники: у вашей смены такого права нет, и повторный вход его не добавит. Позовите врача, который вёл приём, — подписать может он.";
