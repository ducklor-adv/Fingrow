import React, { useMemo, useState } from "react";

/**
 * Fingrow ACF — Interactive Canvas Tester (v3.2)
 * ------------------------------------------------
 * ✅ ID scheme: YY + AAA + NNNN (e.g., 25AAA0000). Root = 25AAA0000. New users auto-generate sequential IDs.
 * ✅ Default ACF Root = 25AAA0001 (your account). If it doesn't exist yet, we gracefully fallback to 25AAA0000 until created.
 * ✅ ACF Root is configurable from the UI for live events; NIC placement fills **layer-first (BFS)** within the ACF Root's subtree.
 * ✅ BIC still restricts to inviter's subtree, layer-first relative to inviter.
 * ✅ Users Table shows explicit "User ID" and Child #1–#5.
 * ✅ Dark-friendly selects.
 * ✅ Dev tests extended: ID format, ACF Root fallback.
 */

// ---------------- Types ----------------
 type User = {
  userId: string;       // e.g., 25AAA0001
  runNumber: number;    // insertion/run order
  parentId: string | null;
  childCount: number;
  maxChildren: number;
  acfAccepting: boolean;
  inviterId?: string | null;
  inviteCode?: string | null;
  createdAt: number; // epoch ms
  level: number;     // depth from GLOBAL system root (25AAA0000)
};

type Mode = "NIC" | "BIC";

const SYSTEM_ROOT_ID = "25AAA0000"; // the permanent system root node
const DEFAULT_ACF_ROOT_ID = "25AAA0001"; // your account (first signup)

// ---------------- Utilities ----------------
function getNow() { return Date.now(); }

// ID generator: YY + AAA + NNNN
function twoDigitYear(date = new Date()): string {
  return String(date.getFullYear() % 100).padStart(2, '0');
}
function makeUserId(seq: number, letters = 'AAA', date = new Date()): string {
  const yy = twoDigitYear(date); // e.g., '25'
  const num = String(seq).padStart(4, '0');
  return `${yy}${letters}${num}`; // e.g., 25AAA0001
}

function buildIndex(users: User[]) {
  const byId = new Map<string, User>();
  const children = new Map<string, User[]>();
  for (const u of users) byId.set(u.userId, u);
  for (const u of users) {
    if (!u.parentId) continue;
    const list = children.get(u.parentId) ?? [];
    list.push(u);
    children.set(u.parentId, list);
  }
  return { byId, children };
}

function bfsSubtree(users: User[], rootId: string): Set<string> {
  const { children } = buildIndex(users);
  const out = new Set<string>();
  const q: string[] = [rootId];
  while (q.length) {
    const id = q.shift()!;
    if (out.has(id)) continue;
    out.add(id);
    const ch = children.get(id) ?? [];
    for (const c of ch) q.push(c.userId);
  }
  return out;
}

function relativeDepthMap(users: User[], rootId: string): Map<string, number> {
  const { children } = buildIndex(users);
  const depth = new Map<string, number>();
  const q: Array<{id:string; d:number}> = [{ id: rootId, d: 0 }];
  while (q.length) {
    const { id, d } = q.shift()!;
    if (depth.has(id)) continue;
    depth.set(id, d);
    const ch = children.get(id) ?? [];
    for (const c of ch) q.push({ id: c.userId, d: d + 1 });
  }
  return depth;
}

function computeGlobalLevel(users: User[], userId: string): number {
  const { byId } = buildIndex(users);
  let level = 0;
  let cur = byId.get(userId);
  while (cur && cur.parentId) {
    level += 1;
    cur = byId.get(cur.parentId);
  }
  return level;
}

// NIC ordering (relative to current ACF Root): depthFromAcfRoot → childCount → createdAt → runNumber
function cmpNICWithDepth(depth: Map<string, number>) {
  return (a: User, b: User) => {
    const da = depth.get(a.userId) ?? Number.POSITIVE_INFINITY;
    const db = depth.get(b.userId) ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    if (a.childCount !== b.childCount) return a.childCount - b.childCount;
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
    return a.runNumber - b.runNumber;
  };
}

