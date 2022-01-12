
//------------------------------------------------------------------------------------------

const assert = require('assert');

const Web3 = require('web3'); // Web3 Library

const web3 = new Web3(provider); // web3 instance using the current provider

const compiledContractJson = require('../build/contracts/Tradingbot_v2.json');

let accounts;
let contractInstance;

beforeEach(async () => {
  accounts = await web3.eth.getAccounts();

  const deploymentKey = Object.keys(compiledContractJson.networks)[0];
  contractInstance = await new web3.eth.Contract(compiledContractJson.abi, compiledContractJson.networks[deploymentKey].address);
});


describe('Testing Tradingbot_v2', () => {
  it('Deploys a contract', () => {
    console.log(contractInstance.options.address);
    assert.ok(contractInstance.options.address);
  });

  /*
  it('Initializes owner by msg.sender', async () => {
    const owner = await contractInstance.methods.owner().call();
    console.log(accounts[0], owner);
    assert.equal(accounts[0], owner);
  });

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
