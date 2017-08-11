'use strict';

const crypto = require('crypto');

const key = process.env.ENCRYPTION_KEY; // Must be   256 bytes (32 characters)
const algorithm = process.env.ENCRYPTION_ALGORITHM

function encrypt(text) {
  if (!text) return false;
  return new Promise((resolve, reject) => {
    var cipher = crypto.createCipher(algorithm, key)
    var crypted = cipher.update(text, 'utf8', 'hex')
    crypted += cipher.final('hex');
    resolve(crypted)
  })
}

function decrypt(text) {
  if (!text) return false;
  return new Promise((resolve, reject) => {
    var decipher = crypto.createDecipher(algorithm, key)
    var decrypted = decipher.update(text, 'hex', 'utf8')
    decrypted += decipher.final('utf8');
    resolve(decrypted);
  })
}

module.exports = { decrypt, encrypt };