// BIC ordering: inviter-relative depth → childCount → createdAt → runNumber
function cmpBIC(depth: Map<string, number>) {
  return (a: User, b: User) => {
    const da = depth.get(a.userId) ?? Number.POSITIVE_INFINITY;
    const db = depth.get(b.userId) ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    if (a.childCount !== b.childCount) return a.childCount - b.childCount;
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
    return a.runNumber - b.runNumber;
  };
}

// ---------------- UI atoms ----------------
function Badge({ label, tone = "default" }:{label:string;tone?:"default"|"ok"|"warn"|"crit"}){
  const t = tone === "ok" ? "bg-green-600 text-white"
          : tone === "warn" ? "bg-amber-500 text-white"
          : tone === "crit" ? "bg-rose-600 text-white"
          : "bg-gray-100 text-gray-800 border";
  return <span className={`text-xs px-2 py-0.5 rounded-full ${t}`}>{label}</span>;
}

function SlotBar({ count, max }:{count:number;max:number}){
  const slots = Array.from({length:max});
  return (
    <div className="flex gap-1">
      {slots.map((_,i)=>{
        const filled = i < count;
        return <div key={i} className={`w-3 h-3 rounded-sm ${filled?"bg-blue-600":"bg-gray-200"}`} title={`${i+1}/${max}`}/>;
      })}
    </div>
  );
}

function UserCard({ u, onSelect, selected }:{u:User;onSelect:(id:string)=>void;selected:boolean}){
  const full = u.childCount >= u.maxChildren;
  return (
    <button
      onClick={() => onSelect(u.userId)}
      className={`text-left w-full border rounded-2xl p-4 transition shadow-sm hover:shadow-md ${selected?"border-blue-500 ring-2 ring-blue-200":"border-gray-200"}`}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-semibold">
          {u.userId === SYSTEM_ROOT_ID ? "R" : u.runNumber}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-base truncate">{u.userId}</div>
          <div className="text-xs text-gray-500">run #{u.runNumber} • level {u.level}</div>
          <div className="mt-2 flex items-center gap-2">
            <SlotBar count={u.childCount} max={u.maxChildren} />
            <Badge label={`child ${u.childCount}/${u.maxChildren}`} tone={full?"warn":"default"} />
            <Badge label={u.acfAccepting?"ACF: ON":"ACF: OFF"} tone={u.acfAccepting?"ok":"crit"} />
          </div>
        </div>
      </div>
    </button>
  );
}

function TreeBranch({ users, rootId, onSelect }:{users:User[];rootId:string;onSelect:(id:string)=>void}){
  const { children, byId } = useMemo(()=>buildIndex(users),[users]);
  function renderNode(id: string): React.ReactNode {
    const u = byId.get(id);
    if (!u) return null;
    const ch = (children.get(id) ?? []).sort((a,b)=>a.runNumber-b.runNumber);
    const full = u.childCount >= u.maxChildren;
    return (
      <div key={id} className="ml-4">
        <div className="flex items-center gap-3 py-1">
          <button onClick={()=>onSelect(id)} className={`text-sm font-medium underline-offset-2 hover:underline ${id===rootId?"text-blue-700":""}`}>{u.userId}</button>
          <SlotBar count={u.childCount} max={u.maxChildren} />
          <Badge label={u.acfAccepting?"ON":"OFF"} tone={u.acfAccepting?"ok":"crit"} />
          <Badge label={`${u.childCount}/${u.maxChildren}`} tone={full?"warn":"default"} />
        </div>
        {ch.length>0 && (
          <div className="border-l-2 border-gray-200 pl-4 mt-1 space-y-2">
            {ch.map(c=>renderNode(c.userId))}
          </div>
        )}
      </div>
    );
  }
  return <div className="text-sm leading-6">{renderNode(rootId)}</div>;
}

