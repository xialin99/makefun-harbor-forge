import {createApp} from './app.ts';
const origin=(process.env.MAKEFUN_ENV_URL??'').replace(/\/+$/,'');
if(!origin)throw Error('MAKEFUN_ENV_URL is required');
const server=createApp();
await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,resolve)});
const address=server.address();
if(!address||typeof address==='string')throw Error('No TCP listener');
async function request(path:string,body?:unknown){
 const res=await fetch(origin+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
 return res;
}
const pause=(ms:number)=>new Promise(r=>setTimeout(r,ms));
let registered=false;
for(let failures=0;!registered;){
 try{const response=await request('/register',{port:address.port});
 if(response.status===200||response.status===409){registered=true;break}
 if(response.status===400||response.status===405)throw Error('Invalid registration protocol');
 }catch(e){if((e as Error).message==='Invalid registration protocol')throw e}
 await pause(Math.min(2000,250*2**Math.min(4,failures++)));
}
for(;;){
 try{const response=await request('/done');if(response.ok&&(await response.json()).done===true)break}catch{}
 await pause(250);
}
await new Promise<void>(resolve=>server.close(()=>resolve()));
