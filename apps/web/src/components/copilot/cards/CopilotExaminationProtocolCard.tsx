/**
 * CopilotExaminationProtocolCard.tsx — Медицинская карта приёма и протокол осмотра.
 *
 * Мандат 8ap: Полная очистка от сырых номеров советских приказов ('043/у').
 * Чистый семантический доменный язык врача и пациента: Медицинская карта приёма / Дневник визита.
 * Мандат 8e: Doctor Autonomy — возможность редактирования дневника перед внесением в 1 клик.
 * Мандат 8am: Ровно одна Primary CTA кнопка (акцентный teal #0d9488), сенсорный тач-таргет >= 44x44px.
 */

export {
  CopilotSoapDiaryCard,
  CopilotSoapDiaryCard as CopilotExaminationProtocolCard,
  CopilotSoapDiaryCard as CopilotMedicalCardProtocolCard,
  CopilotSoapDiaryCard as CopilotProtocol043ConfirmCard,
} from "./CopilotSoapDiaryCard";
