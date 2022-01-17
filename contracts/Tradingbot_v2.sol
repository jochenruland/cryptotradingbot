// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
// pargma experimental ABIEncoderV2 no longer necessary from solidity 0.8.0

// LEARNING:
// - DAO Investment concept
// - Integration of Uniswap as DEX to trade on

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";


interface IWETH9 {
    function balanceOf(address account) external view returns (uint256);
    function deposit() external payable;

    function withdraw(uint256 wad) external;
}


contract Tradingbot {
  enum State {
    IDLE,
    CONTRIBUTING,
    TRADING
  }
  State public currentState = State.IDLE;

  struct Asset {
    uint id;
    string sticker;
    address tokenAddress;
    uint lastPrice;
    uint availableFunds;
  }

  address public owner;

  mapping(uint => address) public investors; // registered investors
  mapping(address => uint) public shares; // shares per investor
  mapping(uint => Asset) public assets; // registered token to  % of Portfolio

  uint public nextInvestorId;
  uint public nextAssetId;
  uint public totalShares;
  uint public minAmount;
  uint public contributionEnd;

  // allows to call functions from the Uniswap Factory contract
  IUniswapV3Factory public immutable SwapV3Factory = IUniswapV3Factory(0x1F98431c8aD98523631AE4a59f267346ea31F984);

  // allows to call functions from the Uniswap SwapRouter Interface
  ISwapRouter public immutable SwapRouter = ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);

  // we hardcode the token addresses (in production we would use an input parameter for this)
  address public constant WETH = 0xc778417E063141139Fce010982780140Aa0cD5Ab; // WETH on Rinkeby Testnet
  address public constant DAI = 0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa; // DAI on Rinkeby Testnet

  // UniswapV3 allows 3 different pool fees
  uint24 public poolFee_1 = 500;
  uint24 public poolFee_2 = 3000;
  uint24 public poolFee_3 = 10000;

  // 1a. Define the admin of the investment contract
  constructor() {
    owner = msg.sender;
  }

  // 1b. Seperate initialize() function to reinitialize the contract for trading; not possible if this would be defined in constructor
  function initialize(uint _minAmount, uint duration) external onlyOwner() {
    require(currentState == State.IDLE, "State must be idle");
    minAmount = _minAmount;
    contributionEnd = block.timestamp + duration;

    currentState = State.CONTRIBUTING;
  }

  // 2. DAO concept; anybody can contribute and will be registered as investor
  function contribute() external payable timeOut() {
    require(currentState == State.CONTRIBUTING, "State must be CONTRIBUTING");
    require(msg.value >= minAmount, "You must contribute the minimum amount");
    (bool _success, uint24 _poolFee) = _uniswapV3PoolExists(WETH, DAI);
    require(_success, "Pool does not exist");

    uint256 deadline = block.timestamp + 15; // using 'now' for convenience, for mainnet pass deadline from frontend!
    address tokenIn = WETH;
    address tokenOut = DAI;
    uint24 fee = _poolFee;
    address recipient = address(this);
    uint256 amountIn = msg.value;
    uint256 amountOutMinimum = 1;
    uint160 sqrtPriceLimitX96 = 0;

    ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams(
        tokenIn,
        tokenOut,
        fee,
        recipient,
        deadline,
        amountIn,
        amountOutMinimum,
        sqrtPriceLimitX96
    );


    uint amountOut = SwapRouter.exactInputSingle{ value: msg.value }(params);

    // an investor can contribute mutiple times; therefore shares neet to be +=;
    investors[nextInvestorId] = msg.sender;
    shares[msg.sender] += amountOut;
    totalShares += amountOut;

    // an address is registered as an investor if it has contributed the min amount once and nextInvestorId will be incremented
    nextInvestorId ++;

  }

  // 3. As long as currentState = State.IDLE the owner can cancel the bot and refund the money
  function cancelTradingbot() external onlyOwner() {
    require(currentState == State.CONTRIBUTING, "Bot has started trading and can not be cancled");

    _refundInvestors();

    _reset();
  }


  // 4. Initial buy of token to be traded
  // As long as there are funds of baseCurrency available you can invest in token
  function initialAssetBuy(address _tokenAddress, uint _value) external onlyOwner() {
      require(block.timestamp >= contributionEnd, "Contributtion period not yet passed");
      require(getTokenBalance(DAI) > 0, "No more token of baseCurrency available in this contract");
      require(_value > 0, "Each registered asset must get a value of baseCurrency");
      require( _tokenAddress != DAI, "You can not trade baseCurrency into baseCurrency");

      (bool _success, uint24 _poolFee) = _uniswapV3PoolExists(DAI, _tokenAddress);
      require(_success, "Pool does not exist");

      uint _amountIn = _value;

      ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
        tokenIn: DAI,
        tokenOut: _tokenAddress,
        fee: _poolFee,
        recipient: address(this),
        deadline: block.timestamp + 60,
        amountIn: _amountIn,
        amountOutMinimum: 1,
        sqrtPriceLimitX96: 0
      });

      // Approve the SwapRouter contract for the amount of DAI
      // I first made an error to approve this contract - that's wrong, the DAI was already tranfered to this contract in contribute()
      IERC20(DAI).approve(address(SwapRouter), _amountIn);

      uint _amountOut = SwapRouter.exactInputSingle(params);

      uint _price = uint(_amountIn / _amountOut);

      assets[nextAssetId] = Asset(nextAssetId, getTokenSticker(_tokenAddress), _tokenAddress, _price, 0);
      nextAssetId ++;

      currentState = State.TRADING;

  }

  // 5. Sell token depending on predicted price development
  //
  function sellToken(uint _assetId, /*uint currentPrice,*/ uint predPrice, uint tuner) external onlyOwner() returns (bool _trade) {
    require(currentState == State.TRADING, "Tradingbot must be started first");
    require(getTokenBalance(assets[_assetId].tokenAddress) > 0, "No token available");

    (bool _success, uint24 _poolFee) = _uniswapV3PoolExists(assets[_assetId].tokenAddress, DAI);
    require(_success, "Pool does not exist");

    // Check if price predicted in future x hours < (last buy - tuner)
    if(predPrice < (assets[_assetId].lastPrice - tuner)) {

      uint _amountIn = getTokenBalance(assets[_assetId].tokenAddress);

      ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
        tokenIn: assets[_assetId].tokenAddress,
        tokenOut: DAI,
        fee: _poolFee,
        recipient: address(this),
        deadline: block.timestamp + 15,
        amountIn: _amountIn,
        amountOutMinimum: 1,
        sqrtPriceLimitX96: 0
      });

      // Approve the SwapRouter contract for the amount of token to be traded
      IERC20(assets[_assetId].tokenAddress).approve(address(SwapRouter), _amountIn);

      uint _amountOut = SwapRouter.exactInputSingle(params);

      //Updates the availableFunds of the asset in DAI
      assets[_assetId].availableFunds += _amountOut;

      //Calculates the selling price in DAI
      uint _price = _amountOut /_amountIn;

      assets[_assetId].lastPrice = _price;

      _trade = true;

    }
  }
  //

  // 6. Buy token depending on predicted price development
  function buyToken(uint _assetId, /*uint currentPrice,*/ uint predPrice, uint tuner) external onlyOwner() returns (bool _trade) {
    require(currentState == State.TRADING, "Tradingbot must be started first");
    require(assets[_assetId].availableFunds > 0, "No funds available");

    (bool _success, uint24 _poolFee) = _uniswapV3PoolExists(DAI, assets[_assetId].tokenAddress);
    require(_success, "Pool does not exist");

    // Check if price predicted in future x hours < (last buy - tuner)
    if(predPrice > (assets[_assetId].lastPrice + tuner)) {

      uint _amountIn = assets[_assetId].availableFunds;

      ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
        tokenIn: DAI,
        tokenOut: assets[_assetId].tokenAddress,
        fee: _poolFee,
        recipient: address(this),
        deadline: block.timestamp + 60,
        amountIn: _amountIn,
        amountOutMinimum: 1,
        sqrtPriceLimitX96: 0
      });

      // Approve the SwapRouter contract for the amount of token to be traded
      IERC20(DAI).approve(address(SwapRouter), _amountIn);

      uint _amountOut = SwapRouter.exactInputSingle(params);

      //Updates the availableFunds of the asset in DAI
      assets[_assetId].availableFunds -= _amountIn;

      //Calculates the buying price in DAI
      uint _price = _amountIn /_amountOut;

      assets[_assetId].lastPrice = _price;

      _trade = true;

    }
  }
  //

  // 7. Liquidate portfolio and return money to investors
  function liquidatePortfolio () external payable onlyOwner() {


    for(uint i; i < nextAssetId; i++) {
      if(getTokenBalance(assets[i].tokenAddress) > 0) {
        (bool _success, uint24 _poolFee) = _uniswapV3PoolExists(assets[i].tokenAddress, DAI);
        require(_success, "Pool does not exist");

        uint _amountIn = getTokenBalance(assets[i].tokenAddress);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
          tokenIn: assets[i].tokenAddress,
          tokenOut: DAI,
          fee: _poolFee,
          recipient: address(this),
          deadline: block.timestamp + 15,
          amountIn: _amountIn,
          amountOutMinimum: 1,
          sqrtPriceLimitX96: 0
        });

        // Approve the SwapRouter contract for the amount of token to be traded
        IERC20(assets[i].tokenAddress).approve(address(SwapRouter), _amountIn);

        SwapRouter.exactInputSingle(params);

        //Updates the availableFunds of the asset in DAI
        assets[i].availableFunds = 0;

        //Calculates the selling price in DAI
        uint _price = 0;

        assets[i].lastPrice = _price;

      }
    }

    _refundInvestors();

    _reset();
  }

  // 8. Some view functions
  function getBalance() external view returns(uint) {
    return address(this).balance;
  }

  function getTokenBalance(address tokenAddress) public view returns(uint tokenBalance) {
    tokenBalance = IERC20(tokenAddress).balanceOf(address(this));
  }

  function getTokenSticker(address tokenAddress) public view returns(string memory _sticker) {
    _sticker = IERC20Metadata(tokenAddress).symbol();
  }

  function _uniswapV3PoolExists(address _tokenIn, address _tokenOut) public view returns (bool pool_existence, uint24 _poolFee){
    if( SwapV3Factory.getPool(_tokenIn, _tokenOut, poolFee_1) != address(0) ){
        _poolFee = poolFee_1;
        pool_existence = true;
    }
    else if(SwapV3Factory.getPool(_tokenIn, _tokenOut, poolFee_2) != address(0)){
        _poolFee = poolFee_2;
        pool_existence = true;

    }
    else if(SwapV3Factory.getPool(_tokenIn, _tokenOut, poolFee_3) != address(0)){
        _poolFee = poolFee_3;
        pool_existence = true;

    }

  }

  // swap DAI to WETH, then iterate over the nextInvestorId and refund the contract balance to the investors in relation to their shares
  function _refundInvestors() public payable {
    require(getTokenBalance(DAI) > 0, "No funds to be redistributed");

    (bool _success, uint24 _poolFee) = _uniswapV3PoolExists(DAI, WETH);
    require(_success, "Pool does not exist");

    uint _amountIn = getTokenBalance(DAI);

    ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
      tokenIn: DAI,
      tokenOut: WETH,
      fee: _poolFee,
      recipient: address(this),
      deadline: block.timestamp + 15,
      amountIn: _amountIn,
      amountOutMinimum: 1,
      sqrtPriceLimitX96: 0
    });

    // Approve the SwapRouter contract for the amount of DAI
    // I first made an error to approve this contract - that's wrong, the DAI was already tranfered to this contract in contribute()
    IERC20(DAI).approve(address(SwapRouter), _amountIn);

    SwapRouter.exactInputSingle(params);

    // Unwrap WETH to ETH and send to this contract
    uint balanceWETH = IWETH9(WETH).balanceOf(address(this));

    IERC20(WETH).approve(address(this), balanceWETH);

    if (balanceWETH > 0) {
       IWETH9(WETH).withdraw(balanceWETH);
    }


    // Save value of contract balance and Calculate share for each investor
    require(address(this).balance > 0, "No ether available to be redistributed");
    uint _totalFunds = address(this).balance;

    for(uint i=0; i < nextInvestorId; i++) {
      uint _refund = _totalFunds * shares[investors[i]] / totalShares;
      payable(investors[i]).transfer(_refund);
    }


  }

  function _reset() public {

    // mappings must be cleaned up one by one; delete key word only works for each entry
    for(uint i=0; i < nextInvestorId; i++) {
      delete shares[investors[i]];
      delete investors[i];
    }

    for(uint j=0; j < nextAssetId; j++) {
      delete assets[j];
    }

    nextInvestorId = 0;
    nextAssetId = 0;
    totalShares = 0;
    // Other currentState variables minAmount and contributionEnd must be reinitialized in function initialize()

    delete currentState;

  }


  modifier onlyOwner() {
    require(msg.sender == owner, "Only owner can call this function");
    _;
  }

  modifier timeOut() {
    require(block.timestamp < contributionEnd, "Time over");
    _;
  }

}
