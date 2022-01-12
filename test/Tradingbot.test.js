const { expectRevert, time } = require('@openzeppelin/test-helpers');
const assert = require('assert');
const Web3 = require('web3'); // Web3 Library

const web3provider = new Web3.providers.HttpProvider('https://rinkeby.infura.io/v3/e9fbb5967c14460cbf78edd9d129532f');

const web3 = new Web3(web3provider);

const compiledContractJson = require('../build/contracts/Tradingbot.json');

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

  it('Initializes owner by msg.sender', async () => {
    const owner = await contractInstance.methods.owner().call();
    console.log(accounts[0], owner);
    assert.equal(accounts[0], owner);
  });

  it('Initializes contribution period and minAmount', async () => {
    await contractInstance.methods.initialize(100, 120).send({
      from: accounts[0],
      gas: '1000000'
    })
    const min = contractInstance.methods.minAmount().call();
    assert.equal(100, min);
  });


  /*
  it('Can recieve Ether', async () => {
    const tx = await contractInstance.methods.deposit().send({
      from: accounts[0],
      value: web3.utils.toWei('10', 'ether'),
      gas: '1000000'
    });
    console.log(tx.status);
    assert.ok(tx.status);
  });

  it('Shows the balance of the Contract', async () => {
    const contractBalance = await contractInstance.methods.balanceOf().call();
    console.log(web3.utils.fromWei(contractBalance,'ether'));
  });

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
