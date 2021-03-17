const axios = require('axios');
const https = require('https');

class ApiHelper {

  /// CONSTRUCTOR:
  constructor(timeout=5000, keepAlive = true){
    this._client = axios.create({
      httpsAgent: new https.Agent({ keepAlive }),
      timeout: timeout
    })
  }

  /// PUBLIC METHODS:
  async fetchCoinbase(){
    let joinedCandes = []
    while (joinedCandes.length !== 243){
      joinedCandes = []
      const firstCandles = await this._client.request('https://api.pro.coinbase.com/products/BTC-USD/candles?granularity=900')
      const secondCandles = await this._client.request(`https://api.pro.coinbase.com/products/BTC-USD/candles?granularity=3600`)
      secondCandles.data.splice(48)
      for (let i=0; i<firstCandles.data.length-1; i=i+2){
        const hlcv = []
        hlcv.push((firstCandles.data[i][2]+firstCandles.data[i+1][2])/2)
        hlcv.push((firstCandles.data[i][1]+firstCandles.data[i+1][1])/2)
        hlcv.push((firstCandles.data[i][4]+firstCandles.data[i+1][4])/2)
        hlcv.push(firstCandles.data[i][5]+firstCandles.data[i][5])
              joinedCandes.push(hlcv)
      }
      for (let i in secondCandles.data){
        const hlcv = []
        hlcv.push(secondCandles.data[i][2])
        hlcv.push(secondCandles.data[i][1])
        hlcv.push(secondCandles.data[i][4])
        hlcv.push(secondCandles.data[i][5]/2)
        joinedCandes.push(hlcv)
        joinedCandes.push(hlcv)
      }
      joinedCandes.forEach(candle => {
        for (let key of candle){
          if (key === 'NaN') key = '0'
        }
      })
      while (joinedCandes.length > 243){
            joinedCandes.pop()
      }
    }
    return joinedCandes
  }

  async fetchBitfinex(){
    let candles = []
    while (candles.length !== 243){
      candles = []
      const histCandles = await this._client.request('https://api-pub.bitfinex.com/v2/candles/trade:30m:tBTCUSD/hist?limit=242')
      for (let i in histCandles.data) {
        const hlcv = []
        hlcv.push(histCandles.data[i][3])
        hlcv.push(histCandles.data[i][4])
        hlcv.push(histCandles.data[i][2])
        hlcv.push(histCandles.data[i][5])
        candles.push(hlcv)
      }
      const lastCandle = await this._client.request('https://api-pub.bitfinex.com/v2/candles/trade:30m:tBTCUSD/last')
      const hlcv = []
      hlcv.push(lastCandle.data[3])
      hlcv.push(lastCandle.data[4])
      hlcv.push(lastCandle.data[2])
      hlcv.push(lastCandle.data[5])
      candles.push(hlcv)
    }

    return candles
  }

  async fetchBitstamp(){
    let candlesSanitized = []
    while (candlesSanitized.length !== 243){
      candlesSanitized = []
      const candles = await this._client.request('https://www.bitstamp.net/api/v2/ohlc/btcusd/?step=1800&limit=243')
      candles.data.data.ohlc.reverse()
      for (let i in candles.data.data.ohlc){
        const hlcv = []
        hlcv.push(candles.data.data.ohlc[i].high)
        hlcv.push(candles.data.data.ohlc[i].low)
        hlcv.push(candles.data.data.ohlc[i].close)
        hlcv.push(candles.data.data.ohlc[i].volume)
        candlesSanitized.push(hlcv)
      }
      return candlesSanitized
    }
  }
}
module.exports = ApiHelper
