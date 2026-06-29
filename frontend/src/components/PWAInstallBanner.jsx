import React,{useState,useEffect} from "react";
import {Download,X} from "lucide-react";

export default function PWAInstallBanner(){
  const [prompt,setPrompt]=useState(null);
  const [show,setShow]=useState(false);
  useEffect(()=>{
    if(localStorage.getItem("pwa_dismissed"))return;
    const h=e=>{e.preventDefault();setPrompt(e);setShow(true);};
    window.addEventListener("beforeinstallprompt",h);
    return()=>window.removeEventListener("beforeinstallprompt",h);
  },[]);
  if(!show||!prompt)return null;
  const install=async()=>{prompt.prompt();const{outcome}=await prompt.userChoice;if(outcome==="accepted"||outcome==="dismissed"){setShow(false);setPrompt(null);}};
  const dismiss=()=>{localStorage.setItem("pwa_dismissed","1");setShow(false);};
  return(
    <div data-testid="pwa-install-banner" style={{
      position:"fixed",bottom:0,left:0,right:0,zIndex:60,
      background:"var(--surface)",borderTop:"1px solid var(--border)",
      padding:"14px 20px calc(14px + var(--sab))",
      display:"flex",alignItems:"center",gap:14,
      boxShadow:"0 -4px 20px rgba(0,0,0,.08)",
      animation:"slideUp .4s cubic-bezier(.34,1.1,.64,1) both",
    }}>
      <div style={{width:46,height:46,borderRadius:12,background:"var(--blue)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <Download size={22} color="#fff"/>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:15,fontWeight:700,color:"var(--text-1)"}}>Install Job Ledger</div>
        <div style={{fontSize:13,color:"var(--text-3)"}}>Add to home screen for quick access</div>
      </div>
      <button type="button" onClick={install} className="btn btn-primary btn-sm">Install</button>
      <button type="button" onClick={dismiss} style={{background:"none",border:"none",color:"var(--text-4)",cursor:"pointer",padding:4,flexShrink:0}}><X size={18}/></button>
    </div>
  );
}
