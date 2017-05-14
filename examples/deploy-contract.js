const OPALQuerier = require('../src/')
const Web3 = require('web3');

let opal = new OPALQuerier({ provider: 'http://localhost:8545'})


let txHash = opal.deployContract('{query_contract_path}', '{private_key}')
  .then(txReceipt => {
    console.log(txReceipt)
    // TODO...
    //   return opal.issueQuery({
    //     querier: {
    //       uri: '...',
    //       address: '...'
    //     },
    //     // remainder of JWD payload
    //   }, privateKey)
    // })
    // .then(queryReceipts => {
    //   console.log(queryReceipts);
    //   // ...
    // })
  })
  .catch(console.error);
