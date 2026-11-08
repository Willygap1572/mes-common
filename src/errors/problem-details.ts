/**
 * Error body returned by every MES REST API, following RFC 9457
 * (Problem Details for HTTP APIs), content type `application/problem+json`.
 */
export interface ProblemDetails {
  /** URI identifying the problem type, e.g. `urn:mes:linecontrol:part-not-ok`. */
  type: string;
  title: string;
  status: number;
  detail?: string;
  /** Request path or id of the affected resource. */
  instance?: string;
  /** Module that produced the error. */
  module?: string;
  [extension: string]: unknown;
}

export const PROBLEM_CONTENT_TYPE = 'application/problem+json';

export function problem(
  module: string,
  code: string,
  status: number,
  title: string,
  detail?: string,
): ProblemDetails {
  return { type: `urn:mes:${module}:${code}`, title, status, detail, module };
}
