# CLAUDE.md: mes-common

## Este módulo

**Common** (id `common`): Contratos compartidos del MES: referencias entre módulos, formato de error (RFC 9457) y SDK de plugins del `telegramprocessor`.

Responsabilidades:
- Tipos de referencia: `PlantNodeRef`, `CatalogRef`, `MaterialRef`, `PartRef`, `ModuleInfo`.
- Niveles de la jerarquía ISA-95 (`PLANT_LEVELS`).
- Formato de error común `ProblemDetails` (RFC 9457, `application/problem+json`).
- Contrato de plugins: `TelegramPlugin`, `TelegramAction`, `ActionStep`, `ActionContext` y helpers.
- Codificador binario de telegramas: `decodeTelegram`, `encodeTelegram`, `validateLayout`, `readTypeId`, `toHex` / `fromHex`.
- `PartRecord`: la pieza terminada que `parttracking` entrega a `parthistory`.

Fuera de alcance (no implementar aquí):
- Lógica de negocio: solo contratos y utilidades puras, sin dependencias de NestJS.

Dependencias: ninguna.

## Stack y comandos

TypeScript 6 (ESM), Vitest, oxlint, Prettier. Node ≥ 22, npm ≥ 11.

```bash
npm install
npm run lint && npm run build && npm test
npm run format
```

## Convenciones

- Solo tipos y funciones puras. Sin dependencias de runtime (ni NestJS ni Angular), para que la usen backend y hub.
- Todo lo público se exporta desde `src/index.ts`.
- Un cambio incompatible en un contrato obliga a subir versión mayor y a actualizar los módulos que lo usan.
- Imports relativos terminados en `.js`.

## Sistema MES: contexto común

Sistema MES open source y modular. Cada módulo es un repositorio independiente (`Willygap1572/mes-*-module`) con su API y su base de datos. El `hub` es el único frontend. Objetivo: llevar la producción de una fábrica según normas europeas (ISA-95 / IEC 62264, ISO 22400, IEC 62443, RGPD, NIS2, Pasaporte Digital de Producto).

Conceptos transversales:
- **Catálogo**: producto/variante que se fabrica, con identificador y versión (p. ej. batería de 32, 42 o 46 celdas). Une `bom`, `machineconfigurator`, `linecontrol` y `toolcontrol`.
- **Jerarquía de planta**: solo `factorystructure` la define; los demás guardan el id del nodo, nunca copian la estructura.
- **Pieza**: metadatos + resultados + materiales + *bloque de datos adicional* (datos de producción, solo mientras está en línea).
- **Telegrama**: mensaje PLC ↔ MES. `communicationadapter` → `telegramprocessor` (plugins) → módulos.

Puertos locales: hub 4200; factorystructure 3101, materialcontrol 3102, bom 3103, machineconfigurator 3104, toolcontrol 3105, linecontrol 3106, telegramprocessor 3107, telegramconfigurator 3108, communicationadapter 3109, reporting 3110, catalog 3111, productionorder 3112, parttracking 3113, parthistory 3114, machinestate 3115, shiftcalendar 3116, quality 3117, labeling 3118.

## Decisiones de arquitectura

- **Comunicación:** REST por defecto (`/api/v1/...`, OpenAPI en `/api/docs`). Cuando se necesite: SSE o WebSockets para tiempo real hacia el hub, webhooks para notificar cambios a otros módulos o sistemas externos, GraphQL para consultas agregadas (hub, reporting).
- **Base de datos:** PostgreSQL 17 (imagen con TimescaleDB), un esquema por módulo (nombre = id del módulo). Ningún módulo lee la BD de otro: solo vía API. `parthistory` usará TimescaleDB.
- **ORM:** Drizzle (`@nestjs/drizzle`). Tablas en `src/database/schema.ts` con `dbSchema.table(...)`; migraciones con `npm run db:generate`, que se aplican solas al arrancar. Sin `DATABASE_URL` se usa PGlite en memoria (desarrollo y tests).
- **Errores:** RFC 9457 `application/problem+json`, `type` = `urn:mes:<módulo>:<código>` (filtro global en `src/common/`).
- **Contratos compartidos:** `@mes/common` (repo `mes-common`), fijado a un commit concreto en `package.json`. Para actualizarlo: `npm install git+https://github.com/Willygap1572/mes-common.git#<sha>` (siempre con `git+https`: la forma corta `github:` deja una URL SSH en el lock y el CI no puede descargarla).
- **Entorno completo:** `mes-hub-module/deploy/docker-compose.yml`.
- **Autenticación:** OIDC/JWT con Keycloak autoalojado (realm `mes` en `mes-hub-module/deploy/keycloak/`). Roles `operator`, `engineer`, `admin` y `service` (módulo a módulo, *client credentials*). Cada módulo valida los tokens con `src/auth/` y registra quién cambió qué en `src/audit/`; no hay usuarios ni contraseñas en los módulos. Pasar a Microsoft Entra ID es configuración (`OIDC_ISSUER`, cliente del hub).
- **Licencia:** EUPL-1.2. Todo el código nuevo debe ser compatible.
