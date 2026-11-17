import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {gitRoute,object} from './git.ts';
function snapshot(r:any,ref:string){const tip=r.refs.get(ref)??ref,commit=r.objects?.get(tip);const out=new Map<string,any>();
 const tree=commit?.data.toString().match(/^tree ([0-9a-f]{40})/m)?.[1];function walk(id:string,prefix:string){const b=r.objects?.get(id)?.data;if(!b)return;let i=0;while(i<b.length){const z=b.indexOf(0,i);if(z<0)break;const spec=b.toString('utf8',i,z),sp=spec.indexOf(' '),mode=spec.slice(0,sp),name=prefix+spec.slice(sp+1),oid=b.subarray(z+1,z+21).toString('hex');if(mode==='40000'||mode==='040000')walk(oid,name+'/');else{const data=r.objects.get(oid)?.data??Buffer.alloc(0);out.set(name,{type:'file',name:name.split('/').at(-1),path:name,encoding:'base64',content:data.toString('base64'),sha:oid,size:data.length})}i=z+21}}if(tree)walk(tree,'');return out}
function save(r:any,branch:string,files:Map<string,any>,message:string){
 function tree(prefix:string):string{const rows:any[]=[];const dirs=new Set<string>();for(const [path,e] of files){if(!path.startsWith(prefix))continue;const rest=path.slice(prefix.length);if(rest.includes('/'))dirs.add(rest.split('/')[0]);else rows.push({name:rest,mode:'100644',oid:object(r,'blob',Buffer.from(e.content,'base64'))})}for(const name of dirs)rows.push({name,mode:'40000',oid:tree(prefix+name+'/')});rows.sort((a,b)=>(a.name+(a.mode==='40000'?'/':'')).localeCompare(b.name+(b.mode==='40000'?'/':'')));return object(r,'tree',Buffer.concat(rows.map(e=>Buffer.concat([Buffer.from(e.mode+' '+e.name+'\0'),Buffer.from(e.oid,'hex')]))))}
 const root=tree(''),parent=r.refs.get(branch);const data=Buffer.from('tree '+root+'\n'+(parent?'parent '+parent+'\n':'')+'author Harbor <harbor@example.invalid> 1700000000 +0000\ncommitter Harbor <harbor@example.invalid> 1700000000 +0000\n\n'+message+'\n');const id=object(r,'commit',data);r.refs.set(branch,id);return {sha:id,message,parents:parent?[{sha:parent}]:[]};
}
const repos=new Map<string,any>();let seq=1;let account=process.env.MAKEFUN_SHOP_LOGIN??'';
const responseCache=new WeakMap<object,string>();
const sha=(s:string)=>createHash('sha1').update(s).digest('hex');
const fail=(status:number,message:string):never=>{throw {status,message}};
function repo(owner:string,name:string){
 if(!account&&[...repos.values()].some(r=>r.name===name&&r.owner.login==='agent')){
  account=owner;for(const r of [...repos.values()])if(r.owner.login==='agent'){repos.delete(r.full_name);r.owner.login=owner;r.full_name=owner+'/'+r.name;repos.set(r.full_name,r)}
 }
 return repos.get(owner+'/'+name)??fail(404,'Not Found')
}
function create(name:string,owner=account||'agent',description='',privateRepo=false){
 if(!name)fail(422,'name is required');const key=owner+'/'+name;if(repos.has(key))fail(422,'Repository already exists');
 const r={id:seq++,node_id:'R_'+seq,name,full_name:key,owner:{login:owner,id:1},description,private:privateRepo,default_branch:'main',has_issues:true,permissions:{admin:true,push:true,pull:true},issues:[],pulls:[],labels:[],files:new Map(),refs:new Map(),number:1};repos.set(key,r);return r;
}
const view=(r:any)=>{const {issues,pulls,labels,files,refs,number,...data}=r;return {...data,html_url:'http://forge/'+r.full_name,clone_url:'http://forge/'+r.full_name+'.git'}};
function issue(r:any,b:any){if(!b.title)fail(422,'title is required');if((b.labels??[]).some((s:any)=>!r.labels.some((l:any)=>l.name===(s.name??s))))fail(422,'Unknown label');const n=r.number++;const i={id:seq++,node_id:'I_'+seq,number:n,title:b.title,body:b.body??'',state:'open',labels:(b.labels??[]).map((a:any)=>r.labels.find((l:any)=>l.name===(a.name??a))),user:r.owner,created_at:new Date(1700000000000+n*1000).toISOString()};r.issues.push(i);return i}
function pull(r:any,b:any){if(!b.title||!b.head||!b.base)fail(422,'title, head and base required');const n=r.number++;const pr={id:seq++,node_id:'P_'+seq,number:n,title:b.title,body:b.body??'',state:'open',merged:false,mergeable:true,head:{ref:b.head,sha:r.refs.get(b.head)??sha(b.head)},base:{ref:b.base,sha:r.refs.get(b.base)??sha(b.base)}};r.pulls.push(pr);return pr}
function changed(r:any,p:any){const old=snapshot(r,p.base.sha),head=snapshot(r,p.head.sha);return [...new Set([...old.keys(),...head.keys()])].filter(k=>old.get(k)?.sha!==head.get(k)?.sha).map(filename=>({filename,status:!old.has(filename)?'added':!head.has(filename)?'removed':'modified',additions:head.has(filename)?1:0,deletions:old.has(filename)?1:0,changes:1}));}
function merge(r:any,n:number){const p=r.pulls.find((p:any)=>p.number===n)??fail(404,'Not Found');const original=snapshot(r,p.base.sha),base=snapshot(r,p.base.ref),head=snapshot(r,p.head.sha);for(const f of changed(r,p)){if(base.get(f.filename)?.sha!==original.get(f.filename)?.sha&&base.get(f.filename)?.sha!==head.get(f.filename)?.sha)fail(405,'Merge conflict');if(head.has(f.filename))base.set(f.filename,head.get(f.filename));else base.delete(f.filename)}const c=save(r,p.base.ref,base,p.title);p.state='closed';p.merged=true;p.merged_at='2026-01-01T00:00:00Z';p.merge_commit_sha=c.sha;return {sha:c.sha,merged:true,message:'Pull Request successfully merged'}}
const toolSpecs=[['create_repo',['name']],['get_repo',['owner','repo']],['create_issue',['owner','repo','title']],['list_issues',['owner','repo']],['create_pull_request',['owner','repo','title','head','base']],['merge_pull_request',['owner','repo','pull_number']]];
const tools=toolSpecs.map(([name,required]:any)=>({name,description:'Manage repository data: '+name,inputSchema:{type:'object',required,properties:Object.fromEntries(['name','owner','repo','title','body','state','head','base','pull_number'].map(p=>[p,{type:p==='pull_number'?'integer':'string'}]))}}));
function rpc(b:any){const base={jsonrpc:'2.0',id:b.id??null};const ok=(result:any)=>({...base,result});
 if(b.method==='initialize')return ok({protocolVersion:b.params?.protocolVersion??'2025-11-25',capabilities:{tools:{}},serverInfo:{name:'Harbor Forge',version:'1.0.0'}});
 if(b.method==='server/discover')return ok({supportedVersions:['2026-07-28','2025-11-25'],serverInfo:{name:'Harbor Forge',version:'1.0.0'},capabilities:{tools:{}}});
 if(b.method==='tools/list')return ok({tools});
 if(b.method?.startsWith('notifications/'))return null;
 if(b.method!=='tools/call')return {...base,error:{code:-32601,message:'Unknown method'}};
 const name=b.params?.name,a=b.params?.arguments??{},spec=tools.find(t=>t.name===name);
 if(!spec||spec.inputSchema.required.some((k:string)=>a[k]===undefined))return {...base,error:{code:-32602,message:'Unknown tool or missing argument'}};
 try{let v;const r=()=>repo(a.owner,a.repo);if(name==='create_repo')v=view(create(a.name,a.owner??'agent'));if(name==='get_repo')v=view(r());if(name==='create_issue')v=issue(r(),a);if(name==='list_issues')v=r().issues.filter((i:any)=>!a.state||a.state==='all'||i.state===a.state);if(name==='create_pull_request')v=pull(r(),a);if(name==='merge_pull_request')v=merge(r(),+a.pull_number);return ok({content:[{type:'text',text:JSON.stringify(v)}]})}catch(e:any){return ok({isError:true,content:[{type:'text',text:e.message}]})}
}
function graph(b:any):any{
 if(Array.isArray(b))return b.map(graph);const q=b.query??'',v=b.variables??{};
 const fields:any={Issue:['id','number','title','state','body'],PullRequest:['id','number','headRefName','baseRefName','mergeable','state','merged','files'],Repository:['id','databaseId','name','nameWithOwner','owner','defaultBranchRef','viewerPermission','hasIssuesEnabled','issue','issues','pullRequests','pullRequest']};
 if(q.includes('__type')){const data:any={};for(const a of q.matchAll(/(?:(\w+)\s*:\s*)?__type\s*\(\s*name:\s*"([^"]+)"/g)){const name=a[2];data[a[1]??'__type']={name,kind:name==='SearchType'?'ENUM':'OBJECT',fields:(fields[name]??[]).map((name:string)=>({name,type:{kind:'SCALAR',name:'String'}})),enumValues:name==='SearchType'?[{name:'ISSUE'}]:null}}return {data}}
 const a=v.input??v;const global=(id:string)=>[...repos.values()].flatMap(r=>[{r,item:r},...r.issues.map((item:any)=>({r,item})),...r.pulls.map((item:any)=>({r,item}))]).find(({item})=>item.node_id===id);
 const gql=(p:any)=>({...p,id:p.node_id,state:p.state?.toUpperCase(),headRefName:p.head?.ref,baseRefName:p.base?.ref});
 if(q.includes('createIssue')){const found=global(a.repositoryId);if(!found)return {errors:[{message:'Unknown repository'}]};return {data:{createIssue:{issue:gql(issue(found.r,a))}}}}
 if(q.includes('closeIssue')||q.includes('mergePullRequest')||q.includes('addComment')){const f=global(a.issueId??a.pullRequestId??a.subjectId);if(!f)return {errors:[{message:'Unknown id'}]};if(q.includes('closeIssue')){f.item.state='closed';responseCache.delete(f.item);return {data:{closeIssue:{issue:gql(f.item)}}}}if(q.includes('mergePullRequest')){merge(f.r,f.item.number);return {data:{mergePullRequest:{pullRequest:gql(f.item)}}}}f.item.comments??=[];const c={id:'C_'+seq++,body:a.body};f.item.comments.push(c);responseCache.delete(f.item);return {data:{addComment:{commentEdge:{node:c}}}}}
 if(/\bnode\s*\(/.test(q)){const f=global(v.id??q.match(/id:\s*"([^"]+)"/)?.[1]);return {data:{node:f?{...view(f.r),id:f.item.node_id,nameWithOwner:f.r.full_name,__typename:'Repository'}:null}}}
 const viewerFields=q.match(/viewer\s*{([^}]*)}/)?.[1]?.match(/[A-Za-z_][A-Za-z_0-9]*/g)??[];
 for(const field of viewerFields)if(!['login','id','name','email','avatarUrl','url','__typename'].includes(field))return {errors:[{message:'Cannot query field '+field+' on type User'}]};
 const owner=v.owner??v.login??q.match(/owner:\s*"([^"]+)"/)?.[1],name=v.name??v.repo??q.match(/name:\s*"([^"]+)"/)?.[1];const r=repos.get(owner+'/'+name);
 if(q.includes('viewer')&&!q.includes('repository'))return {data:{viewer:{login:account||'agent',id:'U_1'}}};
 if(q.includes('createPullRequest')){const a=v.input??v;const r=[...repos.values()].find(r=>String(r.node_id)===a.repositoryId||String(r.id)===a.repositoryId);if(!r)return {errors:[{message:'Unknown repository'}]};const p=pull(r,{title:a.title,head:a.headRefName,base:a.baseRefName});return {data:{createPullRequest:{pullRequest:gql(p)}}}}
 if(!r)return {data:{repository:null}};
 const number=v.number??v.issueNumber??v.pullRequestNumber??+(q.match(/(?:issue|pullRequest)\s*\(number:\s*(\d+)/)?.[1]??0);
 let issues=r.issues.filter((i:any)=>!q.includes('OPEN')||i.state==='open');if(q.includes('DESC'))issues=[...issues].reverse();
 const convert=(i:any)=>({...i,id:i.node_id,state:i.state.toUpperCase(),headRefName:i.head?.ref,baseRefName:i.base?.ref,mergeable:'MERGEABLE',files:{nodes:i.head?changed(r,i).map(f=>({path:f.filename})):[],totalCount:i.head?changed(r,i).length:0}});
 const connection=(a:any[])=>{const start=v.after?Math.max(0,a.findIndex(i=>String(i.number)===v.after)+1):0,page=a.slice(start,start+(v.first??a.length));return {nodes:page.map(convert),edges:page.map(i=>({node:convert(i),cursor:String(i.number)})),totalCount:a.length,pageInfo:{hasNextPage:start+page.length<a.length,endCursor:page.length?String(page.at(-1).number):null}}};
 return {data:{repository:{...view(r),id:r.node_id,databaseId:r.id,nameWithOwner:r.full_name,viewerPermission:'ADMIN',hasIssuesEnabled:true,defaultBranchRef:{name:r.default_branch},issues:connection(issues),pullRequests:connection(r.pulls),issue:r.issues.find((i:any)=>i.number===number)?convert(r.issues.find((i:any)=>i.number===number)):null,pullRequest:r.pulls.find((i:any)=>i.number===number)?convert(r.pulls.find((i:any)=>i.number===number)):null}}};
}
export function createApp(){return createServer(async(req,res)=>{
 if(req.method==='GET'&&req.headers.authorization==='Bearer '+process.env.MAKEFUN_SHOP_TOKEN){
  const match=req.url?.match(/^\/api\/v3\/repos\/([^/]+)\/([^/]+)\/issues\/(\d+)$/);
  if(match){const r=repos.get(decodeURIComponent(match[1])+'/'+decodeURIComponent(match[2]));const item=r?.issues.find((i:any)=>i.number===+match[3]);if(item){let text=responseCache.get(item);if(!text){text=JSON.stringify(item);responseCache.set(item,text)}res.writeHead(200,{'content-type':'application/json','x-github-request-id':'harbor-'+seq});res.end(text);return}}
 }
 const u=new URL(req.url??'/','http://forge'),p=decodeURIComponent(u.pathname),m=req.method??'GET';const send=(status:number,data:any,headers:any={})=>{res.writeHead(status,{'content-type':'application/json','x-github-request-id':'harbor-'+seq,...headers});res.end(status===204?'':JSON.stringify(data))};
 if(p==='/healthz')return send(200,{ok:true});
 if(req.headers.authorization!=='Bearer '+process.env.MAKEFUN_SHOP_TOKEN)return send(401,{message:'Bad credentials'});
 const git=p.match(/^\/([^/]+)\/([^/]+)\.git\/(.+)$/);
 if(git){try{return await gitRoute(req,res,repo(git[1],git[2]),p,u)}catch(e:any){return send(e.status??400,{message:e.message})}}
 let b:any={};try{const raw=await new Promise<string>((resolve,reject)=>{const chunks:Buffer[]=[];req.on('data',c=>chunks.push(c));req.on('end',()=>resolve(Buffer.concat(chunks).toString()));req.on('error',reject)});if(raw)b=JSON.parse(raw)}catch{return send(400,p==='/mcp'?{jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}}:{message:'Malformed JSON'})}
 try{
 if(p==='/mcp'){const r=Array.isArray(b)?b.map(rpc):rpc(b);return r===null?send(202,{}):send(200,r)}
 if(p==='/api/graphql')return send(200,graph(b));
 if(p==='/api/v3'||p==='/api/v3/')return send(200,{current_user_url:'/api/v3/user'},{'x-oauth-scopes':'repo, read:org'});
 if(p==='/api/v3/meta')return send(200,{installed_version:'harbor-1.0'});
 if(p==='/api/v3/user')return send(200,{login:account||'agent',id:1});
 if(p==='/api/v3/user/repos'){if(m==='POST')return send(201,view(create(b.name,b.owner??(account||'agent'),b.description,b.private===true)));const list=[...repos.values()].map(view),page=+(u.searchParams.get('page')??1),size=+(u.searchParams.get('per_page')??30);return send(200,list.slice((page-1)*size,page*size),page*size<list.length?{link:`<http://${req.headers.host}${p}?page=${page+1}&per_page=${size}>; rel="next"`}:{})}
 const match=p.match(/^\/api\/v3\/repos\/([^/]+)\/([^/]+)(?:\/(.*))?$/);if(!match)fail(404,'Not Found');const [,owner,name,tail='']=match!,r=repo(owner,name);
 if(!tail){if(m==='DELETE'){repos.delete(r.full_name);return send(204,null)}if(m==='PATCH')r.description=b.description??r.description;return send(200,view(r))}
 if(tail==='git/refs'&&m==='POST'){r.refs.set(b.ref.replace(/^refs\/heads\//,''),b.sha);return send(201,{ref:b.ref,object:{sha:b.sha,type:'commit'}})}
 if(tail==='branches')return send(200,[...r.refs].filter(([name]:any)=>!name.startsWith('refs/')).map(([name,sha]:any)=>({name,commit:{sha}})));
 if(tail.startsWith('commits')){const id=tail.split('/')[1]??u.searchParams.get('sha')??r.default_branch;const oid=r.refs.get(id)??id;const data=r.objects?.get(oid)?.data.toString();if(!data)fail(404,'Not Found');const entry={sha:oid,commit:{message:data.split('\n\n').slice(1).join('\n\n').trim(),author:{name:'Harbor',email:'harbor@example.invalid'},committer:{name:'Harbor',email:'harbor@example.invalid'}},parents:[...data.matchAll(/^parent ([0-9a-f]{40})$/gm)].map((m:any)=>({sha:m[1]}))};return send(200,tail==='commits'?[entry]:entry)}
 const comments=tail.match(/^issues\/(\d+)\/comments$/);if(comments){const i=r.issues.find((i:any)=>i.number===+comments[1])??fail(404,'Not Found');i.comments??=[];if(m==='POST'){const comment={id:seq++,body:b.body,user:r.owner};i.comments.push(comment);responseCache.delete(i);return send(201,comment)}return send(200,i.comments)}
 if(tail==='labels'){if(m==='POST'){r.labels.push({id:seq++,name:b.name,color:b.color??'ffffff'});return send(201,r.labels.at(-1))}return send(200,r.labels)}
 if(tail==='issues'&&m==='POST')return send(201,issue(r,b));
 if(tail==='issues'){let list=r.issues.filter((i:any)=>!u.searchParams.get('state')||u.searchParams.get('state')==='all'||i.state===u.searchParams.get('state'));if(u.searchParams.get('direction')!=='asc')list=[...list].reverse();return send(200,list)}
 if(tail==='pulls'&&m==='POST')return send(201,pull(r,b));if(tail==='pulls')return send(200,r.pulls.filter((p:any)=>u.searchParams.get('state')==='all'||p.state===(u.searchParams.get('state')??'open')));
 const pf=tail.match(/^pulls\/(\d+)\/files$/);if(pf){const pr=r.pulls.find((p:any)=>p.number===+pf[1])??fail(404,'Not Found');return send(200,changed(r,pr))}
 const n=tail.match(/^(issues|pulls)\/(\d+)(\/merge)?$/);if(n){if(n[3])return send(200,merge(r,+n[2]));const item=r[n[1]].find((i:any)=>i.number===+n[2])??fail(404,'Not Found');if(m==='PATCH'){Object.assign(item,b);responseCache.delete(item)}return send(200,item)}
 if(tail.startsWith('contents/')){const path=tail.slice(9),branch=b.branch??u.searchParams.get('ref')??r.default_branch,files=snapshot(r,branch),old=files.get(path);
 if(m==='GET'){if(old)return send(200,old);const prefix=path.replace(/\/$/,'')+'/',list=[...files.values()].filter(e=>e.path.startsWith(prefix)&&!e.path.slice(prefix.length).includes('/'));if(list.length)return send(200,list);fail(404,'Not Found')}
 if(m==='PUT'){if(old&&b.sha!==old.sha)fail(409,'stale sha');const content=b.content??'',data=Buffer.from(content,'base64'),entry={type:'file',name:path.split('/').at(-1),path,encoding:'base64',content,size:data.length,sha:object(r,'blob',data)};files.set(path,entry);return send(old?200:201,{content:entry,commit:save(r,branch,files,b.message??'Update '+path)})}
 if(m==='DELETE'){if(!old)fail(404,'Not Found');if(b.sha!==old.sha)fail(409,'stale sha');files.delete(path);return send(200,{commit:save(r,branch,files,b.message??'Delete '+path)})}}

 fail(404,'Not Found');
 }catch(e:any){send(e.status??500,{message:e.message??'Internal error'})}
})}


