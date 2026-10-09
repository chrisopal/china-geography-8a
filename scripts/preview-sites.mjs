// Local preview of the exact packaged Worker, using only Node's standard library.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
const port=Number(process.env.PORT || 8768);
const cache=new Map();
globalThis.caches={default:{
  async match(request){return cache.get(typeof request==='string'?request:request.url)?.clone();},
  async put(request,response){cache.set(typeof request==='string'?request:request.url,response.clone());}
}};
const source=await readFile(new URL('../dist/server/index.js',import.meta.url),'utf8');
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const env={OPENROUTER_API_KEY:process.env.OPENROUTER_API_KEY || ''};
http.createServer(async(req,res)=>{
  try {
    const chunks=[];for await(const chunk of req){chunks.push(chunk);if(Buffer.concat(chunks).length>20000){res.writeHead(413);res.end();return;}}
    const headers=new Headers();for(const [k,v] of Object.entries(req.headers))if(v)headers.set(k,Array.isArray(v)?v.join(','):v);
    const request=new Request(`http://127.0.0.1:${port}${req.url}`,{method:req.method,headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});
    const response=await worker.fetch(request,env,{waitUntil:p=>p.catch(()=>{})});
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(500);res.end('Preview error');}
}).listen(port,'127.0.0.1',()=>console.log(`Sites Worker preview: http://127.0.0.1:${port}/`));
