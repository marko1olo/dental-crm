export type MischBoneClass = 'D1' | 'D2' | 'D3' | 'D4';

export interface BoneDensityAnalysis {
  corticalHu: number;
  cancellousHu: number;
  apicalHu: number;
  boneClass: MischBoneClass;
  protocolSteps: string[];
}

export function generateDrillSequence(
  corticalHu: number,
  cancellousHu: number,
  apicalHu: number,
  implantBrand: string,
  implantDiameter: number
): BoneDensityAnalysis {
  // Simple weighted average to determine overall class
  // Cortical is usually densest, Cancellous is spongier
  const avgHu = (corticalHu * 0.4) + (cancellousHu * 0.4) + (apicalHu * 0.2);
  
  let boneClass: MischBoneClass;
  if (avgHu > 1250) boneClass = 'D1';
  else if (avgHu > 850) boneClass = 'D2';
  else if (avgHu > 350) boneClass = 'D3';
  else boneClass = 'D4';

  const steps: string[] = [];
  steps.push('1. Начало: Сферическая фреза / Пилотное сверло (Pilot Drill)');

  if (boneClass === 'D1') {
    steps.push(`2. Расширение: Фрезы до ${implantDiameter} мм на НИЗКИХ оборотах с обильным охлаждением.`);
    steps.push('3. Кортикальный этап: Обязательное использование кортикальной фрезы (Cortical Tap) или метчика.');
    steps.push('4. Предупреждение: Высокий риск остеонекроза. Избегать чрезмерного торка (>50 Нсм).');
  } else if (boneClass === 'D2') {
    steps.push(`2. Расширение: Фрезы до ${implantDiameter} мм (стандартный протокол).`);
    steps.push('3. Кортикальный этап: Применение профильного сверла (Profile Drill) только в кортикальном слое.');
  } else if (boneClass === 'D3') {
    steps.push(`2. Расширение: Недопрепарирование. Финальная фреза ~${(implantDiameter - 0.5).toFixed(1)} мм.`);
    steps.push('3. Формирование ложа: Избегать использования метчиков.');
  } else {
    // D4
    steps.push(`2. Расширение: Глубокое недопрепарирование (Under-drilling). Финальная фреза ~${(implantDiameter - 1.0).toFixed(1)} мм.`);
    steps.push('3. Рекомендация: Использование остеотомов для уплотнения (конденсации) кости.');
    steps.push('4. Важно: Риск плохой первичной стабильности. Максимизация торка (Primary Stability).');
  }

  // Brand-specific tweaks
  if (implantBrand.toLowerCase().includes('osstem')) {
    steps.push(`5. Специфика Osstem: Использовать фрезу TSIII/TSIV в зависимости от кости.`);
  } else if (implantBrand.toLowerCase().includes('straumann')) {
    steps.push(`5. Специфика Straumann: Учитывать форму Bone Level / Tissue Level.`);
  }

  return {
    corticalHu,
    cancellousHu,
    apicalHu,
    boneClass,
    protocolSteps: steps
  };
}
