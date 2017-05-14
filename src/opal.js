/**
 * Dependencies
 */
const fs = require('fs');
const Web3 = require('web3');
const EthereumUtils = require('./utils/ethereum-utils');
const MathHelpers = require('./utils/math-helpers.js');


/**
 * Open Algorithms (OPAL)
 */
class OPALQuerier {

  constructor(config) {
    let web3 = new Web3();
    let _provider = new web3.providers.HttpProvider(config.provider);
    web3.setProvider(_provider);
    this.web3 = web3;
    this.helpers = new MathHelpers(this.web3);
    this.utils = new EthereumUtils(this.web3);
  }

  /**
   * Validate a QueryContractDocument.
   *
   * @param {Object} payload
   * @return {boolean} is valid
   */
  // TODO: pass in signed JWD instead of simple JSON object
  validate (payload) {
    // TODO: add additional validation checks for JWD signatures/expiration
    // and for conformity to QueryContractDocument schema (all requisite
    // fields present, proper field types, etc.)

    // 1. validate JWD
    // 2. extract payload

    // Confirm that the source matches the pre-compiled bytecode
    let compiledContract = this.utils.compile(payload.source);
    let bytecode = compiledContract.bytecode;
    let bytecodeMatchesSource = (bytecode == payload.bytecode);

    return bytecodeMatchesSource;
  }

  /**
   * Deploy a new contract specified in a signed JWD.
   *
   * @param {String} filename of query contract document
   * @return {Object} the transaction receipt
   */
  // TODO: update filename to instead be a URI
  deployContract(filename, privateKey) {
    let source = fs.readFileSync(filename, 'utf8');
    let payload;
    try {
      payload = JSON.parse(source).payload;
    } catch (err) {
      return console.error(err);
    }

    if (!this.validate(payload)) {
      throw new Error("invalid query contract");
    }

    let address = this.helpers.computeAddressFromPrivateKey(privateKey);
    let queryURI = this.helpers.getQueryUriInHex(payload.queryURI);
    let bytecode = payload.bytecode + queryURI;
    let tx = this.utils.createRawTransaction(bytecode, address, '0x0');
    let key = Buffer.from(privateKey, 'hex');
    tx.sign(key);
    let serializedTx = tx.serialize();

    let txHash = this.web3.eth.sendRawTransaction(serializedTx.toString('hex'));

    console.log("Attempting to deploy contract from account: ", this.web3.eth.coinbase);
    console.log("Transaction completed.")
    console.log("Transaction hash: ", txHash)

    return this.getAsyncTransactionReceipt(txHash);
  }

  /**
   * Watch the Ethereum blockchain for a transaction to be mined.
   *
   * @param {String} filename of query contract document
   * @return {Object} the transaction receipt from deploying new contract
   */
  getAsyncTransactionReceipt(txHash) {
    let blockFilter = this.web3.eth.filter('latest');
    let promise = new Promise((resolve, reject) => {
      blockFilter.watch( () => {
        this.web3.eth.getTransactionReceipt(txHash, (err, receipt) => {
          if (err) {
            console.error(err);
            reject(err);
          }
          if (receipt) {
            blockFilter.stopWatching();
            console.log("Contract deployed to address: ", receipt.contractAddress);
            resolve(receipt);
          }
        });
      });
    });
    return promise;
  }

  /**
   * Get instance of the Query contract at a given address.
   *
   * @param {Object} abi of the deployed contract
   * @param {String} contractAddress of deployed contract
   * @return {Query}
   */
  getQueryInstance(source, contractAddress) {
    let abi = utils.getABI(source);
    let Query = web3.eth.contract(abi);
    return Query.at(contractAddress);
  }

  static submitBid(queryInstance, to, bid) {
      queryInstance.submitBid(to, bid, {from: address, gas: 3000000, value: config.web3.toWei(1, 'ether')});
  }

  static getState(queryInstance) {
      let state = queryInstance.getState({from: address, gas: 3000000});
  }

}

module.exports = OPALQuerier
