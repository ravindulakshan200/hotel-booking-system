const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";

const getEncryptionKey = () => {
  const keyHex = process.env.EMAIL_PAYLOAD_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error("EMAIL_PAYLOAD_ENCRYPTION_KEY is missing or undefined.");
  }
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) {
    throw new Error("EMAIL_PAYLOAD_ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters).");
  }
  return key;
};

const encryptPayload = (payloadObj, eventKey) => {
  if (!payloadObj || Object.keys(payloadObj).length === 0) return payloadObj;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  // Bind the ciphertext to this specific event key to prevent swapping
  cipher.setAAD(Buffer.from(String(eventKey)));
  
  const payloadStr = JSON.stringify(payloadObj);
  let ciphertext = cipher.update(payloadStr, "utf8", "hex");
  ciphertext += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");

  return {
    v: 1,
    iv: iv.toString("hex"),
    tag,
    ciphertext
  };
};

const decryptPayload = (encryptedObj, eventKey) => {
  if (!encryptedObj || Object.keys(encryptedObj).length === 0) {
    return encryptedObj;
  }
  
  if (encryptedObj.v !== 1 || !encryptedObj.iv || !encryptedObj.tag || !encryptedObj.ciphertext) {
    throw new Error("Payload is not a valid encrypted envelope (v=1).");
  }

  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(encryptedObj.iv, "hex"));
  decipher.setAuthTag(Buffer.from(encryptedObj.tag, "hex"));
  decipher.setAAD(Buffer.from(String(eventKey)));
  
  let decryptedStr = decipher.update(encryptedObj.ciphertext, "hex", "utf8");
  decryptedStr += decipher.final("utf8");
  
  return JSON.parse(decryptedStr);
};

module.exports = {
  encryptPayload,
  decryptPayload,
  getEncryptionKey
};
