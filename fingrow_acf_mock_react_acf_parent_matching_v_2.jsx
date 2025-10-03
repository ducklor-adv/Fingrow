import React, { useEffect, useMemo, useState } from "react";

export default function FingrowACFMock() {
  // === Core constants ===
  const nowISO = () => new Date().toISOString();
  const rootUserId = "Anatta999"; // user0

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
      maxFollower: 1, // Root can have only 1 follower by default
      followerCount: 0,
      followerFullStatus: "Open",
      maxLevelRoyalty: 19530,
      jsFilePath: `/net/${rootUserId}.js`,
      childCount: 0,
      parentId: null,
      parentFile: null,
      totalFinpoint: 0,
    },
  }));

  // === JS files storage (network lists per user) ===
  const [jsonFiles, setJsonFiles] = useState<{ [k: string]: any[] }>({ [rootUserId]: [] });

  // === Run number / username autoincrement ===
  const [nextRun, setNextRun] = useState(1); // 1..N for normal users (Atta)
  const autoUsername = useMemo(() => String(nextRun - 1), [nextRun]); // 0,1,2,... on UI

  // === Registration controls ===
  const [mode, setMode] = useState<"NIC" | "BIC">("NIC");
  const [chosenInvitor, setChosenInvitor] = useState(rootUserId);
  const [continuousAdd, setContinuousAdd] = useState(true);
  const [allocScope, setAllocScope] = useState<"FILE" | "NETWORK">("FILE");
  const bicOptions = useMemo(() => users.map((u) => u.userId), [users]);

  // === Helpers ===
  const computeStatus = (count: number, max: number) => (count < max ? "Open" : "Full");

  // Build candidate parent list from a target owner (root for NIC, specific invitor for BIC)
  const buildCandidatesFromFile = (targetOwnerId: string) => {
    let candidateIds: Set<string> = new Set([targetOwnerId]);

    if (allocScope === "NETWORK") {
      // BFS across entire downline of target owner
      const visited = new Set<string>();
      const queue: string[] = [targetOwnerId];
      while (queue.length) {
        const id = queue.shift() as string;
        if (visited.has(id)) continue;
        visited.add(id);
        const children = jsonFiles[id] || [];
        for (const c of children) if (!visited.has(c.userId)) queue.push(c.userId);
      }
      candidateIds = visited;
    } else {
      // FILE: owner + entries inside owner file (index)
      const file = jsonFiles[targetOwnerId] || [];
      file.forEach((child) => candidateIds.add(child.userId));
    }

    const out = Array.from(candidateIds).map((id) => {
      const rec = dna[id];
      const followerCount = rec?.followerCount ?? 0;
      const maxFollower = rec?.maxFollower ?? (id === rootUserId ? 1 : 5);
      const status = computeStatus(followerCount, maxFollower);
      const u = users.find((x) => x.userId === id);
      const createdAt = u?.createdAt || nowISO();
      const runNumber = rec?.runNumber ?? Number.MAX_SAFE_INTEGER;
      return { id, followerCount, maxFollower, status, createdAt, runNumber };
    });

    // Eligible = only OPEN
    const open = out.filter((c) => c.status === "Open");

    // ✅ Spec-aligned deterministic ordering to prevent flip-flop
    // 1) Lowest followerCount first (least-loaded)
    // 2) Earliest registTime (createdAt ASC)
    // 3) Lowest runNumber as final tie-breaker
    open.sort((a, b) => {
      if (a.followerCount !== b.followerCount) return a.followerCount - b.followerCount;
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      if (ta !== tb) return ta - tb;
      return (a.runNumber ?? 0) - (b.runNumber ?? 0);
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

    // Parent matching within invitor's file or full network
    const candidates = buildCandidatesFromFile(invitorId);
    if (candidates.length === 0) {
      if (!continuousAdd) alert("ไม่พบ Parent ที่มีสถานะ Open ในไฟล์ปลายทาง");
      return;
    }
    const parent = candidates[0];

    // New DNA record for this user
    const newUserDna = {
      runNumber,
      userId: newUserId,
      registTime: createdAt,
      registType,
      invitor: invitorId,
      userType,
      maxFollower: 5, // default for Atta
      followerCount: 0,
      followerFullStatus: "Open",
      maxLevelRoyalty: 19530,
      jsFilePath: `/net/${newUserId}.js`,
      childCount: 0,
      parentId: parent.id,
      parentFile: `/net/${parent.id}.js`,
      totalFinpoint: 0,
    };

    // Append to parent JSON file (+ owner index for NIC/BIC scope)
    const childRecord = { runNumber, userId: newUserId, registTime: createdAt, followerFullStatus: "Open" };
    const newJsonFiles = { ...jsonFiles };
    if (!newJsonFiles[parent.id]) newJsonFiles[parent.id] = [];
    newJsonFiles[parent.id] = [...newJsonFiles[parent.id], childRecord];

    const ownerIndexId = invitorId; // NIC: root; BIC: chosen invitor
    if (!newJsonFiles[ownerIndexId]) newJsonFiles[ownerIndexId] = [];
    if (!newJsonFiles[ownerIndexId].some((r: any) => r.userId === newUserId)) {
      newJsonFiles[ownerIndexId] = [...newJsonFiles[ownerIndexId], childRecord];
    }

    if (!newJsonFiles[newUserId]) newJsonFiles[newUserId] = [];

    // Update parent follow status & childCount
    const parentFollowerCount = (dna[parent.id]?.followerCount || 0) + 1;
    const parentMax = dna[parent.id]?.maxFollower ?? (parent.id === rootUserId ? 1 : 5);

    const updatedDna = {
      ...dna,
      [newUserId]: newUserDna,
      [parent.id]: {
        ...(dna[parent.id] || {}),
        followerCount: parentFollowerCount,
        followerFullStatus: computeStatus(parentFollowerCount, parentMax),
        childCount: (jsonFiles[parent.id]?.length || 0) + 1,
      },
    };

    setUsers(newUsers);
    setDna(updatedDna);
    setJsonFiles(newJsonFiles);
    setNextRun(nextRun + 1);

    if (!continuousAdd) alert(`สมัครสำเร็จ และ ACF จัดวาง parent เป็น ${parent.id}`);
  };

  // === Admin overrides (maxFollower / maxLevelRoyalty) ===
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [overrideMaxFollower, setOverrideMaxFollower] = useState("");
  const [overrideMaxLevel, setOverrideMaxLevel] = useState("");

  const beginEdit = (uid: string) => {
    setEditingUserId(uid);
    setOverrideMaxFollower(String(dna[uid]?.maxFollower ?? ""));
    setOverrideMaxLevel(String(dna[uid]?.maxLevelRoyalty ?? ""));
  };

  const saveOverrides = () => {
    if (!editingUserId) return;
    const mf = parseInt(overrideMaxFollower, 10);
    const ml = parseInt(overrideMaxLevel, 10);
    const prev = (dna as any)[editingUserId] || {};

    const mfValid = Number.isNaN(mf) ? (prev.maxFollower ?? 5) : mf;
    const mlValid = Number.isNaN(ml) ? (prev.maxLevelRoyalty ?? 19530) : ml;

    const followerCount = prev.followerCount ?? 0;
    const followerFullStatus = computeStatus(followerCount, mfValid);

    setDna({
      ...dna,
      [editingUserId]: {
        ...prev,
        maxFollower: mfValid,
        maxLevelRoyalty: mlValid,
        followerFullStatus,
      },
    });
    setEditingUserId(null);
  };

  // === Debug ===
  const viewJson = (uid: string) => alert(`${uid}.js\n` + JSON.stringify(jsonFiles[uid] || [], null, 2));

  useEffect(() => {
    console.assert(computeStatus(0, 1) === "Open", "0/1 => Open");
    console.assert(computeStatus(1, 1) === "Full", "1/1 => Full");
    console.assert(computeStatus(4, 5) === "Open", "4/5 => Open");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 p-6 max-w-7xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fingrow ACF Mock</h1>
        <div className="text-sm opacity-70">All data in-memory • Demo only</div>
      </header>

      {/* Registration */}
      <section className="bg-slate-800/60 backdrop-blur rounded-2xl p-5 border border-slate-700/50 shadow">
        <h2 className="text-xl font-semibold mb-4">สมัครสมาชิก + Run ACF</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm">Next Username (อัตโนมัติ)</label>
            <div className="mt-1 px-3 py-2 rounded-xl border border-slate-600/60 bg-slate-900/40 font-mono">{autoUsername}</div>
            <div className="text-xs opacity-70 mt-1">ระบบจะตั้งชื่อผู้ใช้ให้อัตโนมัติเป็น 0,1,2…</div>
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
          <button className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700" onClick={handleRegister}>สมัคร & Run ACF</button>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="scale-110" checked={continuousAdd} onChange={(e)=>setContinuousAdd(e.target.checked)} /> สมัครต่อเนื่อง</label>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="opacity-80">Allocation Scope:</span>
            <label className="flex items-center gap-1">
              <input type="radio" name="scope" checked={allocScope === 'FILE'} onChange={()=>setAllocScope('FILE')} /> ในไฟล์ (Owner + ชั้นแรก)
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" name="scope" checked={allocScope === 'NETWORK'} onChange={()=>setAllocScope('NETWORK')} /> ทั้งเครือข่าย (BFS)
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
                <th>run #</th><th>userId</th><th>userType</th><th>registTime</th><th>registType</th><th>invitor</th><th>maxFollower</th><th>followerCount</th><th>FollowerFull</th><th>maxLevelRoyalty</th><th>jsFilePath</th><th>childCount</th><th>parentId</th><th>parentFile</th><th>totalFinpoint</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(dna).sort((a:any,b:any)=>(a.runNumber??999)-(b.runNumber??999)).map((r:any)=> (
                <tr key={r.userId} className="border-b border-slate-800/60">
                  <td>{r.runNumber}</td>
                  <td className="font-mono">{r.userId}</td>
                  <td>{r.userType}</td>
                  <td>{r.registTime}</td>
                  <td>{r.registType}</td>
                  <td>{r.invitor || "-"}</td>
                  <td>{r.maxFollower}</td>
                  <td>{r.followerCount}</td>
                  <td>{r.followerFullStatus}</td>
                  <td>{r.maxLevelRoyalty}</td>
                  <td className="font-mono">{r.jsFilePath}</td>
                  <td>{r.childCount}</td>
                  <td>{r.parentId || "-"}</td>
                  <td className="font-mono">{r.parentFile || "-"}</td>
                  <td>{r.totalFinpoint}</td>
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
                <th>#</th><th>User ID</th><th>Username</th><th>Created</th><th>Regist Type</th><th>Invitor</th><th>Actions</th>
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
                    <button className="px-3 py-1 rounded-lg border" onClick={()=>viewJson(u.userId)}>ดูไฟล์ JS</button>
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

      {/* Admin panel */}
      <section className="bg-slate-800/60 backdrop-blur rounded-2xl p-5 border border-slate-700/50 shadow">
        <h2 className="text-xl font-semibold mb-4">Admin Overrides</h2>
        {editingUserId ? (
          <div className="grid md:grid-cols-4 gap-4 items-end">
            <div>
              <label>User ID</label>
              <div className="mt-1 font-mono">{editingUserId}</div>
            </div>
            <div>
              <label>Max Follower</label>
              <input className="w-full mt-1 rounded-xl border p-2" value={overrideMaxFollower} onChange={(e)=>setOverrideMaxFollower(e.target.value)} />
            </div>
            <div>
              <label>Max Level Royalty</label>
              <input className="w-full mt-1 rounded-xl border p-2" value={overrideMaxLevel} onChange={(e)=>setOverrideMaxLevel(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 rounded-xl bg-sky-600" onClick={saveOverrides}>บันทึก</button>
              <button className="px-4 py-2 rounded-xl border" onClick={()=>setEditingUserId(null)}>ยกเลิก</button>
            </div>
          </div>
        ) : (
          <div className="opacity-70 text-sm">เลือกผู้ใช้จาก Users แล้วกด "Admin Override"</div>
        )}
      </section>

      {/* JSON explorer */}
      <section className="bg-slate-800/60 backdrop-blur rounded-2xl p-5 border border-slate-700/50 shadow">
        <h2 className="text-xl font-semibold mb-4">ไฟล์เครือข่าย (JSON)</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {Object.keys(jsonFiles).map((uid)=> (
            <div key={uid} className="border border-slate-700/50 rounded-xl p-3">
              <div className="font-semibold mb-2">{uid}.js</div>
              <pre className="text-xs whitespace-pre-wrap bg-slate-900/40 rounded-lg p-2 max-h-40 overflow-auto">{JSON.stringify(jsonFiles[uid], null, 2)}</pre>
              <div className="text-xs mt-2 opacity-70">path: /net/{uid}.js</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center opacity-70 text-xs pt-4">Fingrow • ACF Demo</footer>
    </div>
  );
}
