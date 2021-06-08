
require('dotenv').config()
console.log("\x1b[32m%s\x1b[0m",'███╗   ███╗ █████╗ ██████╗ ███████╗██╗███╗   ██╗██████╗ ██████╗ ███████╗ █████╗ ███╗   ███╗███████╗')
console.log("\x1b[32m%s\x1b[0m",'████╗ ████║██╔══██╗██╔══██╗██╔════╝██║████╗  ██║██╔══██╗██╔══██╗██╔════╝██╔══██╗████╗ ████║██╔════╝')
console.log("\x1b[32m%s\x1b[0m",'██╔████╔██║███████║██║  ██║█████╗  ██║██╔██╗ ██║██║  ██║██████╔╝█████╗  ███████║██╔████╔██║███████╗')
console.log("\x1b[32m%s\x1b[0m",'██║╚██╔╝██║██╔══██║██║  ██║██╔══╝  ██║██║╚██╗██║██║  ██║██╔══██╗██╔══╝  ██╔══██║██║╚██╔╝██║╚════██║')
console.log("\x1b[32m%s\x1b[0m",'██║ ╚═╝ ██║██║  ██║██████╔╝███████╗██║██║ ╚████║██████╔╝██║  ██║███████╗██║  ██║██║ ╚═╝ ██║███████║')
console.log("\x1b[32m%s\x1b[0m",'╚═╝     ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝╚═╝╚═╝  ╚═══╝╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝')
console.log('\x1b[32m' +process.env.npm_package_name + ' V'+ process.env.npm_package_version+ "\x1b[0m")
console.log('⛽\x1b[33m' + process.env.GAS_PRICE+ "\x1b[0m GWEI")




const readline = require('readline')
const ethers = require('ethers')
const axios = require('axios')
const DB = require('./modules/db-con.js')
const ONE_SPLIT_ABI = require('./src/abis/onesplit.json')
const ZRX_EXCHANGE_ABI = require('./src/abis/zrx.json')
const TRADER_ABI = require('./src/abis/TradingBot.json')
const FILL_ORDER_ABI = require('./src/abis/fillorder2.json')

/// ETHEREUM PROVIDER 
const network = "homestead";
const PROVIDER = new ethers.providers.InfuraProvider(network,{
  infura: process.env.INFURA_ID,

})

// use account index

const wallet = ethers.Wallet.fromMnemonic(process.env.PRIVATE_KEY)
const WALLET = wallet.connect(PROVIDER)

const ACCOUNT = WALLET.address

console.log('gas limit ',process.env.GAS_LIMIT)
const TRADER_CONTRACT = new ethers.Contract(process.env.TRADE_CONTRACT, TRADER_ABI.abi, WALLET)

// SMART CONTRACTS

const ONE_SPLIT_ADDRESS = "0xC586BeF4a0992C495Cf22e1aeEE4E446CECDee0E"
const oneSplitContract = new ethers.Contract(ONE_SPLIT_ADDRESS, ONE_SPLIT_ABI, PROVIDER)
const ZRX_EXCHANGE_ADDRESS = '0x61935CbDd02287B511119DDb11Aeb42F1593b7Ef'
const zrxExchangeContract = new ethers.Contract(ZRX_EXCHANGE_ADDRESS, ZRX_EXCHANGE_ABI, PROVIDER)


const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';           
const SAI = '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359';
const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const DAI = '0x6b175474e89094c44da98b954eedeac495271d0f';

const base = [WETH]
//const base = [USDC,DAI,WETH]
let baseTrack = 0
let prevTrack = 0
let firstRun = true // bot just turned on
const POLLING_INTERVAL = process.env.POLLING_INTERVAL || 3000 //seconds
const checkedOrders = []
let ERC20, tempOrderID, chkOrd, profitableArbFound, marketChecker, key, minimunReturn 
// the fix

let fees = ethers.utils.parseUnits(process.env.GAS_PRICE, 'gwei')
console.log( parseInt(fees.toString()) * parseInt(process.env.GAS_LIMIT) )
let ZEROXFEES = (parseInt(fees) * 70000).toString()
console.log('0x fees ',ZEROXFEES)



