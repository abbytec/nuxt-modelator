// ======= CLIENTE: MIDDLEWARES =======
// Este archivo mantiene compatibilidad con el runtime
// Los middlewares están disponibles desde middlewares/index.js

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
} from "./middlewares/index.js";
