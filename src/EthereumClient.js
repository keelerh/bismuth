/**
 * Dependencies
 */
const { JWT, JWD } = require('@trust/jose')
const crypto = require('@trust/webcrypto')
const CryptoJS = require('crypto-js')
const fs = require('fs')
const keyto = require('@trust/keyto')
const solc = require('solc')
const TestRPC = require('ethereumjs-testrpc')
const Tx = require('ethereumjs-tx')
const Web3 = require('web3')


class EthereumClient {

  constructor(config) {
    this.keyPair = config.keyPair 
    this.secretKey = keyto.from(this.keyPair.privateKey.handle, 'pem').toString('blk', 'private')

    // @todo Switch to provider being passed from config
    this.web3 = new Web3(TestRPC.provider({
      accounts: [{
          secretKey: '0x' + this.secretKey,
          balance: '0x100000000000000000'  // fund newly generated account
        }]
    }))
  }

  /**
   * Validate a QueryContractDocument.
   *
   * @param {Object} token
   * @return {boolean} is valid
   *
   * @todo
   * Validate conformity of JWD to QueryContractDocument format
   */
  validate(jwd) {

    // @todo
    // Get public key from .well-known instead of hard-coded file
    // let source = fs.readFileSync('../examples/jwds/publicKey.pem', 'utf8')
    // let pubKey = keyto.from(source, 'pem')
    // console.log(pubKey)

    // 1. validate JWD
    // let result = JWT.verify({ serialized: jwd, cryptoKey: pubKey, result: 'instance' })
    // console.log(result)

    // 2. confirm that the source matches the pre-compiled bytecode
    let compiledContract = this.compile(jwd.payload.source)
    let bytecodeMatchesSource = (compiledContract.bytecode == jwd.payload.bytecode)

    // return validJwd && bytecodeMatchesSource
    return bytecodeMatchesSource
  }

  /**
   * Deploy a new contract specified in a signed JWD.
   *
   * @param {String} filename of query contract document
   * @return {Object} the transaction receipt
   *
   * @todo
   * Update filename to instead be a URI and sort out key
   * management (private key should not be an arg)
   */
  deployContract(filename, keyPair) {
    let source = fs.readFileSync(filename, 'utf8')
    let jwd
    try {
      jwd = JWD.fromDocumentGeneral(JSON.parse(source)).toJWD()
    } catch (err) {
      return console.error(err)
    }

    if (!this.validate(jwd)) {
      throw new Error("invalid query contract")
    }

    let address = this.computeEthereumAddress()
    // @todo Get actual query id
    let queryURI = this.toHex('123456')
    let bytecode = jwd.payload.bytecode + queryURI
    let tx = this.createRawTransaction(bytecode, address, '0x0')
    let k = keyto.from(this.keyPair.privateKey.handle, 'pem').toString('blk', 'private')
    let Key = new Buffer(k, 'hex')
    tx.sign(Key)
    let serializedTx = tx.serialize()

    return new Promise((resolve, reject) => {
        return this.web3.eth.sendRawTransaction(serializedTx.toString('hex'), (err, txHash) => {
          if (err) {
            console.error(err)
            reject(err)
          } else {
            resolve(txHash)
          }
        })
      })

      .then(txHash => {
        let blockFilter = this.web3.eth.filter('latest');
        return new Promise((resolve, reject) => {
          blockFilter.watch( () => {
            this.web3.eth.getTransactionReceipt(txHash, (err, receipt) => {
              if (err) {
                reject(err);
              }
              if (receipt) {
                blockFilter.stopWatching();
                resolve(receipt);
              }
            });
          });
        });
      })

      .then(receipt => {
          console.log(receipt)
      })

      .catch(console.log)
  }

  /**
   * Watch the Ethereum blockchain for a transaction to be mined.
   *
   * @param {String} filename of query contract document
   * @return {Object} the transaction receipt from deploying new contract
   */
  getAsyncTransactionReceipt(txHash) {
    let blockFilter = this.web3.eth.filter('latest')
    let promise = new Promise((resolve, reject) => {
      blockFilter.watch( () => {
        this.web3.eth.getTransactionReceipt(txHash, (err, receipt) => {
          if (err) {
            console.error(err)
            reject(err)
          }
          if (receipt) {
            blockFilter.stopWatching()
            resolve(receipt)
          }
        });
      });
    });
    return promise
  }

  /**
   * Assemble a raw transaction to send to the Ethereum blockchain.
   *
   * @param {Object} bytecode of transaction
   * @param {String} from querier's address
   * @param {String} to data provider's address
   * @return {Tx}
   */
  createRawTransaction(bytecode, from, to) {
    //let _gasPrice = this.web3.toHex(this.web3.eth.gasPrice)
    //let _gasLimit = this.web3.toHex(4700000)
    //let _nonce = this.web3.toHex(this.web3.eth.getTransactionCount(from))

    let _rawTx = {
      nonce: '0x00',
      gasPrice: '0x09184e72a000',
      gasLimit: '0x47B760',
      data: '0x' + bytecode,
      from: from
    }

    return new Tx(_rawTx)
  }

  /**
   * Compile Solidity code into Ethereum bytecode.
   *
   * @param {String} source human-readable Solidity code
   * @return {String}
   */
  compile(source) {
    let output = solc.compile(source, 1)
    
    // @todo Remove hard-coding of contract name
    return output.contracts[':SingleDataProviderEscrowContract']
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
   * Compute Ethereum address from private key.
   *
   * @return {String}
   */
  computeEthereumAddress() {
      let pubKey = this.keyPair.publicKey.handle

      // @todo (not yet implemented in @trust/keyto, then will replace CryptoJS)
      // let publicKey = keyto.from(pubKey, 'pem').toString('blk', 'public')
    
      let pubKeyWordArray = CryptoJS.enc.Hex.parse(pubKey)
      let hash = CryptoJS.SHA3(pubKeyWordArray, {
          outputLength: 256
      })

      return hash.toString(CryptoJS.enc.Hex).slice(24)
  };

  /**
   * Convert an Ethereum contract paramter to hex.
   *
   * @param {String} parameter
   * @return {String}
   */
  toHex(parameter) {
    let hex = this.web3.toHex(parameter).slice(2)
    // word size in Ethereum is 256 bytes
    let padding = Array(257 - (256 % hex.length)).join('0')

    return padding + hex
  }

}

module.exports = EthereumClient
