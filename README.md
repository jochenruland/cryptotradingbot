# This project is under construction !!!

# Crypto-Tradingbot - Tutorial
## I. Scope
This project provides a Tradingbot for ERC20 tokens on the Ethereum blockchain. The main developments can be found in the smart contract `./contracts/Tradingbot_v2.sol` and the testing script `./test/Tradingbot.test.js`.

The Tradingbot will be run automatically using a node.js script and a cron job (sheduled task on Windows) which are both still under construction.

The main purpose of this application is to create a tutorial teaching the following components of a decentralized application (dApp)

### Module 1:
1. Using Truffle as a development environment for dApps
2. Creating advanced smart contracts introducing the following concepts
  - general aspects: enum, structs, mappings vs. arrays, modifiers and different function types
  - organizing joint investments using the DAO concept (Decentralized Autonomous Organization)
  - handling ERC20 token using the OpenZeppelin library
  - integration of decentralized exchanges, specifically UniswapV3
  - handling Ether on decentralized exchanges using WETH9
3. Deploying and testing the smart contract on Rinkeby test network using Remix
4. Configuration and deployment to Rinkeby test network with Truffle
5. Writing test scripts with Javascript/Web3 library and testing with mocha   

### Module 2: "under construction"
6. Connecting oracle smart contracts to request price information
7. Creating a node.js script to initialize the Tradingbot
8. Setup a cron job (sheduled task on Windows) to automatically trade ERC20 tokens

## II. Modules and Functions
### 1. Smart Contract Tradingbot_v2.sol
The smart contract contains the main functions for handling and trading ERC20 tokens on the blockchain. There is only one "owner/manager" of the tradingbot but multiple "investors" are allowed. The "owner/manager" can but is not obliged to become an investor.

#### i. Constructor
`constructor()`
The constructor does not take any arguments. It defines the owner of the tradingbot as the msg.sender.

#### ii. External Functions
`function initialize(uint _minAmount, uint duration) external onlyOwner()`
This function initializes the tradingbot defining the minimum contribution amount and the open period for contribution of investors. It defines the time frame for investments. After that period no further investments will be accepted. Only the owner can initialize the tradingbot.

`function contribute() external payable timeOut()`
Any Ethereum address (EOA and other smart contracts) is allowed to invest by calling this function and contributing at least the minimum amount of Ether as long as the contribution period is open. The base currency of this tradingbot is DAI. Therefore all contributions in Ether will immediately be swapped to DAI. Any contributing investor will be registered and attributed the amount of shares which corresponds to the contributing amount in relation to the total amount.

`function cancelTradingbot() external onlyOwner()`
There might be situations where only a few investors contribute small amounts of Ether or the general investment opportunities are unfavorable so that the owner/manager decides not to start the tradingsbot. In this case the owner can call the above function which refunds the contributions to the original investors according to their shares.

`function initialAssetBuy(address _tokenAddress, uint _value) external onlyOwner()`
With this function the owner/manager of the tradingbot can buy the initial set off assets means ERC20 tokens and start the tradingbot. This process is somehow contradictory to the idea of a DAO, where normally all contributers/investors would be allowed to make investment proposals on which the community of investors then decides. The process has been simplified in this case as the main purpose is to present the concept of a tradingbot with all different aspects. Therefore here only the owner/manager decides on the initial set of assets. Once the first asset has been purchased the tradingbot is started. The owner/manager is allowed to further invest until

`function sellToken(uint _assetId, uint predPrice, uint tuner)  external onlyOwner()`
Once the tradingbot has been started a cron job (or sheduled task on Windows) will regularly request price information for each asset (referenced by assetID) from an external API (for example from central exchanges like Coinbase) and calculate a predicted price as well as a tuner for the corresponding asset. The predicted price can be calculated using linear regression or other algorithms like polynomial regression f.ex. The tuner can be the standard deviation or a multiple derived from the historical price information of the asset. The calculation of these parameters is not part of this project. Based on these parameters, which will be passed as arguments to the sellToken  and the buyToken function by the cron job from the account of the owner/manager, the tradingbot decides wether to sell or buy the corresponding asset.

`function buyToken(uint _assetId, uint predPrice, uint tuner) external onlyOwner()`
Cf. above function sellToken.

`function liquidatePortfolio () external payable onlyOwner()`
After the owner/manager has made the first investment, the portfolio can be liquidated at any time. The assets will be swapped back to Ether and the balance of the tradingbot will be redistributed to the investors in correspondence to their amount of shares.  

`function getBalance() external view returns(uint)`
Returns the balance of the tradingbot contract in WEI.

`function getTokenBalance(address tokenAddress) public view returns(uint tokenBalance)`
Returns the balance of the tradingbot contract on any ERC20 token specified by tokenAddress.

`function getTokenSticker(address tokenAddress) public view returns(string memory _sticker)`
Returns the symbol of an ERC20 token specified by tokenAddress.

#### iii. Internal Functions
The following functions have been specified as public to make testing easier. In a later deployment on mainnet they will be specified as internal functions.

`function _refundInvestors() public payable`
Calling this function will initiate a sell out of all existing assets, swap the DAI back into Ether and refund the investors in correspondence to their shares.

`function _reset() public`
After the tradingbot has been cancled or liquidated this function resets all state variables and changes the current state of the tradingbot to IDLE. Thus the tradingbot can be started again.

#### iv. Modifiers
`modifier onlyOwner()`
Requires the owner/manager to execute the function marked with this modifier

`modifier timeOut()`
Requires the contribution period to be not yet over in order to execute the function marked with this modifier.

### 2. Testfile Tradingbot.test.js
The testfile `Tradingbot.test.js` contains unit tests for all main functions and an integration test. Once you have deployed the smart contract you can run the test script by using `truffle test --network {yourNetwork}`. The network configuration is done in the `truffle-config.js` file. You can find all details regarding the truffle configuration in the truffle documentation. 

## III. Installation
You can deploy your own instance of the tradingbot to any Ethereum testnet or the mainnet. Therefore clone this repo to the preferred directory on your computer using `git clone https://github.com/jochenruland/cryptotradingbot`. Then you have to create your own `.secret` file in the root directory containing the mnemonic of your wallet.

The following dependencies have been installed to run the code:

```
"dependencies": {
  "@openzeppelin/contracts": "^4.4.1",
  "@openzeppelin/test-helpers": "^0.5.15",
  "@truffle/hdwallet-provider": "^2.0.0",
  "@uniswap/v3-periphery": "^1.3.0",
  "mocha": "^9.1.3",
  "web3": "^1.6.1"
}
```
They can be found in `package.json`.
