import React from "react";
import { ImplantPassportModal, type ImplantPassportModalProps } from "./ImplantPassportModal";

export type ImplantSurgeryProtocolModalProps = ImplantPassportModalProps;

/**
 * ImplantSurgeryProtocolModal — Каноническое хирургическое модальное окно протокола имплантации (DENTE CRM).
 * Обеспечивает полную автономию врача у кресла (Мандат 8e), мягкий складской овердрафт (Мандат 8n),
 * 1-клик протоколы (стандартный, немедленная нагрузка, двухэтапный, НКР) и печать паспорта пациента.
 */
export const ImplantSurgeryProtocolModal: React.FC<ImplantSurgeryProtocolModalProps> = (props) => {
	return <ImplantPassportModal {...props} />;
};

export default ImplantSurgeryProtocolModal;
