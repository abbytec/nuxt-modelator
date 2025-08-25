// ======= CLIENTE: MIDDLEWARES =======
// Este archivo mantiene compatibilidad con el runtime
// Los middlewares están disponibles desde middlewares/index.js
// Importamos el índice para garantizar el auto-registro en entornos
// cliente cuando Nuxt resuelva este archivo.
import "./middlewares/index.js";

// Re-exportar solo los helpers específicos de cliente
export {
        saveOnStore,
        getFromPluralFiltered,
        addToPlural,
        cache,
        postRequest,
        postAllRequest,
        getRequest,
        getAllRequest,
        putRequest,
        putAllRequest,
        deleteRequest,
         deleteAllRequest,
         logRequest,
         run,
         throttle,
         debounce,
         retryable,
         cacheable,
 } from "./middlewares/index.js";