// const iface2 = new ethers.utils.Interface(JSON.stringify(FILL_ORDER_ABI));
// const sig2 = "fillOrder((address,address,address,address,uint256,uint256,uint256,uint256,uint256,uint256,bytes,bytes,bytes,bytes),uint256,bytes)";
// console.log(iface2)



run()



 async function run(){
    clearInterval(marketChecker)
  
   
    if(baseTrack > base.length){
        prevTrack = 0 
        baseTrack = 0
    }
    if(baseTrack > prevTrack){
     // scan0x(base[baseTrack])
      prevTrack = baseTrack
    }else{
      prevTrack = 0  
    }

    // FILL DB ON FIRST RUN
    if(firstRun){
        if(await DB.DBInit() ){
            scan0x(base[baseTrack])
            }
            // LOADING ERC20 DB
            ERC20 = await DB.loadErc() // key to pass pair option loadErc(tokenA, tokenB)
            firstRun = false
            //console.table(ERC20)
    }
    
    // RESETING VARIABLES
    tempOrderID = 0
    chkOrd = false
    marketChecker = null
   


     // PROMPT USER FOR A SCAN
     var rl = readline.createInterface({
     input: process.stdin, 
     output: process.stdout 
     });

     rl.question("Press Enter to start \x1b[32m>\x1b[0m", async response => {
        rl.setPrompt(' "\x1b[33mscan\x1b[0m" \x1b[32m to scan trade on base asset. \x1b[0m\n "\x1b[33mtrade\x1b[0m" \x1b[32m to start the trading bot. \x1b[0m\n "\x1b[33mresume\x1b[0m" \x1b[32mto resume trading. \x1b[0m\n\x1b[32m Type your command \x1b[32m >> \x1b[0m');
        rl.prompt();
        rl.on('line', (userInput) => {
            response = userInput;
            rl.close();
        });

        rl.on('close', async () => {
           
            switch(response) {
                case 'update':                    //scan
                    await DB.updatePrice()
                    return run()
                  case 'scan':                    //scan
                    scan0x(base[baseTrack])
                  break;
                case 'trade':  
                     profitableArbFound = false                  // trade
                     marketChecker = setInterval(async () => { await checkMarkets() }, POLLING_INTERVAL)
                  break;
                case 'resume':                    // resume trade
                  profitableArbFound = false
                  marketChecker = setInterval(async () => { await checkMarkets() }, POLLING_INTERVAL)
               break;
          
                default:
                    // any key
                    profitableArbFound = false
                    marketChecker = setInterval(async () => { await checkMarkets() }, POLLING_INTERVAL)
               
              }
        });
       
      response = null

    });
     
 } 

 

