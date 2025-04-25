import debugConstructor from 'debug'
import pMemoize from 'promise-mem'

import { errors } from './error'
import { perBlockStrategy } from './strategies/per-block'
import { permanentStrategy } from './strategies/permanent'
import { type JsonRpcCallFn, type Strategy } from './types'
import { getKey } from './utils/cache-key'
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

  // Each strategy resolves to a cache if it has a maxAge defined.
  // Index all caches into the object by strategy name
  const cachesByStrategy = strategies
    .filter(({ maxAge }) => maxAge !== undefined)
    .map(({ maxAge, name }) => ({
      [name]: pMemoize(rpc, {
        cache,
        maxAge,
        resolver: getKey,
        ...options
      })
    }))
    .reduce((acc, curr) => ({ ...acc, ...curr }), {})

  // This object indexed by method holds a function that returns which strategy (and cache)
  // should be used. By default, each strategy resolves to use its own cache, but some strategies
  // may resolve to other strategies' caches, depending on the method
  const strategyResolver = strategies
    .flatMap(({ methods, name, resolver = () => name }) =>
      methods.map(method => ({
        [method]: resolver
      }))
    )
    .reduce((acc, curr) => ({ ...acc, ...curr }), {})

  // Return the cached `rpc` function.
  //
  // If an strategy defined an RPC function for the incoming method, use that.
  // Otherwise call the method directly if allowed or return proper errors.
  //
  // To prevent user code to mutate the cached results, the cached RPC functions
  // will always return a clone of the result and not the result object itself.
  return function (method, params) {
    try {
      const strategyName = strategyResolver[method]?.(method, params)
      if (strategyName) {
        return cachesByStrategy[strategyName](method, params).then(clone)
      }
      if (allowOthers) {
        // not configured to be cached, call the method directly
        return rpc(method, params)
      }
      return Promise.reject(errors.methodNotFound())
    } catch (err) {
      // @ts-expect-error error is typed as unknown by default
      return Promise.reject(errors.internalServerError(err))
    }
  }
}
