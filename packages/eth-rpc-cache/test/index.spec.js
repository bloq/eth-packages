import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinon from 'sinon'

chai.use(chaiAsPromised).should()

import { errors } from '../error'
import { createEthRpcCache } from '../index'

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
    const testMethod = 'eth_chainId'
    const testParams = []
    const testResult = '0x1'
    const mockRpc = function (method, params) {
      method.should.equal(testMethod)
      params.should.deep.equal(testParams)
      return getJsonResponse(testResult)
    }
    const spied = sinon.spy(mockRpc)
    const testStrategy = {
      getRpc(rpc) {
        rpc.should.equal(mockRpc)
        return spied
      },
      methods: [testMethod],
      name: 'test-strategy'
    }

    const ethRpc = createEthRpcCache(mockRpc, { strategies: [testStrategy] })
    const response = await ethRpc(testMethod, testParams)

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
