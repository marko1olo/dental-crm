/**
 * apps/web/src/components/recalls/DirectRecallsLauncher.tsx
 *
 * Обратная совместимость для множественного имени лаунчера (SSOT).
 * Делегирует в канонический DirectRecallLauncher (Мандат 8b).
 */

import React from "react";
import { DirectRecallLauncher } from "./DirectRecallLauncher";

export { DirectRecallLauncher };
export const DirectRecallsLauncher: React.FC = () => {
	return <DirectRecallLauncher />;
};

export default DirectRecallsLauncher;
