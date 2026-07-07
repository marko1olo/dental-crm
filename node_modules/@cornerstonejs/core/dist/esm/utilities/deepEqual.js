export function deepEqual(obj1, obj2) {
    if (obj1 === obj2) {
        return true;
    }
    if (obj1 == null || obj2 == null) {
        return false;
    }
    try {
        return JSON.stringify(obj1) === JSON.stringify(obj2);
    }
    catch (error) {
        console.debug('Error in JSON.stringify during deep comparison:', error);
        return obj1 === obj2;
    }
}
