'use strict';

/// PACKAGES:
const {BittrexClient} = require('bittrex-rest-client')
const {ApiHelper} = requre('../src')
require('dotenv').config()

const client = new BittrexClient({
  apiKey: process.env.KEY,
  apiSecret: process.env.SECRET,
  timeout: 3000})

const apihelper = new ApiHelper()
/// GLOBAL VARIABLES:
const WDB = []
const index = []
const buyThreshold = 0.618
const sellThreshold = -0.382
const longBias = 1.382

function main(){
  await compileIndex()
  await fillWDB()
  await calculateTrade()
  sleep(1800000)
}

function compileIndex(){
  const coinbase = await apihelper.fetchCoinbase()
  const bitfinex = await apihelper.fetchBitfinex()
  const bitstamp = await apihelper.fetchBitstamp()
  for (let i=0;i<243;i++){
    const hlcv = {
      high:0,
      low:0,
      close:0,
      volume:0
    }
    hlcv.volume = coinbase[i][3]+bitfinex[i][3]+bitstamp[i][3]
    hlcv.high = vwap(coinbase[i][0],bitfinex[i][0],bitstamp[i][0],coinbase[i][3],bitfinex[i][3],bitstamp[i][3],hlcv.volume)
    hlcv.low = vwap(coinbase[i][1],bitfinex[i][1],bitstamp[i][1],coinbase[i][3],bitfinex[i][3],bitstamp[i][3],hlcv.volume)
    hlcv.close = vwap(coinbase[i][2],bitfinex[i][2],bitstamp[i][2],coinbase[i][3],bitfinex[i][3],bitstamp[i][3],hlcv.volume)
    index.push(hlcv)
  }
}

function fillWDB(period=10){
  WDB.slice(0,0)
  for (let i=0;i<period;i++){
    WDB.unshift(weightedDirectionalBias(index, i))
  }
}

function calculateTrade(){
  const strength = trendStrength()
  if (strength >=7 && WDB[0] < WDB[1] && WDB[1] < WDB[2]  && WDB[0] > buyThreshold) trade('BUY',WDB[0],index[0])
  else if (strength <= -7 && WDB[0] > WDB[1] && WDB[1] < WDB[2] && WDB[0] < sellThreshold) trade('SELL',WDB[0],index[0])
}

function vwap(price1,price2,price3,volume1,volume2,volume3,totalvol){
  const comp1 = price1 * (volume1/totalvol)
  const comp2 = price2 * (volume2/totalvol)
  const comp3 = price3 * (volume3/totalvol)
  const vWAP = comp1 + comp2 + comp3
  return vWAP
}

function weightedDirectionalBias(data,offset){
  const inputData = data
  for (let i=0;i<offset;i++){
    index.shift()
  }
  const price = volumeWeightedMovingAverage(inputData, 1)
  const vwma3 = volumeWeightedMovingAverage(inputData, 3)
  const vwma9 = volumeWeightedMovingAverage(inputData, 9)
  const vwma27 = volumeWeightedMovingAverage(inputData, 27)
  const vwma81 = volumeWeightedMovingAverage(inputData, 81)
  const vwma243 = volumeWeightedMovingAverage(inputData, 243)
  const macd = (vwma3-vwma9)+(vwma9-vwma27)+(vwma27-vwma81)+(vwma81-vwma243)
  return (price / (price - macd)) - 1
}

function volumeWeightedMovingAverage(data,period){
  const inputData = data.slice(0,period)
  let vprice = 0
  let totalvol = 0
  for (let i in inputData){
    vprice = vprice + (((inputData[i].high + inputData[i].low + inputData[i].close) / 3) * inputData[i].volume)
    totalvol = totalvol + inputData[i].volume
  }
  return vprice / totalvol
}

function trendStrength(){
  let strength = 0
  for (let i=0;i<WDB.length-1;i++){
    if (WDB[i] > WDB[i+1]) strength++
    else if (WDB[i] < WDB[i+1]) strength--
  }
  return strength
}

function getMinTrade(balance,direction){
  const bal = balance
  const marketData = await client.markets()
  const direction = direction
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

function trade(direction,wdb,price){
  const direction = direction
  const wdb = Math.abs(wdb)
  const price = price
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
  const balance = await client.balances(currency)
  const minTrade = getMinTrade(balance,direction)
  const qty = minTrade * (wdb / multiplier)
  if (qty < balance){
    const cancelOrders = await client.cancelOrder('open','BTC-USD')
    console.log(cancelOrders)
    const sendOrder = await client.sendOrder('BTC-USD', direction, 'LIMIT',{quantity:qty,limit:price})
    console.log(sendOrder)
  }
}

