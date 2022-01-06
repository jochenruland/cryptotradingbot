const Tradingbot = artifacts.require("Tradingbot");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("Tradingbot", function (/* accounts */) {
  it("should assert true", async function () {
    await Tradingbot.deployed();
    return assert.isTrue(true);
  });
});
