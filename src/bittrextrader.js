'use strict';

/// PACKAGES:
const {BittrexClient} = require('bittrex-rest-client')
const {ApiHelper} = require('../src')
require('dotenv').config()

class BittrexTrader {
  constructor(buyThreshold=0.618,sellThreshold=-0.382,longBias=1.382) {
    this.client = new BittrexClient({
    apiKey: process.env.KEY,
    apiSecret: process.env.SECRET,
    timeout: 3000}),

    this.apihelper = new ApiHelper(),

    /// GLOBAL VARIABLES:
    this.WDB = [],
    this.index = [],
    this.buyThreshold = buyThreshold,
    this.sellThreshold = sellThreshold,
    this.longBias = longBias
  }



async sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}



  async vwap(price1,price2,price3,volume1,volume2,volume3,totalvol){
    const comp1 = price1 * (volume1/totalvol)
    const comp2 = price2 * (volume2/totalvol)
    const comp3 = price3 * (volume3/totalvol)
    const vWAP = comp1 + comp2 + comp3
    return vWAP
  }

  async volumeWeightedMovingAverage(data,period){
    const inputData = data.slice(0,period)
    let vprice = 0
    let totalvol = 0
    for (let i in inputData){
      vprice = vprice + (((inputData[i].high + inputData[i].low + inputData[i].close) / 3) * inputData[i].volume)
      totalvol = totalvol + inputData[i].volume
    }
    return vprice / totalvol
  }

  async weightedDirectionalBias(data,offset){
    const inputData = Array.from(data).slice(0,-1)
    for (let i=0;i<offset;i++){
      inputData.shift()

    }
    const price = await this.volumeWeightedMovingAverage(inputData, 1)
    const vwma3 = await this.volumeWeightedMovingAverage(inputData, 3)
    const vwma9 = await this.volumeWeightedMovingAverage(inputData, 9)
    const vwma27 = await this.volumeWeightedMovingAverage(inputData, 27)
    const vwma81 = await this.volumeWeightedMovingAverage(inputData, 81)
    const vwma243 = await this.volumeWeightedMovingAverage(inputData, inputData.length)
    const macd = ((vwma3-vwma9)+(vwma9-vwma27)+(vwma27-vwma81)+(vwma81-vwma243))
    return (price / (price - macd)) - 1
  }

  async trendStrength(){
    let strength = 0
    for (let i=0;i<this.WDB.length-1;i++){
      if (this.WDB[i] > this.WDB[i+1]) strength++
      else if (this.WDB[i] < this.WDB[i+1]) strength--
    }
    return strength
  }

  async getMinTrade(balance,dir){
    const bal = balance
    const marketData = await this.client.markets()
    const direction = dir
    let minTrade = 0
    let qty = 0
    for (let i in marketData){
      if (marketData[i].sumbol === 'BTC-USD') minTrade = marketData[i].minTradeSize
    }
    if (minTrade / bal > 0.02) qty = bal * 0.02
    else qty = minTrade
    if (direction === 'BUY') qty = qty * longBias
    return qty
  }

  async trade(dir,wdb,currentPrice){
    const direction = dir
    const wtddb = await Math.abs(wdb)
    const price = currentPrice
    let multiplier = 0
    let currency = ''
    if (direction === 'BUY'){
      multiplier = buyThreshold
      currency = 'USD'
    }
    else if (direction === 'SELL'){
      multiplier = sellThreshold
      currency = 'BTC'
    }
    const balance = await this.client.balances(currency)
    const minTrade = await this.getMinTrade(balance,direction)
    const qty = minTrade * (wtddb / multiplier)
    if (qty < balance){
      const cancelOrders = await this.client.cancelOrder('open','BTC-USD')
      const sendOrder = await this.client.sendOrder('BTC-USD', direction, 'LIMIT',{quantity:qty,limit:price})
    }
  }

  async compileIndex(){
    const coinbase = await this.apihelper.fetchCoinbase()
    const bitfinex = await this.apihelper.fetchBitfinex()
    const bitstamp = await this.apihelper.fetchBitstamp()
    for (let i=0;i<243;i++){
      const hlcv = {
        high:0,
        low:0,
        close:0,
        volume:0
      }
      hlcv.volume = parseFloat(coinbase[i][3]) + parseFloat(bitfinex[i][3]) + parseFloat(bitstamp[i][3])
      hlcv.high = await this.vwap(
        parseFloat(coinbase[i][0]),
        parseFloat(bitfinex[i][0]),
        parseFloat(bitstamp[i][0]),
        parseFloat(coinbase[i][3]),
        parseFloat(bitfinex[i][3]),
        parseFloat(bitstamp[i][3]),
        hlcv.volume
        )
      hlcv.low = await this.vwap(coinbase[i][1],bitfinex[i][1],bitstamp[i][1],coinbase[i][3],bitfinex[i][3],bitstamp[i][3],hlcv.volume)
      hlcv.close = await this.vwap(coinbase[i][2],bitfinex[i][2],bitstamp[i][2],coinbase[i][3],bitfinex[i][3],bitstamp[i][3],hlcv.volume)
      this.index.push(hlcv)
    }
  }

  async fillWDB(period=10){
    this.WDB.slice(0,0)
    for (let i=0;i<period;i++){
      this.WDB.unshift(await this.weightedDirectionalBias(this.index, i))
    }
  }

  async calculateTrade(){
    const strength = await this.trendStrength()
    if (strength >=7 && this.WDB[0] < this.WDB[1] && this.WDB[1] < this.WDB[2]  && this.WDB[0] > buyThreshold) this.trade('BUY',this.WDB[0],this.index[0])
    else if (strength <= -7 && this.WDB[0] > this.WDB[1] && this.WDB[1] < this.WDB[2] && this.WDB[0] < sellThreshold) this.trade('SELL',this.WDB[0],this.index[0])
  }

  async run(){
    while (true){
      await this.compileIndex()
      await this.fillWDB()
      console.log(this.WDB)
      await this.calculateTrade()
      await this.sleep(1800000)
    }
  }
}

module.exports = BittrexTrader