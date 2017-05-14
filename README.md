OPAL
=========

A module providing a two-way peg binding query and result data to smart contracts and blockchain transactions to OPAL API documents.

## Installation

Not yet available.

<!--  `npm install @keelerh/opal`-->

## Usage

```javascript
opal.deployContract(uri, privateKey)
  .then(txReceipt => {
    return opal.issueQuery({
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

Currently, only functionality for the initial contract deployment is implemented. After a new Query contract is deployed, a querier and
the target data providers interact with the contract to settle on
payment for query execution via a bid-ask exchange. Once the participating
data providers and associated payment is settled, the contract is set to the `Locked` state and the target data providers and payments can no longer be modified. At this time, data providers should begin query execution. 
Following completion of query exection by all specified data providers, the data providers are eligible to collect their payment from escrow following
the withdrawl pattern.

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

## Running the Example

#### Set up Ethereum environment
1. `npm install -g ethereumjs-testrpc`
2. Start a local chain for development: `$ testrpc`

#### Run the package

1. `npm install`
2. Replace `{$YOUR_PRIVATE_KEY}` in `examples/deploy-contract.js:8` with
	one of the keys listed under `Private Keys` in the console running the
	local dev chain
3. `$ node examples/deploy-contract.js`

## Tests

To be implemented.

<!--  `npm test`-->