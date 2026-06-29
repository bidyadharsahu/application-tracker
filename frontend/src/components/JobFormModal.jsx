import React,{useState,useEffect} from "react";
import {X,Save,Loader2} from "lucide-react";
import {toast} from "sonner";

const fmt=(s)=>{if(!s)return"";if(s.match(/^\d{4}-\d{2}-\d{2}$/)){const[y,m,d]=s.split("-");return d+" "+m+" "+y;}return s;};
const parse=(s)=>{if(!s)return"";const m=s.trim().match(/^(\d{2})[- /.](\d{2})[- /.](\d{4})$/);if(m)return m[3]+"-"+m[2]+"-"+m[1];return s.trim();};

export default function JobFormModal({open,onClose,onSave,initial,prefill}){
  const [form,setForm]=useState({job_name:"",start_date:"",last_date:"",exam_date:"",tags:"",apply_link:"",app_username:"",app_password:"",notes:""});
  const [saving,setSaving]=useState(false);

  useEffect(()=>{
    if(!open)return;
    const b=initial||{},p=prefill||{};
    setForm({job_name:p.job_name||b.job_name||"",start_date:fmt(p.start_date||b.start_date||""),last_date:fmt(p.last_date||b.last_date||""),exam_date:fmt(p.exam_date||b.exam_date||""),tags:p.tags||b.tags||"",apply_link:p.apply_link||b.apply_link||"",app_username:p.app_username||b.app_username||"",app_password:p.app_password||b.app_password||"",notes:p.notes||b.notes||""});
  },[open,initial,prefill]);

  if(!open)return null;
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const save=async()=>{
    if(!form.job_name.trim()){toast.error("Job name required");return;}
    if(!form.apply_link.trim()){toast.error("Apply link required");return;}
    for(const k of["start_date","last_date","exam_date"]){const p=parse(form[k]);if(form[k]&&!p.match(/^\d{4}-\d{2}-\d{2}$/)){toast.error("Enter "+k.replace("_"," ")+" as DD MM YYYY");return;}}
    setSaving(true);
    try{await onSave({job_name:form.job_name.trim(),start_date:parse(form.start_date)||null,last_date:parse(form.last_date)||null,exam_date:parse(form.exam_date)||null,tags:form.tags.trim()||null,apply_link:form.apply_link.trim(),app_username:form.app_username.trim()||null,app_password:form.app_password.trim()||null,notes:form.notes.trim()||null});}
    finally{setSaving(false);}
  };

  return(
    <div onClick={onClose} data-testid="job-form-modal" style={{position:"fixed",inset:0,zIndex:100,background:"rgba(0,0,0,.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-end"}}>
      <div className="sheet" onClick={e=>e.stopPropagation()} style={{width:"100%",padding:"0 20px"}}>
        <div className="sheet-handle"/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22}}>
          <div>
            <div style={{fontSize:20,fontWeight:800,color:"var(--text-1)"}}>{initial?"Edit Job":"New Job"}</div>
            <div style={{fontSize:13,color:"var(--text-3)",marginTop:2}}>Fill in the details below</div>
          </div>
          <button type="button" onClick={onClose} data-testid="job-form-close" className="btn btn-ghost btn-icon" style={{width:38,height:38}}><X size={17}/></button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <label className="label">Job Name *</label>
            <input className="input" value={form.job_name} onChange={e=>set("job_name",e.target.value)} placeholder="e.g. SBI PO 2026" data-testid="job-form-name"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["start_date","Start Date","DD MM YYYY","job-form-start-date"],["last_date","Last Date *","DD MM YYYY","job-form-last-date"],["exam_date","Exam Date","DD MM YYYY","job-form-exam-date"],["tags","Tags","SSC, Banking","job-form-tags"]].map(([k,l,ph,id])=>(
              <div key={k}>
                <label className="label">{l}</label>
                <input className="input" value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={ph} data-testid={id} style={{fontSize:15}}/>
              </div>
            ))}
          </div>
          <div>
            <label className="label">Apply Link *</label>
            <input className="input" value={form.apply_link} onChange={e=>set("apply_link",e.target.value)} placeholder="https://…" data-testid="job-form-apply-link" type="url"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><label className="label">Username</label><input className="input" value={form.app_username} onChange={e=>set("app_username",e.target.value)} placeholder="Optional" data-testid="job-form-app-username"/></div>
            <div><label className="label">Password</label><input className="input" value={form.app_password} onChange={e=>set("app_password",e.target.value)} placeholder="Optional" data-testid="job-form-app-password"/></div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="Any notes…" rows={3} data-testid="job-form-notes" style={{resize:"vertical",minHeight:80}}/>
          </div>
          <div style={{display:"flex",gap:10,paddingBottom:8}}>
            <button type="button" onClick={save} disabled={saving} className="btn btn-primary" data-testid="job-form-save" style={{flex:1}}>
              {saving?<Loader2 size={17} style={{animation:"spin .8s linear infinite"}}/>:<Save size={17}/>}
              {saving?"Saving…":initial?"Save Changes":"Add Job"}
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{minWidth:90}}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
