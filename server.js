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

    //TO-DO: WEBSOCKET API
        //TO-DO: WEBSOCKET_API authentication function
        //TO-DO: get price data
        //TO-DO: connection alive test
        
    
    
    

//TO-DO: build logic
    //TO-DO: WMA
    //TO-DO: Weighted Directional Bias using v2.0
    //TO-DO: BUY/SELL trigers based on inputs from WDB
        //TO-DO: object array for lookback period
            //TO-DO: contains WBD value and a boolean for growing/shrinking
        //TO-DO: eval BUY/SELL conditions
        //TO-DO: calculate order sizing based on inputs from WDB