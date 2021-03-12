const should = require('should');
const { ApiHelper } = require('../src');
require('dotenv').config();
const client = new ApiHelper();

describe('api-helper', () =>{
  it('should get an array of 243 30min candles from Bitfinex', async () =>{
    let candles = await client.fetchBitfinex()
    should.exist(candles)
    candles.length.should.be.equal(243)
  })


  it('should get an array of 243 30min candles from Bitstamp', async () =>{
    let candles = await client.fetchBitstamp()
    should.exist(candles)
    candles.length.should.be.equal(243)
  })

  it('should get an array of 243 30min candles from Coinbase', async () =>{
    let candles = await client.fetchCoinbase()
    should.exist(candles)
    candles.length.should.be.equal(243)
  })
})
