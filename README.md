# This project is under construction !!!

# Crypto-Tradingbot - Tutorial
## I. Scope
1. Deposit :
  - allows to send Ether to the smart contract
  - register the amount of Ether per Investor
2. Liquidate Portfolio
  - Sell all token in relation to initial contribution
  - Register amount of Ether per Investor
3. Withdraw Ether
  - Investor can send Ether from SC to his address
  - If amount of Ether > Initial contribution -> 4% of Profit goes to owner of the contract
4. Configure Base currency
  - define the token to which the bot shall sell -> Default DAI; could also be WETH
5. Register tokens to trade with -> only owner
  - Pass in an array of ticker and Portfolio allocation in %
  - Register tokens as allowed Portfolio
6. Trade
  - Pass in (ticker, future value X days, stdev)
  - Request current value from DEX
  - Case 0 - Start investing
    - split Ether balance in % values per token
    - buy token for Ether on DEX
    - set tokenTrading = true
  - Case 1:
    - for each token, do:
    - if: future value >= current value -> break
    - elseif: future evalue < current value && future value > (current value - 2 * Stdev) -> break
    - else:
      - trade ticker against base currency (DAI)
      - register DAI Value & Tokenprice
  - Case 2:  
    - for each token
      - if token trading == true && balance == 0
        - if if future value  > (last trading value + 2 * Stdev)
          - Trade DAI value against Token
