import { state } from '../state';
function getSynchronizer(synchronizerId) {
    return state.synchronizers.find((s) => s.id === synchronizerId);
}
export default getSynchronizer;
