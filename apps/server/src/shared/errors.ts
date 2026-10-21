/** Errors the HTTP layer maps to status codes. */
export class NotFoundError extends Error {}
export class ForbiddenError extends Error {}
/** Bad input; `fields` maps a field name to what is wrong with it, for forms. */
export class InvalidInputError extends Error {
  constructor(
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}
