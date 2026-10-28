import React from "react";
import { CheckCircle2 } from "lucide-react";
import type { EstimateTierOption } from "../types";
import { formatMoney } from "../../useCopilotFormat";

export interface EstimateTierStagesListProps {
  activeTierObj: EstimateTierOption;
}

export const EstimateTierStagesList: React.FC<EstimateTierStagesListProps> = ({
  activeTierObj,
}) => {
  const stages =
    activeTierObj.stages && activeTierObj.stages.length > 0
      ? activeTierObj.stages
      : [
          {
            stageName: "Терапевтическая подготовка и препарирование",
            proceduresCount: 2,
            totalRub: Math.round((activeTierObj.totalRub || 0) * 0.3),
          },
          {
            stageName: "Оптические слепки / сканирование и лаборатория",
            proceduresCount: 1,
            totalRub: Math.round((activeTierObj.totalRub || 0) * 0.25),
          },
          {
            stageName:
              activeTierObj.tierKey === "economy"
                ? "Примерка и фиксация металлокерамики Co-Cr"
                : activeTierObj.tierKey === "optimum"
                  ? "Адгезивная фиксация керамической коронки e.max"
                  : "Прецизионная посадка коронки из диоксида циркония",
            proceduresCount: 1,
            totalRub: Math.round((activeTierObj.totalRub || 0) * 0.45),
          },
        ];

  return (
    <>
      <div className="copilot-et-stages-block">
        <div className="copilot-et-stages-header">
          <CheckCircle2 size={13} className="text-[var(--teal)]" />
          <span>Этапы плана лечения:</span>
        </div>
        <div className="copilot-et-stages-list">
          {stages.map((stage, idx) => (
            <div key={idx} className="copilot-et-stage-row">
              <div className="copilot-et-stage-info">
                <CheckCircle2
                  size={14}
                  className="text-[var(--teal)] flex-shrink-0"
                />
                <span className="copilot-et-stage-name">
                  {stage.stageName}
                  {stage.proceduresCount ? (
                    <span className="text-[var(--muted)] font-normal text-[11px] ml-1">
                      ({stage.proceduresCount} проц.)
                    </span>
                  ) : null}
                </span>
              </div>
              <span className="copilot-et-stage-price tabular-nums">
                {formatMoney(stage.totalRub)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {activeTierObj.keyAdvantages && activeTierObj.keyAdvantages.length > 0 && (
        <ul className="copilot-et-advantages-list">
          {activeTierObj.keyAdvantages.map((adv, i) => (
            <li key={i} className="copilot-et-adv-item">
              <CheckCircle2
                size={13}
                className="text-[var(--teal)] flex-shrink-0 mt-0.5"
              />
              <span>{adv}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
};