// ---------------- UsersTable ----------------
function UsersTable({ users, selectedUser, onSelect, onToggleAccept, onSetMax }:{
  users: User[];
  selectedUser: string;
  onSelect: (id:string)=>void;
  onToggleAccept: (id:string)=>void;
  onSetMax: (id:string, max:number)=>void;
}){
  const { children } = useMemo(()=>buildIndex(users),[users]);
  const rows = useMemo(()=>[...users].sort((a,b)=>a.runNumber-b.runNumber),[users]);
  const getChildren = (pid:string)=> (children.get(pid) ?? []).sort((a,b)=>a.runNumber-b.runNumber).slice(0,5);

  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-800/80 sticky top-0 z-10">
          <tr className="text-left">
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">User ID</th>
            <th className="px-3 py-2">User</th>
            <th className="px-3 py-2">Parent</th>
            <th className="px-3 py-2">Level</th>
            <th className="px-3 py-2">Slots</th>
            <th className="px-3 py-2">Count</th>
            <th className="px-3 py-2">ACF</th>
            <th className="px-3 py-2">Max</th>
            <th className="px-3 py-2" colSpan={5}>Child #1–#5</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(u=>{
            const ch = getChildren(u.userId);
            const full = u.childCount >= u.maxChildren;
            return (
              <tr key={u.userId} className={`border-t border-slate-700/50 ${selectedUser===u.userId?"bg-slate-800/40":""}`}>
                <td className="px-3 py-2 font-mono">{u.runNumber}</td>
                <td className="px-3 py-2 font-mono">{u.userId}</td>
                <td className="px-3 py-2">
                  <button onClick={()=>onSelect(u.userId)} className="underline underline-offset-2 hover:opacity-80">{u.userId}</button>
                </td>
                <td className="px-3 py-2 font-mono opacity-80">{u.parentId ?? "—"}</td>
                <td className="px-3 py-2">{u.level}</td>
                <td className="px-3 py-2"><SlotBar count={u.childCount} max={u.maxChildren} /></td>
                <td className="px-3 py-2"><Badge label={`${u.childCount}/${u.maxChildren}`} tone={full?"warn":"default"} /></td>
                <td className="px-3 py-2">
                  <button onClick={()=>onToggleAccept(u.userId)} className={`px-2 py-1 rounded-lg border ${u.acfAccepting?"border-emerald-500 text-emerald-400":"border-rose-500 text-rose-400"}`}>
                    {u.acfAccepting?"ON":"OFF"}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <select value={u.maxChildren} onChange={e=>onSetMax(u.userId, parseInt(e.target.value,10))} className="rounded px-2 py-1 bg-transparent border border-slate-600">
                    {[1,2,3,4,5].map(m=> <option key={m} value={m}>{m}</option>)}
                  </select>
                </td>
                {[0,1,2,3,4].map(i=> (
                  <td key={i} className="px-2 py-2">
                    {ch[i] ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-700/60">
                        <span className="font-mono text-xs">{ch[i].runNumber}</span>
                        <span className="opacity-80">{ch[i].userId}</span>
                      </span>
                    ) : (
                      <span className="opacity-40">—</span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------- Main Component ----------------
export default function ACFCanvasTester(){
  // nextSeq: 0 is reserved for SYSTEM_ROOT_ID. Start from 1 for the first signup (DEFAULT_ACF_ROOT_ID).
  const [nextSeq, setNextSeq] = useState<number>(1);

  const [users, setUsers] = useState<User[]>(()=>{
    const root: User = {
      userId: SYSTEM_ROOT_ID, // 25AAA0000
      runNumber: 0,
      parentId: null,
      childCount: 0,
      maxChildren: 1,
      acfAccepting: true,
      inviterId: null,
      inviteCode: null,
      createdAt: getNow(),
      level: 0,
    };
    return [root];
  });

  const [lastRun, setLastRun] = useState(0);
  const [selectedUser, setSelectedUser] = useState<string>(SYSTEM_ROOT_ID);

  // ACF Working Root (for NIC scoping & layering). Default to 25AAA0001, fallback to SYSTEM_ROOT_ID until available.
  const [acfRootId, setAcfRootId] = useState<string>(DEFAULT_ACF_ROOT_ID);

  const [bicInviter, setBicInviter] = useState<string>(SYSTEM_ROOT_ID);
  const [batch, setBatch] = useState<number>(5);

  // Settings
  const [respectACF, setRespectACF] = useState(true);
  const [defaultAcceptACF, setDefaultAcceptACF] = useState(true);
  const [autoCloseWhenFull, setAutoCloseWhenFull] = useState(true);

  const sortedUsers = useMemo(()=>[...users].sort((a,b)=>a.runNumber-b.runNumber),[users]);

  // Compute/refresh global level (for display)
  function recomputeGlobalLevels(list: User[]) {
    for (const u of list) u.level = computeGlobalLevel(list, u.userId);
  }

  // Resolve actual ACF root used (fallback to system root if not exists yet)
  const actualAcfRoot = useMemo(()=>{
    const exists = users.some(u=>u.userId===acfRootId);
    return exists ? acfRootId : SYSTEM_ROOT_ID;
  },[acfRootId, users]);

  // Live candidates
  const nicTop = useMemo(()=>{
    const subtree = bfsSubtree(users, actualAcfRoot);
    const depth = relativeDepthMap(users, actualAcfRoot);
    const pool = users.filter(u => subtree.has(u.userId) && u.userId !== SYSTEM_ROOT_ID && u.childCount < u.maxChildren && (!respectACF || u.acfAccepting));
    return pool.sort(cmpNICWithDepth(depth)).slice(0,5);
  },[users, respectACF, actualAcfRoot]);

  const bicTop = useMemo(()=>{
    const subtree = bfsSubtree(users, bicInviter);
    const depth = relativeDepthMap(users, bicInviter);
    const pool = users.filter(u => subtree.has(u.userId) && u.childCount < u.maxChildren && (!respectACF || u.acfAccepting));
    return pool.sort(cmpBIC(depth)).slice(0,5);
  },[users, bicInviter, respectACF]);

  function pickParent(mode: Mode, list: User[]): User | null {
    if (mode === "NIC") {
      const subtree = bfsSubtree(list, actualAcfRoot);
      const depth = relativeDepthMap(list, actualAcfRoot);
      const pool = list.filter(u => subtree.has(u.userId) && u.userId !== SYSTEM_ROOT_ID && u.childCount < u.maxChildren && (!respectACF || u.acfAccepting));
      return pool.sort(cmpNICWithDepth(depth))[0] ?? null;
    } else {
      const subtree = bfsSubtree(list, bicInviter);
      const depth = relativeDepthMap(list, bicInviter);
      const pool = list.filter(u => subtree.has(u.userId) && u.childCount < u.maxChildren && (!respectACF || u.acfAccepting));
      return pool.sort(cmpBIC(depth))[0] ?? null;
    }
  }

  function addOne(mode: Mode){
    setUsers(prev => {
      const copy = structuredClone(prev) as User[];
      const parent = pickParent(mode, copy);
      if (!parent) {
        alert(mode === "NIC" ? "NIC: ไม่มีผู้เปิดรับ/ที่ว่างในเลเยอร์ปัจจุบันภายใต้ ACF Root" : "BIC: เครือข่ายผู้เชิญไม่มีที่ว่าง/ไม่เปิดรับ");
        return prev;
      }
      const newRun = lastRun + 1;
      const newId = makeUserId(nextSeq); // 25AAA0001, 25AAA0002, ...
      const newUser: User = {
        userId: newId,
        runNumber: newRun,
        parentId: parent.userId,
        childCount: 0,
        maxChildren: 5,
        acfAccepting: defaultAcceptACF,
        inviterId: mode === "BIC" ? bicInviter : null,
        inviteCode: mode === "BIC" ? `INV-${bicInviter}` : null,
        createdAt: getNow(),
        level: 0,
      };
      copy.push(newUser);
      const p = copy.find(u=>u.userId===parent.userId)!;
      p.childCount += 1;
      if (autoCloseWhenFull && p.childCount >= p.maxChildren) p.acfAccepting = false;
      recomputeGlobalLevels(copy);
      setLastRun(newRun);
      setNextSeq(nextSeq + 1);
      setSelectedUser(parent.userId);
      return copy;
    });
  }

  function addBatchNIC(n:number){ for (let i=0;i<n;i++) addOne("NIC"); }

  function toggleAccept(uid: string){
    setUsers(prev => prev.map(u => {
      if (u.userId !== uid) return u;
      if (!u.acfAccepting) {
        const canOpen = u.childCount < u.maxChildren;
        return { ...u, acfAccepting: canOpen };
      }
      return { ...u, acfAccepting: false };
    }));
  }

  function setMax(uid: string, max: number){
    setUsers(prev => prev.map(u => u.userId===uid ? { ...u, maxChildren: Math.max(1, Math.min(5, max)), acfAccepting: (u.childCount < Math.max(1, Math.min(5, max)) ? u.acfAccepting : false) } : u));
  }

  function setSubtreeAccept(rootId: string, accept: boolean){
    setUsers(prev => {
      const ids = bfsSubtree(prev, rootId);
      return prev.map(u => ids.has(u.userId)
        ? { ...u, acfAccepting: accept ? (u.childCount < u.maxChildren) : false }
        : u);
    });
  }

  function CandidateList({ title, list }:{title:string;list:User[]}){
    return (
      <div className="border rounded-2xl p-3 bg-slate-800/40 border-slate-600">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">{title}</h3>
          <span className="text-xs opacity-70">ลำดับ (layer-first)</span>
        </div>
        {list.length === 0 ? (
          <div className="text-sm text-rose-400">ไม่มีผู้เปิดรับ/ที่ว่าง</div>
        ) : (
          <ol className="space-y-1">
            {list.map((u,idx)=>{
              const full = u.childCount >= u.maxChildren;
              return (
                <li key={u.userId} className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs">{idx+1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{u.userId} <span className="text-xs opacity-70">(run {u.runNumber})</span></div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge label={`level ${u.level}`} />
                      <SlotBar count={u.childCount} max={u.maxChildren} />
                      <Badge label={`${u.childCount}/${u.maxChildren}`} tone={full?"warn":"default"} />
                      <Badge label={u.acfAccepting?"ON":"OFF"} tone={u.acfAccepting?"ok":"crit"} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 p-6 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Fingrow ACF — Interactive Canvas Tester</h1>
          <p className="text-sm opacity-70 mt-1">System Root: <span className="font-mono bg-slate-100 text-slate-900 px-2 py-0.5 rounded">{SYSTEM_ROOT_ID}</span></p>
        </div>
        <div className="text-xs opacity-70">ACF: Layer-first (BFS) • Respect ACF: {respectACF?"ON":"OFF"}</div>
      </header>

      {/* Settings */}
      <section className="bg-slate-800/60 backdrop-blur rounded-2xl p-5 border border-slate-700/50 shadow">
        <h2 className="text-xl font-semibold mb-3">ACF Settings</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="text-xs opacity-80">ACF Root (ใช้คัด NIC layer-first ภายใต้เครือข่ายนี้)</div>
            <div className="flex gap-2 items-center flex-wrap">
              <select value={acfRootId} onChange={e=>setAcfRootId(e.target.value)} className="border rounded-lg px-3 py-2 bg-slate-900 text-slate-100 border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-600 appearance-none">
                {/* show DEFAULT_ACF_ROOT_ID first if exists */}
                {[...sortedUsers].map(u => (
                  <option key={u.userId} value={u.userId} className="bg-slate-900 text-slate-100">{u.userId} (run {u.runNumber})</option>
                ))}
              </select>
              <Badge label={`ใช้จริง: ${actualAcfRoot}`} />
            </div>
            <div className="text-xs opacity-70">ค่าเริ่มต้น: {DEFAULT_ACF_ROOT_ID} (ถ้ายังไม่มี จะ fallback เป็น {SYSTEM_ROOT_ID})</div>
          </div>

          <div className="space-y-2">
            <div className="text-xs opacity-80">พารามิเตอร์</div>
            <label className="flex items-center gap-2"><input type="checkbox" className="scale-110" checked={respectACF} onChange={e=>setRespectACF(e.target.checked)} /> พิจารณาเฉพาะผู้ที่เปิดรับ ACF</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="scale-110" checked={defaultAcceptACF} onChange={e=>setDefaultAcceptACF(e.target.checked)} /> สมาชิกใหม่เปิดรับ ACF อัตโนมัติ</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="scale-110" checked={autoCloseWhenFull} onChange={e=>setAutoCloseWhenFull(e.target.checked)} /> ปิดรับอัตโนมัติเมื่อเต็ม</label>
          </div>
        </div>
      </section>

      {/* Controls + Live Candidates */}
      <section className="grid lg:grid-cols-3 gap-4">
        <div className="rounded-2xl p-4 space-y-3 bg-slate-800/60 border border-slate-700/50">
          <h2 className="font-semibold text-lg">Add via NIC</h2>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={()=>addOne("NIC")} className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white">Add 1 via NIC</button>
            <input type="number" min={1} value={batch} onChange={e=>setBatch(parseInt(e.target.value||"1",10))} className="w-24 rounded-lg px-3 py-2 border border-slate-600 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600"/>
            <button onClick={()=>addBatchNIC(Math.max(1, batch))} className="px-3 py-2 rounded-xl border border-slate-600">Add N via NIC</button>
          </div>
          <p className="text-xs opacity-70">คัด parent ภายใต้ ACF Root: <span className="font-mono">{actualAcfRoot}</span> • ชั้นตื้นก่อน → child → เวลา</p>
          <CandidateList title="NIC Candidate (Top 5)" list={nicTop} />
        </div>

        <div className="rounded-2xl p-4 space-y-3 bg-slate-800/60 border border-slate-700/50">
          <h2 className="font-semibold text-lg">Add via BIC</h2>
          <div className="flex items-center gap-2">
            <select aria-label="Select inviter" value={bicInviter} onChange={e=>setBicInviter(e.target.value)} className="rounded-lg px-3 py-2 border border-slate-600 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600 appearance-none">
              {sortedUsers.map(u => (
                <option key={u.userId} value={u.userId} className="bg-slate-900 text-slate-100">{u.userId} (run {u.runNumber})</option>
              ))}
            </select>
            <button onClick={()=>addOne("BIC")} className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white">Add via BIC</button>
          </div>
          <p className="text-xs opacity-70">จำกัดใต้เครือข่ายผู้เชิญ: ชั้นใกล้ผู้เชิญก่อน → child → เวลา</p>
          <CandidateList title="BIC Candidate (Top 5)" list={bicTop} />
        </div>

        <div className="rounded-2xl p-4 space-y-3 bg-slate-800/60 border border-slate-700/50">
          <h2 className="font-semibold text-lg">Tree Focus</h2>
          <div className="flex items-center gap-2">
            <select value={selectedUser} onChange={e=>setSelectedUser(e.target.value)} className="rounded-lg px-3 py-2 border border-slate-600 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600 appearance-none">
              {sortedUsers.map(u => (
                <option key={u.userId} value={u.userId} className="bg-slate-900 text-slate-100">{u.userId} (run {u.runNumber})</option>
              ))}
            </select>
            <span className="text-xs opacity-70">แสดงเครือข่ายย่อย</span>
          </div>
          <div className="text-xs opacity-70">รวม {bfsSubtree(users, selectedUser).size} คนในเครือข่ายนี้</div>
          <div className="text-xs opacity-70">Tip: คลิกชื่อใน Tree เพื่อ focus</div>
        </div>
      </section>

      {/* Tree View */}
      <section className="rounded-2xl p-4 bg-slate-800/60 border border-slate-700/50">
        <h2 className="font-semibold mb-3 text-lg">Subtree Viewer</h2>
        <TreeBranch users={users} rootId={selectedUser} onSelect={setSelectedUser} />
      </section>

      {/* Users Table */}
      <section className="rounded-2xl p-4 bg-slate-800/60 border border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Users Table (Child 1–5)</h2>
          <div className="text-xs opacity-70">คลิก User เพื่อโฟกัส / สลับ ACF / ตั้งค่า Max</div>
        </div>
        <UsersTable
          users={users}
          selectedUser={selectedUser}
          onSelect={setSelectedUser}
          onToggleAccept={toggleAccept}
          onSetMax={setMax}
        />
      </section>

      <footer className="text-xs opacity-70 text-center pb-6">SystemRoot={SYSTEM_ROOT_ID} • Default ACF Root={DEFAULT_ACF_ROOT_ID} • NIC scoped to ACF Root • BIC scoped to inviter • Order: depth→child→time→run.</footer>
    </div>
  );
}

// ---------------- Dev sanity tests (console only) ----------------
(function runDevTests(){
  try {
    const t0 = getNow();
    const id1 = makeUserId(1); const id2 = makeUserId(12);
    console.assert(/^\d{2}[A-Z]{3}\d{4}$/.test(id1) && /^\d{2}[A-Z]{3}\d{4}$/.test(id2), 'UserId format must be YYAAA####');

    const ROOT: User = { userId: SYSTEM_ROOT_ID, runNumber: 0, parentId: null, childCount: 0, maxChildren: 1, acfAccepting: true, inviterId: null, inviteCode: null, createdAt: t0-1000, level: 0 } as any;
    const A: User    = { userId: makeUserId(1), runNumber: 1, parentId: SYSTEM_ROOT_ID, childCount: 0, maxChildren: 5, acfAccepting: true, inviterId: null, inviteCode: null, createdAt: t0-900, level: 1 } as any;
    const B: User    = { userId: makeUserId(2), runNumber: 2, parentId: SYSTEM_ROOT_ID, childCount: 0, maxChildren: 5, acfAccepting: true, inviterId: null, inviteCode: null, createdAt: t0-800, level: 1 } as any;
    const A1: User   = { userId: makeUserId(3), runNumber: 3, parentId: A.userId,       childCount: 0, maxChildren: 5, acfAccepting: true, inviterId: null, inviteCode: null, createdAt: t0-700, level: 2 } as any;

    const usersBase: User[] = [ROOT, A, B, A1];
    const acfRootWanted = DEFAULT_ACF_ROOT_ID;
    const acfRootActual = usersBase.some(u=>u.userId===acfRootWanted) ? acfRootWanted : SYSTEM_ROOT_ID;
    console.assert(acfRootActual === SYSTEM_ROOT_ID, 'Fallback to system root if default ACF root not present');

    const depthMap = relativeDepthMap(usersBase, acfRootActual);
    const nicScoped = usersBase.filter(u=>bfsSubtree(usersBase, acfRootActual).has(u.userId) && u.userId!==SYSTEM_ROOT_ID);
    const nicSorted = nicScoped.sort(cmpNICWithDepth(depthMap)).map(u=>u.userId);
    console.assert(nicSorted[0]===A.userId || nicSorted[0]===B.userId, '[NIC BFS] shallower under ACF root first');
  } catch(e){
    console.warn('[ACF DevTests] Warning:', e);
  }
})();
