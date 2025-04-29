import { keccak256 } from 'viem'
import { describe, expect, it, vi } from 'vitest'

import { errors } from '../src/error'
import { createEthRpcCache } from '../src/index'
import { perBlockStrategy } from '../src/strategies/per-block'
import { permanentStrategy } from '../src/strategies/permanent'

const getJsonResponse = result =>
  Promise.resolve({
    id: 1,
    jsonrpc: '2.0',
    result
  })

describe('Ethereum RPC Cache', function () {
  it('should reject unsupported methods', async function () {
    const cachedRpc = createEthRpcCache(() => getJsonResponse('0x123'), {
      allowOthers: false
    })
    await expect(cachedRpc('unsupported', [])).rejects.toThrow(
      'Method not found'
    )
  })

  it('should reject if the RPC call fails', async function () {
    const mockRpc = function () {
      throw errors.internalServerError(new Error())
    }
    const ethRpc = createEthRpcCache(mockRpc)
    await expect(ethRpc('test', [])).rejects.toThrow('Internal error')
  })

  it('should execute any unknown method', async function () {
    const testMethod = 'join'
    const testParams = [1, 2]
    const mockRpc = function (method, params) {
      expect(method).toBe(testMethod)
      expect(params).toEqual(testParams)
      return getJsonResponse(testParams.join())
    }

    const ethRpc = createEthRpcCache(mockRpc)
    const response = await ethRpc(testMethod, testParams)

    expect(response).toEqual({
      id: 1,
      jsonrpc: '2.0',
      result: testParams.join()
    })
  })

  it('should call through a strategy', async function () {
    const testMethod = 'eth_call'
    const testParams = [
      {
        data: '0xa25ae55700000000000000000000000000000000000000000000000000000000000016ed',
        to: '0x'
      },
      'latest'
    ]
    const testResult = '0x1'
    const mockRpc = function (method, params) {
      expect(method).toBe(testMethod)
      expect(params).toEqual(testParams)
      return getJsonResponse(testResult)
    }
    const spied = vi.fn(mockRpc)

    const indexed = [
      { method: 'decimals()', policy: 'permanent' },
      { method: 'getL2Output(uint256)', policy: 'block' }
    ]
      .map(({ method, policy }) => ({
        [keccak256(method).slice(0, 10)]: policy
      }))
      .reduce((a, b) => ({ ...a, ...b }), {})

    const ethCallStrategy = {
      methods: [testMethod],
      name: 'eth-call-strategy',
      resolver(_, params) {
        const signature = params[0].data.slice(0, 10)
        return indexed[signature]
      }
    }

    const ethRpc = createEthRpcCache(spied, {
      strategies: [perBlockStrategy, permanentStrategy, ethCallStrategy]
    })
    const response = await ethRpc(testMethod, testParams)
    // call again to ensure the cached version was used
    await ethRpc(testMethod, testParams)

    expect(response).toEqual({
      id: 1,
      jsonrpc: '2.0',
      result: testResult
    })
    expect(spied.mock.calls.length).toBe(1)
  })

  it('should cache permanent methods', async function () {
    const chainId = '0x1'
    const rpc = vi.fn().mockResolvedValue(getJsonResponse(chainId))
    const ethRpc = createEthRpcCache(rpc)

    const chainIds = await Promise.all([
      ethRpc('eth_chainId', []),
      ethRpc('eth_chainId', [])
    ])

    chainIds.forEach(c => expect(c.result).toBe(chainId))
    expect(rpc.mock.calls.length).toBe(1)
  })

  it('should cache per-block methods', async function () {
    const clock = vi.useFakeTimers()
    const blockNumber = '0x12'
    const mockRpc = vi.fn().mockResolvedValue(getJsonResponse(blockNumber))
    const ethRpc = createEthRpcCache(mockRpc)

    const blockNumbers = await Promise.all([
      ethRpc('eth_blockNumber', []),
      ethRpc('eth_blockNumber', [])
    ])

    blockNumbers.forEach(({ result }) => expect(result).toBe(blockNumber))
    expect(mockRpc.mock.calls.length).toBe(1)
    clock.advanceTimersByTime(10000)
    const latestBlockNumber = await ethRpc('eth_blockNumber', [])

    expect(latestBlockNumber.result).toBe(blockNumber)
    expect(mockRpc.mock.calls.length).toBe(2)

    clock.useRealTimers()
  })
})
