import { type Strategy } from '../types'

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

export const permanentStrategy: Strategy = {
  maxAge: Infinity,
  methods,
  name: 'permanent'
}
