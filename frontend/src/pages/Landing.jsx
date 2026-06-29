import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, X, Clock, CheckCircle2, Bell, ChevronRight, AlertCircle, Calendar } from "lucide-react";
import api from "../lib/api";
import { sortJobs, daysUntil, formatDate } from "../lib/utils-date";
import JobCard from "../components/JobCard";
import DeadlineAlert from "../components/DeadlineAlert";
import PWAInstallBanner from "../components/PWAInstallBanner";
import { toast } from "sonner";

const getStatus = (j, today) => {
  if (j.applied) return "applied";
  const future = j.start_date && j.start_date > today;
  const blank  = !j.start_date && !j.exam_date && !j.last_date;
  return future || blank ? "notices" : "pending";
};

export default function Landing() {
  const [jobs, setJobs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState(null);
  const [query, setQuery]     = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const fetch = async () => {
    setLoading(true);
    try { setJobs(sortJobs(await api.listJobs())); }
    catch { toast.error("Failed to load jobs"); }
    finally { setLoading(false); }
  };

  useEffect(() => { api.deleteExpiredUnappliedJobs(); fetch(); }, []);

  useEffect(() => {
    jobs.forEach(async j => {
      if (j.start_date && j.start_date <= today && !j.notified && !j.applied) {
        toast.success(`${j.job_name} is now open!`);
        try { await api.markNotified(j.id); } catch {}
      }
    });
  }, [jobs]);

  const handleToggle = async (job) => {
    try {
      const u = await api.toggleApplied(job.id);
      setJobs(prev => sortJobs(prev.map(j => j.id === job.id ? u : j)));
      toast.success(u.applied ? "Marked as Applied ✓" : "Moved to Pending");
    } catch { toast.error("Update failed"); }
  };

  const counts = useMemo(() => ({
    pending: jobs.filter(j => getStatus(j, today) === "pending").length,
    applied: jobs.filter(j => getStatus(j, today) === "applied").length,
    notices: jobs.filter(j => getStatus(j, today) === "notices").length,
  }), [jobs, today]);

  const list = useMemo(() => {
    if (!tab) return [];
    let l = jobs.filter(j => {
      const s = getStatus(j, today) === tab;
      const q = !query || j.job_name?.toLowerCase().includes(query.toLowerCase()) || j.tags?.toLowerCase().includes(query.toLowerCase());
      return s && q;
    });
    if (tab === "applied") l = [...l].sort((a,b) => (!a.exam_date?1:!b.exam_date?-1:new Date(a.exam_date)-new Date(b.exam_date)));
    return l;
  }, [jobs, tab, query, today]);

  const nextExam = useMemo(() =>
    jobs.filter(j => j.applied && j.exam_date && new Date(j.exam_date) >= new Date())
        .sort((a,b) => new Date(a.exam_date)-new Date(b.exam_date))[0] || null
  , [jobs]);

  const urgent = useMemo(() => jobs.filter(j => { if(j.applied) return false; const d=daysUntil(j.last_date); return d!==null&&d<=3&&d>=0; }), [jobs]);
  const total  = counts.pending + counts.applied + counts.notices;
  const pct    = total > 0 ? Math.round((counts.applied/total)*100) : 0;

  const selectTab = k => { if(tab===k){setTab(null);setQuery("");}else{setTab(k);setQuery("");setShowSearch(false);} };

  return (
    <div style={{minHeight:"100dvh",background:"var(--bg)"}}>

      {/* ── Header ── */}
      <header style={{
        position:"sticky",top:0,zIndex:50,
        background:"rgba(255,255,255,.95)",
        backdropFilter:"blur(12px)",
        borderBottom:"1px solid var(--border)",
        paddingTop:"calc(16px + var(--sat))",
        paddingBottom:16,padding:"calc(16px + var(--sat)) 20px 16px",
      }}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:"var(--text-3)",letterSpacing:".06em",textTransform:"uppercase",marginBottom:2}}>
              Job Ledger
            </div>
            <h1 style={{fontSize:22,fontWeight:800,color:"var(--text-1)",margin:0,lineHeight:1.2}}>
              My Applications
            </h1>
          </div>
          <Link to="/admin/login" data-testid="admin-login-link"
            style={{
              display:"inline-flex",alignItems:"center",gap:6,
              background:"var(--blue)",color:"#fff",textDecoration:"none",
              fontWeight:700,fontSize:14,padding:"11px 18px",
              borderRadius:"var(--r-full)",
              boxShadow:"0 2px 8px rgba(29,78,216,.35)",
            }}
          >
            <Plus size={17} strokeWidth={2.5}/> Add
          </Link>
        </div>
      </header>

      <main style={{padding:"0 0 90px"}}>
        <div style={{padding:"0 16px"}}>

          <DeadlineAlert jobs={jobs} />

          {/* Next exam */}
          {nextExam && !tab && (
            <div className="anim-up card" style={{
              marginTop:16, padding:"14px 16px",
              borderLeft:"4px solid var(--blue)",
              display:"flex",alignItems:"center",gap:12,
            }}>
              <Calendar size={20} color="var(--blue)" style={{flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,fontWeight:700,color:"var(--blue)",textTransform:"uppercase",letterSpacing:".06em"}}>Next Exam</div>
                <div style={{fontSize:15,fontWeight:700,color:"var(--text-1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nextExam.job_name}</div>
                <div style={{fontSize:13,color:"var(--text-3)",marginTop:1}}>
                  {(() => { const d=Math.ceil((new Date(nextExam.exam_date)-new Date())/86400000); return d===0?"Today!":d===1?"Tomorrow!":d+" days away"; })()}
                  {" · "}{formatDate(nextExam.exam_date)}
                </div>
              </div>
              <ChevronRight size={16} color="var(--text-4)"/>
            </div>
          )}

          {/* Urgent alert */}
          {urgent.length > 0 && !tab && (
            <div className="anim-up d1" style={{
              marginTop:12,padding:"12px 16px",
              background:"var(--red-bg)",border:"1px solid var(--red-border)",
              borderRadius:"var(--r-md)",
              display:"flex",alignItems:"center",gap:10,
            }}>
              <div style={{
                width:8,height:8,borderRadius:"50%",background:"var(--red)",flexShrink:0,
                animation:"pulse-dot 1.5s ease-in-out infinite",
              }}/>
              <div style={{flex:1}}>
                <span style={{fontSize:14,fontWeight:700,color:"var(--red)"}}>
                  {urgent.length} deadline{urgent.length>1?"s":""} closing within 3 days!
                </span>
                <span style={{fontSize:13,color:"var(--red)",opacity:.75,marginLeft:6}}>Tap Pending →</span>
              </div>
            </div>
          )}

          {/* Progress bar */}
          {total > 0 && !tab && (
            <div className="anim-up d2 card" style={{marginTop:12,padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:13,fontWeight:600,color:"var(--text-2)"}}>Overall Progress</span>
                <span style={{fontSize:14,fontWeight:800,color:"var(--blue)"}}>{pct}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{width:pct+"%"}}/>
              </div>
              <div style={{fontSize:12,color:"var(--text-4)",marginTop:6}}>
                {counts.applied} applied · {counts.pending} pending · {counts.notices} upcoming
              </div>
            </div>
          )}

          {/* Live clock */}
          {!tab && <LiveClock />}

          {/* ── 3 stat cards ── */}
          <div className={tab?"":"anim-up d3"} style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginTop:16}}>
            {[
              { key:"pending", label:"Pending", icon:<Clock size={18}/>,      color:"var(--amber)",  activeBg:"var(--amber-bg)" },
              { key:"applied", label:"Applied", icon:<CheckCircle2 size={18}/>,color:"var(--green)",  activeBg:"var(--green-bg)" },
              { key:"notices", label:"Notices", icon:<Bell size={18}/>,        color:"var(--purple)", activeBg:"var(--purple-bg)" },
            ].map(({key,label,icon,color,activeBg}) => {
              const on = tab===key;
              return (
                <button key={key} type="button" data-testid={"filter-card-"+key}
                  onClick={()=>selectTab(key)}
                  className={"stat-card"+(on?" active":"")}
                  style={on?{borderColor:color,background:activeBg}:{}}
                >
                  <div style={{color:on?color:"var(--text-4)",marginBottom:6}}>{icon}</div>
                  <div style={{fontSize:32,fontWeight:800,color:on?color:"var(--text-1)",lineHeight:1,marginBottom:4}}>
                    {loading?"—":counts[key]}
                  </div>
                  <div style={{fontSize:11,fontWeight:600,color:on?color:"var(--text-3)",textTransform:"uppercase",letterSpacing:".06em"}}>
                    {label}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Expanded list ── */}
          {tab && (
            <div className="anim-down" style={{marginTop:16}}>

              {/* Section header */}
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <h2 style={{flex:1,fontSize:17,fontWeight:700,color:"var(--text-1)",margin:0}}>
                  {tab==="pending"?"Pending Jobs":tab==="applied"?"Applied (by exam date)":"Upcoming Notices"}
                </h2>
                <button type="button" onClick={()=>{setShowSearch(s=>!s);if(showSearch)setQuery("");}}
                  className="btn btn-ghost btn-icon" style={{width:40,height:40}}>
                  {showSearch?<X size={17}/>:<Search size={17}/>}
                </button>
                <div style={{fontSize:13,fontWeight:600,color:"var(--text-3)",background:"var(--surface-2)",padding:"4px 10px",borderRadius:"var(--r-full)",border:"1px solid var(--border)"}}>
                  {list.length}
                </div>
              </div>

              {/* Search */}
              {showSearch && (
                <div className="anim-down" style={{position:"relative",marginBottom:12}}>
                  <Search size={16} style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"var(--text-4)",pointerEvents:"none"}}/>
                  <input autoFocus value={query} onChange={e=>setQuery(e.target.value)}
                    placeholder="Search jobs…" data-testid="search-input"
                    className="input" style={{paddingLeft:42,borderRadius:"var(--r-full)"}}/>
                  {query && <button onClick={()=>setQuery("")} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"var(--text-3)",cursor:"pointer"}}><X size={15}/></button>}
                </div>
              )}

              {/* Cards */}
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {loading ? <SkeletonCards/> :
                  list.length===0 ? <EmptyState query={query} tab={tab}/> :
                  list.map((job,i)=>(
                    <div key={job.id} className="anim-up" style={{animationDelay:i*.04+"s"}}>
                      <JobCard job={job} onToggle={handleToggle}/>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* Idle hint */}
          {!tab && !loading && (
            <div style={{textAlign:"center",padding:"40px 0 0",color:"var(--text-4)",fontSize:14,fontWeight:500}}>
              Tap a card above to view jobs
            </div>
          )}
        </div>
      </main>
      <PWAInstallBanner/>
    </div>
  );
}

function LiveClock() {
  const [now,setNow]=useState(new Date());
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t);},[]);
  return (
    <div style={{marginTop:12,padding:"10px 14px",background:"var(--surface-2)",borderRadius:"var(--r-md)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontSize:13,color:"var(--text-3)",fontWeight:500}}>
        {now.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}
      </span>
      <span style={{fontSize:16,fontWeight:700,color:"var(--text-1)",fontVariantNumeric:"tabular-nums"}}>
        {now.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}
      </span>
    </div>
  );
}

function SkeletonCards() {
  return (<>{[1,2,3].map(i=>(
    <div key={i} className="card" style={{padding:20}}>
      <div className="skeleton" style={{height:18,width:"65%",marginBottom:12}}/>
      <div className="skeleton" style={{height:13,width:"42%",marginBottom:8}}/>
      <div className="skeleton" style={{height:13,width:"30%"}}/>
    </div>
  ))}</>);
}

function EmptyState({query,tab}) {
  return (
    <div data-testid="empty-state" className="card anim-scale" style={{padding:"48px 20px",textAlign:"center"}}>
      <div style={{fontSize:40,marginBottom:12}}>{query?"🔍":tab==="applied"?"📭":tab==="pending"?"🎉":"📬"}</div>
      <div style={{fontSize:17,fontWeight:700,color:"var(--text-1)",marginBottom:6}}>{query?"Nothing found":`No ${tab} jobs yet`}</div>
      <div style={{fontSize:14,color:"var(--text-3)"}}>{query?"Try different keywords":tab==="applied"?"Mark a job applied to see it here":"Add jobs from the admin panel"}</div>
    </div>
  );
}
