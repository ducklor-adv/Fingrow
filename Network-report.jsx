import React, { useMemo, useState } from "react";

export default function FingrowACF_LayoutOnly() {
  // =============== CONFIG ===============
  const TOTAL_USERS = 35;        // สร้างผู้ใช้ทั้งหมด 35 คน
  const TREE_LIMIT = 30;         // หน้านี้แสดงใน tree ได้ 30 คน
  const OVERFLOW_HOST_POOL = 25; // ผู้ใช้ 25 คนแรกเป็น "เจ้าบ้าน" สำหรับโยนส่วนเกิน

  // =============== TABLE HEADERS ===============
  const headers = [
    "run #","userId","Username","Created","registType","invitor","followerCount","childCount","parentId","ownFinpoint","totalFinpoint","FollowerFull","userType","level","maxFollower","maxLevelRoyalty"
  ];

  // Column width & alignment per header (match order) — tighter widths (ตัวเลขจัดกลาง)
  const colW = [
    "w-[5ch] text-center",            // run # (numeric)
    "w-[10ch] font-mono",            // userId
    "w-[12ch]",                      // Username
    "w-[18ch] font-mono",            // Created (ISO)
    "w-[8ch]",                       // registType
    "w-[12ch] font-mono",            // invitor
    "w-[8ch] text-center",           // followerCount (numeric)
    "w-[8ch] text-center",           // childCount (numeric)
    "w-[12ch] font-mono",            // parentId
    "w-[10ch] text-center tabular-nums", // ownFinpoint (numeric)
    "w-[11ch] text-center tabular-nums", // totalFinpoint (numeric)
    "w-[10ch]",                      // FollowerFull
    "w-[8ch]",                       // userType
    "w-[6ch] text-center",           // level (numeric)
    "w-[10ch] text-center",          // maxFollower (numeric)
    "w-[12ch] text-center"           // maxLevelRoyalty (numeric)
  ];

  // =============== DATA GENERATION (35 USERS) ===============
  const rows = useMemo(() => {
    const arr = [] as any[];

    // ROOT (Anatta)
    const root = {
      index: 0,
      runNumber: 0,
      userId: "Anatta999",
      username: "Anatta Root",
      userType: "Anatta",
      level: 0,
      createdAt: new Date(Date.UTC(2025, 9, 3, 9, 0, 0)).toISOString(),
      registType: "NIC",
      invitor: null,
      maxFollower: 1,
      followerCount: 0,
      followerFullStatus: "Open",
      maxLevelRoyalty: 19530,
      childCount: 0,
      parentId: null,
      ownFinpoint: 0,
      totalFinpoint: 0,
      photoUrl: `https://i.pravatar.cc/120?u=anatta999`,
    };
    arr.push(root);

    // BFS allocate: root รับได้ 1, ที่เหลือ (Atta) รับได้ 5
    const q: any[] = [root];
    for (let i = 1; i < TOTAL_USERS; i++) {
      // find next parent in queue that still has capacity
      let parent = q.find(p => (p.followerCount || 0) < (p.maxFollower || 5));
      if (!parent) parent = q[0];

      const created = new Date(Date.UTC(2025, 9, 3, 9, 0, 0));
      created.setMinutes(created.getMinutes() + i);

      const u = {
        index: i,
        runNumber: i,
        userId: `UID-${i}`,
        username: `${i-1}`,
        userType: "Atta",
        level: (parent.level || 0) + 1,
        createdAt: created.toISOString(),
        registType: "NIC",
        invitor: "Anatta999", // ทุกคนมี invitor เป็น Anatta999
        maxFollower: 5,
        followerCount: 0,
        followerFullStatus: "Open",
        maxLevelRoyalty: 19530,
        childCount: 0,
        parentId: parent.userId,
        ownFinpoint: (i % 5) * 50,
        totalFinpoint: (i % 5) * 50,
        photoUrl: `https://i.pravatar.cc/120?u=uid-${i}`,
      };

      arr.push(u);
      q.push(u);
      parent.followerCount = (parent.followerCount || 0) + 1;
      parent.childCount = (parent.childCount || 0) + 1;
      parent.followerFullStatus = parent.followerCount >= parent.maxFollower ? "Full" : "Open";
    }

    // finalize totals
    arr.forEach(n => {
      n.totalFinpoint = n.ownFinpoint; // mock
      if (!n.invitor) n.invitor = "Anatta999"; // root aside
    });

    return arr;
  }, []);

  // =============== OVERFLOW MAPPING ( > 30 ) ===============
  const visibleSet = new Set(rows.slice(0, TREE_LIMIT).map(n => n.userId));
  const overflowRows = rows.slice(TREE_LIMIT);
  const hostIds = rows.slice(0, Math.min(OVERFLOW_HOST_POOL, rows.length)).map(n => n.userId);
  const overflowMap: Record<string, any[]> = {};
  overflowRows.forEach((n, i) => {
    const hostId = hostIds[i % hostIds.length];
    (overflowMap[hostId] = overflowMap[hostId] || []).push(n);
  });

  // =============== HELPERS ===============
  const HeaderLabel = ({ label }: { label: string }) => {
    const parts = label.split(/(?=[A-Z])/);
    return (
      <span className="block leading-[1.05] text-center whitespace-normal break-words">
        {parts.map((p, i) => (
          <React.Fragment key={i}>{i > 0 && <wbr />}{p}</React.Fragment>
        ))}
      </span>
    );
  };

  const Avatar = ({ url, ring = "ring-red-400" }: { url?: string; ring?: string }) => (
    <div className={`w-10 h-10 rounded-full overflow-hidden ring-2 ${ring} bg-slate-700 flex items-center justify-center`}>
      {url ? <img src={url} alt="avatar" className="w-full h-full object-cover" /> : <span className="text-[10px] opacity-70">N/A</span>}
    </div>
  );

  const childrenOf = (parentId: string, onlyVisible = true) => {
    let kids = rows
      .filter(n => n.parentId === parentId)
      .sort((a,b)=> new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    if (onlyVisible) kids = kids.filter(k => visibleSet.has(k.userId));
    return kids;
  };

  const firstChildOf = (parentId: string) => childrenOf(parentId, true)[0];

  const buildChain = (startId: string, generations = 6) => {
    const chain: any[] = [];
    let cursor = rows.find(n => n.userId === startId);
    let depth = 0;
    while (cursor && depth < generations) {
      chain.push(cursor);
      const next = firstChildOf(cursor.userId);
      if (!next) break;
      cursor = next;
      depth++;
    }
    return chain; // ตัวอย่างแนวนอน A → A1 → A2 → ...
  };

  // =============== TABLE CELL STYLES ===============
  const thBase = "px-1 py-1 text-[11px] font-semibold uppercase tracking-wider bg-slate-900/80 backdrop-blur supports-[backdrop-filter]:bg-slate-900/70 text-slate-200 border-r border-slate-700/70 first:rounded-tl-xl last:border-r-0 sticky top-0 z-10 min-w-0 align-top";
  const tdBase = "px-1.5 py-1 text-xs whitespace-nowrap truncate border-r border-slate-800/60 last:border-r-0 min-w-0";

  // =============== TREE STATE & MODAL ===============
  const [treeRootId, setTreeRootId] = useState(rows[0]?.userId || "Anatta999");
  const treeRoot = rows.find(n => n.userId === treeRootId) || rows[0];
  const chain = buildChain(treeRoot.userId);

  const [modalRootId, setModalRootId] = useState<string | null>(null);
  const modalRoot = rows.find(n => n.userId === modalRootId);
  const modalChain = modalRoot ? buildChain(modalRoot.userId) : [];

  // Badge component for overflow count per parent (เชื่อมกับ first 25)
  const OverflowBadge = ({ parentId }: { parentId: string }) => {
    const list = overflowMap[parentId] || [];
    if (!list.length) return null;
    return (
      <button onClick={() => setModalRootId(parentId)} className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/40 hover:bg-cyan-500/25">
        +{list.length} more
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 p-6 max-w-7xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fingrow ACF Mock — Combined Table</h1>
        <div className="text-sm opacity-70">Merged DNA + Users • Layout Preview</div>
      </header>

      {/* === TABLE SECTION === */}
      <section className="bg-slate-800/60 backdrop-blur rounded-2xl p-5 border border-slate-700/50 shadow">
        <h2 className="text-xl font-semibold mb-4">FingrowDNA + Users</h2>
        <div className="overflow-auto rounded-xl">
          <table className="min-w-full table-fixed text-xs border-separate border-spacing-0">
            <thead className="text-left">
              <tr className="border-b border-slate-700/60">
                {headers.map((h, i) => (
                  <th key={h} className={`${thBase} ${colW[i]}`}><HeaderLabel label={h} /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r)=> (
                <tr key={r.userId} className="border-b border-slate-800/60">
                  <td className={`${tdBase} ${colW[0]} text-center tabular-nums`}>{r.runNumber}</td>
                  <td className={`${tdBase} ${colW[1]}`}>{r.userId}</td>
                  <td className={`${tdBase} ${colW[2]}`}>{r.username}</td>
                  <td className={`${tdBase} ${colW[3]}`}>{r.createdAt}</td>
                  <td className={`${tdBase} ${colW[4]}`}>{r.registType}</td>
                  <td className={`${tdBase} ${colW[5]}`}>{r.invitor || "-"}</td>
                  <td className={`${tdBase} ${colW[6]} text-center tabular-nums`}>{r.followerCount}</td>
                  <td className={`${tdBase} ${colW[7]} text-center tabular-nums`}>{r.childCount}</td>
                  <td className={`${tdBase} ${colW[8]}`}>{r.parentId || "-"}</td>
                  <td className={`${tdBase} ${colW[9]} text-center tabular-nums`}>{Number(r.ownFinpoint || 0).toLocaleString()}</td>
                  <td className={`${tdBase} ${colW[10]} text-center tabular-nums`}>{Number(r.totalFinpoint || 0).toLocaleString()}</td>
                  <td className={`${tdBase} ${colW[11]}`}>{r.followerFullStatus}</td>
                  <td className={`${tdBase} ${colW[12]}`}>{r.userType}</td>
                  <td className={`${tdBase} ${colW[13]} text-center tabular-nums`}>{r.level ?? '-'}</td>
                  <td className={`${tdBase} ${colW[14]} text-center tabular-nums`}>{r.maxFollower}</td>
                  <td className={`${tdBase} ${colW[15]} text-center tabular-nums`}>{r.maxLevelRoyalty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* === HORIZONTAL NETWORK TREE SECTION === */}
      <section className="bg-slate-800/60 backdrop-blur rounded-2xl p-5 border border-slate-700/50 shadow">
        <div className="flex items-center gap-3 mb-2">
          {/* แสดงคู่โปรไฟล์ + userId ของคนแรก ก่อนคำว่า Network Tree */}
          <Avatar url={treeRoot.photoUrl} ring="ring-red-400" />
          <div className="text-sm font-semibold">{treeRoot.userId} <span className="opacity-60">· {treeRoot.username}</span></div>
          <h2 className="text-xl font-semibold ml-auto">Network Tree — Horizontal (Profile Pictures)</h2>
        </div>
        <p className="text-xs opacity-70 mb-4">หน้านี้แสดงสูงสุด {TREE_LIMIT} คน • คนที่เกินจะถูกผูกไว้กับผู้ใช้ {OVERFLOW_HOST_POOL} คนแรกและดูได้ผ่านปุ่ม <em>+more</em></p>

        <div className="space-y-6">
          {chain.map((parent, gi) => {
            const isAnatta = parent.userType === "Anatta";
            const maxSlot = isAnatta ? 1 : (parent.maxFollower || 5);
            const kidsVisible = childrenOf(parent.userId, true).slice(0, maxSlot);
            const emptySlots = Math.max(0, maxSlot - kidsVisible.length);

            return (
              <div key={parent.userId} className="flex items-center gap-4">
                {/* Parent card */}
                <div className="flex items-center gap-3 w-64 shrink-0">
                  <button onClick={() => setModalRootId(parent.userId)} className="shrink-0">
                    <Avatar url={parent.photoUrl} ring="ring-red-400" />
                  </button>
                  <div>
                    <div className="text-sm font-semibold flex items-center gap-2">
                      {parent.userId}
                      <OverflowBadge parentId={parent.userId} />
                    </div>
                    <div className="text-[10px] opacity-70">Generation {gi}</div>
                  </div>
                </div>

                {/* Connector + children row */}
                <div className="flex-1">
                  <div className="h-px bg-slate-600 mb-3" />
                  <div className="flex flex-wrap gap-4 items-start">
                    {kidsVisible.map((c) => (
                      <button key={c.userId} onClick={() => setModalRootId(c.userId)} className="flex flex-col items-center w-16 hover:opacity-90">
                        <Avatar url={c.photoUrl} ring="ring-cyan-400" />
                        <div className="text-[10px] mt-1 text-center truncate w-full">{c.username || c.userId}</div>
                      </button>
                    ))}
                    {Array.from({ length: emptySlots }).map((_, i) => (
                      <div key={`empty-${i}`} className="flex flex-col items-center w-16">
                        <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-600" />
                        <div className="text-[10px] mt-1 opacity-50">(ว่าง)</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* === MODAL: POPUP NETWORK FROM SELECTED USER === */}
      {modalRoot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModalRootId(null)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-4 w-[min(100%,900px)] max-h-[80vh] overflow-auto shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Avatar url={modalRoot.photoUrl} ring="ring-red-400" />
                <div>
                  <div className="text-sm font-semibold">{modalRoot.userId} <span className="opacity-60">· {modalRoot.username}</span></div>
                  <div className="text-[10px] opacity-70">Focused Network Tree</div>
                </div>
              </div>
              <button onClick={() => setModalRootId(null)} className="px-2 py-1 text-xs rounded-lg border border-slate-600 hover:bg-slate-800">Close</button>
            </div>

            <div className="space-y-6">
              {modalChain.map((parent, gi) => {
                const isAnatta = parent.userType === "Anatta";
                const maxSlot = isAnatta ? 1 : (parent.maxFollower || 5);
                const kids = childrenOf(parent.userId, false).slice(0, maxSlot);
                const emptySlots = Math.max(0, maxSlot - kids.length);
                return (
                  <div key={`modal-${parent.userId}`} className="flex items-center gap-4">
                    <div className="flex items-center gap-3 w-64 shrink-0">
                      <Avatar url={parent.photoUrl} ring="ring-red-400" />
                      <div>
                        <div className="text-sm font-semibold">{parent.userId}</div>
                        <div className="text-[10px] opacity-70">Generation {gi}</div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="h-px bg-slate-600 mb-3" />
                      <div className="flex flex-wrap gap-4">
                        {kids.map((c) => (
                          <div key={`modal-${c.userId}`} className="flex flex-col items-center w-16">
                            <Avatar url={c.photoUrl} ring="ring-cyan-400" />
                            <div className="text-[10px] mt-1 text-center truncate w-full">{c.username || c.userId}</div>
                          </div>
                        ))}
                        {Array.from({ length: emptySlots }).map((_, i) => (
                          <div key={`m-empty-${i}`} className="flex flex-col items-center w-16">
                            <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-600" />
                            <div className="text-[10px] mt-1 opacity-50">(ว่าง)</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <footer className="text-center opacity-70 text-xs pt-4">Fingrow — Layout Demo</footer>
    </div>
  );
}
