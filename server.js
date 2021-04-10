const BittrexTrader = require('./src/bittrextrader')
const app = new BittrexTrader(-0.025,0.05,2,6,0.02) // Change these values to suit your preference. See README.md for details.
app.run()
