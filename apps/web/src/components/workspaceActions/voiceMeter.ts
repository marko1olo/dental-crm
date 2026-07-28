/**
 * Индикатор уровня записи для кнопки голоса.
 *
 * Раньше высота полосок считалась как `Math.max(10, Math.random() * glow)`:
 * на экране двигался генератор случайных чисел, а не измеренный уровень
 * сигнала. Это ровно тот выдуманный интерфейс, который запрещён §2, и хуже
 * того — он врал: полоски плясали даже при полной тишине, потому что
 * `Math.random()` не зависит от `volume`.
 *
 * Здесь высота — детерминированная функция реального уровня. Тишина видна как
 * тишина.
 *
 * Модуль переехал из `floatingCorner/voiceMeter.ts` вместе с владельцем группы
 * действий: сам плавающий угол удалён (обоснование —
 * `workspaceActionsPlacement.ts`), а индикатор уровня к геометрии угла никогда
 * отношения не имел и работает там, где живёт кнопка голоса.
 */

/** Количество полосок индикатора. */
export const VOICE_METER_BARS = 12;

/** Доля высоты, видимая при нулевом уровне: полоска остаётся полоской. */
export const VOICE_METER_FLOOR_SHARE = 0.12;

/** Во сколько раз крайняя полоска ниже центральной при том же уровне. */
export const VOICE_METER_EDGE_SHARE = 0.45;

/** Верхняя граница шкалы `volume` из Web Audio (байт на отсчёт). */
export const VOICE_METER_VOLUME_MAX = 255;

/**
 * Высоты полосок в процентах, слева направо. Профиль симметричный: центр
 * реагирует на уровень полностью, края — приглушённо, поэтому по силуэту видно
 * громкость, а не случайный шум.
 */
export function voiceMeterHeights(
	volume: number,
	barCount: number = VOICE_METER_BARS,
): number[] {
	const bars = Math.max(1, Math.trunc(barCount));
	const safeVolume = Number.isFinite(volume) ? volume : 0;
	const level =
		Math.min(VOICE_METER_VOLUME_MAX, Math.max(0, safeVolume)) /
		VOICE_METER_VOLUME_MAX;
	const center = (bars - 1) / 2;
	const heights: number[] = [];
	for (let index = 0; index < bars; index += 1) {
		const distance = center === 0 ? 0 : Math.abs(index - center) / center;
		const weight =
			VOICE_METER_EDGE_SHARE + (1 - VOICE_METER_EDGE_SHARE) * (1 - distance);
		const share =
			VOICE_METER_FLOOR_SHARE +
			(1 - VOICE_METER_FLOOR_SHARE) * level * weight;
		heights.push(Math.round(share * 1000) / 10);
	}
	return heights;
}

/**
 * Радиус свечения кнопки голоса в пикселях. Единственная динамическая величина
 * оформления: цвет берётся из токена темы, а радиус растёт от измеренного
 * уровня. Вынесен сюда из JSX, чтобы арифметику можно было проверить тестом.
 */
export const VOICE_GLOW_MIN_PX = 20;
export const VOICE_GLOW_MAX_PX = 100;

export function voiceGlowRadiusPx(volume: number): number {
	const safeVolume = Number.isFinite(volume) ? volume : 0;
	const level =
		Math.min(VOICE_METER_VOLUME_MAX, Math.max(0, safeVolume)) /
		VOICE_METER_VOLUME_MAX;
	return Math.round(
		Math.min(
			VOICE_GLOW_MAX_PX,
			Math.max(VOICE_GLOW_MIN_PX, level * VOICE_GLOW_MAX_PX),
		),
	);
}
