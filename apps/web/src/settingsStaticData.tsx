import { Layers3, ScanSearch, SlidersHorizontal, type LucideIcon } from "lucide-react";
import type { AiJobKind, AiRecognitionTarget, ImagingSourceKind } from "@dental/shared";

export type RecognitionPreset = {
  key: string;
  title: string;
  detail: string;
  kind: AiJobKind;
  target: AiRecognitionTarget;
  text: string;
};

export type ImagingConnectorCard = {
  title: string;
  detail: string;
  source: ImagingSourceKind;
};

export type ImagingViewerCapability = {
  title: string;
  detail: string;
  state: string;
  icon: LucideIcon;
};

export const recognitionPresets: RecognitionPreset[] = [
  {
    key: "voice",
    title: "Диктовка врача",
    detail: "Голос превращается в черновик ЭМК, не в подписанный диагноз.",
    kind: "voice_transcription",
    target: "visit_note",
    text: "Пациент жалуется на боль при накусывании в области 36. Объективно кариозная полость, реакция на холод кратковременная. План лечение под анестезией."
  },
  {
    key: "paper",
    title: "Фото журнала",
    detail: "OCR дает строки для предпросмотра, дубли и предупреждения.",
    kind: "paper_ocr",
    target: "patient_import",
    text: "Иванова Марина Сергеевна +7 927 111-22-33 прием 12.05 лечение 36\nНовый Пациент +7 927 333-44-55 первичная консультация"
  },
  {
    key: "image",
    title: "Снимок / КТ",
    detail: "ИИ-описание остается черновиком до проверки врача.",
    kind: "image_summary",
    target: "imaging_summary",
    text: "ОПТГ от 10.05.2026, область обеих челюстей, проверить 36 и 46, ретинированные 8 зубы."
  }
];

export const imagingConnectorCards: ImagingConnectorCard[] = [
  {
    title: "Радиовизиограф / датчик",
    detail: "Локальный модуль забирает снимок из RVG, EzSensor, Carestream, Vatech и похожих систем.",
    source: "sensor_bridge"
  },
  {
    title: "ОПТГ, ТРГ и КТ",
    detail: "Файлы КТ/IMA, серии КЛКТ, панорамные и цефалометрические снимки; полноценный КТ-просмотрщик идет отдельным модулем.",
    source: "dicom_file"
  },
  {
    title: "Архив снимков клиники",
    detail: "Подключение к серверу снимков клиники без ручного копирования файлов.",
    source: "pacs"
  },
  {
    title: "Папка обмена",
    detail: "Папка для софта, который умеет только выгружать JPG/PNG/TIFF/BMP/WebP/КТ в папку.",
    source: "folder_watch"
  }
];

export const imagingViewerCapabilities: ImagingViewerCapability[] = [
  {
    title: "2D RVG / OPG / ТРГ",
    detail: "Поворот, зеркало, инверсия, яркость, контраст и масштаб прямо в рабочей смене.",
    state: "готово",
    icon: SlidersHorizontal
  },
  {
    title: "Импорт КТ/снимков",
    detail: "Пути .dcm/.ima и экспорты JPG/PNG/TIFF/BMP/WebP проходят предпросмотр до записи в карту.",
    state: "предпросмотр",
    icon: ScanSearch
  },
  {
    title: "КЛКТ / КТ серии",
    detail: "Нужен отдельный просмотрщик: серии КЛКТ/КТ, срезы, архив снимков и предварительная подготовка.",
    state: "следующий модуль",
    icon: Layers3
  }
];
