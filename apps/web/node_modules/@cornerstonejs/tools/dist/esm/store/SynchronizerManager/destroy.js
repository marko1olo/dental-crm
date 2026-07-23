import { state } from '../state';
function destroy() {
    while (state.synchronizers.length > 0) {
        const synchronizer = state.synchronizers.pop();
        synchronizer.destroy();
    }
}
export default destroy;
