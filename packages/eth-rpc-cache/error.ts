export class JsonRpcError extends Error {
  constructor(
    message: string,
    public code: number
  ) {
    super(message)
    this.code = code

    // Set the prototype explicitly.
    // See https://github.com/microsoft/TypeScript-wiki/blob/81fe7b91664de43c02ea209492ec1cea7f3661d0/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, JsonRpcError.prototype)
  }
}

export const errors = {
  internalServerError: (err: Error) =>
    new JsonRpcError(err?.message || 'Internal error', -32603),
  methodNotFound: () => new JsonRpcError('Method not found', -32601)
}
