import { state } from '../state';
function getToolGroup(toolGroupId) {
    return state.toolGroups.find((s) => s.id === toolGroupId);
}
export default getToolGroup;
