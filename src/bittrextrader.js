'use strict';

/// PACKAGES:
const {BittrexClient} = require('bittrex-rest-client')
const {ApiHelper} = require('../src')
const uuid = require('uuid-random')
require('dotenv').config()

class BittrexTrader {
  constructor(buyThreshold=-0.3334,sellThreshold=0.6667,hodlRatio=2) {
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
    this.longBias = 1
    this.balanceBTC = 0
    this.balanceUSD = 0
    this.portfolioValue = 0
  }



  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }


  async getBalances(){
    const getBalanceBTC = await this.client.balance('BTC')
    const getBalanceUSD = await this.client.balance('USD')
    this.balanceBTC = parseFloat(getBalanceBTC.available)
    this.balanceUSD = parseFloat(getBalanceUSD.available)
    this.balanceUSD = this.balanceUSD / this.index[0].close
    this.longBias = this.balanceBTC / this.balanceUSD
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
    if (minTrade / bal < 0.02) qty = bal * 0.02
    else qty = minTrade
    if (direction === 'BUY') qty = qty * ((1 + (1 / longBias)) * 2)
    return qty
  }

  async trade(dir,wdb,currentPrice){
    const direction = dir
    const wtddb = await Math.abs(wdb)
    const price = currentPrice
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
    const qty = minTrade * (wtddb / multiplier)
    if (qty > balance) qty = balance

    await this.client.cancelOrder('open','BTC-USD')
    console.log(`${new Date().toISOString()} sending order: ${direction} ${qty} @ ${price}`)
    response = await this.client.sendOrder('BTC-USD', direction, 'LIMIT',{quantity:qty,limit:price},'GOOD_TIL_CANCELLED',uuid(),true)
    this.tradeCooldown = 10
    return response
  }

  async compileIndex(){
    let coinbase = []
    let bitfinex = []
    let bitstamp = []
    try{
      coinbase = await this.apihelper.fetchCoinbase()
      bitfinex = await this.apihelper.fetchBitfinex()
      bitstamp = await this.apihelper.fetchBitstamp()
    }
    catch(error){
      console.log(`${new Date().toISOString()} ${error}`)
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
    const strength = await this.trendStrength()
    if (strength >=7 && this.WDB[0] < this.WDB[1] && this.WDB[1] > this.WDB[2]  && this.WDB[0] >= this.sellThreshold && this.tradeCooldown < 1 && this.longBias >= this.hodlRatio) {
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
    else if (strength >=7 && this.WDB[0] < this.WDB[1] && this.WDB[1] > this.WDB[2]  && this.WDB[0] >= this.sellThreshold && this.tradeCooldown < 1 && this.longBias < this.hodlRatio){
      console.log(`${new Date().toISOString()} HODL!`)
    }
    else if (strength <= -7 && this.WDB[0] > this.WDB[1] && this.WDB[1] < this.WDB[2] && this.WDB[0] <= this.buyThreshold && this.tradeCooldown < 6) {
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
      if (this.statusReportCounter < 1){
        this.statusReportCounter = 10
      }
      console.log(`${new Date().toISOString()} Index Price: ${this.index[0].close.toFixed(2)}, WDB: ${this.WDB[0].toFixed(4)}, Position Ratio: ${this.longBias.toFixed(2)}, Portfolio Value: ${this.portfolioValue.toFixed(2)}`)
      this.statusReportCounter--
      await this.calculateTrade()
      if (this.tradeCooldown > 0) this.tradeCooldown--
      await this.sleep(180000)
    }
  }
}

module.exports = BittrexTrader
