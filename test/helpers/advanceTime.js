const advanceTime = s => {
  return new Promise((resolve, reject) => {
    const id = new Date().getTime()
    web3.currentProvider.sendAsync(
      {
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [s],
        id,
      },
      function(err) {
        if (err) return reject(err)
        web3.currentProvider.sendAsync(
          {
            jsonrpc: '2.0',
            method: 'evm_mine',
            id: id + 1,
          },
          (err2, res) => {
            return err2 ? reject(err2) : resolve(res)
          }
        )

        resolve()
      }
    )
  })
}

module.exports = {advanceTime}