async function checkMarkets() {
  //  stop if already chking
  if(chkOrd) {
    return
  }
  // Stop checking markets if profitable is found
  if(profitableArbFound) {
    console.log("\x1b[32m%s\x1b[0m","⚠️ PROFITABLE FOUND checkMarket() ", profitableArbFound)
    chkOrd = false
    clearInterval(marketChecker)
    return 
  }

  // otherwise we check market for each entry in DB
  // need some filter for favorite ERC20
  chkOrd = true
for(key in ERC20){ 

    if(profitableArbFound) {
      //  console.log("\x1b[32m%s\x1b[0m","⚠️ PROFITABLE FOUND checkMarket() ", profitableArbFound)
        chkOrd = false
        //profitableArbFound = false
        clearInterval(marketChecker)
        return 
      }else {
        try {
            await wait(0.5) // timer for OX
            await checkOrderBook(base[baseTrack], key)  // NEED TOKEN A and B
            
        } catch (error) {
            console.error(error)
            chkOrd = false
            return
        }
      }
    }

//WE FINIsH SCANNING ALL DB ENTRY FOR THAT BASE (That Token A)
// increment base counter
baseTrack++

if(baseTrack < base.length){
// we keep going to next base
} else { 
// otherwise it's the last Token A
baseTrack = 0    
}
//completed checking for Token A pair
chkOrd = false
console.log("\x1b[32m%s\x1b[0m","⚠️ BASE SWITCH ",baseTrack)
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//        0x ORDERBOOK
//////////////////////////////////////////////////////////
async function checkOrderBook(baseAddress, quoteAddress) {
    if(baseAddress == quoteAddress){
        return // same pair
    }
    if(profitableArbFound) {
        console.log("\x1b[32m%s\x1b[0m","⚠️ Check Order Book IN ", profitableArbFound)
        chkOrd = false
        //profitableArbFound = false
        clearInterval(marketChecker)
       return 
      }

    const baseAddr = baseAddress.substring(2,42)
    const quoteAddr = quoteAddress.substring(2,42)
    const zrxResponse = await axios.get(`https://api.0x.org/sra/v3/orderbook?baseAssetData=0xf47261b0000000000000000000000000${baseAddr}&quoteAssetData=0xf47261b0000000000000000000000000${quoteAddr}&perPage=1000`)
    const zrxData = zrxResponse.data
    const bids = zrxData.bids.records
    console.log('\x1b[32mfound \x1b[33m'+ zrxData.bids.page.toString().padEnd(2) +'\x1b[32m page(s) \x1b[33m'+ zrxData.bids.total.toString().padEnd(2) +'\x1b[32m order(s) for \x1b[33m'+ERC20[baseAddress].symbol +'/'+ ERC20[quoteAddress].symbol +'\x1b[0m');
    let i = 0

    for(i=0; i < zrxData.bids.total && profitableArbFound == false; i++){
      
   
          if(profitableArbFound) {
            console.log("\x1b[32m%s\x1b[0m","⚠️ Check Order Book loop ", profitableArbFound)
            chkOrd = false
            //profitableArbFound = false
            clearInterval(marketChecker)
           return 
          } else {
          //  console.log(bids[i].order) //<-----------------------------------------------------------------------------------------------------VIEW ORDER
          await checkArb({ zrxOrder: bids[i].order, assetOrder:[ baseAddress, quoteAddress, baseAddress] }) // E.G. WETH, DAI, WETH
          }

    } 

  }
 
 async function checkArb(args) {
    const { assetOrder, zrxOrder } = args

    // Track order
     tempOrderID = JSON.stringify(zrxOrder)
     //console.table(zrxOrder)
     //console.table(assetOrder)
    // Skip if order checked
    if(checkedOrders.includes(tempOrderID)) {
     //  console.log('Order already checked')
      return // Don't log
    }
  
    // Add to checked orders
    checkedOrders.push(tempOrderID)
  
   // with fees
    if(zrxOrder.takerFee.toString() !== '0') {
     return
    } 
    
 // if there is no fee
     inputAssetAmount = zrxOrder.takerAssetAmount.toString() 
  
    // Build order tuple
    const orderTuple = [
      zrxOrder.makerAddress,
      zrxOrder.takerAddress,
      zrxOrder.feeRecipientAddress,
      zrxOrder.senderAddress, /// ??
      zrxOrder.makerAssetAmount,
      zrxOrder.takerAssetAmount,
      zrxOrder.makerFee,
      zrxOrder.takerFee,
      zrxOrder.expirationTimeSeconds,
      zrxOrder.salt,
      zrxOrder.makerAssetData,
      zrxOrder.takerAssetData,
      zrxOrder.makerFeeAssetData,
      zrxOrder.takerFeeAssetData
    ]
  
    // Fetch order status
    const orderInfo = await zrxExchangeContract.getOrderInfo(orderTuple)
  
    // Skip order if it's been partially filled
    if(orderInfo.orderTakerAssetFilledAmount.toString() !== '0') {
        return
    }
  // if its the same token or the amount to purchase in the order is 0
    if(assetOrder[1] == assetOrder[2] || zrxOrder.makerAssetAmount <= 0){
        console.log("\x1b[32m%s\x1b[0m","‼️ SAME ASSET ‼️" ,zrxOrder.makerAssetAmount )
        return
    }


    // Fetch 1Split Data
    const oneSplitData = await fetchOneSplitData({
      fromToken: assetOrder[1],                   // from the quoted asset
      toToken: assetOrder[2],                     // back to Loan asset/base asset
      amount: zrxOrder.makerAssetAmount,          // The amount     
    })
    //   Borow TokenA      Buy B and Resell      Babck to TokenA
    //   assetOrder[0]       assetOrder[1]        assetOrder[2]    
   
    // input is the amount we borrowed to fill the order on 0x to receive assetOrder[1]
    // output is the amount we get back after the swap on OnSplit
    console.log('0x      Input :',formatToken(zrxOrder.takerAssetAmount,ERC20[assetOrder[0]].decimals))
    console.log('1Split Output :',formatToken(oneSplitData.returnAmount,ERC20[assetOrder[2]].decimals))
    console.log('----------------------------------------------')
     
    // Check for profit
     let netProfit = '0'
     let realProfit = 0
     
    if(oneSplitData.returnAmount == '0'){
      return
    }
    if(oneSplitData.returnAmount != '0'){
   
      // There is an amount for the order
      // the return amount minus the amount we input is possible profit
      // poddible because the we have to take the fees into account
      
      // TX Cost
      let MaxTxCost = ethers.utils.formatUnits(process.env.GAS_PRICE, 'gwei') * process.env.ESTIMATED_GAS
      // add 0x fees
      let maxTotal = MaxTxCost + parseInt(ZEROXFEES)
      // the tx cost
      let txCost = formatToken(maxTotal.toString(),ERC20[assetOrder[0]].decimals)
    
      //console.log('TX COST',txCost)

      netProfit = ethers.utils.formatUnits(oneSplitData.returnAmount, ERC20[assetOrder[2]].decimals) - formatToken(zrxOrder.takerAssetAmount,ERC20[assetOrder[0]].decimals) - parseFloat(txCost)
      realProfit = parseFloat(netProfit) 
    
      console.log('🤑',realProfit)
      console.log('⛽',txCost)

      
      if(realProfit <=0)   {
        // there is no profit
        return
      }   
 
      console.log('🤑',realProfit)
  
      // the minimum amount we are willing to accept (fluctuation in time)
      // we accept a minimum amount by cutting off 33% of the profit
       minimunReturn = oneSplitData.returnAmount    
       console.log('Minimum Return : ', minimunReturn.toString())
    }
   
    const outputAssetAmount = oneSplitData.returnAmount  //this is what we will get from the OneSplit Swap
    // If still profitable
    const profitable =  realProfit  > 0
    if(profitable) {
        profitableArbFound = true
        console.log("\x1b[32m%s\x1b[0m","⚠️ PROFITABLE FOUND ⚠️")
       // array of symbol for display
      let c = 0
      let assets = []
      assetOrder.forEach(asset => {
          assets[c]= ERC20[asset].symbol
          c ++
      });
      
      // Log the arb
      console.table([{
        'Profitable?': profitable,
        'Asset Order': assets.join(', '),
        'Exchange Order': 'ZRX, 1Split',
        'Input':  formatToken(inputAssetAmount, ERC20[assetOrder[0]].decimals),
        'Output': formatToken(outputAssetAmount, ERC20[assetOrder[0]].decimals),
        'Profit': netProfit
      }])

      clearInterval(marketChecker)
      await trade( assetOrder[0], assetOrder[1], zrxOrder, inputAssetAmount, oneSplitData, minimunReturn)
       //await wait(5)  // trade simulation
      /// need to stop the checkarb loop here /////////////////////////////////////////////////////////////////////////////////////////////
      return run()
    }
    return 
  }

// TRADE EXECUTION
async function trade(flashTokenAddress, arbTokenAddress, orderJson, fillAmount, oneSplitData) {
    const FLASH_AMOUNT = fillAmount
    console.log('🤑'+ formatToken(FLASH_AMOUNT, ERC20[base[baseTrack]].decimals ) +' ON '+ ERC20[base[baseTrack]].symbol)

  

    const orderTuple = [
      orderJson.makerAddress,
      orderJson.takerAddress,
      orderJson.feeRecipientAddress ,
      orderJson.senderAddress ,
      orderJson.makerAssetAmount ,
      orderJson.takerAssetAmount ,
      orderJson.makerFee ,
      orderJson.takerFee ,
      orderJson.expirationTimeSeconds ,
      orderJson.salt ,
      orderJson.makerAssetData ,
      orderJson.takerAssetData ,
      orderJson.makerFeeAssetData ,
      orderJson.takerFeeAssetData
    ]
  

    const signature = orderJson.signature
    const iface = new ethers.utils.Interface(JSON.stringify(FILL_ORDER_ABI));
    const sig = "fillOrder((address,address,address,address,uint256,uint256,uint256,uint256,uint256,uint256,bytes,bytes,bytes,bytes),uint256,bytes)";
    const data = iface.encodeFunctionData(sig, [orderTuple,fillAmount, signature])
    const distribution = oneSplitData.distribution   
  
console.log('----------------------------------------------')
console.log('---------      TRADE CALL      ---------------')
console.log('----------------------------------------------')

console.log('-----------   OneSplit Data     --------------')
console.table(oneSplitData)
console.log('----------------------------------------------')

console.log('------------   Order Tupple     --------------')
console.table(orderTuple)
console.log('----------------------------------------------')

console.log('--------------   Signature     ---------------')
console.log(signature)
console.log('----------------------------------------------')

console.log('Order Fill Amount : ', fillAmount)
console.log(ERC20[flashTokenAddress].symbol,'\nFlash Token  : ',flashTokenAddress)
console.log('Flash Amount  : ',FLASH_AMOUNT, '\nType : ')
console.log(ERC20[arbTokenAddress].symbol,'\nArb Token  : ',arbTokenAddress)

console.log('------------      0x Data     -----------------')
console.table(data)
console.log('-----------------------------------------------')
console.log('Min return : ',minimunReturn.toString())
console.log('--------   1Split Distribution    -------------')
console.table(distribution)

let option = {
from: ACCOUNT,
gasLimit: process.env.GAS_LIMIT,
gasPrice: ethers.utils.parseUnits(process.env.GAS_PRICE,9).toString(),
value: ZEROXFEES
}
let TX = await TRADER_CONTRACT.getFlashloan( 
  flashTokenAddress,                                           
  FLASH_AMOUNT, 
  arbTokenAddress,
  data,
  minimunReturn,                                                    
  distribution,
  option
)
const receipt = await TX.wait(1) 
console.log('----------------------------------------------')
console.log(receipt)
console.log('----------------------------------------------')

    }
 
// ORDER DATA FROM ONE SPLIT
const ONE_SPLIT_PARTS = 10
const ONE_SPLIT_FLAGS = 0

async function fetchOneSplitData(args) {
  const { fromToken, toToken, amount } = args
  const data = await oneSplitContract.getExpectedReturn(fromToken, toToken, amount, ONE_SPLIT_PARTS, ONE_SPLIT_FLAGS)
  return(data)
}

/// TIMMING
const wait = (seconds) => {
    const milliseconds = seconds * 1000
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

/// SCANNERS
async function scan0x(takerAsset){
        const zrxResponse = await axios.get(`https://api.0x.org/sra/v3/orders?takerAssetData0xf47261b0000000000000000000000000${takerAsset}&perPage=1000`)
        const zrxData = zrxResponse.data.records
        zrxData.map( async (a) => {
            wait(0.05)
            var s = a.order.makerAssetData.length - 40
            var addr = '0x'+a.order.makerAssetData.substr(s)
            // this is where we add it
             await DB.addErc(addr)  
        })
        return run()      
}


const formatToken = (tokenAmount, decimals) => {
return  ethers.utils.formatUnits(tokenAmount, decimals)
  }


