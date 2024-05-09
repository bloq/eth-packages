# eth-rpc-cache

![NPM Version](https://img.shields.io/npm/v/eth-rpc-cache)

A simple cache for Ethereum RPC requests extensible with different caching strategies.

## Install

```sh
npm i eth-rpc-cache
```

## Usage

```ts
import { createEthRpcCache } from 'eth-rpc-cache'
import { providers } from 'ethers'

const provider = new providers.JsonRpcProvider('https://rpc.url.org')
const cache = new Map()
const cachedProvider = {
  ...provider,
  send: createEthRpcCache((method, params) => provider.send(method, params), {
    cache
  })
}
Object.setPrototypeOf(cachedProvider, Object.getPrototypeOf(cachedProvider))

// Will call the RPC endpoint and retrieve the chainId
await cachedProvider.send('eth_chainId', [])
// Will retrieve the value from the cache, and while the instance is alive, it will permanently be cached
await cachedProvider.send('eth_chainId', [])
// Will call the RPC endpoint and retrieve the current number
await cachedProvider.send('eth_blockNumber', [])
// This value will be cached for ~half block, so if requested again before that time passes, it will come from the cache
await cachedProvider.send('eth_blockNumber', [])
```

## API

### createEthRpcCache(rpc, options)

Returns a function

#### Parameters

##### rpc

Type: `Function`

A function that follows the [JSON-RPC specification](https://www.jsonrpc.org/specification). Its parameters are:

- `method` (string): The method to call
- `params` (Array): The parameters to pass to the method

and returns a Promise which resolves to an object with the following structure

- `jsonrpc` (string): Version of the protocol
- `id` (number): The request identifier
- `result` (any): The result of the request

##### options

Type: `object`  
Default: `{}`

An optional configuration object

###### options.allowOthers (optional)

Type: `boolean`  
Default: `true`

Whether the strategy should allow to run the RPC call to unknown methods. Throws if `false`

###### options.cache (optional)

Type: `object`  
Default: `new Map()`

The cache storage.
Must implement these methods: `has(key)`, `set(key, value)`, `get(key)` and `delete(key)`

###### options.strategy (optional)

Type: `object[]`
Default: `[perBlockStrategy, permanentStrategy]`

Array of strategies to use to cache methods. If methods are repeated, the latter will take precedence over the former.
