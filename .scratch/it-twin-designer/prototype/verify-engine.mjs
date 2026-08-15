// Verify the prototype's reachability engine against starter-pack §5 traces A & B.
// Extracted copy of the engine logic (kept in sync with viz-prototype.html).
// Run:  node verify-engine.mjs
const O = {
  server:{id:"server",type:"Server"}, db:{id:"db",type:"Database"}, table:{id:"table",type:"Table"},
  ssn:{id:"ssn",type:"Column"}, name:{id:"name",type:"Column"}, email:{id:"email",type:"Column"}, phone:{id:"phone",type:"Column"},
  appReader:{id:"appReader",type:"DatabaseUser"}, role:{id:"role",type:"Role"}, login:{id:"login",type:"SqlLogin"},
  service:{id:"service",type:"WebService"}, endpoint:{id:"endpoint",type:"ApiEndpoint"},
  portal:{id:"portal",type:"UiApp"}, jane:{id:"jane",type:"User"},
};
const RELS = [
  {id:"c1",rel:"contains",from:"server",to:"db"},{id:"c2",rel:"contains",from:"db",to:"table"},
  {id:"c3",rel:"contains",from:"table",to:"ssn"},{id:"c4",rel:"contains",from:"table",to:"name"},
  {id:"c5",rel:"contains",from:"table",to:"email"},{id:"c6",rel:"contains",from:"table",to:"phone"},
  {id:"c7",rel:"contains",from:"db",to:"appReader"},{id:"c8",rel:"contains",from:"db",to:"role"},
  {id:"c9",rel:"contains",from:"server",to:"login"},
  {id:"a1",rel:"accesses",from:"appReader",to:"table"},{id:"a2",rel:"accesses",from:"role",to:"table"},
  {id:"m1",rel:"memberOf",from:"appReader",to:"role"},{id:"m2",rel:"mapsTo",from:"appReader",to:"login"},
  {id:"u1",rel:"usedAsServiceAccountBy",from:"service",to:"login"},{id:"e1",rel:"exposes",from:"service",to:"endpoint"},
  {id:"r1",rel:"returns",from:"endpoint",to:"ssn"},{id:"cl",rel:"calls",from:"portal",to:"endpoint"},
  {id:"us",rel:"uses",from:"jane",to:"portal"},
];
const RT = { contains:{propagates:false}, accesses:{propagates:true,bidi:true}, memberOf:{propagates:true,modeDependent:true},
  mapsTo:{propagates:true,bidi:true}, usedAsServiceAccountBy:{propagates:true,bidi:true}, exposes:{propagates:true,bidi:true},
  returns:{propagates:true,bidi:true}, calls:{propagates:true,bidi:true}, uses:{propagates:true,bidi:true} };

const children={}; for(const r of RELS) if(r.rel==="contains") (children[r.from]||=[]).push(r.to);
function descendants(id){const out=[],st=[...(children[id]||[])],seen=new Set();while(st.length){const n=st.pop();if(seen.has(n))continue;seen.add(n);out.push(n);st.push(...(children[n]||[]));}return out;}
function buildAdj(mode){const adj={};const add=(a,b,arc)=>{(adj[a]||=[]).push({to:b,...arc});};
  for(const r of RELS){const rt=RT[r.rel];if(!rt.propagates)continue;const A=r.from,B=r.to;
    if(r.rel==="accesses"){const targets=[B,...descendants(B)];for(const t of targets){add(A,t,{relId:"accesses",relInst:r.id,dir:"fwd",flood:t===B?null:B});add(t,A,{relId:"accesses",relInst:r.id,dir:"rev",flood:t===B?null:B});}}
    else if(r.rel==="memberOf"){if(mode==="user-to-data")add(A,B,{relId:"memberOf",relInst:r.id,dir:"fwd"});else add(B,A,{relId:"memberOf",relInst:r.id,dir:"rev"});}
    else{add(A,B,{relId:r.rel,relInst:r.id,dir:"fwd"});add(B,A,{relId:r.rel,relInst:r.id,dir:"rev"});}}
  return adj;}
