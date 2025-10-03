import React, { useEffect, useMemo, useState } from "react";

export default function FingrowACFMock() {
  // === Core constants ===
  const nowISO = () => new Date().toISOString();
  const rootUserId = "Anatta999"; // Simulated root (we will recreate real root on reset)

  // === Users table (mock of main user registry) ===
  const [users, setUsers] = useState([
    { userId: rootUserId, username: "Anatta Root", createdAt: nowISO(), registType: "NIC", invitor: null },
  ]);

  // === FingrowDNA.db (in-memory mock) ===
  const [dna, setDna] = useState(() => ({
    [rootUserId]: {
      runNumber: 0,
      userId: rootUserId,
      registTime: nowISO(),
      registType: "NIC",
      invitor: null,
      userType: "Anatta",
      level: 0, // absolute level from root
      maxFollower: 1, // Root can have only 1 follower by default
      followerCount: 0,
      followerFullStatus: "Open",
      maxLevelRoyalty: 19530,
      jsFilePath: `/net/${rootUserId}.js`,
      childCount: 0,
      parentId: null,
      parentFile: null,
      ownFinpoint: 0, // editable earning of this user
      totalFinpoint: 0, // subtree sum (self + descendants)
    },
  }));

  // === JS files storage (network lists per user) ===
  // We tag edges so that BFS/subtree uses only PARENT edges (INDEX edges are for owner index view only)
  const [jsonFiles, setJsonFiles] = useState({ [rootUserId]: [] });

  // === Run number / username autoincrement ===
  const [nextRun, setNextRun] = useState(1); // 1..N for normal users (Atta)
  const autoUsername = useMemo(() => String(nextRun - 1), [nextRun]); // 0,1,2,... on UI

  // === Registration controls ===
  const [mode, setMode] = useState("NIC"); // "NIC" | "BIC"
  const [chosenInvitor, setChosenInvitor] = useState(rootUserId);
  const [continuousAdd, setContinuousAdd] = useState(true);
  const [allocScope, setAllocScope] = useState("FILE"); // "FILE" | "NETWORK"
  const bicOptions = useMemo(() => users.map((u) => u.userId), [users]);

  // === Helpers ===
  const computeStatus = (count, max) => (count < max ? "Open" : "Full");

  // Sum subtree ownFinpoint for every user (self + descendants using PARENT edges only)
  const recomputeTotalFinpoints = (dnaState, jsonState) => {
    const ids = Object.keys(dnaState);
    const totals = {};
    for (const id of ids) {
      let sum = 0;
      const visited = new Set();
      const q = [id];
      while (q.length) {
        const cur = q.shift();
        if (visited.has(cur)) continue;
        visited.add(cur);
        sum += Number(dnaState[cur]?.ownFinpoint || 0);
        const children = (jsonState[cur] || []).filter(e => e.edgeType === "PARENT").map(e => e.userId);
        for (const cid of children) q.push(cid);
      }
      totals[id] = sum;
    }
    return totals;
  };

  // Build candidate parent list from a target owner (root for NIC, specific invitor for BIC)
  // Policy: Layer-first (closest to invitor), then Earliest-first (fill to 5), then runNumber
  // Enforce 7-level cap at registration time (parent.level must be <= 6)
  // Supports test overrides to allow unit-like assertions without mutating live state
  const buildCandidatesFromFile = (targetOwnerId, override) => {
    const dnaRef = (override && override.dna) ? override.dna : dna;
    const jsonRef = (override && override.jsonFiles) ? override.jsonFiles : jsonFiles;
    const scopeRef = (override && override.allocScope) ? override.allocScope : allocScope;
    const usersRef = (override && override.users) ? override.users : users;

    // Build depth map from the invitor using BFS (PARENT edges only)
    const depthMap = new Map();
    const queue = [targetOwnerId];
    depthMap.set(targetOwnerId, 0);

    while (queue.length) {
      const id = queue.shift();
      const children = (jsonRef[id] || []).filter(e => e.edgeType === "PARENT");
      for (const c of children) {
        const cid = c.userId;
        if (!depthMap.has(cid)) {
          depthMap.set(cid, (depthMap.get(id) || 0) + 1);
          queue.push(cid);
        }
      }
    }

    // Build status rows (snapshot from refs)
    let nodes = Array.from(depthMap.entries()).map(([id, depth]) => {
      const rec = dnaRef[id];
      const followerCount = rec && typeof rec.followerCount === 'number' ? rec.followerCount : 0;
      const maxFollower = rec && typeof rec.maxFollower === 'number' ? rec.maxFollower : (id === rootUserId ? 1 : 5);
      const status = computeStatus(followerCount, maxFollower);
      const u = usersRef.find((x) => x.userId === id);
      const createdAt = (u && u.createdAt) ? u.createdAt : nowISO();
      const runNumber = rec && typeof rec.runNumber === 'number' ? rec.runNumber : Number.MAX_SAFE_INTEGER;
      const level = rec && typeof rec.level === 'number' ? rec.level : 0;
      return { id, depth, level, followerCount, maxFollower, status, createdAt, runNumber };
    });

    // Scope mapping per business rule (with fallback):
    // FILE     => Direct child only (parent must be the invitor itself) => depth === 0
    // NETWORK  => Under the invitor's child subtree only (exclude invitor) => depth >= 1
    // NEW: If FILE has no open slot (invitor Full), fallback to NETWORK automatically.
    const filterByScope = (arr, scopeName) => {
      if (scopeName === 'FILE') return arr.filter((n) => n.depth === 0);
      return arr.filter((n) => n.depth >= 1);
    };

    // First try the requested scope
    let scoped = filterByScope(nodes, scopeRef);
    let open = scoped.filter((n) => n.status === "Open" && n.level <= 6);

    // Fallback: if FILE yields no open parent, try NETWORK (child subtree)
    if (open.length === 0 && scopeRef === 'FILE') {
      const networkScoped = filterByScope(nodes, 'NETWORK');
      open = networkScoped.filter((n) => n.status === "Open" && n.level <= 6);
    }

    if (open.length === 0) return [];

    // Layer-first: choose the nearest layer to invitor (based on computed depth)
    const minDepth = Math.min(...open.map((n) => n.depth));
    open = open.filter((n) => n.depth === minDepth);

    // Within the chosen layer: Earliest-first, then least-loaded, then lowest runNumber
    open.sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      if (ta !== tb) return ta - tb; // earliest first (fill earliest parents to 5 first)
      if (a.followerCount !== b.followerCount) return a.followerCount - b.followerCount; // fill to 5
      return (a.runNumber || 0) - (b.runNumber || 0);
    });

    return open;
  };

  // === Register & ACF ===
  const handleRegister = () => {
    const newUserId = `UID-${nextRun}`;
    const createdAt = nowISO();
    const invitorId = mode === "NIC" ? rootUserId : chosenInvitor;
    const registType = mode; // NIC / BIC
    const runNumber = nextRun;
    const userType = "Atta"; // runNumber >= 1

    const newUser = { userId: newUserId, username: autoUsername, createdAt, registType, invitor: invitorId };
    const newUsers = [...users, newUser];

    // Parent matching within invitor's subtree according to scope (with automatic fallback when invitor Full)
    const candidates = buildCandidatesFromFile(invitorId);
    if (candidates.length === 0) {
      alert("No open parent found under invitor scope (hit 5x7 constraints)");
      return;
    }
    const parent = candidates[0];

    // Enforce 7-level cap strictly: child level = parent.level + 1 must be <= 7
    const parentLevel = (dna[parent.id] && typeof dna[parent.id].level === 'number') ? dna[parent.id].level : 0;
    const childLevel = parentLevel + 1;
    if (childLevel > 7) {
      alert("Selected parent would exceed max level (7)");
      return;
    }

    // New DNA record for this user
    const newUserDna = {
      runNumber,
      userId: newUserId,
      registTime: createdAt,
      registType,
      invitor: invitorId,
      userType,
      level: childLevel,
      maxFollower: 5, // default for Atta
      followerCount: 0,
      followerFullStatus: "Open",
      maxLevelRoyalty: 19530,
      jsFilePath: `/net/${newUserId}.js`,
      childCount: 0,
      parentId: parent.id,
      parentFile: `/net/${parent.id}.js`,
      ownFinpoint: 0,
      totalFinpoint: 0,
    };

    // Append to parent JSON file (+ owner index for NIC/BIC scope) with edge types
    const childRecordParent = { runNumber, userId: newUserId, registTime: createdAt, followerFullStatus: "Open", edgeType: "PARENT" };
    const childRecordIndex  = { runNumber, userId: newUserId, registTime: createdAt, followerFullStatus: "Open", edgeType: "INDEX" };
    const newJsonFiles = { ...jsonFiles };
    if (!newJsonFiles[parent.id]) newJsonFiles[parent.id] = [];
    newJsonFiles[parent.id] = [...newJsonFiles[parent.id], childRecordParent];

    const ownerIndexId = invitorId; // NIC: root; BIC: chosen invitor
    if (!newJsonFiles[ownerIndexId]) newJsonFiles[ownerIndexId] = [];
    if (!newJsonFiles[ownerIndexId].some((r) => r.userId === newUserId && r.edgeType === "INDEX")) {
      newJsonFiles[ownerIndexId] = [...newJsonFiles[ownerIndexId], childRecordIndex];
    }

    if (!newJsonFiles[newUserId]) newJsonFiles[newUserId] = [];

    // Update parent follow status & childCount
    const parentFollowerCount = ((dna[parent.id] && dna[parent.id].followerCount) || 0) + 1;
    const parentMax = (dna[parent.id] && dna[parent.id].maxFollower != null) ? dna[parent.id].maxFollower : (parent.id === rootUserId ? 1 : 5);

    let updatedDna = {
      ...dna,
      [newUserId]: newUserDna,
      [parent.id]: {
        ...(dna[parent.id] || {}),
        followerCount: parentFollowerCount,
        followerFullStatus: computeStatus(parentFollowerCount, parentMax),
        childCount: (newJsonFiles[parent.id] ? newJsonFiles[parent.id].filter(e => e.edgeType === "PARENT").length : 0),
      },
    };

    // Recompute totalFinpoint for all users after topology changes
    const totals = recomputeTotalFinpoints(updatedDna, newJsonFiles);
    updatedDna = Object.fromEntries(Object.entries(updatedDna).map(([id, rec]) => [id, { ...rec, totalFinpoint: totals[id] || 0 }]));

    setUsers(newUsers);
    setDna(updatedDna);
    setJsonFiles(newJsonFiles);
    setNextRun(nextRun + 1);

    if (!continuousAdd) alert(`Registered. ACF parent = ${parent.id} (level ${childLevel})`);
  };

  // === Admin overrides (maxFollower / maxLevelRoyalty) ===
  const [editingUserId, setEditingUserId] = useState(null);
  const [overrideMaxFollower, setOverrideMaxFollower] = useState("");
  const [overrideMaxLevel, setOverrideMaxLevel] = useState("");

  const beginEdit = (uid) => {
    setEditingUserId(uid);
    setOverrideMaxFollower(String((dna[uid] && dna[uid].maxFollower != null) ? dna[uid].maxFollower : ""));
    setOverrideMaxLevel(String((dna[uid] && dna[uid].maxLevelRoyalty != null) ? dna[uid].maxLevelRoyalty : ""));
  };

  const saveOverrides = () => {
    if (!editingUserId) return;
    const mf = parseInt(overrideMaxFollower, 10);
    const ml = parseInt(overrideMaxLevel, 10);
    const prev = dna[editingUserId] || {};

    const mfValid = Number.isNaN(mf) ? (prev.maxFollower != null ? prev.maxFollower : 5) : mf;
    const mlValid = Number.isNaN(ml) ? (prev.maxLevelRoyalty != null ? prev.maxLevelRoyalty : 19530) : ml;

    const followerCount = prev.followerCount != null ? prev.followerCount : 0;
    const followerFullStatus = computeStatus(followerCount, mfValid);

    let updated = {
      ...dna,
      [editingUserId]: {
        ...prev,
        maxFollower: mfValid,
        maxLevelRoyalty: mlValid,
        followerFullStatus,
      },
    };

    // Recompute totals (structure unchanged, but keep consistency)
    const totals = recomputeTotalFinpoints(updated, jsonFiles);
    updated = Object.fromEntries(Object.entries(updated).map(([id, rec]) => [id, { ...rec, totalFinpoint: totals[id] || 0 }]));

    setDna(updated);
    setEditingUserId(null);
  };

  // === Own Finpoint editor ===
  const updateOwnFinpoint = (uid, val) => {
    const num = Number(val);
    const prev = dna[uid] || {};
    let updated = { ...dna, [uid]: { ...prev, ownFinpoint: Number.isFinite(num) ? num : 0 } };
    const totals = recomputeTotalFinpoints(updated, jsonFiles);
    updated = Object.fromEntries(Object.entries(updated).map(([id, rec]) => [id, { ...rec, totalFinpoint: totals[id] || 0 }]));
    setDna(updated);
  };

  // === Debug / Test Cases ===
  const viewJson = (uid) => alert(`${uid}.js\n` + JSON.stringify(jsonFiles[uid] || [], null, 2));

  useEffect(() => {
    // Basic tests for computeStatus (keep existing tests)
    console.assert(computeStatus(0, 1) === "Open", "0/1 => Open");
    console.assert(computeStatus(1, 1) === "Full", "1/1 => Full");
    console.assert(computeStatus(4, 5) === "Open", "4/5 => Open");
    // Extra test: boundary full
    console.assert(computeStatus(5, 5) === "Full", "5/5 => Full");

    // Candidate test at boot: root should be the first open candidate under FILE (depth 0 only)
    const cands = buildCandidatesFromFile(rootUserId);
    console.assert(Array.isArray(cands) && cands[0] && cands[0].id === rootUserId, "Root should be first candidate (layer-first, earliest-first)");

    // New tests: FILE fallback to NETWORK when invitor is Full
    (function testFileFallback() {
      const mockDna = {
        ...dna,
        [rootUserId]: { ...(dna[rootUserId] || {}), followerCount: 1, maxFollower: 1 },
        A: {
          runNumber: 99, userId: 'A', registTime: nowISO(), registType: 'NIC', invitor: rootUserId,
          userType: 'Atta', level: 1, maxFollower: 5, followerCount: 0, followerFullStatus: 'Open',
          maxLevelRoyalty: 19530, jsFilePath: '/net/A.js', childCount: 0, parentId: rootUserId, parentFile: `/net/${rootUserId}.js`, ownFinpoint: 0, totalFinpoint: 0,
        },
      };
      const mockUsers = [...users, { userId: 'A', username: 'A', createdAt: nowISO(), registType: 'NIC', invitor: rootUserId }];
      const mockFiles = { ...jsonFiles, [rootUserId]: [ { userId: 'A', edgeType: 'PARENT' } ], A: [] };
      const c = buildCandidatesFromFile(rootUserId, { dna: mockDna, jsonFiles: mockFiles, allocScope: 'FILE', users: mockUsers });
      console.assert(c.length > 0 && c[0].id === 'A', 'FILE should fallback to NETWORK (child subtree) when invitor is Full');
    })();

    // NETWORK should exclude invitor node itself
    (function testNetworkExcludesInvitor() {
      const c2 = buildCandidatesFromFile(rootUserId, { allocScope: 'NETWORK' });
      console.assert(!c2.some(x => x.id === rootUserId), 'NETWORK must exclude invitor node');
    })();
  }, []);

  // Reusable header renderers to avoid parser issues with long inline JSX rows
  const dnaHeaders = [
    "run #","userId","userType","level","registTime","registType","invitor","maxFollower",
    "followerCount","FollowerFull","maxLevelRoyalty","childCount","parentId","ownFinpoint","totalFinpoint"
  ];
  const userHeaders = ["#","User ID","Username","Created","Regist Type","Invitor","Actions"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 p-6 max-w-7xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fingrow ACF Mock</h1>
        <div className="text-sm opacity-70">All data in-memory - Demo only</div>
      </header>

      {/* Registration */}
      <section className="bg-slate-800/60 backdrop-blur rounded-2xl p-5 border border-slate-700/50 shadow">
        <h2 className="text-xl font-semibold mb-4">Register + Run ACF</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm">Next Username (auto)</label>
            <div className="mt-1 px-3 py-2 rounded-xl border border-slate-600/60 bg-slate-900/40 font-mono">{autoUsername}</div>
            <div className="text-xs opacity-70 mt-1">System assigns 0,1,2...</div>
          </div>
          <div>
            <label className="text-sm">Regist Type</label>
            <div className="mt-1 flex gap-2">
              <button className={`px-3 py-2 rounded-xl border ${mode === "NIC" ? "bg-white/10" : ""}`} onClick={() => setMode("NIC")}>NIC</button>
              <button className={`px-3 py-2 rounded-xl border ${mode === "BIC" ? "bg-white/10" : ""}`} onClick={() => setMode("BIC")}>BIC</button>
            </div>
          </div>
          <div>
            <label className="text-sm">Invitor</label>
            <select className="w-full mt-1 rounded-xl border border-slate-600/60 bg-transparent p-2" value={chosenInvitor} onChange={(e) => setChosenInvitor(e.target.value)} disabled={mode !== "BIC"}>
              {bicOptions.map((id) => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <button className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700" onClick={handleRegister}>Register &amp; Run ACF</button>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="scale-110" checked={continuousAdd} onChange={(e)=>setContinuousAdd(e.target.checked)} /> Continuous register</label>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="opacity-80">Policy: Layer-first (closest to invitor) - Earliest-first (fill to 5) - Hard cap at 7 levels - FILE: direct child only (fallback to NETWORK when Full), NETWORK: under child subtree</span>
            <label className="flex items-center gap-1">
              <input type="radio" name="scope" checked={allocScope === 'FILE'} onChange={()=>setAllocScope('FILE')} /> Direct child only (Parent = Invitor)
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" name="scope" checked={allocScope === 'NETWORK'} onChange={()=>setAllocScope('NETWORK')} /> Under child subtree (exclude Invitor)
            </label>
          </div>
        </div>
      </section>

      {/* DNA Table */}
      <section className="bg-slate-800/60 backdrop-blur rounded-2xl p-5 border border-slate-700/50 shadow">
        <h2 className="text-xl font-semibold mb-4">FingrowDNA.db (Mock)</h2>
        <div className="overflow-auto">
          <table className="min-w-full text-xs">
            <thead className="text-left">
              <tr className="border-b border-slate-700/50">
                {dnaHeaders.map((h) => (<th key={h}>{h}</th>))}
              </tr>
            </thead>
            <tbody>
              {Object.values(dna).sort((a,b)=>(a.runNumber??999)-(b.runNumber??999)).map((r)=> (
                <tr key={r.userId} className="border-b border-slate-800/60">
                  <td>{r.runNumber}</td>
                  <td className="font-mono">{r.userId}</td>
                  <td>{r.userType}</td>
                  <td>{r.level ?? '-'}</td>
                  <td>{r.registTime}</td>
                  <td>{r.registType}</td>
                  <td>{r.invitor || "-"}</td>
                  <td>{r.maxFollower}</td>
                  <td>{r.followerCount}</td>
                  <td>{r.followerFullStatus}</td>
                  <td>{r.maxLevelRoyalty}</td>
                  <td>{r.childCount}</td>
                  <td>{r.parentId || "-"}</td>
                  <td>
                    <input className="w-24 bg-transparent border border-slate-700 rounded px-2 py-1 text-right" value={dna[r.userId]?.ownFinpoint ?? 0} onChange={(e)=>updateOwnFinpoint(r.userId, e.target.value)} />
                  </td>
                  <td className="text-right tabular-nums">{Number(r.totalFinpoint || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Users table */}
      <section className="bg-slate-800/60 backdrop-blur rounded-2xl p-5 border border-slate-700/50 shadow">
        <h2 className="text-xl font-semibold mb-4">Users</h2>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left">
              <tr className="border-b border-slate-700/50">
                {userHeaders.map((h) => (<th key={h}>{h}</th>))}
              </tr>
            </thead>
            <tbody>
              {users.map((u,i)=> (
                <tr key={u.userId} className="border-b border-slate-800/60">
                  <td>{i===0?0:i}</td>
                  <td className="font-mono">{u.userId}</td>
                  <td>{u.username}</td>
                  <td>{u.createdAt}</td>
                  <td>{u.registType}</td>
                  <td>{u.invitor || "-"}</td>
                  <td className="flex gap-2">
                    <button className="px-3 py-1 rounded-lg border" onClick={()=>viewJson(u.userId)}>View JS file</button>
                    {dna[u.userId] && (
                      <button className="px-3 py-1 rounded-lg border" onClick={()=>beginEdit(u.userId)}>Admin Override</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* JSON explorer */}
      <section className="bg-slate-800/60 backdrop-blur rounded-2xl p-5 border border-slate-700/50 shadow">
        <h2 className="text-xl font-semibold mb-4">Network files (JSON)</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {Object.keys(jsonFiles).map((uid)=> (
            <div key={uid} className="border border-slate-700/50 rounded-xl p-3">
              <div className="font-semibold mb-2">{uid}.js</div>
              <pre className="text-xs whitespace-pre-wrap bg-slate-900/40 rounded-lg p-2 max-h-40 overflow-auto">{JSON.stringify(jsonFiles[uid], null, 2)}</pre>
              <div className="text-xs mt-2 opacity-70">path: /net/<span className="font-mono">{uid}</span>.js</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center opacity-70 text-xs pt-4">Fingrow - ACF Demo</footer>
    </div>
  );
}
