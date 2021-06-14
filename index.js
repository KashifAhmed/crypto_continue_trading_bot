/**
 * Low Investment Strategy with high profit
 * Here's the plan
 * Invest: $500
 * Goal: $600
 * Rules (Invest when it low sell when make profit)
 *  - Don't invest more then 25 on any coin
 *  - Sell if the coin makes more the 15% profit
 *  - Don't invest from profit, keep the profit converted to USDT
 *  - 
*/

/**
 * How script works
 * Fetch list of all the cryptos - DONE
 * Get the current coin price - DONE
 * Get the low price - DONE
 * Get the high price - DONE
 * If the price of coin less then 30% the purchase
 * If the price of coin making more then 20% profit then sell
 */


const rp = require('request-promise'),
    WebSocket = require('ws'),
    fs = require('fs');

const binance_base_api = "https://api1.binance.com";
const binance_api_key = "6UBgrtFdzW4nM0K4OSRc2NYCPOeFMR6gYn2tfWsW44D5OiNvFCUmntv0RaPN74Yl";
const binqance_secret_key = "DwA0200b2y428bkHaMO8d1RkxFkzRolMf2OzR4TuHjSOPY3wqxAlrsqL28LBPYas";

let coins = [],
    portfolio = [],
    availableInvestment = 500,
    profit = 0,
    favorite_coins = [],
    minimumProfitPercentage = 0.1, // 20%
    minimumPurchasePercentage = -1, // 200%
    minimumNumberOfTrade = 10000;


const fetchCoinOptions = {
    uri: binance_base_api + '/api/v3/exchangeInfo',
    json: true, 
    headers: {
        "X-MBX-APIKEY" : binance_api_key
    }
};

 
const intializeOperation  = async() =>{
    
    console.log("Fetching Coin List in Exchange")
    try{
        // Step 1: Get list of all the crypto currencies
        let fetchedCoins = await rp(fetchCoinOptions)
        if(fetchedCoins.symbols && fetchedCoins.symbols.length>0){
            coins = fetchedCoins.symbols;    
        }
       
        // Step 2: Get the current, low, high and average price of coin
        console.log("Initializing Step 2");
        let maxCoins = coins.length;          //coins.length;
        for(var i = 0; i < maxCoins ; i++){ 
            const coin = coins[i];

            if(coin.permissions.indexOf("SPOT") < 0){
                console.log(coin.symbol +" not allow spot transaction");
                continue;
            }
            
            const coinHistoryOption = {
                uri: binance_base_api + '/api/v3/ticker/24hr?symbol='+coin.symbol,
                json: true, 
                headers: {
                    "X-MBX-APIKEY" : binance_api_key
                }
            }

            const fetchCoinHistory = await rp(coinHistoryOption);
            
           

            
            console.clear();
            console.log(' --- Processing ('+ Math.round(i/coins.length*100)+'%) '+coin.symbol+ ' having margin '+ Number(fetchCoinHistory.priceChangePercent)+ '% ----');
            if(Number(fetchCoinHistory.priceChangePercent)<minimumPurchasePercentage){
                // Only choose high margin coins
                favorite_coins.push(fetchCoinHistory.symbol);
            }
            
        }

        fs.writeFile('favorite_coins.json', JSON.stringify(favorite_coins), 'utf8', ()=>{
            console.log("Update Favorite coin")
        });
        

        // Maintain open prices


        // Now we have history, it's time to make transaction on every 1 min to make profit

        /**
         * Market Streams
         */
        console.log("Initializing Streaming");
        
        
        
        const streamingURL = 'wss://stream.binance.com:9443/ws/!ticker@arr'
        const wss = new WebSocket(streamingURL); // !bookTicker //TODO: UPDATE THIS ONE & ALL THE PROBLEM SOLVED
        console.clear();
        console.log(' ---- COIN  ---- | ---- Price ---- | ---- Quantity ---- | ---- DateTime ---- ')
        wss.on('message', function connection(data) {
            const latest_change = JSON.parse(data)
            const filter_stream_pipe = latest_change.filter(change => {
                return favorite_coins.indexOf(change.s)>-1 && change.n > minimumNumberOfTrade;
            });
            
            for (var i = 0; i < filter_stream_pipe.length; i++) {
                let coin_latest_stats = filter_stream_pipe[i];
                let portfolioIndex = portfolio.findIndex(p => p.s === coin_latest_stats.s);
                if (portfolioIndex < 0) {
                    // Must Purchase
                    
                    

                    // TODO: Write here purchase strategy
                    portfolio.push({
                        s: coin_latest_stats.s,
                        p: coin_latest_stats.c,
                        stock: 25,
                        sold: []
                    });
                    availableInvestment -= 25;
                    fs.writeFile('portfolio.json', JSON.stringify(portfolio), 'utf8', () => {
                        console.log("Updated Portfolio")
                    });
                } else {
                    // console.log("YOU NEED TO HANDLE SELL STRATEGY HERE")
                    
                    if (coin_latest_stats.c > portfolio[portfolioIndex].p) {
                        const profit = coin_latest_stats.c - portfolio[portfolioIndex].p;
                        const profitPercentage = (profit / coin_latest_stats.c) * 100;
                        console.log(" -------------------------------------------------------------");
                        console.log("Available Investment: "+ availableInvestment);
                        console.log(portfolio[portfolioIndex].s+" PROFIT Percent "+ profitPercentage)
                        console.log("Date Time", new Date());
                        console.log(" -------------------------------------------------------------");
                        // TODO: Update more algorithm here
                        if (profitPercentage > minimumProfitPercentage) {
                            console.log("Price Increase Sell it", profitPercentage)
                            console.log(portfolio[portfolioIndex].s + ' has been increased with ' + profit + ' amount with ' + profitPercentage + '%');
                            portfolio[portfolioIndex].stock = 0;
                            portfolio[portfolioIndex].sold.push({
                                quantity: 25,
                                date: new Date(),
                                p: coin_latest_stats.c
                            })
                            fs.writeFile('portfolio.json', JSON.stringify(portfolio), 'utf8', () => {
                                console.log("Updated Portfolio")
                            });
                        }

                    }
                }
            }
            
            
            
            // ws.on('message', (message) => {
            //     console.log('received: %s', message);
            //   });
        });





    }catch(error){
        console.log("Error", error);
    }
    
}

intializeOperation()



