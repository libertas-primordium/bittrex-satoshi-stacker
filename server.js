'use strict';

/// PACKAGES:
const express = require('express');
const cors = require('cors');
const { response } = require('express');
const CryptoJS = require('crypto-js');
require('dotenv').config();



//TO-DO: api authentication function
const uri = 'https://api.bittrex.com/v3/balances';
const preSign = [timestamp, uri, method, contentHash, subaccountId].join('');
const signature = CryptoJS.HmacSHA512(preSign, apiSecret).toString(CryptoJS.enc.Hex);

//TO-DO: build api routes
        
    //TO-DO: get balances
    //TO-DO: get working orders
    //TO-DO: get price data
    //TO-DO: post order
    //TO-DO: cancel order

//TO-DO: build logic
    //TO-DO: WMA
    //TO-DO: Weighted Directional Bias using v2.0
    //TO-DO: BUY/SELL trigers based on inputs from WDB
        //TO-DO: object array for lookback period
            //TO-DO: contains WBD value and a boolean for growing/shrinking
        //TO-DO: eval BUY/SELL conditions
        //TO-DO: calculate order sizing based on inputs from WDB