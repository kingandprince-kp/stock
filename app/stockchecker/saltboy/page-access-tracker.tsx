"use client";
import { useEffect } from "react";
export default function PageAccessTracker() {
  useEffect(() => {
    let stopped=false;
    const task=window.setTimeout(async () => {
      let clientId: string;
      try {
        clientId=localStorage.getItem("kp_inventory_client_id") || crypto.randomUUID();
        localStorage.setItem("kp_inventory_client_id",clientId);
      } catch { clientId=crypto.randomUUID(); }
      const payload=JSON.stringify({ clientId, eventId:crypto.randomUUID() });
      for (let attempt=0;attempt<3 && !stopped;attempt++) {
        try {
          const response=await fetch("/api/salt-boy/page-access",{method:"POST",headers:{"Content-Type":"application/json"},body:payload,signal:AbortSignal.timeout(8000)});
          if (response.ok || response.status===400 || response.status===403) return;
        } catch { /* Retry the same event ID so a delayed response cannot double-count a view. */ }
        if (attempt<2) await new Promise((resolve)=>window.setTimeout(resolve,attempt===0?1000:3000));
      }
    },0);
    return () => { stopped=true;window.clearTimeout(task); };
  },[]);
  return null;
}
