import {
  ctImplantLibrary,
  type CtImplantLibraryItem,
} from "./ctPlanningCatalog";

export type CtPlanningImplantLibraryPanelProps = {
  effectiveSelectedImplantId: string;
  setLocalSelectedImplantId: (id: string) => void;
  onSelectImplant?: ((implant: CtImplantLibraryItem) => void) | undefined;
};

export function CtPlanningImplantLibraryPanel({
  effectiveSelectedImplantId,
  setLocalSelectedImplantId,
  onSelectImplant,
}: CtPlanningImplantLibraryPanelProps) {
  return (
    <div
      className="ct-implant-library-strip"
      data-testid="ct-implant-library-strip"
      aria-label="Библиотека имплантов для КТ-планирования"
    >
      <div className="ct-implant-library-head">
        <strong>Библиотека имплантов</strong>
        <span>
          Универсальные типоразмеры; брендовые каталоги подключаются отдельно.
        </span>
      </div>
      <div className="ct-implant-library-grid">
        {ctImplantLibrary.map((implant) => (
          <button
            className={`ct-implant-library-card ${effectiveSelectedImplantId === implant.id ? "selected" : ""}`}
            key={implant.id}
            type="button"
            onClick={() => {
              setLocalSelectedImplantId(implant.id);
              onSelectImplant?.(implant);
            }}
            aria-pressed={effectiveSelectedImplantId === implant.id}
            aria-label={`Выбрать имплант ${implant.diameterMm} на ${implant.lengthMm} мм: ${implant.indication}`}
          >
            <span>{implant.system}</span>
            <strong>
              {implant.diameterMm} x {implant.lengthMm} мм
            </strong>
            <p>
              {implant.line} · {implant.platform}
            </p>
            <small>{implant.indication}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
