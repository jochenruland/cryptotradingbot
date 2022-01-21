
//--------------------configuring web3 for rinkeby/mainnet---------------------------------------------------------------------------
  // As we are not in the frontend application, we need the hdwallet-provider which provides some hdwallet features on top of the http protocol
  // When we configure web3 for our frontend application we can use the http provider
const HDWalletProvider = require('@truffle/hdwallet-provider');

// Read in mnemonic from file
const fs = require('fs');
const path = require('path');
const secretPath = path.resolve(__dirname, '..', '.secret');
const mnemonic = fs.readFileSync(secretPath, 'utf8').toString().trim();


const Web3 = require("web3");

const provider = new HDWalletProvider(mnemonic, `wss://rinkeby.infura.io/ws/v3/e9fbb5967c14460cbf78edd9d129532f` )

const web3 = new Web3(provider);

//------------------- requiring some testing Libraries---------------------------------------------------------------------------
//require('@openzeppelin/test-helpers/configure')({provider: () => new HDWalletProvider(mnemonic, `wss://rinkeby.infura.io/ws/v3/e9fbb5967c14460cbf78edd9d129532f`});


const { expectRevert, time } = require('@openzeppelin/test-helpers');
const assert = require('assert');

const { advanceTime } = require('./helpers/advanceTime');


//----------------------configuring web3 for local mainnetFork using ganache-cli-----------------------------------------------------

//const ganache = require('ganache-cli');
//const Web3 = require('web3');
//const web3 = new Web3('http://localhost:8545');

//----------------------------------------------------------------------------------------------------------------------------------

const compiledContractJson = require('../build/contracts/Tradingbot.json');

process.env.UV_THREADPOOL_SIZE=10;


let accounts;
let contractInstance;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// before() will only create one web3 instance of the contract; beforeEach() creates a new web3 instance before each it-statement
beforeEach(async () => {
  accounts = await web3.eth.getAccounts();

  const deploymentKey = Object.keys(compiledContractJson.networks)[0];

  contractInstance = await new web3.eth.Contract(compiledContractJson.abi, compiledContractJson.networks[deploymentKey].address);
});


describe('Testing Tradingbot_v2', () => {
  it('Contract available on Rinkeby', () => {
    console.log(contractInstance.options.address);
    console.log(accounts);

    assert.ok(contractInstance.options.address);
  });

/*
  it('Initializes account[0] as the owner', async () => {
    const owner = await contractInstance.methods.owner().call();
    console.log(accounts[0], owner);
    assert.equal(accounts[0], owner);
  });

  it('Initializes tradingsbot, allows to contribute from different accounts and swaps Ether to Dai', async () => {

    await contractInstance.methods._reset().send({
      from: accounts[0]
    });


    await contractInstance.methods.initialize(100, 120).send({
      from: accounts[0]
    });


    const min = await contractInstance.methods.minAmount().call();
    console.log("Minimum Amount: ", min);
    assert.equal(100, min);

    await contractInstance.methods.contribute().send({
      from: accounts[0],
      value: '1000'
    });

    let balance = await contractInstance.methods.getTokenBalance('0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa').call();
    balance = parseFloat(balance);
    console.log(balance);
    assert(balance > 0);

    await contractInstance.methods.contribute().send({
      from: accounts[1],
      value: '1000'
    });

    const oldBalance = balance;
    balance = await contractInstance.methods.getTokenBalance('0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa').call();
    console.log(balance);
    assert(balance > oldBalance);

  });

  it('Requires the minimum contribution', async () => {
    try {
      await contractInstance.methods.contribute().send({
        from: accounts[1],
        value: '80'
      });
      assert(false); // if it has not thrown an error until this line, the test must fail
    } catch(err) {
      console.log(err);
      assert(err);
    }
  });
*/
  it("Shows all state variables", async () => {
    const contractState = await contractInstance.methods.currentState().call();
    console.log("Contract State: ", contractState);

    const investorID = await contractInstance.methods.nextInvestorId().call();
    console.log("InvestorID: ", investorID);

    const assetID = await contractInstance.methods.nextAssetId().call();
    console.log("AssetID: ", assetID);

    const totalShares = await contractInstance.methods.totalShares().call();
    console.log("shares1, shares2, totalShares: ", totalShares);

    const min = await contractInstance.methods.minAmount().call();
    console.log("MinAmount: ", min);

    const contributionEndTime = await contractInstance.methods.contributionEnd().call();
    console.log("End of contribution: ", contributionEndTime);

  });

/*
  it('Cancel tradingbot', async () => {
    const contractState = await contractInstance.methods.currentState().call();
    console.log("Contract state:" , contractState);

    await contractInstance.methods.cancelTradingbot().send({from: accounts[0]});

    let balance = await contractInstance.methods.getTokenBalance('0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa').call();
    balance = parseFloat(balance);
    console.log(balance);
    assert(balance == 0);
  });

*/

/*
  // This test will only work on local testing environment as you cannot advance time of a public BC
    it('No longer allows contribution after contribution period is over', async () => {

      await contractInstance.methods._reset().send({
        from: accounts[0]
      });

      const contractState = await contractInstance.methods.currentState().call();
      console.log(contractState);

      await contractInstance.methods.initialize(100, 120).send({
        from: accounts[0]
      });

      await time.increase(time.duration.seconds(30));
      console.log("Get up to here");
      await expectRevert(contractInstance.methods.contribute().send({from: accounts[1], value: '1000'}), 'Time over');
    });

*/

  it('Buys an initial asset if pool exists', async () => {

    await contractInstance.methods._reset().send({
      from: accounts[0]
    });

    await contractInstance.methods.initialize(100, 70).send({
      from: accounts[0]
    });


    const min = await contractInstance.methods.minAmount().call();
    console.log("Minimum Amount: ", min);
    assert.equal(100, min);

    await contractInstance.methods.contribute().send({
      from: accounts[0],
      value: '1000'
    });

    let balance = await contractInstance.methods.getTokenBalance('0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa').call();
    balance = parseFloat(balance);
    console.log("Balance after first contribution: ", balance);
    assert(balance > 0);

    await contractInstance.methods.contribute().send({
      from: accounts[1],
      value: '1000'
    });

    const oldBalance = balance;
    balance = await contractInstance.methods.getTokenBalance('0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa').call();
    console.log("Balance after second contribution: ", balance);
    assert(balance > oldBalance);

    console.log("Timestamp before: ", 99);
    await sleep(70000);
    console.log("Timestamp after: ", 199);

    const investAmount = 5000000;
    await contractInstance.methods.initialAssetBuy('0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', 50000000000).send({from: accounts[0]});

    console.log("Timestamp after: ", 299);

    balance = await contractInstance.methods.getTokenBalance('0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984').call();
    console.log("Balance of UNI: ", balance);


  });
/*

  it('Sells the initial asset if prediction below asset.price', async () => {

    let artPricePrediction = await contractInstance.methods.assets[0].lastPrice().call();

    artPricePrediction = parseInt(artPricePrediction / 2);

    await contractInstance.methods.sellToken(0, artPricePrediction, 3).send({from: accounts[0]});

  });

  it('Buys the initial asset if prediction above asset.price', async () => {

    let artPricePrediction = await contractInstance.methods.assets[0].lastPrice().call();

    artPricePrediction = parseInt(artPricePrediction * 2);

    await contractInstance.methods.buyToken(0, artPricePrediction, 3).send({from: accounts[0]});

  });

*/

})