function bfs(root,mode){const adj=buildAdj(mode);const visited=new Set([root]),parent={},perHop={0:new Set([root])};
  let frontier=[root],hop=0;const order=(arr)=>arr.sort((a,b)=>a.to<b.to?-1:a.to>b.to?1:0);
  while(frontier.length){hop++;const next=[];for(const u of frontier){for(const a of order([...(adj[u]||[])])){if(visited.has(a.to))continue;visited.add(a.to);parent[a.to]={from:u,...a};(perHop[hop]||=new Set()).add(a.to);next.push(a.to);}}frontier=next;}
  const maxHop=Object.keys(perHop).map(Number).reduce((m,h)=>Math.max(m,h),0);return {visited,parent,perHop,maxHop};}
function chainTo(id,parent){const s=[];let c=id;while(parent[c]){const p=parent[c];s.push({to:c,from:p.from,relId:p.relId,dir:p.dir,flood:p.flood});c=p.from;}return s.reverse();}
const hopOf=(id,r)=>{for(const h in r.perHop)if(r.perHop[h].has(id))return +h;return 0;};

let pass=true; const ok=(c,m)=>{console.log((c?"PASS":"FAIL")+": "+m);if(!c)pass=false;};
function fmtChain(id,r){return chainTo(id,r.parent).map(s=>`${O[s.from].name} ${s.flood?("→[flood "+O[s.flood].name+"]→"):("("+s.relId+" "+s.dir+") →")} ${O[s.to].name}`).join("  |  ");}

// Trace A: data→user, root=SSN. Expect Jane reachable.
const A=bfs("ssn","data-to-user");
ok(A.visited.has("jane"), "Trace A (data→user from SSN): Jane Doe is reachable");
ok(A.visited.has("appReader"), "Trace A: app_reader reachable (direct accesses Customer→flood SSN)");
ok(A.visited.has("role"), "Trace A: db_datareader reachable");
ok(A.visited.has("endpoint"), "Trace A: endpoint reachable (returns)");
console.log("  A Jane chain: "+fmtChain("jane",A));
console.log("  A reachable ("+[...A.visited].length+"): "+[...A.visited].map(id=>O[id].name).join(", "));
console.log("  A Jane at hop "+hopOf("jane",A));

// Trace B: user→data, root=Jane. Expect SSN + sibling columns reachable.
const B=bfs("jane","user-to-data");
ok(B.visited.has("ssn"), "Trace B (user→data from Jane): Customer.SSN is reachable");
ok(B.visited.has("name")&&B.visited.has("email")&&B.visited.has("phone"), "Trace B: sibling columns reachable (descendant flood on accesses Customer)");
ok(B.visited.has("role"), "Trace B: db_datareader reachable (memberOf app_reader→role, user→data mode)");
console.log("  B SSN chain: "+fmtChain("ssn",B));
console.log("  B reachable ("+[...B.visited].length+"): "+[...B.visited].map(id=>O[id].name).join(", "));
console.log("  B SSN at hop "+hopOf("ssn",B));

// memberOf mode-dependence: in data→user, memberOf traverses Role→DBUser only.
// So from app_reader (DBUser) you must NOT reach role via memberOf in data→user mode.
const AfromAppReader=bfs("appReader","data-to-user");
ok(!AfromAppReader.parent["role"] || AfromAppReader.parent["role"].relId!=="memberOf", "memberOf mode-dep: in data→user, app_reader does NOT reach role via memberOf (Role→DBUser only)");
// but role DOES reach app_reader via memberOf in data→user
const AfromRole=bfs("role","data-to-user");
ok(AfromRole.visited.has("appReader") && AfromRole.parent["appReader"]?.relId==="memberOf", "memberOf mode-dep: in data→user, role reaches app_reader via memberOf (Role→DBUser)");

console.log("\n"+(pass?"ALL CHECKS PASSED ✅":"SOME CHECKS FAILED ❌"));
process.exit(pass?0:1);