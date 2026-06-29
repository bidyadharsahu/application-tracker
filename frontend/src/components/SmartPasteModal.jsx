import React,{useState} from "react";
import {X,Sparkles,Loader2} from "lucide-react";
import {toast} from "sonner";
import api from "../lib/api";

export default function SmartPasteModal({open,onClose,onParsed}){
  const [text,setText]=useState("");
  const [loading,setLoading]=useState(false);
  if(!open)return null;

  const parse=async()=>{
    if(text.trim().length<5){toast.error("Paste some content first");return;}
    setLoading(true);
    try{
      const data=await api.smartParse(text);
      if(!data.job_name&&!data.last_date&&!data.apply_link){toast.error("Could not extract data. Try cleaner text.");}
      else{toast.success("Details extracted! Review and save.");onParsed&&onParsed(data);}
    }catch(e){toast.error(e?.response?.data?.detail||"AI parse failed");}
    finally{setLoading(false);}
  };

  return(
    <div onClick={onClose} data-testid="smart-paste-modal" style={{position:"fixed",inset:0,zIndex:100,background:"rgba(0,0,0,.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-end"}}>
      <div className="sheet" onClick={e=>e.stopPropagation()} style={{width:"100%",padding:"0 20px"}}>
        <div className="sheet-handle"/>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
          <div style={{width:44,height:44,borderRadius:12,background:"var(--blue)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <Sparkles size={20} color="#fff"/>
          </div>
          <div>
            <div style={{fontSize:18,fontWeight:800,color:"var(--text-1)"}}>Smart Paste</div>
            <div style={{fontSize:13,color:"var(--text-3)"}}>AI reads and extracts job details</div>
          </div>
          <button type="button" onClick={onClose} data-testid="smart-paste-close" className="btn btn-ghost btn-icon" style={{marginLeft:"auto",width:38,height:38}}><X size={17}/></button>
        </div>
        <div style={{marginBottom:14}}>
          <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Paste job notification text here…" data-testid="smart-paste-textarea" className="input" rows={7} style={{resize:"vertical",minHeight:160}}/>
        </div>
        <div style={{display:"flex",gap:10,paddingBottom:8}}>
          <button type="button" onClick={parse} disabled={loading} className="btn btn-primary" data-testid="smart-paste-extract-btn" style={{flex:1}}>
            {loading?<Loader2 size={17} style={{animation:"spin .8s linear infinite"}}/>:<Sparkles size={17}/>}
            {loading?"Reading with AI…":"Extract with AI"}
          </button>
          <button type="button" onClick={onClose} className="btn btn-secondary" style={{minWidth:90}}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
