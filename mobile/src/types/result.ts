export type Result<TOk, TError> =
  | { ok: true; value: TOk }
  | { ok: false; error: TError };

export function okResult<TOk>(value: TOk): Result<TOk, never> {
  return { ok: true, value };
}

export function errResult<TError>(error: TError): Result<never, TError> {
  return { ok: false, error };
}
