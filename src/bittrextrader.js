'use strict';

/// PACKAGES:
const {BittrexClient} = require('bittrex-rest-client')
const {ApiHelper} = require('../src')
const uuid = require('uuid-random')
require('dotenv').config()

/// CLASS
/**
 * @method BittrexTrader Automated trading strategy.
 * @param  {Number} buyThreshold=-0.025 - float. Should be positive.
 * @param  {Number} sellThreshold=0.05 - float. Should be negative.
 * @param  {Number} hodlRatio=1.5 - float. Should be positive.
 * @param  {Number} minTrendStrength=5 integer. Enum=[1,...8].
 * @param  {Number} tradeSize=0.02 float. Percentage expressed as float 0-1.
 * @returns {Object}
 */
class BittrexTrader {
  constructor(buyThreshold=-0.025,sellThreshold=0.05,hodlRatio=1.5,minTrendStrength=5,tradeSize=0.02,test=true) {
    this.client = new BittrexClient({
    apiKey: process.env.KEY,
    apiSecret: process.env.SECRET,
    timeout: 3000}),

    this.apihelper = new ApiHelper(),

    /// GLOBAL VARIABLES:
    this.WDB = [],
    this.index = [],
    this.tradeCooldown = 0,
    this.statusReportCounter = 0;
    this.buyThreshold = buyThreshold,
    this.sellThreshold = sellThreshold,
    this.hodlRatio = hodlRatio,
    this.minTrendStrength = minTrendStrength,
    this.tradeSize = tradeSize,
    this.test = test,
    this.positionRatio = 1,
    this.balanceBTC = 0,
    this.balanceUSD = 0,
    this.portfolioValue = 0,
    this.strength = 0,
    this.buyMultiplier = sellThreshold / Math.abs(buyThreshold)
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async getBalances(){
    let getBalanceBTC = {}
    let getBalanceUSD = {}
    while (!getBalanceUSD.available || !getBalanceBTC.available){
      try{
        getBalanceBTC = await this.client.balance('BTC')
        getBalanceUSD = await this.client.balance('USD')
      }
      catch(error){
        console.log(`${new Date().toISOString()} ${error}`)
      }
    }
    this.balanceBTC = parseFloat(getBalanceBTC.available)
    this.balanceUSD = parseFloat(getBalanceUSD.available)
    this.balanceUSD = this.balanceUSD / this.index[0].close
    this.positionRatio = this.balanceBTC / this.balanceUSD
    this.portfolioValue = (this.balanceBTC + this.balanceUSD) * this.index[0].close
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
    const inputData = Array.from(data)
    for (let i=0;i<offset;i++){
      inputData.shift()
    }
    const price = await this.volumeWeightedMovingAverage(inputData, 1)
    const vwma3 = await this.volumeWeightedMovingAverage(inputData, 3)
    const vwma9 = await this.volumeWeightedMovingAverage(inputData, 9)
    const vwma27 = await this.volumeWeightedMovingAverage(inputData, 27)
    const vwma81 = await this.volumeWeightedMovingAverage(inputData, 81)
    const vwma243 = await this.volumeWeightedMovingAverage(inputData, 243)
    const macd = ((vwma3-vwma9)+(vwma9-vwma27)+(vwma27-vwma81)+(vwma81-vwma243))
    return (price / (price - macd)) - 1
  }

  async trendStrength(){
    let strength = 0
    for (let i=0;i<this.WDB.length-1;i++){
      if (this.WDB[i] > this.WDB[i+1]) strength++
      else if (this.WDB[i] < this.WDB[i+1]) strength--
    }
    this.strength = strength
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
    if (minTrade / bal < this.tradeSize) qty = bal * this.tradeSize
    else qty = minTrade
    if (direction === 'BUY') qty = qty * (1 + ( (1 / this.positionRatio)) * this.hodlRatio) * this.buyMultiplier
    return qty
  }

  async trade(dir,wdb,currentPrice){
    const direction = dir
    const wtddb = await Math.abs(wdb)
    const price = currentPrice.toFixed(3)
    let balance = 0
    let response = ''
    let multiplier = 0
    if (direction === 'BUY'){
      multiplier = this.buyThreshold
      balance = this.balanceUSD
    }
    else if (direction === 'SELL'){
      multiplier = Math.abs(this.sellThreshold)
      balance = this.balanceBTC
    }
    const minTrade = await this.getMinTrade(balance,direction)
    if (minTrade>balance) {
      response = `${new Date().toISOString()} balance too low: ${balance} < minTrade: ${minTrade}`
      return response
    }
    let qty = minTrade * (wtddb / multiplier)
    if (qty < minTrade) qty = minTrade
    qty = qty.toFixed(8)
    console.log(`${new Date().toISOString()} sending order: ${direction} ${qty} @ ${price}`)
    if (this.test === false){
      await this.client.cancelOrder('open','BTC-USD')
      response = await this.client.sendOrder('BTC-USD', direction, 'LIMIT',{quantity:qty,limit:price},'GOOD_TIL_CANCELLED',uuid(),true)
    }
    this.tradeCooldown = 10
    return JSON.stringify(response)
  }

  async compileIndex(){
    let coinbase = []
    let bitfinex = []
    let bitstamp = []
    while (coinbase.length !== 253 || bitfinex.length !== 253 || bitstamp.length !== 253 ){
      try{
        coinbase = await this.apihelper.fetchCoinbase()
        bitfinex = await this.apihelper.fetchBitfinex()
        bitstamp = await this.apihelper.fetchBitstamp()
      }
      catch(error){
        console.log(`${new Date().toISOString()} ${error}`)
      }
    }
    this.index = []
    for (let i=0;i<253;i++){
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
      hlcv.low = await this.vwap(
        parseFloat(coinbase[i][1]),
        parseFloat(bitfinex[i][1]),
        parseFloat(bitstamp[i][1]),
        parseFloat(coinbase[i][3]),
        parseFloat(bitfinex[i][3]),
        parseFloat(bitstamp[i][3]),
        hlcv.volume
        )
      hlcv.close = await this.vwap(
        parseFloat(coinbase[i][2]),
        parseFloat(bitfinex[i][2]),
        parseFloat(bitstamp[i][2]),
        parseFloat(coinbase[i][3]),
        parseFloat(bitfinex[i][3]),
        parseFloat(bitstamp[i][3]),
        hlcv.volume
        )
      this.index.push(hlcv)
    }
  }

  async fillWDB(period=10){
    this.WDB = []
    for (let i=0;i<period;i++){
      this.WDB.push(await this.weightedDirectionalBias(this.index, i))
    }
  }

  async calculateTrade(){
    const strength = this.strength
    if (Math.abs(strength) >=5 && strength > 0 && this.WDB[0] < this.WDB[1] && this.WDB[1] > this.WDB[2]  && this.WDB[0] >= this.sellThreshold && this.positionRatio > this.hodlRatio) {
      console.log(`${new Date().toISOString()} calculating SELL trade...`)
      let sell = {}
      try{
        sell = await this.trade('SELL',this.WDB[0],this.index[0].close)
      }
      catch(error){
        console.log(`${new Date().toISOString()} ${error}`)
      }
      console.log(`${new Date().toISOString()} ${sell}`)
    }
    else if (Math.abs(strength) >=5 && strength > 0 && this.WDB[0] < this.WDB[1] && this.WDB[1] > this.WDB[2]  && this.WDB[0] > this.sellThreshold && this.positionRatio <= this.hodlRatio){
      console.log(`${new Date().toISOString()} HODL!`)
    }

    else if (Math.abs(strength) >=5 && strength < 0  && this.WDB[0] > this.WDB[1] && this.WDB[1] < this.WDB[2] && this.WDB[0] <= this.buyThreshold) {
      console.log(`${new Date().toISOString()} calculating BUY trade...`)
      let buy = {}
      try{
        buy = await this.trade('BUY',this.WDB[0],this.index[0].close)
      }
      catch(error){
        console.log(`${new Date().toISOString()} ${error}`)
      }
      console.log(`${new Date().toISOString()} ${buy}`)
    }
  }

  async run(){
    while (true){
      await this.compileIndex()
      await this.fillWDB()
      await this.getBalances()
      await this.trendStrength()
      if (this.statusReportCounter < 1){
        this.statusReportCounter = 10
        console.log(`${new Date().toISOString()} Index Price: ${this.index[0].close.toFixed(2)}, WDB: ${this.WDB[0].toFixed(4)}, Trend Strength: ${this.strength}, Position Ratio: ${this.positionRatio.toFixed(2)}, Portfolio Value: ${this.portfolioValue.toFixed(2)}`)
      }
      this.statusReportCounter--
      if (this.tradeCooldown < 1){
        await this.calculateTrade()
      }
      if (this.tradeCooldown > 0) {
        this.tradeCooldown--
      }
      await this.sleep(180000)
    }
  }
}

module.exports = BittrexTrader
