// ======= SERVIDOR: MIDDLEWARES Y RESOLVERS =======
// Este archivo mantiene compatibilidad con el runtime
// Los middlewares están disponibles desde middlewares/index.js
// Aseguramos la auto-registración de los middlewares al importar este
// archivo, incluso cuando Nuxt resuelva a la versión `.server` y haga
// tree-shaking de los re-exports.
import "./middlewares/index.js";

import type { H3Event } from "h3";

// Resolver demo por defecto
export const defaultReturn = ({ payload, state }: { event: H3Event; op: string; model: string; state: Record<string, any>; payload?: any }) =>
	payload ?? state.data ?? state.savedData ?? state.validatedData ?? { ok: true };

// Re-exportar solo los helpers específicos de servidor e híbridos
export {
        isAuth,
        dbConnect,
        transaction,
        timed,
        sessionHasProperty,
        mongoQuery,
        mongoSave,
        mongoUpdate,
        mongoDelete,
        mongoSaveOrUpdate,
        mongoInfo,
        // Middlewares híbridos
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
        rateLimit,
        debug,
        // Middlewares de cliente (para composición híbrida)
        addToPlural,
        saveOnStore,
        getFromPluralFiltered,
        cache,
} from "./middlewares/index.js";
