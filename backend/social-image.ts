import {Resvg,initWasm,type InitInput} from '@resvg/resvg-wasm';
import {escapeSocialText,type QuoteSocialCard} from './quote-social';

let wasmReady:Promise<void>|undefined;
const base64=(bytes:Uint8Array)=>{let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);};
// Estimate optical width to keep arbitrary names inside two readable lines.
function nameLines(text:string,size:number,width:number):string[] {
  const charWidth=(char:string)=>/[MW@#%]/.test(char)?size*.9:/[ilI .,'’]/.test(char)?size*.28:char.codePointAt(0)!>255?size:size*.58;
  const lines:string[]=[];let line='',used=0;
  for(const word of text.split(' ')){
    const wordWidth=Array.from(word).reduce((n,char)=>n+charWidth(char),0);
    if(line&&used+size*.28+wordWidth>width){lines.push(line);line='';used=0;}
    for(const char of word){const length=charWidth(char);if(used+length>width){lines.push(line);line='';used=0;}line+=char;used+=length;}
    line+=' ';used+=size*.28;
  }
  if(line.trim())lines.push(line.trim());
  if(lines.length>2){const last=Array.from(lines[1].trim());while(last.reduce((n,char)=>n+charWidth(char),size)>width)last.pop();return[lines[0].trim(),last.join('').trim()+'…'];}
  return lines.map(line=>line.trim());
}
export function quotationSocialSvg(card:QuoteSocialCard,logo:Uint8Array):string {
  const escape=escapeSocialText,size=card.customerName.length>48?42:54,lines=nameLines(card.customerName,size,760);
  const reference=Array.from(card.reference).slice(0,35).join('')+(card.reference.length>35?'…':'');
  const name=lines.map((line,index)=>`<tspan x="64" y="${282+index*64}">${escape(line)}</tspan>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#faf8f4"/>
  <rect width="1200" height="118" fill="#1c3a2f"/>
  <rect x="56" y="25" width="151" height="69" rx="7" fill="white"/>
  <image x="68" y="34" width="127" height="51" preserveAspectRatio="xMidYMid meet" xlink:href="data:image/png;base64,${base64(logo)}"/>
  <g font-family="Plus Jakarta Sans" fill="#18221d">
    <text x="232" y="62" fill="#ffffff" font-size="${card.brandName.length>48?13:card.brandName.length>32?17:23}" font-weight="700">${escape(card.brandName)}</text>
    <text x="232" y="87" fill="#e6cba8" font-size="13" letter-spacing="1.7">SPACES MADE PERSONAL</text>
    <text x="1136" y="66" text-anchor="end" fill="#e6cba8" font-size="14" letter-spacing="2">${card.documentType==='Work order'?'WORK ORDER':'QUOTATION'}</text>
    <text x="64" y="183" fill="#526957" font-size="16" letter-spacing="2.2">PREPARED EXCLUSIVELY FOR</text>
    <text font-size="${size}" font-weight="700">${name}</text>
    <text x="64" y="${lines.length===1?336:398}" font-size="25" fill="#31513d">${card.documentType==='Work order'?'Your agreed interior scope.':'Your home. Thoughtfully planned.'}</text>
    <path d="M64 442H1136" stroke="#dcd3c2" stroke-width="2"/>
    <text x="64" y="492" fill="#6e644f" font-size="13" letter-spacing="1.6">${card.documentType==='Work order'?'WORK ORDER REFERENCE':'QUOTATION REFERENCE'}</text>
    <text x="64" y="527" font-size="26" font-weight="700">${escape(reference)}</text>
    <text x="64" y="568" font-size="16" fill="#526957">${escape(card.issueDate?`Prepared ${card.issueDate}  ·  `:'')}${card.roomCount} ${card.roomCount===1?'room':'rooms'} · A scope tailored to you</text>
    <text x="1136" y="528" text-anchor="end" font-size="16" fill="#31513d">Room-wise furniture</text>
    <text x="1136" y="556" text-anchor="end" font-size="16" fill="#31513d">Materials &amp; specifications</text>
  </g>
  <g transform="translate(906 166)" stroke="#a18a60" stroke-width="2" fill="none">
    <rect x="0" y="0" width="230" height="230" rx="5" fill="#f0eade" stroke="#ded3bf"/>
    <rect x="28" y="27" width="174" height="177" rx="2" fill="#faf8f4"/>
    <path d="M28 75H202M86 75V204M144 75V204M150 144H196M150 174H196M66 117V137M103 117V137M161 104V124"/>
    <path d="M21 213H209" stroke="#1c3a2f"/>
  </g>
  <rect y="611" width="1200" height="19" fill="#1c3a2f"/>
  </svg>`;
}

/** One compiled Wasm renderer and a small bounded cache per Worker isolate. */
export function createSocialImageRenderer(wasm:()=>Promise<InitInput>,asset:(path:string)=>Promise<Uint8Array>) {
  let assets:Promise<Uint8Array[]>|undefined;
  const cache=new Map<string,Uint8Array>();
  return async(card:QuoteSocialCard):Promise<Uint8Array>=>{
    const key=JSON.stringify(card),cached=cache.get(key);if(cached)return cached;
    wasmReady||=wasm().then(value=>initWasm(value)).catch(error=>{wasmReady=undefined;throw error;});
    assets||=Promise.all([asset('/assets/fonts/PlusJakartaSans.ttf'),asset('/assets/ume-logo.png')]).catch(error=>{assets=undefined;throw error;});
    const [[font,logo]]=await Promise.all([assets,wasmReady]);
    const svg=new Resvg(quotationSocialSvg(card,logo),{font:{fontBuffers:[font],defaultFontFamily:'Plus Jakarta Sans'}});
    try{const rendered=svg.render();try{const png=new Uint8Array(rendered.asPng());if(cache.size>=24)cache.delete(cache.keys().next().value!);cache.set(key,png);return png;}finally{rendered.free();}}finally{svg.free();}
  };
}
