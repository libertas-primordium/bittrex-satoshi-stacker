const BittrexTrader = require('./src/bittrextrader')
const app = new BittrexTrader(-0.0125,0.025,1,5) // Change these values to suit your preference. See README.md for details.
app.run()
