const EthereumClient = require('../src/')
const crypto = require('@trust/webcrypto')
const TestRPC = require('ethereumjs-testrpc')


crypto.subtle.generateKey(

    // use WebCrypto to generate new ECDSA secp256k1 keypair
    {
      name: 'ECDSA',
      namedCurve: 'K-256',
      hash: { name: 'SHA-256' }
    },
    true,
    ['sign', 'verify']
  )

  .then(keyPair => {
    return new EthereumClient({ keyPair: keyPair})
  })

  .then(client => {
    return client.deployContract('jwds/ContractIssuanceResponse.json')
  })

  .then(txReceipt => {
    console.log(txReceipt)
    // TODO...
    //   return client.issueQuery({
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

  .catch(console.error)
