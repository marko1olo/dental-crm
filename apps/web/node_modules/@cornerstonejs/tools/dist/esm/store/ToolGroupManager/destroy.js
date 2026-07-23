import { state } from '../state';
import destroyToolGroup from './destroyToolGroup';
function destroy() {
    const toolGroups = [...state.toolGroups];
    for (const toolGroup of toolGroups) {
        destroyToolGroup(toolGroup.id);
    }
    state.toolGroups = [];
}
export default destroy;
