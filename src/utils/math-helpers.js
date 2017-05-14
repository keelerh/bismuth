/**
 * Dependencies
 */
const CryptoJS = require('crypto-js');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');


class MathHelpers {

  constructor(web3) {
    this.web3 = web3;
  }

  getQueryUriInHex(queryURI) {
    let hex = this.web3.toHex(queryURI).slice(2);
    // word size in Ethereum is 256 bytes
    let padding = Array(257 - (256 % hex.length)).join('0');
    return padding + hex;
  }

  /**
   * Compute Ethereum address from a private key.
   *
   * @param {String} privateKey
   * @return {String}
   */
  computeAddressFromPrivateKey(privateKey) {
      let keyPair = ec.genKeyPair();
      keyPair._importPrivate(privateKey, 'hex');
      let compact = false;
      let pubKey = keyPair.getPublic(compact, 'hex').slice(2);
      let pubKeyWordArray = CryptoJS.enc.Hex.parse(pubKey);
      let hash = CryptoJS.SHA3(pubKeyWordArray, {
          outputLength: 256
      });
      return hash.toString(CryptoJS.enc.Hex).slice(24);
  };

}

module.exports = MathHelpers;
