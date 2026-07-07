import { state } from '../state';
function destroyToolGroup(toolGroupId) {
    const toolGroupIndex = state.toolGroups.findIndex((tg) => tg.id === toolGroupId);
    if (toolGroupIndex > -1) {
        state.toolGroups.splice(toolGroupIndex, 1);
    }
}
export default destroyToolGroup;
