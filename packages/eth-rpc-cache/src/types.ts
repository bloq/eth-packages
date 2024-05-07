type JsonRpcResult = {
  jsonrpc: string
  id: number
  result: string
}

export type JsonRpcCallFn = (
  method: string,
  params: unknown[]
) => Promise<JsonRpcResult>

export type Strategy = {
  getRpc: (
    rpc: JsonRpcCallFn,
    cache: Map<string, unknown>,
    options?: Record<string, unknown>
  ) => JsonRpcCallFn
  methods: string[]
  name: string
}
