/**
 * Mainnet x402 v2 HTTP 402 challenge for a paid wallet report.
 * STAGE 1: advertise real Base payment terms, but do NOT accept or settle signatures.
 * Safely enable actual settlement only after a separately reviewed facilitator integration.
 */
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
export const MAINNET_X402 = Object.freeze({
  network: 'eip155:8453',
  chainId: 8453,
  asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  payTo: '0x5F5d8B3Cf23368b9B5fab4e4A391A998803c292F',
  amount: '10000', // USDC has six decimals: 10000 = 0.01 USDC
  facilitator: 'https://facilitator.payai.network'
});

export function mainnetChallenge(wallet, publicOrigin = 'https://base-activity-hub.onrender.com') {
  if (!ADDRESS.test(wallet)) throw new Error('Invalid wallet address');
  const base = new URL(publicOrigin);
  if (base.protocol !== 'https:') throw new Error('Mainnet payments require HTTPS');
  const url = new URL('/api/x402/report', base);
  url.searchParams.set('address', wallet.toLowerCase());
  url.searchParams.set('chainId', '8453');
  return {
    x402Version: 2,
    resource: {
      url: url.href,
      description: 'Base Activity Hub extended wallet report (Base Mainnet)',
      mimeType: 'application/json'
    },
    accepts: [{
      scheme: 'exact',
      network: MAINNET_X402.network,
      amount: MAINNET_X402.amount,
      asset: MAINNET_X402.asset,
      payTo: MAINNET_X402.payTo,
      maxTimeoutSeconds: 300,
      extra: { assetTransferMethod: 'eip3009', name: 'USDC', version: '2' }
    }],
    extensions: {}
  };
}

const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff'
};
function respond(res, status, payload, headers = {}) {
  res.writeHead(status, {...jsonHeaders, ...headers});
  res.end(JSON.stringify(payload));
}
export function handleMainnetX402Challenge(req, res, url) {
  if (req.method !== 'GET') {
    respond(res, 405, { error: 'Only GET is supported.' }, { Allow: 'GET' });
    return;
  }
  const address = url.searchParams.get('address') || '';
  if (!ADDRESS.test(address) || url.searchParams.get('chainId') !== '8453') {
    respond(res, 400, {error: 'Provide a valid address and chainId=8453.'});
    return;
  }
  // Fail closed: this stage MUST NOT charge anyone or serve a paid resource.
  if (req.headers['payment-signature'] || req.headers['x-payment']) {
    respond(res, 503, {error: 'x402 Mainnet payment settlement is not enabled yet. No payment has been submitted.'});
    return;
  }
  const challenge = mainnetChallenge(address, process.env.PUBLIC_APP_URL || 'https://base-activity-hub.onrender.com');
  respond(res, 402, { ...challenge, error: 'Payment required: 0.01 USDC on Base Mainnet. Settlement is not enabled yet.' }, {
    'PAYMENT-REQUIRED': Buffer.from(JSON.stringify(challenge)).toString('base64')
  });
}
