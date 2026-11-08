/**
 * Plugin contract of the telegram processor.
 *
 * A telegram definition (built in telegramconfigurator) is a sequence of
 * actions. Each action is provided by a plugin: `core` for simple data
 * handling, `maths` for simple arithmetic, and one plugin per MES module
 * (machineconfigurator, linecontrol, parttracking...) that calls that
 * module's REST API.
 *
 * Each MES module can ship its own plugin implementing this contract.
 */

/** Field values of the incoming telegram and of the response being built. */
export type FieldValues = Record<string, unknown>;

export interface ActionContext {
  /** Fields parsed from the incoming telegram (read only). */
  readonly request: Readonly<FieldValues>;
  /** Fields to send back to the PLC. Actions write here. */
  readonly response: FieldValues;
  /** Intermediate values shared between the actions of one telegram. */
  readonly variables: FieldValues;
  /** Where the telegram comes from; absent when testing from the hub. */
  readonly meta?: TelegramMeta;
}

export interface TelegramMeta {
  /** Machine (factorystructure node) that sent the telegram. */
  nodeId?: string;
  /** communicationadapter connection. */
  connectionId?: string;
}

export interface TelegramAction {
  /** Unique within the plugin, e.g. `add`. Referenced as `maths.add`. */
  readonly name: string;
  /** Short help shown in the hub, e.g. `target = a + b`. */
  readonly description?: string;
  execute(
    ctx: ActionContext,
    params: Readonly<Record<string, unknown>>,
  ): Promise<void> | void;
}

export interface TelegramPlugin {
  /** Plugin identifier, e.g. `core`, `maths`, `machineconfigurator`. */
  readonly name: string;
  readonly actions: readonly TelegramAction[];
}

/** One step of a telegram definition: `plugin.action` plus its parameters. */
export interface ActionStep {
  action: string;
  params?: Record<string, unknown>;
}

/** Resolves a value reference: `request.x`, `variables.y`, `response.z` or a literal. */
export function resolveValue(ctx: ActionContext, ref: unknown): unknown {
  if (typeof ref !== 'string') return ref;
  const [scope, ...rest] = ref.split('.');
  const key = rest.join('.');
  if (!key) return ref;
  switch (scope) {
    case 'request':
      return ctx.request[key];
    case 'variables':
      return ctx.variables[key];
    case 'response':
      return ctx.response[key];
    default:
      return ref;
  }
}

/** Writes a value to `response.x` or `variables.y`. */
export function writeValue(
  ctx: ActionContext,
  target: unknown,
  value: unknown,
): void {
  if (typeof target !== 'string') {
    throw new Error(`Invalid target: ${String(target)}`);
  }
  const [scope, ...rest] = target.split('.');
  const key = rest.join('.');
  if (scope === 'response' && key) ctx.response[key] = value;
  else if (scope === 'variables' && key) ctx.variables[key] = value;
  else throw new Error(`Invalid target: ${target}`);
}
