const Tradingbot_v2 = artifacts.require("Tradingbot_v2");

// Do not forget to pass constructor arguments to deploy function!
module.exports = function (deployer) {
  deployer.deploy(Tradingbot_v2);
};
