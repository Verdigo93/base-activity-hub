/** Dependency-free Keccak-256 and ABI helpers for EIP-1193 wallets. All amounts use bigint. */
const MASK=(1n<<64n)-1n;
const ROT=[0,1,62,28,27,36,44,6,55,20,3,10,43,25,39,41,45,15,21,8,18,2,61,56,14];
const RC=['0000000000000001','0000000000008082','800000000000808a','8000000080008000','000000000000808b','0000000080000001','8000000080008081','8000000000008009','000000000000008a','0000000000000088','0000000080008009','000000008000000a','000000008000808b','800000000000008b','8000000000008089','8000000000008003','8000000000008002','8000000000000080','000000000000800a','800000008000000a','8000000080008081','8000000000008080','0000000080000001','8000000080008008'].map(v=>BigInt('0x'+v));
const rot=(n,k)=>{if(k===0)return n;let r=BigInt(k);return ((n<<r)|(n>>(64n-r)))&MASK};
function permute(A){for(let r=0;r<24;r++){const C=new Array(5),D=new Array(5),B=new Array(25);for(let x=0;x<5;x++)C[x]=A[x]^A[x+5]^A[x+10]^A[x+15]^A[x+20];for(let x=0;x<5;x++)D[x]=C[(x+4)%5]^rot(C[(x+1)%5],1);for(let y=0;y<5;y++)for(let x=0;x<5;x++){let i=x+5*y;let a=(A[i]^D[x])&MASK;B[y+5*((2*x+3*y)%5)]=rot(a,ROT[i])}for(let y=0;y<5;y++)for(let x=0;x<5;x++)A[x+5*y]=(B[x+5*y]^((~B[(x+1)%5+5*y])&B[(x+2)%5+5*y]))&MASK;A[0]^=RC[r]}}
export function keccak256(text){const input=typeof text==='string'?new TextEncoder().encode(text):text;const rate=136;const padded=Array.from(input);padded.push(1);while(padded.length%rate!==rate-1)padded.push(0);padded.push(128);const A=new Array(25).fill(0n);for(let start=0;start<padded.length;start+=rate){for(let i=0;i<rate;i++)A[Math.floor(i/8)]^=BigInt(padded[start+i])<<BigInt((i%8)*8);permute(A)}const out=[];for(let i=0;i<32;i++)out.push(Number((A[Math.floor(i/8)]>>BigInt((i%8)*8))&255n));return out.map(b=>b.toString(16).padStart(2,'0')).join('')}
const strip=v=>String(v).replace(/^0x/,'');
const word=x=>BigInt(x).toString(16).padStart(64,'0');
const bytesToHex=bytes=>Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
export function isAddress(value){return typeof value==='string' && /^0x[0-9a-fA-F]{40}$/.test(value)};
export function parseUnits(input,decimals){const s=String(input).trim();if(!/^\d+(\.\d+)?$/.test(s))throw Error('Enter a valid positive amount.');const [whole,fraction='']=s.split('.');if(fraction.length>decimals)throw Error(`Too many decimals (max ${decimals}).`);const value=BigInt(whole)*10n**BigInt(decimals)+BigInt((fraction.padEnd(decimals,'0'))||'0');if(value<=0n)throw Error('Amount must be positive.');return value}
export function formatUnits(input,decimals,precision=5){let n=BigInt(input), base=10n**BigInt(decimals);let a=n/base,b=(n%base).toString().padStart(decimals,'0').slice(0,precision).replace(/0+$/,'');return a.toString()+(b?'.'+b:'')}
function encodeSingle(type,value){if(type==='address'){if(!isAddress(value))throw Error('Invalid Ethereum address.');return strip(value).toLowerCase().padStart(64,'0')}if(/^uint(8|16|32|64|128|256)?$/.test(type)){if(BigInt(value)<0n)throw Error('Negative unsigned integer');return word(value)}if(type==='bool')return word(value?1:0);if(type==='bytes32'){const v=strip(value);if(v.length!==64||!/^[a-f\d]+$/i.test(v))throw Error('Invalid bytes32');return v}throw Error('Unsupported ABI type: '+type)}
function encodeDynamic(type,value){if(type==='string'){const hex=bytesToHex(new TextEncoder().encode(String(value)));return word(hex.length/2)+hex.padEnd(Math.ceil(hex.length/64)*64,'0')}if(type==='bytes'){const hex=strip(value);if(hex.length%2||!/^[a-f\d]*$/i.test(hex))throw Error('Invalid bytes');return word(hex.length/2)+hex.padEnd(Math.ceil(hex.length/64)*64,'0')}throw Error('Unsupported dynamic type')}
export function abiEncode(types,values){if(types.length!==values.length)throw Error('ABI argument mismatch');const head=[],tail=[];let offset=32*types.length;for(let i=0;i<types.length;i++){const t=types[i];if(t==='string'||t==='bytes'){const e=encodeDynamic(t,values[i]);head.push(word(offset));tail.push(e);offset+=e.length/2}else head.push(encodeSingle(t,values[i]))}return '0x'+head.join('')+tail.join('')}
export function callData(signature,types=[],values=[]){return '0x'+keccak256(signature).slice(0,8)+strip(abiEncode(types,values))}
export const shortAddress=s=>s?s.slice(0,6)+'...'+s.slice(-4):'—';
export const hex=n=>'0x'+BigInt(n).toString(16);
export function errorMessage(err){return String(err?.shortMessage||err?.reason||err?.message||err||'Unknown wallet error').replace(/\s*\{.*$/s,'').slice(0,260)}

/** Schema-0 ERC-8021 encoded Builder Code suffix; matches ox/erc8021 for one code. */
export function builderCodeSuffix(code){
 if(!code)return '';
 const data=new TextEncoder().encode(code);
 if(data.length===0||data.length>255||!/^[-_a-z0-9]{1,64}$/i.test(code))throw Error('Invalid Builder Code');
 const codeHex=Array.from(data).map(b=>b.toString(16).padStart(2,'0')).join('');
 return '0x'+data.length.toString(16).padStart(2,'0')+codeHex+'00'+'8021'.repeat(8);
}
