# mes-common

**MES Common**: Contratos compartidos del MES: referencias entre módulos, formato de error (RFC 9457) y SDK de plugins del `telegramprocessor`.

Forma parte de un sistema **MES open source** modular para gestionar la producción de una fábrica siguiendo normas y estándares europeos (ISA-95 / IEC 62264, ISO 22400, IEC 62443…).

## Responsabilidades

- Tipos de referencia: `PlantNodeRef`, `CatalogRef`, `MaterialRef`, `PartRef`, `ModuleInfo`.
- Niveles de la jerarquía ISA-95 (`PLANT_LEVELS`).
- Formato de error común `ProblemDetails` (RFC 9457, `application/problem+json`).
- Contrato de plugins: `TelegramPlugin`, `TelegramAction`, `ActionContext` y helpers.

## Fuera de alcance

- Lógica de negocio: solo contratos y utilidades puras, sin dependencias de NestJS.

## Relaciones

- **Depende de:** ninguna
- **Lo usan:** todos los módulos

## Conceptos

- **Sin dependencias de runtime**: la librería solo exporta tipos y funciones puras.

## Uso

Librería TypeScript (ESM). Mientras no se publique en un registro npm, se instala desde GitHub:

```bash
npm install git+https://github.com/Willygap1572/mes-common.git
```

```ts
import { type CatalogRef, problem, type TelegramPlugin } from '@mes/common';
```

## Desarrollo

```bash
npm install
npm run lint && npm run build && npm test
npm run format
```

## Arquitectura del sistema

```
                ┌──────────────────────────────────────────────┐
                │ hub (Angular): frontend común de todo el MES │
                └──────────────────────┬───────────────────────┘
                                       │ REST (+ SSE / WebSocket / GraphQL)
 ┌──────────────┬──────────────┬───────┴──────┬──────────────┬──────────────┐
 factorystructure materialcontrol   bom   machineconfigurator toolcontrol  reporting
 catalog  productionorder  parttracking  parthistory  machinestate  quality ...
                                       ▲ REST, vía plugins
                    ┌──────────────────┴───────────────┐   ┌──────────────────────┐
                    │        telegramprocessor         │◄──│ telegramconfigurator │
                    │  plugins: core, maths, módulos   │   └──────────────────────┘
                    └──────────────────┬───────────────┘
                                       │ TCP/IP estándar
                    ┌──────────────────┴───────────────┐
                    │       communicationadapter       │ OPC UA, S7, Modbus, EtherCAT…
                    └──────────────────┬───────────────┘
                                       ▼
                                 PLCs / máquinas
```

| Módulo | Función | Puerto | Estado |
|---|---|---|---|
| [mes-hub-module](https://github.com/Willygap1572/mes-hub-module) | Frontend común (Angular): configuración y supervisión de todos los módulos | 4200 | creado |
| [mes-factorystructure-module](https://github.com/Willygap1572/mes-factorystructure-module) | Jerarquía de planta ISA-95, fuente única de verdad | 3101 | creado |
| [mes-materialcontrol-module](https://github.com/Willygap1572/mes-materialcontrol-module) | Maestro de materiales | 3102 | creado |
| [mes-bom-module](https://github.com/Willygap1572/mes-bom-module) | Estructura de producto: ensamblado N→1 y división 1→N | 3103 | creado |
| [mes-machineconfigurator-module](https://github.com/Willygap1572/mes-machineconfigurator-module) | Parámetros y utillajes de cada máquina por catálogo | 3104 | creado |
| [mes-toolcontrol-module](https://github.com/Willygap1572/mes-toolcontrol-module) | Control de utillajes | 3105 | creado |
| [mes-linecontrol-module](https://github.com/Willygap1572/mes-linecontrol-module) | Routelists, interbloqueo OK/NOK, retrabajo | 3106 | creado |
| [mes-telegramprocessor-module](https://github.com/Willygap1572/mes-telegramprocessor-module) | Motor de lógica de telegramas basado en plugins | 3107 | creado |
| [mes-telegramconfigurator-module](https://github.com/Willygap1572/mes-telegramconfigurator-module) | Define estructura y comportamiento de los telegramas | 3108 | creado |
| [mes-communicationadapter-module](https://github.com/Willygap1572/mes-communicationadapter-module) | Protocolos de campo → TCP/IP estándar | 3109 | creado |
| [mes-reporting-module](https://github.com/Willygap1572/mes-reporting-module) | Estado de producción, estadísticas, KPIs | 3110 | creado |
| [mes-catalog-module](https://github.com/Willygap1572/mes-catalog-module) | Catálogos (variantes de producto) y versiones | 3111 | creado |
| [mes-productionorder-module](https://github.com/Willygap1572/mes-productionorder-module) | Órdenes de producción y lanzamiento a línea | 3112 | creado |
| [mes-parttracking-module](https://github.com/Willygap1572/mes-parttracking-module) | Piezas en línea (BD de línea, efímera) | 3113 | creado |
| [mes-parthistory-module](https://github.com/Willygap1572/mes-parthistory-module) | Histórico de piezas y trazabilidad (20+ años) | 3114 | creado |
| [mes-machinestate-module](https://github.com/Willygap1572/mes-machinestate-module) | Estados de máquina, paradas y alarmas | 3115 | creado |
| [mes-shiftcalendar-module](https://github.com/Willygap1572/mes-shiftcalendar-module) | Turnos y calendario | 3116 | creado |
| [mes-quality-module](https://github.com/Willygap1572/mes-quality-module) | SPC, catálogo de defectos, retrabajo | 3117 | creado |
| [mes-labeling-module](https://github.com/Willygap1572/mes-labeling-module) | Serialización y etiquetas DataMatrix/GS1 | 3118 | creado |
| [mes-common](https://github.com/Willygap1572/mes-common) | Contratos compartidos y SDK de plugins | — | creado |

## Licencia

[EUPL-1.2](LICENSE)
