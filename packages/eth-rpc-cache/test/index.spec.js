import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinon from 'sinon'
import { keccak256 } from 'viem'

chai.use(chaiAsPromised).should()

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
  it('should reject unsupported methods', function () {
    const cachedRpc = createEthRpcCache(() => getJsonResponse('0x123'), {
      allowOthers: false
    })
    return cachedRpc('unsupported', []).should.be.rejectedWith(
      'Method not found'
    )
  })

  it('should reject if the RPC call fails', function () {
    const mockRpc = function () {
      throw errors.internalServerError(new Error())
    }
    const ethRpc = createEthRpcCache(mockRpc)
    return ethRpc('test', []).should.be.rejectedWith('Internal error')
  })

  it('should execute any unknown method', async function () {
    const testMethod = 'join'
    const testParams = [1, 2]
    const mockRpc = function (method, params) {
      method.should.equal(testMethod)
      params.should.deep.equal(testParams)
      return getJsonResponse(testParams.join())
    }

    const ethRpc = createEthRpcCache(mockRpc)
    const response = await ethRpc(testMethod, testParams)

    response.should.eql({
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
      method.should.equal(testMethod)
      params.should.deep.equal(testParams)
      return getJsonResponse(testResult)
    }
    const spied = sinon.spy(mockRpc)

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

    response.should.eql({
      id: 1,
      jsonrpc: '2.0',
      result: testResult
    })
    spied.calledOnce.should.be.true
  })

  it('should cache permanent methods', async function () {
    const chainId = '0x1'
    const rpc = sinon.fake.resolves(getJsonResponse(chainId))
    const ethRpc = createEthRpcCache(rpc)

    const chainIds = await Promise.all([
      ethRpc('eth_chainId', []),
      ethRpc('eth_chainId', [])
    ])

    chainIds.forEach(c => c.result.should.equal(chainId))
    rpc.calledOnce.should.be.true
  })

  it('should cache per-block methods', async function () {
    const clock = sinon.useFakeTimers()
    const blockNumber = '0x12'
    const mockRpc = sinon.fake.resolves(getJsonResponse(blockNumber))
    const ethRpc = createEthRpcCache(mockRpc)

    const blockNumbers = await Promise.all([
      ethRpc('eth_blockNumber', []),
      ethRpc('eth_blockNumber', [])
    ])

    blockNumbers.forEach(({ result }) => result.should.equal(blockNumber))
    mockRpc.calledOnce.should.be.true
    clock.tick(10000)
    const latestBlockNumber = await ethRpc('eth_blockNumber', [])

    latestBlockNumber.result.should.equal(blockNumber)
    mockRpc.calledTwice.should.be.true

    clock.restore()
  })
})
