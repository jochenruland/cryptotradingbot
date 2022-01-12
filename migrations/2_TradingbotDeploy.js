const Tradingbot = artifacts.require("Tradingbot");

// Do not forget to pass constructor arguments to deploy function!
module.exports = function (deployer) {
  deployer.deploy(Tradingbot);
};
