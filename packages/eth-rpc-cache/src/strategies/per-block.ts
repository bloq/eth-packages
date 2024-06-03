import { type Strategy } from '../types'

// These methods could be permanently cached if executed i.e. on an old block.
// For newer blocks, the results could change in the case of a [deep] reorg.
const mayBeSafeMethods = [
  'eth_call',
  'eth_getBalance',
  'eth_getBlockByNumber',
  'eth_getBlockTransactionCountByNumber',
  'eth_getCode',
  'eth_getLogs',
  'eth_getProof',
  'eth_getRawTransactionByBlockNumberAndIndex',
  'eth_getStorageAt',
  'eth_getTransactionByBlockNumberAndIndex',
  'eth_getTransactionCount',
  'eth_getTransactionReceipt',
  'eth_getUncleByBlockNumberAndIndex',
  'eth_getUncleCountByBlockNumber'
]

// These methods can be cached at most until a new block is mined.
const perBlockMethods = [
  'eth_blockNumber',
  'eth_feeHistory',
  'eth_getFilterChanges',
  'eth_getFilterLogs',
  'eth_getWork'
]

const methods = [...mayBeSafeMethods, ...perBlockMethods]

export const perBlockStrategy: Strategy = {
  maxAge: 6000, // Half block time: ~6 sec.
  methods,
  name: 'block'
}
