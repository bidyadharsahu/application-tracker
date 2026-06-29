import React,{useEffect} from "react";
import {BrowserRouter,Routes,Route,Navigate} from "react-router-dom";
import {Toaster} from "sonner";
import Landing from "./pages/Landing";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import {isAuthed} from "./lib/api";
import {supabase} from "./lib/supabase";
import "./App.css";

const RequireAuth=({children})=>isAuthed()?children:<Navigate to="/admin/login" replace/>;

export default function App(){
  useEffect(()=>{
    if("Notification"in window&&Notification.permission==="default")Notification.requestPermission();
    const check=async()=>{
      if(Notification.permission!=="granted")return;
      const today=new Date();
      const{data:applied}=await supabase.from("jobs").select("job_name,exam_date").not("exam_date","is",null).eq("applied",true);
      (applied||[]).forEach(j=>{const d=Math.ceil((new Date(j.exam_date)-today)/86400000);if([0,1,7].includes(d))new Notification("Job Ledger",{body:d===0?"Exam TODAY: "+j.job_name:d===1?"Exam TOMORROW: "+j.job_name:"Exam in 7 days: "+j.job_name,icon:"/icon-192.png",tag:"exam-"+j.job_name+"-"+d});});
      const{data:pending}=await supabase.from("jobs").select("job_name,last_date").not("last_date","is",null).eq("applied",false);
      (pending||[]).forEach(j=>{const d=Math.ceil((new Date(j.last_date)-today)/86400000);if([0,1,3].includes(d))new Notification("Apply Deadline",{body:d===0?"Last day: "+j.job_name:"Apply in "+d+"d: "+j.job_name,icon:"/icon-192.png",tag:"dl-"+j.job_name+"-"+d});});
    };
    check();
  },[]);

  return(
    <div className="App" data-testid="app-root">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing/>}/>
          <Route path="/admin/login" element={<AdminLogin/>}/>
          <Route path="/admin" element={<RequireAuth><AdminDashboard/></RequireAuth>}/>
          <Route path="*" element={<Navigate to="/" replace/>}/>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors toastOptions={{
        style:{background:"#fff",color:"#0F172A",border:"1px solid #E2E8F0",borderRadius:12,fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:500,boxShadow:"0 4px 20px rgba(0,0,0,.12)"},
      }}/>
    </div>
  );
}
