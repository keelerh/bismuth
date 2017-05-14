/**
 * Dependencies
 */
const Tx = require('ethereumjs-tx');
const solc = require('solc');


class EthereumUtils {

  constructor(web3) {
    this.web3 = web3;
  }

  /**
   * Compile Solidity code into Ethereum bytecode.
   *
   * @param {String} source human-readable Solidity code
   * @return {String}
   */
  compile(source) {
    let output = solc.compile(source, 1);
    let result = output.contracts[':Query'];
    return result;
  };

  /**
   * Retrieves a contract's ABI (Application Binary Interface).
   *
   * @param {String} source human-readable Solidity code
   * @return {Object}
   */
  getABI(source) {
    let result = this.compile(source);
    let abi;
    try {
      abi = JSON.parse(result.interface);
    } catch (err) {
      console.log(err);
    }
    return abi;
  };

  /**
   * Assemble a raw transaction to send to the Ethereum blockchain.
   *
   * @param {Object} bytecode of transaction
   * @param {String} from querier's address
   * @param {String} to data provider's address
   * @return {Tx}
   */
  createRawTransaction(bytecode, from, to) {
    let _gasPrice = this.web3.toHex(this.web3.eth.gasPrice);
    let _gasLimit = this.web3.toHex(4700000);
    let _nonce = this.web3.toHex(this.web3.eth.getTransactionCount(from));

    let _rawTx = {
      nonce: _nonce,
      gasPrice: _gasPrice,
      gasLimit: _gasLimit,
      data: '0x' + bytecode,
      from: from
    }
    return new Tx(_rawTx);
  }

}

module.exports = EthereumUtils
