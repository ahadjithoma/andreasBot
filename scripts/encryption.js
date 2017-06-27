'use strict';

const crypto = require('crypto');

const key = process.env.ENCRYPTION_KEY; // Must be   256 bytes (32 characters)
const algorithm = 'aes-256-ctr';

function encrypt(text) {
  var cipher = crypto.createCipher(algorithm, key)
  var crypted = cipher.update(text,'utf8','hex')
  crypted += cipher.final('hex');
  return crypted;
}

function decrypt(text) {
  var decipher = crypto.createDecipher(algorithm, key)
  var dec = decipher.update(text,'hex','utf8')
  dec += decipher.final('utf8');
  return dec;
}

module.exports = { decrypt, encrypt };