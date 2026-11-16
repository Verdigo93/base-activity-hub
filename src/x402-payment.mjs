/** x402 v2 exact EIP-3009 browser payment construction. No wallet keys or approvals. */
const ADDRESS=/^0x[0-9a-f]{40}$/i;
const same=(a,b)=>String(a||'').toLowerCase()===String(b||'').toLowerCase();
export const X402_USDC='0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
export const X402_AMOUNT='10000'; // 0.01 USDC, 6 decimals

export function validateMainnetX402(challenge,account,origin,payTo){
  if(!ADDRESS.test(account)||!ADDRESS.test(payTo))throw Error('Invalid wallet address');
  const o=new URL(origin);
  if(o.protocol!=='https:')throw Error('A secure HTTPS origin is required');
  const target=new URL('/api/x402/report',o);
  target.searchParams.set('address',account.toLowerCase());
  target.searchParams.set('chainId','8453');
  if(challenge?.x402Version!==2||challenge?.accepts?.length!==1||
     challenge.resource?.url!==target.href||challenge.resource?.mimeType!=='application/json')
    throw Error('Unexpected x402 resource');
  const terms=challenge.accepts[0];
  if(terms.scheme!=='exact'||terms.network!=='eip155:8453'||
     terms.amount!==X402_AMOUNT||!same(terms.asset,X402_USDC)||
     !same(terms.payTo,payTo)||terms.maxTimeoutSeconds!==300||
     terms.extra?.assetTransferMethod!=='eip3009'||
     terms.extra?.name!=='USD Coin'||terms.extra?.version!=='2')
    throw Error('Unexpected x402 Mainnet payment terms');
  return {terms,url:target.href};
}

export function createMainnetAuthorization(challenge,account,origin,payTo,randomBytes,now=Math.floor(Date.now()/1000)){
  const {terms,url}=validateMainnetX402(challenge,account,origin,payTo);
  if(!(randomBytes instanceof Uint8Array)||randomBytes.length!==32)
    throw Error('A cryptographically random 32-byte nonce is required');
  if(!Number.isSafeInteger(now)||now<=0)throw Error('Invalid authorization time');
  const authorization={
    from:account,to:terms.payTo,value:terms.amount,
    validAfter:String(now-10),validBefore:String(now+240),
    nonce:'0x'+Array.from(randomBytes,b=>b.toString(16).padStart(2,'0')).join('')
  };
  const typedData={
    types:{
      EIP712Domain:[
        {name:'name',type:'string'},{name:'version',type:'string'},
        {name:'chainId',type:'uint256'},{name:'verifyingContract',type:'address'}
      ],
      TransferWithAuthorization:[
        {name:'from',type:'address'},{name:'to',type:'address'},
        {name:'value',type:'uint256'},{name:'validAfter',type:'uint256'},
        {name:'validBefore',type:'uint256'},{name:'nonce',type:'bytes32'}
      ]
    },
    primaryType:'TransferWithAuthorization',
    domain:{name:terms.extra.name,version:terms.extra.version,
      chainId:8453,verifyingContract:terms.asset},
    message:authorization
  };
  return {authorization,typedData,resourceUrl:url};
}

export function encodeMainnetPayment(challenge,authorization,signature){
  if(!/^0x[0-9a-f]{130}$/i.test(signature))throw Error('Unexpected EIP-712 signature');
  const payload={x402Version:2,resource:challenge.resource,accepted:challenge.accepts[0],
    payload:{signature,authorization},extensions:challenge.extensions||{}};
  // Encode JSON as UTF-8 to support future non-ASCII resource descriptions.
  const bytes=new TextEncoder().encode(JSON.stringify(payload));
  return btoa(Array.from(bytes,b=>String.fromCharCode(b)).join(''));
}
