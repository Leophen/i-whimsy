const crypto = require('crypto');
const algorithm = 'aes192';
const key = crypto.randomBytes(192 / 8);
const iv = crypto.randomBytes(128 / 8);

const encrypt = (text) => {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  cipher.update(text);
  return cipher.final('hex');
}

module.exports = {
  encrypt
}