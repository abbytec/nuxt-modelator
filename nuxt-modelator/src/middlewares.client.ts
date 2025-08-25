// ======= CLIENTE: MIDDLEWARES =======
// Este archivo mantiene compatibilidad con el runtime
// Los middlewares están disponibles desde middlewares/index.js

// Re-exportar solo los helpers específicos de cliente
export { saveOnStore, getFromPluralFiltered, addToPlural, cache, postRequest, logRequest } from "./middlewares/index.js";
