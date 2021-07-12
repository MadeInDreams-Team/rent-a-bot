require('dotenv').config({ silent: true })
const mysql =require('mysql')
const ethers = require('ethers')
const ERC20_ABI = require('../src/abis/erc20.json')
const axios = require('axios')
var pool = mysql.createPool({
  host     : process.env.DB_HOST,
  user     : process.env.DB_USER,
  password : process.env.DB_PASS,
  database : process.env.DB_NAME,
  port: process.env.DB_PORT,
  charset: "utf8_general_ci"
});
const DBInit = async () =>{
  
  return new Promise(resolve => {
    pool.query( "SELECT * FROM information_schema.tables WHERE table_schema = 'madeindr_public' AND table_name = 'erc20' LIMIT 1", async function(err,res){
      console.log('DB connection', err)
     if(res.length > 0){
       // we do nothing table is already created
       resolve(false)
     }
     else{
       // we create it
       pool.query( `CREATE TABLE IF NOT EXISTS erc20 (
        
        address VARCHAR(42) NOT NULL PRIMARY KEY,
        symbol VARCHAR(20),
        name   VARCHAR(25),
        decimals INT,
        USD INT,
        scam BOOLEAN,
        date DATE

        )`,
        async  function(err, res){
          //console.log(res)
       if(!err){
          pool.query(` INSERT INTO erc20 (address,symbol,name,decimals) VALUES ('0x0000000000000000000000000000000000000000','ETH','Ether','18') `, function(err, res){
             if(!err) {
               // we r done
             } else {
               console.log('‼️ \x1b[33m COULD NOT INSERT IN TABLE \x1b[0m'); 
            }
          })
          resolve(true)
        }
        else{
           console.log('‼️ \x1b[33m COULD NOT CREATE DB \x1b[0m'); 
        }
      })
     }
    })

  })
}


const addErc = async (address) => {
  return new Promise(resolve => {
    // Check if token exist
    pool.query( `SELECT * FROM  erc20 WHERE address = '${address}'` ,async  function(err, res){

    let data = []

    if(!err) {
      if(res.length > 0){
        console.log('\x1b[33m '+res[0].name+' already in DB\x1b[0m')
        data = false
        resolve(data)
      }
      else{
        let provider = ethers.getDefaultProvider('https://mainnet.infura.io/v3/'+ process.env.INFURA_ID, process.env.INFURA_SECRET)
          try{

            let erc20 = new ethers.Contract( address, ERC20_ABI , provider)

            //console.log(ethers.utils.keccak256(erc20))
            let name, symbol, decimals

            name =  await erc20.name()
            symbol = await erc20.symbol()
            decimals = await erc20.decimals()
        
            data = [{
               "name" : name,
               "symbol": symbol,
               "address": address,
               "decimals": decimals
              }]

            pool.query(` INSERT INTO erc20 (address,symbol,name,decimals) VALUES ('${address}','${symbol}','${name}','${decimals}') `, async function(err, res){
              if(!err) {
                console.log("\x1b[32m%s\x1b[0m",'INSERTED '+ symbol +' IN DB'); 
              } else {
                console.log('‼️ \x1b[33m COULD NOT INSERT IN DB \x1b[0m'); 
                resolve(data)
              }
            });
         }
         catch(e){
          console.log('‼️ \x1b[33m NO CONTRACT FOUND \x1b[0m')
          data = false
         }
    resolve(data)
      }
    } else {
      console.log('‼️ \x1b[33m COULD NOT CONNECT TO DB \x1b[0m'); 
      throw err;   
    }
  });
});

}
              
const loadErc = async () => {
  return new Promise(resolve => {
   pool.query(" SELECT * FROM  erc20 ", function(err, res){
     if(!err) {
      let n = res.length
      let data = []
      let i = 0
      for(i=0;i<n;i++){
        data[res[i].address] = {  
           symbol : res[i].symbol,
           decimals : res[i].decimals,
        }
      }
       resolve(data)
     } else { 
      console.log('‼️ \x1b[33m COULD NOT LOAD TOKEN FROM DB \x1b[0m');    
     }
     });
  })
}


const updatePrice = async () => {
  return new Promise(resolve => {
  try {
      const instance = axios.create({
      method: 'GET',
      uri: 'https://basic-api.coinmarketcap.com/v1/',
      timeout: 3000,
      qs: {
          'start': '1',
          'limit': '5000',
          'convert': 'USD'
        },
      headers: {
          'X-CMC_PRO_API_KEY': process.env.MARKET_KEY 
      },
      json: true,
      gzip: true
    });

    response  =  instance.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest').then( function (response) {
    console.log(response.data.data[0].quote.USD.price);
    // We need to update the Database

     const marketData = response.data.data

     marketData.map( async (c) => {

      pool.query(` UPDATE erc20 SET USD =  '${c.quote.USD.price}' WHERE symbol ='${c.symbol}' `, async function(err, res){
        if(!err) {
          console.log("\x1b[32m%s\x1b[0m",'UPDATED '+ c.symbol +' PRICE'); 
       
        } else {
          console.log('‼️ \x1b[33m COULD NOT UPDATE PRICE \x1b[0m'); 
        }
      })
     })
 })  
      }
   catch (error) {
    console.error(error);
  }
  resolve(true)
})
}

module.exports =
   {
     DBInit,
     addErc,
     loadErc,
     updatePrice
     // ...
   }