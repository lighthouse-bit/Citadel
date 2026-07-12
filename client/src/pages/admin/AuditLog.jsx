import { useEffect, useState } from 'react';
import { ClipboardList, Loader } from 'lucide-react';
import { auditAPI } from '../../services/api';

export default function AuditLog() {
  const [logs,setLogs]=useState([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{auditAPI.getAll().then(r=>setLogs(r.data.logs)).finally(()=>setLoading(false));},[]);
  return <div className="space-y-6"><div><h1 className="text-2xl font-serif">Audit log</h1><p className="text-stone-500">Administrative changes and their authors.</p></div><div className="bg-white border rounded-xl">{loading?<Loader className="animate-spin m-12 mx-auto"/>:logs.map(log=><div key={log.id} className="p-4 border-b flex gap-3"><ClipboardList className="text-amber-600" size={19}/><div className="flex-1"><b>{log.action.replaceAll('_',' ')}</b><p className="text-sm text-stone-500">{log.entity}{log.entityId?` · ${log.entityId}`:''} · {log.admin?.name||log.admin?.email}</p></div><time className="text-xs text-stone-400">{new Date(log.createdAt).toLocaleString()}</time></div>)}</div></div>;
}
