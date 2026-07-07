import { dashboardSchema } from '@dental/shared';
import { getDashboardFromDb } from './src/db/dashboardQuery.js';

getDashboardFromDb('x').then(d => {
  try {
    dashboardSchema.parse(d);
    console.log('OK');
  } catch (e) {
    console.error(JSON.stringify(e.errors, null, 2));
  }
});
