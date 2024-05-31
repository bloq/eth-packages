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
  maxAge?: number
  methods: string[]
  name: string
  // For a given rpc call, return the strategy name which will be used to cache the result
  resolver?: (method: string, params: unknown[]) => string | undefined
}
