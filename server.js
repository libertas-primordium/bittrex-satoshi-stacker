'use strict';

/// PACKAGES:
const express = require('express');
const cors = require('cors');
const { response } = require('express');
require('dotenv').config();

//TO-DO: api authentication function


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