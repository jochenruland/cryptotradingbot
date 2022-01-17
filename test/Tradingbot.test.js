//------------------- requiring some testing Libraries---------------------------------------------------------------------------
const { expectRevert, time } = require('@openzeppelin/test-helpers');
const assert = require('assert');

//--------------------configuring web3---------------------------------------------------------------------------
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

//-------------------------------------------------------------------------------------------------------------------------------

const compiledContractJson = require('../build/contracts/Tradingbot.json');

process.env.UV_THREADPOOL_SIZE=10;


let accounts;
let contractInstance;

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


  it('Initializes account[0] as the owner', async () => {
    const owner = await contractInstance.methods.owner().call();
    console.log(accounts[0], owner);
    assert.equal(accounts[0], owner);
  });

  it('Initializes tradingsbot, allows to contribute from different accounts and swaps Ether to Dai', async () => {

    await contractInstance.methods._reset().send({
      from: accounts[0]
    });

    let contractState = await contractInstance.methods.currentState().call();
    console.log(contractState);


    await contractInstance.methods.initialize(100, 120).send({
      from: accounts[0]
    });


    const min = await contractInstance.methods.minAmount().call();
    console.log(min);
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

    contractState = await contractInstance.methods.currentState().call();
    console.log("Contract state:" , contractState);

    await contractInstance.methods.cancelTradingbot().send({
      from: accounts[0]
    });

    balance = await contractInstance.methods.getTokenBalance('0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa').call();
    balance = parseFloat(balance);
    console.log(balance);
    assert(balance == 0);

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
    //await expectRevert(contractInstance.methods.contribute().send({from: accounts[1], value: '1000'}), 'Time over');
  });
*/

  it('Cancel tradingbot', async () => {
    const contractState = await contractInstance.methods.currentState().call();
    console.log("Contract state:" , contractState);

    await contractInstance.methods.cancelTradingbot().send({
      from: accounts[0]
    });

    let balance = await contractInstance.methods.getTokenBalance('0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa').call();
    balance = parseFloat(balance);
    console.log(balance);
    assert(balance == 0);
  });

/*

  it('Owner can send Ether from the contract to any address', async () => {
    await contractInstance.methods.send(accounts[2], web3.utils.toWei('2','ether')).send({
      from: accounts[0],
      gas: '1000000'
    });
    const contractBalance = await contractInstance.methods.balanceOf().call();
    console.log(web3.utils.fromWei(contractBalance,'ether'));
    console.log(await web3.eth.net.getId());
  });
  */

})
