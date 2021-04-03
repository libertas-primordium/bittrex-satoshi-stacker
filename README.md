# bittrex-satoshi-stacker
**NO CLAIMS ARE MADE AS TO PAST OR FUTURE PROFITABILITY OF THIS STRATEGY. USE AT YOUR OWN RISK!**
___
## Description:
This strategy attempts to efficiently accumulate or liquidate BTC holdings on the Bittrex exchange, by identifying waning momentum in overbought or oversold market conditions.

### This is an example implementation of three seperate, stand-alone projects which I have been working on:
### 1. Volume weighted bitcoin price index
Build a volume weighted BTCUSD index based on price data from three of the largest BTCUSD exchanges by daily volume. Specifically, markets were chosen which settle in cash USD, not stablecoins such as USDT. The reasoning is that this better represents actual value flows **into** and **out of** the bitcoin economy. I have not published the standalone version yet, as it will likely employ a websocket interface rather than the current REST API version. The REST API version can be found in `/src/apihelper.js` and in the `compileIndex()` method of `/src/bittrextrader.js`.

### 2. Example implementation of **bittrex-rest-client**
This project employs the [bittrex-rest-client](https://github.com/libertas-primordium/bittrex-rest-client) npm package to interface with the Bittrex exchange v3 REST API.

### 3. Volume Weighted Directional Bias Indicator
This project uses the [weighted-directional-bias-indicator](https://github.com/libertas-primordium/weighted-directional-bias-indicator) In order to identify waning momentum a trend in order to sell into overbought or buy into oversold market conditions. An example of this indicator can be seen on [Trading View](https://www.tradingview.com/script/DAtBMtVG-Volume-Weighted-Directional-Bias/).

___
## Logic:
The strategy checks market conditions every three minutes.

If weighted directional bias has been **trending lower**, is currently **negative**, and has just **turned higher**, the strategy will execute a **BUY** order, with order size scaled by how extreme a **negative** value is calculated by the weighted directional bias indicator.

If weighted directional bias has been **trending higher**, is currently **positive**, and has just **turned lower**, and the account's BTC to USD ratio is **not below** the `hodlRatio` parameter, the strategy will execute a **SELL** order, with order size scaled by how extreme a **positive** value is calculated by the weighted directional bias indicator.

The strategy places a limit GTC order at the prevailing close price on the volume weighted bitcoin index. This order remains until it either fills, or the strategy receives a new trade signal (trade signals are limited to not more than every 30 minutes) at which time it simple cancels all open orders in the BTCUSD market before placing a new one. There is room for improvement in regards to order management and I may work on this in the near future.
___
## Usage:
Dependencies: `node`, `nodemon`

Clone the repository to your server.
```
$ git clone https://github.com/libertas-primordium/bittrex-trader
```
`cd` into the directory.

Setup npm modules.
```
$ npm install
```

Install nodemon.
```
$ npm install -g nodemon
```

Create a `.env` file in the root directory of the repository and add the following two lines:
```
KEY=YOUR_BITTREX_API_KEY
SECRET=YOUR_BITTREX_API_SECRET
```
The API credentials need to have the 'READ INFO' and 'TRADE' permissions enabled. There is no need to enable withdrawals.

Change the start parameters for the `BittrexTrader()` object in `server.js` to suit your needs:
```js
const app = new BittrexTrader(buyThreshold,sellThreshold,hodlRatio,minTrendStrength)
```
Required parameters:
1. `buyThreshold`: `float`, must be negative. Default: `-0.025`. Recommended range: `-0.0125` - `-0.05`. This is the least **negative** value on the weighted directional bias indicator before the strategy will buy into a selloff.

2. `sellThreshold`: `float`. Default: `0.05`. Recommended range: `0.025` - `0.10`. This is the least **positive** value on the weighted directional bias indicator before the strategy will sell into a rally.
3. `hodlRatio`: `float`. Default: `1.5`. This is the minimum ratio of BTC to USD in the account that the strategy will seek to maintain. If the account is below this ratio, the strategy will refrain from selling when a sell signal arises. A value of `1.0` would mean the strategy does not sell if less than half of the account value (in USD) is currently held in BTC.
4. `minTrendStrength`: `integer`. Default: `5`. Range: `1` - `8`. This is how strongly weighted directional bias should have been trending leading up to the buy/sell signal in order for the strategy to act on the signal. A value of `1` would result in frequent trades and probably prove unprofitable, while a value of `8` would counter trade into only the most aggressive rallies and selloffs and would find far fewer trades.

Start the server by executing the following command within the root directory of the repository:
```
$ nodemon > server.log
```
The log file can then be monitored in real time with
```
$ tail -f server.log
```
___
Nobody paid me to do this, so if my work saves you time or money, consider sending a tip!
```

BTC: 1EHkFQBk9LB2Zm3RcP7EeVLqUUDaEFpNxx

LTC: Lht9v7E9bxPMAmU2TUeVx2SJZu2AW32LSW

ETH: 0xaba31e526ca98a2a659d69b30adc2da8f3eaaa2d

DOGE: DC8xePEAyC2PeGQUqF51abrF8m7BMuVVoS

XMR: 41tnfGBpCt527q9aqdAjU914gcyJ8Fk2K9vGHHxswgF1hPgouanA2WFbQKimLBMt3zESnkuBWcn29NMiVAC1k4CxRMAdqB6
```
___
## LICENSE:
This software is made available under the MIT licence.

Copyright (c) 2021 libertas-primordium

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.