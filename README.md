OPAL
=========

A module providing a two-way peg binding query and result data to smart contracts and blockchain transactions to OPAL API documents.

## Installation

Not yet available.

<!--  `npm install @keelerh/bismuth`-->

## Usage

```javascript
let client = new EthereumClient({ keyPair: keyPair })
client.deployContract(uri)
  .then(txReceipt => {
    return client.issueQuery({
      querier: {
        uri: '...',
        address: '...'
      },
      // remainder of JWD payload
    }, privateKey)
  })
  .then(queryReceipts => {
  // ...
})
```

Currently, only functionality for the initial contract deployment is implemented. Depending on the contract selected, one of multiple interactionas takes place. If the selected contract is of the bid-ask format, the querier and the target data providers interact with the contract to settle on payment for query execution via a bid-ask exchange. Once the participating data providers and associated payment is settled, the contract is set to the `Locked` state and the target data providers and payments can no longer be modified. At this time, data providers should begin query execution. Following completion of query exection by all specified data providers, the data providers are eligible to collect their payment from escrow following the withdrawl pattern.

## Query Contract as a Finite State Machine

```

+-------------+    +------------+    +-------------+    +------------+
|             |    |            |    |             |    |            |
|   Created   +--->+   Locked   +--->+  Completed  +--->+  Inactive  |
|             |    |            |    |             |    |            |
+------+------+    +------------+    +-------------+    +-----+------+
      |                                                       ^
      |                                                       |
      +-------------------------------------------------------+


```

## Tests

To be implemented.

<!--  `npm test`-->
