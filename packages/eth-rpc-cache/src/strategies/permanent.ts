import pMemoize from 'promise-mem'

import { type JsonRpcCallFn, type Strategy } from '../types'
import { getKey } from '../utils/cache-key'

const name = 'permanent'

// These methods can be safely cached once the result is obtained.
const methods = [
  'eth_chainId',
  'eth_getBlockByHash',
  'eth_getBlockTransactionCountByHash',
  'eth_getRawTransactionByBlockHashAndIndex',
  'eth_getRawTransactionByHash',
  'eth_getTransactionByBlockHashAndIndex',
  'eth_getTransactionByHash',
  'eth_getUncleByBlockHashAndIndex',
  'eth_getUncleCountByBlockHash',
  'net_version',
  'web3_sha3' // This one could be calculated here instead of calling the node.
]

const getRpc = (
  rpc: JsonRpcCallFn,
  cache: Map<string, unknown>,
  options = {}
) =>
  pMemoize(rpc, {
    cache,
    resolver: (method: string, params: unknown[]) => getKey(method, params),
    ...options
  })

export const permanentStrategy: Strategy = {
  getRpc,
  methods,
  name
}
