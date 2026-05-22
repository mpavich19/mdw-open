import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase.js";

// ── CONSTANTS ───────────────────────────────────────────────
const TOURNAMENT_ID = "mdw-2026"; // unique key in DB
const COURSE_RATING = 71.0;
const COURSE_SLOPE  = 127;
const COURSE_PAR    = 70;
const STONEBRIDGE_PARS = [4,4,4,3,5,4,3,5,3,4,5,4,4,4,3,4,3,4];
const HOLE_NAMES = [
  "Bottle","Alps","Leven","Redan","Road Hole","Principals Nose",
  "Biarritz","Long","Sahara","Cape","Pond","Punchbowl",
  "Raynor's Dogleg","Knoll","Short","Hogs Back","Eden","Hogs Back"
];
const blankPlayers = Array.from({ length: 12 }, (_, i) => ({ id: i+1, name: "", handicap: 0 }));

// ── STYLES ──────────────────────────────────────────────────
const googleFonts = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Barlow+Condensed:wght@400;600;700&family=Barlow:wght@400;500;600&display=swap');
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes slideUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  * { -webkit-tap-highlight-color: transparent; }
`;

const gold="#C9A84C", darkGold="#a07830", green="#1a3a2a", lightGreen="#2d6a4f";
const cardGreen="#0f2018", darkBg="#0a1510", border="#1e3528", cream="#f5f0e8", yellow="#f0c040";

// ── HELPERS ─────────────────────────────────────────────────
const toParColor = d => d===null?"#6b7280":d<0?"#4ade80":d===0?gold:"#f87171";
const fmtPar     = d => d===null?"–":d===0?"E":d>0?`+${d}`:`${d}`;
const courseHcp  = idx => Math.round(idx*(COURSE_SLOPE/113)+(COURSE_RATING-COURSE_PAR));

// ── SUPABASE DB HELPERS ─────────────────────────────────────
// We use a single table: tournament_state (id text PK, data jsonb)
// SQL to run once in Supabase SQL editor:
//
// create table if not exists tournament_state (
//   id text primary key,
//   data jsonb not null,
//   updated_at timestamptz default now()
// );
// alter table tournament_state enable row level security;
// create policy "public read" on tournament_state for select using (true);
// create policy "public write" on tournament_state for all using (true);
//
// create table if not exists chat_messages (
//   id bigserial primary key,
//   tournament_id text not null,
//   name text not null,
//   text text not null,
//   time text not null,
//   created_at timestamptz default now()
// );
// alter table chat_messages enable row level security;
// create policy "public read" on chat_messages for select using (true);
// create policy "public write" on chat_messages for all using (true);

async function dbLoad() {
  const { data, error } = await supabase
    .from("tournament_state")
    .select("data")
    .eq("id", TOURNAMENT_ID)
    .single();
  if (error || !data) return null;
  return data.data;
}

async function dbSave(payload) {
  const { error } = await supabase
    .from("tournament_state")
    .upsert({ id: TOURNAMENT_ID, data: payload, updated_at: new Date().toISOString() });
  if (error) throw error;
}

async function dbLoadChat() {
  const { data } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("tournament_id", TOURNAMENT_ID)
    .order("created_at", { ascending: true })
    .limit(100);
  return data || [];
}

async function dbSendChat(name, text, time) {
  await supabase.from("chat_messages").insert({ tournament_id: TOURNAMENT_ID, name, text, time });
}

// ── BEER CAN CREST ──────────────────────────────────────────
function BeerCrest({ size=110 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 110 110" style={{filter:"drop-shadow(0 4px 16px rgba(201,168,76,0.35))"}}>
      <path d="M55 4 L96 20 L96 58 C96 80 77 97 55 106 C33 97 14 80 14 58 L14 20 Z" fill={green} stroke={gold} strokeWidth="2.5"/>
      <path d="M55 12 L90 26 L90 58 C90 76 73 91 55 100 C37 91 20 76 20 58 L20 26 Z" fill="none" stroke={gold} strokeWidth="0.8" opacity="0.4"/>
      <rect x="36" y="30" width="38" height="52" rx="6" fill="#e8e0c8"/>
      <rect x="36" y="38" width="38" height="28" fill="#1a4a30"/>
      <ellipse cx="55" cy="30" rx="19" ry="5" fill="#c8c0a8"/>
      <ellipse cx="55" cy="82" rx="19" ry="5" fill="#c8c0a8"/>
      <ellipse cx="55" cy="26" rx="8" ry="3" fill="#b8b0a0"/>
      <rect x="52" y="22" width="6" height="5" rx="1" fill="#a0988a"/>
      <rect x="53" y="20" width="4" height="3" rx="1" fill="#888"/>
      <text x="55" y="49" textAnchor="middle" fontSize="10" fontWeight="700" fill={yellow} fontFamily="'Barlow Condensed',sans-serif" letterSpacing="2">MDW</text>
      <text x="55" y="60" textAnchor="middle" fontSize="7" fontWeight="600" fill={cream} fontFamily="'Barlow Condensed',sans-serif" letterSpacing="1.5">OPEN</text>
      <line x1="55" y1="62" x2="55" y2="70" stroke={gold} strokeWidth="1"/>
      <path d="M55 62 L61 65 L55 68 Z" fill={gold}/>
      {[[40,44],[43,55],[70,48],[68,60],[41,67]].map(([cx,cy],i)=><circle key={i} cx={cx} cy={cy} r="1.2" fill="white" opacity="0.25"/>)}
      <text x="22" y="18" fontSize="7" fill={gold} opacity="0.8">★</text>
      <text x="84" y="18" fontSize="7" fill={gold} opacity="0.8">★</text>
      <text x="55" y="100" textAnchor="middle" fontSize="5.5" fill={gold} fontFamily="'Barlow Condensed',sans-serif" letterSpacing="1.5" opacity="0.85">EST. 2026</text>
    </svg>
  );
}

function Logo({ compact=false }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:compact?"14px 20px 10px":"24px 20px 18px",background:`linear-gradient(180deg,${darkBg} 0%,${green} 100%)`,borderBottom:`2px solid ${gold}44`,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,opacity:0.04,backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 20px,#fff 20px,#fff 21px)",pointerEvents:"none"}}/>
      <BeerCrest size={compact?80:110}/>
      <div style={{background:lightGreen,color:yellow,fontSize:compact?9:10,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,letterSpacing:"0.2em",padding:"3px 16px",marginTop:compact?6:10,marginBottom:4,clipPath:"polygon(8px 0%,calc(100% - 8px) 0%,100% 50%,calc(100% - 8px) 100%,8px 100%,0% 50%)",border:`1px solid ${gold}44`}}>MEMORIAL DAY WEEKEND</div>
      <h1 style={{fontFamily:"'Cormorant Garamond',serif",color:yellow,fontSize:compact?30:40,margin:"2px 0 0",lineHeight:1,letterSpacing:"0.06em",fontWeight:700}}>2026 MDW OPEN</h1>
      <div style={{display:"flex",alignItems:"center",gap:8,margin:compact?"6px 0 4px":"8px 0 6px",width:"80%"}}>
        <div style={{flex:1,height:1,background:`linear-gradient(90deg,transparent,${gold}66)`}}/>
        <span style={{fontSize:12}}>⛳</span>
        <div style={{flex:1,height:1,background:`linear-gradient(90deg,${gold}66,transparent)`}}/>
      </div>
      <p style={{fontFamily:"'Barlow Condensed',sans-serif",color:gold,fontSize:compact?11:13,fontWeight:600,margin:0,letterSpacing:"0.2em",textTransform:"uppercase"}}>Stonebridge Country Club</p>
      {!compact&&<p style={{fontFamily:"'Barlow',sans-serif",color:"#6b8c7a",fontSize:11,margin:"2px 0 0"}}>Smithtown, NY · Rating 71.0 · Slope 127 · Par 70</p>}
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{margin:"14px 16px 0",background:cardGreen,borderRadius:10,padding:16,border:`1px solid ${border}`}}>
      {title&&<p style={{color:darkGold,fontSize:10,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",margin:"0 0 10px",fontFamily:"'Barlow Condensed',sans-serif"}}>{title}</p>}
      {children}
    </div>
  );
}

function Toast({ msg }) {
  return <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:cardGreen,color:gold,padding:"8px 20px",borderRadius:20,fontSize:13,fontWeight:600,fontFamily:"'Barlow',sans-serif",border:`1px solid ${gold}44`,zIndex:999,whiteSpace:"nowrap"}}>{msg}</div>;
}

// ── CHAT ────────────────────────────────────────────────────
function Chat({ myName }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    fetchMsgs();
    // Supabase realtime subscription
    const channel = supabase
      .channel("chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => fetchMsgs())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function fetchMsgs() {
    const data = await dbLoadChat();
    setMsgs(data);
  }

  async function send() {
    if (!input.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
    const text = input.trim();
    setInput("");
    await dbSendChat(myName, text, time);
  }

  return (
    <div style={{margin:"14px 16px 0",background:cardGreen,borderRadius:12,border:`1px solid ${border}`,overflow:"hidden"}}>
      <div style={{padding:"10px 14px",borderBottom:`1px solid ${border}`}}>
        <p style={{color:darkGold,fontSize:10,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",margin:0,fontFamily:"'Barlow Condensed',sans-serif"}}>💬 Group Chat</p>
      </div>
      <div style={{height:260,overflowY:"auto",padding:"10px 14px",display:"flex",flexDirection:"column",gap:8}}>
        {msgs.length===0&&<p style={{color:"#2d4a38",fontSize:13,textAlign:"center",marginTop:80,fontFamily:"'Barlow',sans-serif"}}>No messages yet. Start the trash talk! 🗑️</p>}
        {msgs.map(m=>{
          const me = m.name===myName;
          return (
            <div key={m.id} style={{display:"flex",flexDirection:"column",alignItems:me?"flex-end":"flex-start"}}>
              {!me&&<span style={{color:darkGold,fontSize:10,fontWeight:700,marginBottom:2,fontFamily:"'Barlow Condensed',sans-serif"}}>{m.name}</span>}
              <div style={{maxWidth:"80%",padding:"8px 12px",borderRadius:me?"16px 16px 4px 16px":"16px 16px 16px 4px",background:me?lightGreen:"#162a1e",border:`1px solid ${me?gold+"44":border}`}}>
                <p style={{color:cream,fontSize:14,margin:0,fontFamily:"'Barlow',sans-serif",lineHeight:1.4}}>{m.text}</p>
              </div>
              <span style={{color:"#2d4a38",fontSize:10,marginTop:2,fontFamily:"'Barlow',sans-serif"}}>{m.time}</span>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>
      <div style={{display:"flex",gap:8,padding:"10px 12px",borderTop:`1px solid ${border}`}}>
        <input
          style={{flex:1,background:darkBg,border:`1px solid ${border}`,borderRadius:20,color:cream,fontSize:14,padding:"9px 14px",outline:"none",fontFamily:"'Barlow',sans-serif"}}
          placeholder="Say something..."
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&send()}
        />
        <button
          style={{padding:"9px 16px",background:input.trim()?lightGreen:"#162a1e",border:`1px solid ${input.trim()?gold+"55":border}`,borderRadius:20,color:input.trim()?cream:"#4b6b58",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer"}}
          onClick={send}>SEND</button>
      </div>
    </div>
  );
}

// ── PLAYER SELECT ───────────────────────────────────────────
function PlayerSelect({ players, onSelect }) {
  return (
    <div style={{minHeight:"100vh",background:darkBg,paddingBottom:40,maxWidth:480,margin:"0 auto"}}>
      <style>{googleFonts}</style>
      <Logo/>
      <div style={{margin:"24px 16px 0",background:cardGreen,borderRadius:12,padding:24,border:`1px solid ${border}`,textAlign:"center"}}>
        <div style={{fontSize:36,marginBottom:12}}>👋</div>
        <h2 style={{fontFamily:"'Cormorant Garamond',serif",color:cream,fontSize:26,margin:"0 0 8px",fontWeight:700}}>Who are you?</h2>
        <p style={{color:"#4b6b58",fontSize:13,margin:"0 0 24px",fontFamily:"'Barlow',sans-serif",lineHeight:1.5}}>
          Select your name to join.<br/>You'll only be able to edit your own scorecard.
        </p>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {players.filter(p=>p.name.trim()).map(p=>(
            <button key={p.id}
              style={{width:"100%",padding:"14px 16px",background:darkBg,border:`1px solid ${border}`,borderRadius:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}
              onClick={()=>onSelect(p.id)}>
              <span style={{color:cream,fontWeight:600,fontSize:16,fontFamily:"'Barlow',sans-serif"}}>{p.name}</span>
              <span style={{color:darkGold,fontSize:12,fontFamily:"'Barlow Condensed',sans-serif"}}>HCP {courseHcp(p.handicap)}</span>
            </button>
          ))}
        </div>
        <div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${border}`}}>
          <button
            style={{width:"100%",padding:"12px",background:"transparent",border:`1px solid ${border}`,borderRadius:10,color:"#4b6b58",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer",letterSpacing:"0.06em"}}
            onClick={()=>onSelect("spectator")}>
            👀 SPECTATOR — View Only
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]         = useState("loading");
  const [players, setPlayers]       = useState(blankPlayers);
  const [scores, setScores]         = useState({});
  const [myPlayerId, setMyPlayerId] = useState(null);
  const [editingHole, setEditingHole] = useState(null);
  const [tempScore, setTempScore]   = useState("");
  const [leaderTab, setLeaderTab]   = useState("net");
  const [showChat, setShowChat]     = useState(false);
  const [toast, setToast]           = useState("");

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(""), 2500); }

  // ── Init
  useEffect(() => {
    init();
    // Supabase realtime for scores
    const channel = supabase
      .channel("tournament")
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_state" }, () => poll())
      .subscribe();
    // Fallback poll every 15s
    const iv = setInterval(poll, 15000);
    return () => { supabase.removeChannel(channel); clearInterval(iv); };
  }, []);

  async function init() {
    try {
      const s = await dbLoad();
      if (s) {
        setPlayers(s.players || blankPlayers);
        setScores(s.scores || {});
        setScreen(s.started ? "pickPlayer" : "setup");
      } else {
        setScreen("setup");
      }
    } catch { setScreen("setup"); }
  }

  async function poll() {
    try {
      const s = await dbLoad();
      if (s) {
        setPlayers(s.players || blankPlayers);
        setScores(s.scores || {});
      }
    } catch {}
  }

  async function save(payload) {
    try {
      await dbSave(payload);
      showToast("✓ Saved");
    } catch { showToast("⚠ Save failed"); }
  }

  function teeItUp() {
    const named = players.filter(p => p.name.trim() !== "");
    if (named.length < 2) { alert("Please add at least 2 player names."); return; }
    save({ players, scores, started: true });
    setScreen("pickPlayer");
  }

  async function saveScore(holeIdx, val) {
    if (!myPlayerId || myPlayerId === "spectator") return;
    const v = parseInt(val) || 0;
    const ns = { ...scores };
    const arr = [...(ns[myPlayerId] || Array(18).fill(0))];
    arr[holeIdx] = v;
    ns[myPlayerId] = arr;
    setScores(ns);
    await save({ players, scores: ns, started: true });
  }

  // Score helpers
  const gross  = id => (scores[id]||[]).reduce((s,v)=>s+(v||0),0);
  const net    = id => { const p=players.find(x=>x.id===id); return gross(id)-(p?courseHcp(p.handicap):0); };
  const played = id => (scores[id]||[]).filter(v=>v>0).length;
  const parThru = n => STONEBRIDGE_PARS.slice(0,n).reduce((a,b)=>a+b,0);
  const toPar  = (id,isNet) => { const n=played(id); return n?(isNet?net(id):gross(id))-parThru(n):null; };

  const leaderboard = (isNet) => players
    .filter(p=>p.name.trim())
    .map(p=>({...p,gross:gross(p.id),net:net(p.id),chcp:courseHcp(p.handicap),played:played(p.id),toPar:toPar(p.id,isNet)}))
    .sort((a,b)=>{
      if(!a.played&&!b.played) return 0;
      if(!a.played) return 1; if(!b.played) return -1;
      return isNet?a.net-b.net:a.gross-b.gross;
    });

  const inp = {display:"block",width:"100%",background:darkBg,border:`1px solid ${border}`,borderRadius:7,color:cream,fontSize:15,padding:"10px 12px",marginBottom:8,outline:"none",boxSizing:"border-box",fontFamily:"'Barlow',sans-serif"};
  const myPlayer = players.find(p=>p.id===myPlayerId);
  const myName   = myPlayer ? myPlayer.name : "Spectator";
  const isSpectator = myPlayerId==="spectator";

  // ── LOADING
  if (screen==="loading") return (
    <div style={{minHeight:"100vh",background:darkBg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{googleFonts}</style>
      <div style={{textAlign:"center"}}>
        <div style={{width:36,height:36,border:`3px solid ${border}`,borderTop:`3px solid ${gold}`,borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto"}}/>
        <p style={{color:"#2d4a38",fontSize:12,marginTop:14,fontFamily:"'Barlow',sans-serif"}}>Loading tournament…</p>
      </div>
    </div>
  );

  // ── SETUP
  if (screen==="setup") return (
    <div style={{minHeight:"100vh",background:darkBg,paddingBottom:40,maxWidth:480,margin:"0 auto"}}>
      <style>{googleFonts}</style>
      <Logo/>
      <Card>
        <div style={{display:"flex",justifyContent:"space-around",textAlign:"center"}}>
          {[["Rating","71.0"],["Slope","127"],["Par","70"]].map(([l,v])=>(
            <div key={l}>
              <div style={{color:gold,fontSize:20,fontWeight:700,fontFamily:"'Cormorant Garamond',serif"}}>{v}</div>
              <div style={{color:"#4b6b58",fontSize:10,letterSpacing:"0.1em",fontFamily:"'Barlow Condensed',sans-serif"}}>{l}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Players & Handicap Index">
        <p style={{color:"#4b6b58",fontSize:11,margin:"0 0 10px",fontFamily:"'Barlow',sans-serif",lineHeight:1.5}}>
          Enter each player's <b style={{color:darkGold}}>Handicap Index</b>. Course HCP auto-calculated for Stonebridge.
        </p>
        {players.map((p,i)=>(
          <div key={p.id} style={{display:"flex",alignItems:"center",marginBottom:8,gap:6}}>
            <span style={{color:"#4b6b58",fontSize:12,width:18,flexShrink:0}}>{i+1}</span>
            <input style={{...inp,flex:2,marginBottom:0}} placeholder={`Player ${i+1}`} value={p.name}
              onChange={e=>setPlayers(players.map(pl=>pl.id===p.id?{...pl,name:e.target.value}:pl))}/>
            <input style={{...inp,width:62,marginBottom:0,textAlign:"center"}}
              type="number" min={0} max={54} step="0.1" placeholder="Idx" value={p.handicap||""}
              onChange={e=>setPlayers(players.map(pl=>pl.id===p.id?{...pl,handicap:parseFloat(e.target.value)||0}:pl))}/>
            {p.name.trim()&&<span style={{color:gold,fontSize:11,width:36,textAlign:"right",fontFamily:"'Barlow Condensed',sans-serif",flexShrink:0}}>→{courseHcp(p.handicap)}</span>}
          </div>
        ))}
      </Card>
      <button
        style={{display:"block",width:"calc(100% - 32px)",margin:"16px 16px 0",padding:"14px",background:`linear-gradient(135deg,${lightGreen},${green})`,border:`1px solid ${gold}55`,borderRadius:10,color:cream,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:18,cursor:"pointer",letterSpacing:"0.1em"}}
        onClick={teeItUp}>TEE IT UP →</button>
      <p style={{color:"#2d4a38",fontSize:11,textAlign:"center",marginTop:10,fontFamily:"'Barlow',sans-serif"}}>All players on this link share live scores</p>
      {toast&&<Toast msg={toast}/>}
    </div>
  );

  // ── PICK PLAYER
  if (screen==="pickPlayer") return (
    <PlayerSelect players={players} onSelect={id=>{ setMyPlayerId(id); setScreen("leaderboard"); }}/>
  );

  // ── MY SCORECARD
  if (screen==="myScore") {
    if (!myPlayer) { setScreen("leaderboard"); return null; }
    const ps = scores[myPlayerId]||Array(18).fill(0);
    return (
      <div style={{minHeight:"100vh",background:darkBg,paddingBottom:40,maxWidth:480,margin:"0 auto"}}>
        <style>{googleFonts}</style>
        <div style={{background:darkBg,borderBottom:`1px solid ${border}`,padding:"14px 20px 12px",textAlign:"center",position:"relative"}}>
          <button style={{position:"absolute",left:14,top:16,background:"transparent",border:"none",color:gold,fontSize:13,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700}} onClick={()=>setScreen("leaderboard")}>← BOARD</button>
          <p style={{color:darkGold,fontSize:10,letterSpacing:"0.15em",margin:"0 0 4px",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700}}>MY SCORECARD</p>
          <h2 style={{fontFamily:"'Cormorant Garamond',serif",color:cream,fontSize:22,margin:"0 0 2px",fontWeight:700}}>{myPlayer.name}</h2>
          <p style={{color:"#4b6b58",fontSize:12,margin:0,fontFamily:"'Barlow',sans-serif"}}>
            Idx {myPlayer.handicap} → HCP <b style={{color:gold}}>{courseHcp(myPlayer.handicap)}</b> &nbsp;·&nbsp;
            Gross <b style={{color:cream}}>{gross(myPlayerId)||"–"}</b> &nbsp;·&nbsp;
            Net <b style={{color:yellow}}>{net(myPlayerId)||"–"}</b>
          </p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,padding:14}}>
          {STONEBRIDGE_PARS.map((par,i)=>{
            const sc=ps[i]||0; const diff=sc>0?sc-par:null;
            return (
              <div key={i}
                style={{background:cardGreen,borderRadius:10,padding:"10px 6px",textAlign:"center",cursor:"pointer",border:`2px solid ${editingHole===i?gold:border}`,transition:"border-color 0.15s"}}
                onClick={()=>{ setEditingHole(i); setTempScore(sc>0?String(sc):""); }}>
                <div style={{color:"#4b6b58",fontSize:9,fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>H{i+1} {HOLE_NAMES[i]}</div>
                <div style={{color:"#2d4a38",fontSize:10,fontFamily:"'Barlow',sans-serif"}}>Par {par}</div>
                <div style={{fontSize:26,fontWeight:700,fontFamily:"'Cormorant Garamond',serif",color:diff===null?"#2d4a38":toParColor(diff),lineHeight:1.1,margin:"3px 0 2px"}}>{sc>0?sc:"–"}</div>
                {diff!==null&&<div style={{fontSize:10,fontWeight:700,color:toParColor(diff),fontFamily:"'Barlow Condensed',sans-serif"}}>{fmtPar(diff)}</div>}
              </div>
            );
          })}
        </div>

        {editingHole!==null&&(
          <div style={{position:"fixed",inset:0,background:"#000000cc",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100}}>
            <div style={{background:cardGreen,borderRadius:"20px 20px 0 0",padding:"20px 18px 32px",width:"100%",maxWidth:480,textAlign:"center",borderTop:`2px solid ${gold}44`}}>
              <p style={{color:gold,fontSize:11,margin:"0 0 2px",letterSpacing:"0.15em",fontFamily:"'Barlow Condensed',sans-serif"}}>
                HOLE {editingHole+1} · {HOLE_NAMES[editingHole]} · PAR {STONEBRIDGE_PARS[editingHole]}
              </p>
              <p style={{color:"#4b6b58",margin:"0 0 14px",fontSize:13,fontFamily:"'Barlow',sans-serif"}}>{myPlayer.name}</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(n=>(
                  <button key={n}
                    style={{padding:"13px 0",border:`1px solid ${tempScore===String(n)?gold:border}`,borderRadius:10,fontSize:20,fontWeight:700,cursor:"pointer",fontFamily:"'Cormorant Garamond',serif",background:tempScore===String(n)?green:darkBg,color:tempScore===String(n)?gold:"#4b6b58",transition:"all 0.1s"}}
                    onClick={()=>setTempScore(String(n))}>{n}</button>
                ))}
              </div>
              <div style={{display:"flex",gap:8,marginTop:14}}>
                <button style={{flex:1,padding:"12px",border:`1px solid ${border}`,borderRadius:10,background:darkBg,color:"#4b6b58",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer"}} onClick={()=>{setEditingHole(null);setTempScore("");}}>CANCEL</button>
                <button style={{flex:2,padding:"12px",border:`1px solid ${gold}55`,borderRadius:10,background:`linear-gradient(135deg,${lightGreen},${green})`,color:cream,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer"}} onClick={()=>{if(tempScore)saveScore(editingHole,tempScore);setEditingHole(null);setTempScore("");}}>SAVE SCORE ✓</button>
              </div>
            </div>
          </div>
        )}
        {toast&&<Toast msg={toast}/>}
      </div>
    );
  }

  // ── LEADERBOARD
  const isNet  = leaderTab==="net";
  const data   = leaderboard(isNet);
  const medals = ["🥇","🥈","🥉"];

  return (
    <div style={{minHeight:"100vh",background:darkBg,paddingBottom:40,maxWidth:480,margin:"0 auto"}}>
      <style>{googleFonts}</style>
      <Logo compact/>

      {/* Playing as / Spectator bar */}
      {!isSpectator&&myPlayer ? (
        <div style={{margin:"12px 16px 0",background:cardGreen,borderRadius:10,padding:"12px 14px",border:`1px solid ${gold}44`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <p style={{color:darkGold,fontSize:10,fontWeight:700,letterSpacing:"0.1em",margin:"0 0 2px",fontFamily:"'Barlow Condensed',sans-serif"}}>PLAYING AS</p>
            <p style={{color:cream,fontSize:16,fontWeight:600,margin:0,fontFamily:"'Barlow',sans-serif"}}>{myPlayer.name}</p>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button style={{padding:"9px 16px",background:`linear-gradient(135deg,${lightGreen},${green})`,border:`1px solid ${gold}55`,borderRadius:8,color:cream,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}} onClick={()=>setScreen("myScore")}>✏️ MY CARD</button>
            <button style={{padding:"9px 10px",background:"transparent",border:`1px solid ${border}`,borderRadius:8,color:"#4b6b58",fontSize:13,cursor:"pointer"}} onClick={()=>setScreen("pickPlayer")}>↩</button>
          </div>
        </div>
      ) : (
        <div style={{margin:"12px 16px 0",background:cardGreen,borderRadius:10,padding:"10px 14px",border:`1px solid ${border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <p style={{color:"#4b6b58",fontSize:13,margin:0,fontFamily:"'Barlow',sans-serif"}}>👀 Viewing as Spectator</p>
          <button style={{padding:"7px 12px",background:"transparent",border:`1px solid ${border}`,borderRadius:8,color:"#4b6b58",fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,cursor:"pointer"}} onClick={()=>setScreen("pickPlayer")}>CHANGE</button>
        </div>
      )}

      {/* Nav */}
      <div style={{display:"flex",margin:"10px 16px 0",background:cardGreen,borderRadius:10,padding:4,gap:4,border:`1px solid ${border}`}}>
        {[["board","🏆 LEADERBOARD"],["chat","💬 CHAT"]].map(([k,label])=>(
          <button key={k} style={{flex:1,padding:"9px 4px",background:(k==="chat"?showChat:!showChat)?green:"transparent",border:(k==="chat"?showChat:!showChat)?`1px solid ${gold}44`:"1px solid transparent",borderRadius:8,color:(k==="chat"?showChat:!showChat)?cream:"#4b6b58",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer",letterSpacing:"0.06em"}} onClick={()=>setShowChat(k==="chat")}>{label}</button>
        ))}
      </div>

      {showChat ? <Chat myName={myName}/> : (
        <>
          <div style={{display:"flex",margin:"10px 16px 0",background:cardGreen,borderRadius:10,padding:4,gap:4,border:`1px solid ${border}`}}>
            {[["net","NET (HANDICAP)"],["gross","GROSS (STROKE)"]].map(([k,label])=>(
              <button key={k} style={{flex:1,padding:"9px 4px",background:leaderTab===k?green:"transparent",border:leaderTab===k?`1px solid ${gold}44`:"1px solid transparent",borderRadius:8,color:leaderTab===k?cream:"#4b6b58",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer",letterSpacing:"0.08em"}} onClick={()=>setLeaderTab(k)}>{label}</button>
            ))}
          </div>

          <div style={{margin:"10px 16px 0",background:cardGreen,borderRadius:12,overflow:"hidden",border:`1px solid ${border}`}}>
            <div style={{display:"flex",padding:"10px 14px",borderBottom:`1px solid ${border}`,color:"#2d4a38",fontSize:10,fontWeight:700,letterSpacing:"0.1em",fontFamily:"'Barlow Condensed',sans-serif"}}>
              <span style={{width:30}}>#</span>
              <span style={{flex:1}}>PLAYER</span>
              <span style={{width:38,textAlign:"center"}}>HCP</span>
              <span style={{width:42,textAlign:"center"}}>THRU</span>
              <span style={{width:52,textAlign:"center"}}>SCORE</span>
              <span style={{width:40,textAlign:"right"}}>+/–</span>
            </div>
            {data.length===0&&<div style={{padding:"28px 20px",textAlign:"center",color:"#2d4a38",fontFamily:"'Barlow',sans-serif",fontSize:14}}>No players yet</div>}
            {data.map((p,i)=>{
              const ds=isNet?p.net:p.gross; const lead=i===0&&p.played>0; const isMe=p.id===myPlayerId;
              return (
                <div key={p.id} style={{display:"flex",alignItems:"center",padding:"12px 14px",borderBottom:`1px solid ${border}22`,background:lead?`linear-gradient(90deg,${green}88,transparent)`:isMe?`linear-gradient(90deg,#0a2a1888,transparent)`:"transparent",borderLeft:`3px solid ${lead?gold:isMe?lightGreen:"transparent"}`}}>
                  <span style={{width:30,fontSize:15}}>{p.played>0?(medals[i]??<span style={{color:"#4b6b58",fontSize:13}}>{i+1}</span>):<span style={{color:"#2d4a38"}}>–</span>}</span>
                  <span style={{flex:1}}>
                    <div style={{color:isMe?yellow:cream,fontWeight:600,fontSize:15,fontFamily:"'Barlow',sans-serif",lineHeight:1.2}}>
                      {p.name}{isMe&&<span style={{color:lightGreen,fontSize:11,marginLeft:6,fontFamily:"'Barlow Condensed',sans-serif"}}>(you)</span>}
                    </div>
                    <div style={{color:"#2d4a38",fontSize:11,fontFamily:"'Barlow',sans-serif"}}>Idx {p.handicap} · <span style={{color:darkGold}}>HCP {p.chcp}</span></div>
                  </span>
                  <span style={{width:38,textAlign:"center",color:darkGold,fontSize:13,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700}}>{p.chcp}</span>
                  <span style={{width:42,textAlign:"center",color:"#4b6b58",fontSize:13}}>{p.played>0?(p.played===18?"F":p.played):"–"}</span>
                  <span style={{width:52,textAlign:"center",color:lead?yellow:cream,fontWeight:700,fontSize:22,fontFamily:"'Cormorant Garamond',serif"}}>{p.played>0?ds:"–"}</span>
                  <span style={{width:40,textAlign:"right",color:toParColor(p.toPar),fontWeight:700,fontSize:14,fontFamily:"'Barlow Condensed',sans-serif"}}>{fmtPar(p.toPar)}</span>
                </div>
              );
            })}
          </div>

          <p style={{color:"#1e3528",fontSize:11,textAlign:"center",margin:"8px 0 0",fontFamily:"'Barlow',sans-serif"}}>Live updates via Supabase</p>

          <div style={{display:"flex",gap:8,margin:"12px 16px 0"}}>
            <button style={{flex:1,padding:"11px 0",background:cardGreen,border:`1px solid ${border}`,borderRadius:10,color:"#4b6b58",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}} onClick={()=>setScreen("setup")}>✎ EDIT SETUP</button>
            <button style={{flex:1,padding:"11px 0",background:"#1a0a0a",border:"1px solid #3a1a1a",borderRadius:10,color:"#7f3a3a",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}} onClick={async()=>{if(!confirm("Reset all scores?"))return;setScores({});await save({players,scores:{},started:true});}}>↺ RESET SCORES</button>
          </div>
        </>
      )}
      {toast&&<Toast msg={toast}/>}
    </div>
  );
}
