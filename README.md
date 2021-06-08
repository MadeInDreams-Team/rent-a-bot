# MadeInDreams-Team   

Code your own arbitrage trading bot

This is the Rent-A-Bot, a trading bot that is looking for arbitrage opportunity between 0x and 1Inch.
It make uses of the DYDX FLash Loan and a smart contract.


## Installation
The bot uses a Mysql DB. You can install it and provide the logging credentials in the .env

```npm install```

Rename the .envexample to .env
Edit the .env file with your;

- Infura ID & Secret
- Your private key (The one used to deploy your contract)
- TradeBot contract address
- Gas settings 
- Interval

You can find the contract in the './src/contracts' folder

Leave 100 Wei in the contract balance 


## Start

```npm start```


Add you favorite exchanges.

This bot Uses Ethers and can sign transactions.

the ```run()``` function is the core.




