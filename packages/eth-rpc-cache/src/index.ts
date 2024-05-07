import debugConstructor from 'debug'

import { errors } from './error'
import { perBlockStrategy } from './strategies/per-block'
import { permanentStrategy } from './strategies/permanent'
import { type JsonRpcCallFn, type Strategy } from './types'
import { clone } from './utils/clone'

const debug = debugConstructor('eth-rpc-cache')

type Options = {
  allowOthers?: boolean
  cache?: Map<string, unknown>
  strategies?: Strategy[]
}

export const createEthRpcCache = function (
  rpc: JsonRpcCallFn,
  options: Options = {}
): JsonRpcCallFn {
  debug('Creating EVM RPC cache')

  const {
    allowOthers = true,
    cache = new Map(),
    strategies = [perBlockStrategy, permanentStrategy]
  } = options

  const cachedRpcByMethod: Record<string, ReturnType<Strategy['getRpc']>> = {}
  strategies.forEach(function ({ getRpc, methods, name }) {
    debug('Using strategy "%s"', name)
    methods.forEach(function (method) {
      // @ts-expect-error allow for options that can be dynamically forwarded to the strategy
      cachedRpcByMethod[method] = getRpc(rpc, cache, options[name])
    })
  })

  // Return the cached `rpc` function.
  //
  // If an strategy defined an RPC function for the incoming method, use that.
  // Otherwise call the method directly if allowed or return proper errors.
  //
  // To prevent user code to mutate the cached results, the cached RPC functions
  // will always return a clone of the result and not the result object itself.
  return function (method, params) {
    const cachedRpc = cachedRpcByMethod[method]

    try {
      return cachedRpc
        ? cachedRpc(method, params).then(clone)
        : allowOthers
          ? rpc(method, params)
          : Promise.reject(errors.methodNotFound())
    } catch (err) {
      // @ts-expect-error error is typed as unknown by default
      return Promise.reject(errors.internalServerError(err))
    }
  }
}
