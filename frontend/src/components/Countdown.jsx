import React,{useEffect,useState} from "react";
import {daysUntil,colorForDays} from "../lib/utils-date";

export default function Countdown({targetDate}){
  const [now,setNow]=useState(new Date());
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(t);},[]);
  if(!targetDate) return <div data-testid="countdown-empty" style={{fontSize:13,color:"var(--text-4)"}}>No deadline set</div>;

  const days=daysUntil(targetDate);
  const color=colorForDays(days);
  const barColor={red:"var(--red)",amber:"var(--amber)",green:"var(--green)",neutral:"var(--border-dark)"}[color];
  const textColor={red:"var(--red)",amber:"var(--amber)",green:"var(--green)",neutral:"var(--text-4)"}[color];

  const target=new Date(targetDate+"T23:59:59");
  const hours=Math.floor(Math.max(0,target-now)/3600000);
  let label,pct;
  if(days===null)return null;
  if(days<0){label="Deadline passed "+Math.abs(days)+"d ago";pct=0;}
  else if(days===0){label="Last day — "+hours+"h left";pct=Math.max(5,(hours/24)*100);}
  else if(days===1){label="1 day left";pct=15;}
  else if(days<=7){label=days+" days left";pct=(days/7)*100;}
  else{label=days+" days left";pct=Math.min(100,(days/30)*100);}

  return(
    <div data-testid="countdown-timer">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
        <span style={{fontSize:13,fontWeight:700,color:textColor}}>{label}</span>
        {days>=0&&<span style={{fontSize:11,color:"var(--text-4)",fontWeight:500,textTransform:"uppercase",letterSpacing:".04em"}}>Deadline</span>}
      </div>
      {days>=0&&(
        <div className="progress-track" style={{height:5}}>
          <div style={{height:"100%",width:pct+"%",background:barColor,borderRadius:99,transition:"width .6s ease"}}/>
        </div>
      )}
    </div>
  );
}
