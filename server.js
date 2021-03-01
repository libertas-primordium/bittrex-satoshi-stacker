'use strict';

/// PACKAGES:
const express = require('express');
const cors = require('cors');
const { response } = require('express');
const CryptoJS = require('crypto-js');
require('dotenv').config();

/// GLOBAL VARIABLES:




//TO-DO: build api routes
    //TO-DO: REST API
        //TO-DO: REST_API authentication function
const timestamp = new Date().getTime();
const contentHash = CryptoJS.SHA512(content).toString(CryptoJS.enc.Hex);
const uri = 'https://api.bittrex.com/v3/balances';
const preSign = [timestamp, uri, method, contentHash, subaccountId].join('');
const signature = CryptoJS.HmacSHA512(preSign, apiSecret).toString(CryptoJS.enc.Hex);

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
            //TO-DO: minimumSize * WDB/threshold
            //TO-DO: check balance, if available > order size, send order