export class Calculator {
}
export class InstanceCalculator {
    constructor(options) {
        this.storePointData = options.storePointData;
    }
    getStatistics() {
        console.debug('InstanceCalculator getStatistics called');
    }
}
