import nacl from 'tweetnacl';

export const verifyDeviceSignature = (publicKey: string, payload: string, signature: string): boolean => {
  const publicKeyBytes = Buffer.from(publicKey, 'base64');
  const signatureBytes = Buffer.from(signature, 'base64');
  const messageBytes = Buffer.from(payload, 'utf8');
  return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
};

