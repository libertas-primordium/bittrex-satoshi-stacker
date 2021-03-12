'use strict';

/// PACKAGES:
const {BittrexClient} = require('bittrex-rest-client');
const {ApiHelper} = requre('../src');
require('dotenv').config();

const client = new BittrexClient({
  apiKey: process.env.KEY,
  apiSecret: process.env.SECRET,
  timeout: 3000});

const apihelper = new ApiHelper();
/// GLOBAL VARIABLES:
let weightedIndex = [];
const WDB = [];

/// INITIALIZE API HELPER:

        //TO-DO: get candles
function compileIndex(){
  const coinbase = await apihelper.fetchCoinbase();

  const index = []
  for (let i=0;i<243;i++){
    const hlcv = {
      high:0,
      low:0,
      close:0,
      volume:0
    };

  }

}
          //TO-DO: Co
        //TO-DO: get balances
        //TO-DO: get working orders
        //TO-DO: post order
        //TO-DO: cancel order

    //TO-DO: Interract with WEBSOCKET API websocket.js
        //TO-DO:


    //TO-DO: REST-API endboints for 3 exchanges
        //TO-DO: CoinbasePRO
            //TO-DO: collect 2x 15min candles and combine intro array of 30min periods
        //TO-DO: Bitstamp
        //TO-DO: Bitfinex


//TO-DO: build logic
    //TO-DO: Combine data from 3 exchanges into single array of volume-weighted averaged data
    //TO-DO: WMA
    //TO-DO: Weighted Directional Bias using v2.0
    //TO-DO: BUY/SELL trigers based on inputs from WDB
        //TO-DO: object array for lookback period
            //TO-DO: contains WBD value and a boolean for growing/shrinking
        //TO-DO: eval BUY/SELL conditions
            //TO-DO:
            /*
            if WDB is >0.618 or <-0.382
            && if last period was shrinking
            && if period before last was growing
            && if >=7 of 9 lookback starting from arr[1] are growing
                then trigger buy or sell
            */
        //TO-DO: calculate order sizing based on inputs from WDB (and price arbitrage against index)?
            //TO-DO: minimumSize * (WDB/threshold)
            //TO-DO: check balance, if available > order size, send order