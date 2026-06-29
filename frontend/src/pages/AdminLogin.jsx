import React,{useState} from "react";
import {useNavigate,Link} from "react-router-dom";
import {ArrowLeft,Eye,EyeOff,Loader2,BriefcaseBusiness} from "lucide-react";
import {toast} from "sonner";
import api,{setToken} from "../lib/api";

export default function AdminLogin(){
  const [passcode,setPasscode]=useState("");
  const [showPw,setShowPw]=useState(false);
  const [loading,setLoading]=useState(false);
  const nav=useNavigate();

  const handleSubmit=async(e)=>{
    e.preventDefault();
    if(passcode.trim().toLowerCase()!=="bidyadhar"){toast.error("Wrong passcode");return;}
    setLoading(true);
    try{
      const data=await api.login("bidyadhar","Bidyadhar1!");
      setToken(data.token);
      toast.success("Welcome back!");
      nav("/admin");
    }catch(err){toast.error(err?.response?.data?.detail||"Login failed");}
    finally{setLoading(false);}
  };

  return(
    <div data-testid="admin-login-page" style={{minHeight:"100dvh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"var(--bg)",padding:"24px 20px calc(24px + var(--sab))"}}>
      <Link to="/" data-testid="back-to-home" style={{position:"absolute",top:"calc(24px + var(--sat))",left:24,display:"flex",alignItems:"center",gap:6,fontSize:14,fontWeight:600,color:"var(--text-3)",textDecoration:"none"}}>
        <ArrowLeft size={17}/> Back
      </Link>
      <div className="card anim-scale" style={{width:"100%",maxWidth:380,padding:"36px 28px"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:64,height:64,borderRadius:18,background:"var(--blue)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",boxShadow:"0 4px 20px rgba(29,78,216,.35)"}}>
            <BriefcaseBusiness size={30} color="#fff"/>
          </div>
          <div style={{fontSize:22,fontWeight:800,color:"var(--text-1)",marginBottom:4}}>Admin Login</div>
          <div style={{fontSize:14,color:"var(--text-3)"}}>Sign in to manage your jobs</div>
        </div>
        <form onSubmit={handleSubmit} data-testid="login-form" style={{display:"flex",flexDirection:"column",gap:16}}>
          <div>
            <label className="label">Passcode</label>
            <div style={{position:"relative"}}>
              <input type={showPw?"text":"password"} value={passcode} onChange={e=>setPasscode(e.target.value)}
                required autoFocus placeholder="Enter your passcode"
                data-testid="login-passcode" className="input" style={{paddingRight:52}}/>
              <button type="button" onClick={()=>setShowPw(p=>!p)} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"var(--text-4)",cursor:"pointer",padding:4}}>
                {showPw?<EyeOff size={18}/>:<Eye size={18}/>}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary" data-testid="login-submit" style={{width:"100%",marginTop:4}}>
            {loading?<Loader2 size={17} style={{animation:"spin .8s linear infinite"}}/>:null}
            {loading?"Signing in…":"Sign In"}
          </button>
        </form>
        <div style={{textAlign:"center",marginTop:18,fontSize:13,color:"var(--text-4)"}}>Only authorised users can add jobs</div>
      </div>
    </div>
  );
}
