const ethUtil =require('ethereumjs-util');
const { convertUtf8ToHex } = require('@walletconnect/utils');

function recoverPublicKey(sig, hash) {
  const params = ethUtil.fromRpcSig(sig);
  const result = ethUtil.ecrecover(
    ethUtil.toBuffer(hash),
    params.v,
    params.r,
    params.s
  );
  return ethUtil.bufferToHex(ethUtil.publicToAddress(result));
}

async function verifySignature(
  address,
  sig,
  hash
  // chainId: number
) {

    const signer = recoverPublicKey(sig, hash);
    return signer.toLowerCase() === address.toLowerCase();
  
}

function encodePersonalMessage(msg) {
  const data = ethUtil.toBuffer(convertUtf8ToHex(msg));
  const buf = Buffer.concat([
    Buffer.from(
      '\u0019Ethereum Signed Message:\n' + data.length.toString(),
      'utf8'
    ),
    data
  ]);
  return ethUtil.bufferToHex(buf);
}

function hashPersonalMessage(msg) {
  const data = encodePersonalMessage(msg);
  const buf = ethUtil.toBuffer(data);
  const hash = ethUtil.keccak256(buf);
  return ethUtil.bufferToHex(hash);
}
module.exports = {hashPersonalMessage,encodePersonalMessage,verifySignature,recoverPublicKey}