const axios = require('axios');
const https = require('https');

class ApiHelper {

  /// CONSTRUCTOR:
  constructor(timeout=3000, keepAlive = true){
    this._client = axios.create({
      httpsAgent: new https.Agent({ keepAlive }),
      timeout: timeout
    })
  }

  /// PUBLIC METHODS:
  async fetchCoinbase(){
    const firstCandles = await this._client.request('https://api.pro.coinbase.com/products/BTC-USD/candles?granularity=900')
    const secondCandles = await this._client.request(`https://api.pro.coinbase.com/products/BTC-USD/candles?granularity=3600`)
    secondCandles.data.splice(47)
    const joinedCandles = []
    for (let i=0; i<firstCandles.data.length-1; i=i+2){
      const ohlc = []
      for (let j in firstCandles.data[i]){
        ohlc.push(firstCandles.data[i][j]+firstCandles.data[i+1][j])
      }
      ohlc.shift()
      joinedCandles.push(ohlc)
    }
    for (let i in secondCandles.data){
      const ohlc = []
      for (let j in secondCandles.data[i]){
        ohlc.push(secondCandles.data[i][j]/2)
      }
      ohlc.shift()
      joinedCandles.push(ohlc)
      joinedCandles.push(ohlc)
    }
    joinedCandles.pop()
    return joinedCandles
  }

  async fetchBitfinex(){
    const candles = []
    const histCandles = await this._client.request('https://api-pub.bitfinex.com/v2/candles/trade:30m:tBTCUSD/hist?limit=242')
    for (let i in histCandles.data) candles.push(histCandles.data[i])
    const lastCandle = await this._client.request('https://api-pub.bitfinex.com/v2/candles/trade:30m:tBTCUSD/last')
    candles.push(lastCandle.data)
    return candles
  }

  async fetchBitstamp(){
    const candles = await this._client.request('https://www.bitstamp.net/api/v2/ohlc/btcusd/?step=1800&limit=243')
    return candles.data.data.ohlc
  }


}
module.exports = ApiHelper
