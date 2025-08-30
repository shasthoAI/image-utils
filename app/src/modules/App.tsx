import React, { useEffect, useMemo, useRef, useState } from 'react';

type Tab = 'compress'|'split'|'pdf'|'chains'|'jobs';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary'|'ghost'|'outline'|'danger';
  size?: 'sm'|'md'|'lg';
};
const Button: React.FC<ButtonProps> = ({className='', variant='outline', size='md', ...props}) => {
  const base = 'inline-flex items-center gap-2 rounded-md border font-medium transition outline-none focus:ring-2 focus:ring-offset-1';
  const sizes = {
    sm: 'text-xs px-2.5 py-1.5',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-2.5',
  }[size];
  const variants = {
    primary: 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700',
    outline: 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50',
    ghost: 'bg-transparent text-gray-700 border-transparent hover:bg-gray-100',
    danger: 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700',
  }[variant];
  return (
    <button className={[base, sizes, variants, className].join(' ')} {...props} />
  );
};

const Kbd: React.FC<React.HTMLAttributes<HTMLElement>> = ({className='', ...props}) => (
  <kbd className={[
    'px-1.5 py-0.5 rounded border border-gray-300 bg-white text-gray-800 text-[10px] font-semibold shadow-sm',
    className,
  ].join(' ')} {...props} />
);

function useLocalStorage<T>(key:string, initial:T){
  const [state,setState]=useState<T>(()=>{
    try{ const raw=localStorage.getItem(key); return raw? JSON.parse(raw) as T : initial; }catch{ return initial; }
  });
  useEffect(()=>{ try{ localStorage.setItem(key, JSON.stringify(state)); }catch{} },[key,state]);
  return [state,setState] as const;
}

function useToast(){
  const [msg,setMsg] = useState<string|undefined>();
  useEffect(()=>{ 
    if(!msg) return; 
    const t=setTimeout(()=>setMsg(undefined),2000); 
    return ()=>clearTimeout(t); 
  },[msg]);
  return { msg,setMsg };
}

const CompareSlider: React.FC<{original:string, compressed:string}> = ({original, compressed}) => {
  const [pct,setPct]=useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromClientX = (clientX:number) => {
    const el = ref.current; if(!el) return;
    const rect = el.getBoundingClientRect();
    const raw = ((clientX - rect.left) / rect.width) * 100;
    const next = Math.max(0, Math.min(100, Math.round(raw)));
    setPct(next);
  };

  const onMouseDown = (e:React.MouseEvent) => {
    dragging.current = true; setFromClientX(e.clientX);
    const onMove = (ev:MouseEvent)=> dragging.current && setFromClientX(ev.clientX);
    const onUp = ()=> { dragging.current=false; window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseup',onUp); };
    window.addEventListener('mousemove',onMove);
    window.addEventListener('mouseup',onUp);
  };
  const onTouchStart = (e:React.TouchEvent) => {
    dragging.current = true; setFromClientX(e.touches[0].clientX);
    const onMove = (ev:TouchEvent)=> dragging.current && setFromClientX(ev.touches[0].clientX);
    const onUp = ()=> { dragging.current=false; window.removeEventListener('touchmove',onMove); window.removeEventListener('touchend',onUp); };
    window.addEventListener('touchmove',onMove, { passive: true });
    window.addEventListener('touchend',onUp);
  };

  const step = (delta:number)=> setPct(p=> Math.max(0, Math.min(100, p+delta)));

  return (
    <div ref={ref} className="relative inline-block w-full max-w-3xl rounded-xl overflow-hidden border bg-white select-none"
         onMouseDown={onMouseDown} onTouchStart={onTouchStart}>
      {/* Base (compressed) */}
      <img src={compressed} className="block w-full"/>
      {/* Top (original) with clipping by width */}
      {/* <div className="absolute inset-y-0 left-0 overflow-hidden" style={{width:`${pct}%`}}> */}
      <div className="absolute inset-y-0 left-0 overflow-hidden" style={{clipPath:`inset(0 ${100-pct}% 0 0)`}}>
        <img src={original} className="block w-full h-full object-cover"/>
      </div>
      {/* Handle + divider */}
      <div className="absolute inset-y-0" style={{left:`${pct}%`, transform:'translateX(-50%)'}}>
        <div className="w-px h-full bg-white/70 shadow-[0_0_0_1px_rgba(0,0,0,0.05)]"/>
      </div>
      <button
        type="button"
        aria-label="Adjust compare"
        onKeyDown={(e)=>{
          if(e.key==='ArrowLeft') { e.preventDefault(); step(e.shiftKey? -10:-1);} 
          if(e.key==='ArrowRight'){ e.preventDefault(); step(e.shiftKey? 10:1);} 
          if(e.key==='Home'){ e.preventDefault(); setPct(0);} 
          if(e.key==='End'){ e.preventDefault(); setPct(100);} 
        }}
        className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-white/90 shadow border left-1/2"
        style={{left:`${pct}%`, transform:'translate(-50%, -50%)'}}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" className="text-gray-700"><path fill="currentColor" d="M10 6l-6 6 6 6V6zm4 12l6-6-6-6v12z"/></svg>
      </button>
      {/* Labels */}
      <div className="absolute left-3 top-3 text-xs font-semibold text-gray-800 bg-white/80 backdrop-blur px-2 py-0.5 rounded">Original</div>
      <div className="absolute right-3 top-3 text-xs font-semibold text-gray-800 bg-white/80 backdrop-blur px-2 py-0.5 rounded">Compressed</div>
      {/* Percent bubble */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] text-gray-700 bg-white/90 border rounded px-1 py-0.5 shadow">{pct}%</div>
    </div>
  );
}

const Section: React.FC<React.PropsWithChildren<{title:string; actions?:React.ReactNode; description?:string}>> = ({title,actions,description,children}) => (
  <section className="rounded-xl border bg-white">
    <div className="flex items-start justify-between gap-4 border-b px-4 py-3">
      <div>
        <h3 className="text-sm font-semibold tracking-wide uppercase text-gray-700">{title}</h3>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
    <div className="p-4">
      {children}
    </div>
  </section>
);

const Dropzone: React.FC<{onFiles:(files:File[])=>void; accept?:string; label?:string; className?:string}> = ({onFiles, accept, label='Drop files here or click to select', className=''}) => {
  const [drag,setDrag]=useState(false);
  const inputRef=useRef<HTMLInputElement>(null);
  const onDrop=(e:React.DragEvent)=>{
    e.preventDefault(); setDrag(false);
    const fs = Array.from(e.dataTransfer.files||[]);
    if(fs.length) onFiles(fs);
  };
  return (
    <div
      onDragOver={(e)=>{e.preventDefault(); setDrag(true);}}
      onDragLeave={()=>setDrag(false)}
      onDrop={onDrop}
      onClick={()=>inputRef.current?.click()}
      className={[
        'flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 text-sm cursor-pointer select-none',
        drag? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50',
        className,
      ].join(' ')}
    >
      <div className="text-gray-700 font-medium">{label}</div>
      <div className="text-xs text-gray-500 mt-1">Supported: images, pdf</div>
      <input ref={inputRef} type="file" multiple accept={accept} className="hidden" onChange={e=>onFiles(Array.from(e.target.files||[]))}/>
    </div>
  );
};

type CompressResult = {
  original: string;
  compressed?: string;
  success: boolean;
  originalUrl?: string;
  compressedViewUrl?: string;
  originalSizeKB?: string;
  compressedSizeKB?: string;
  compressionRatio?: string;
  error?: string;
}

const CompressView: React.FC = () => {
  const [files,setFiles]=useState<File[]>([]);
  const [level,setLevel]=useLocalStorage<'medium'|'high'|'extreme'>('ui.compress.level','medium');
  const [webp,setWebp]=useLocalStorage<boolean>('ui.compress.webp', false);
  const [gray,setGray]=useLocalStorage<boolean>('ui.compress.gray', false);
  const [results,setResults]=useState<CompressResult[]>([]);
  const [loading,setLoading]=useState(false);
  const toast = useToast();

  const presets: {name:string; apply:()=>void}[] = [
    {name:'Balanced', apply:()=>{setLevel('medium'); setWebp(true); setGray(false);}},
    {name:'Max Save', apply:()=>{setLevel('extreme'); setWebp(true); setGray(true);}},
    {name:'High Quality', apply:()=>{setLevel('high'); setWebp(false); setGray(false);}},
  ];

  const submit=async()=>{
    try {
      setLoading(true);
      const fd=new FormData();
      (files||[]).forEach(f=>fd.append('files',f));
      fd.append('level',level); fd.append('webp',String(webp)); fd.append('grayscale',String(gray));
      const r=await fetch('/api/compress',{method:'POST',body:fd});
      const j=await r.json();
      if(!r.ok){ toast.setMsg(j.error||'Failed'); return; }
      setResults(j.results||[]); toast.setMsg('Compression complete');
    } catch (e) {
      console.warn('Compression failed', e);
      toast.setMsg('Compression failed');
    } finally { setLoading(false); }
  };
  return (
    <div className="space-y-4">
      <Section
        title="Input & Settings"
        actions={
          <>
            <div className="hidden md:flex items-center rounded-md border overflow-hidden">
              {(['medium','high','extreme'] as const).map(v=> (
                <button key={v} onClick={()=>setLevel(v)} className={[
                  'px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide',
                  level===v? 'bg-blue-600 text-white':'bg-white hover:bg-gray-50'
                ].join(' ')}>{v}</button>
              ))}
            </div>
            <Button onClick={submit} variant="primary" disabled={loading || !(files && files.length)}>
              {loading? (<span className="inline-flex items-center gap-2"><Spinner/> Running…</span>):(<span className="inline-flex items-center gap-2">Run</span>)}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <Dropzone accept="image/*" onFiles={(fs)=>setFiles((fs as any) as File[])} label="Drop images here or click to select" />
            {files && files.length>0 && (
              <div className="mt-3">
                <SelectedFiles
                  files={files}
                  onRemove={(idx)=> setFiles(prev => prev.filter((_,i)=>i!==idx))}
                />
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm">Output WebP</div>
              <Switch checked={webp} onChange={setWebp}/>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm">Grayscale</div>
              <Switch checked={gray} onChange={setGray}/>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {presets.map(p=> (
                <Button key={p.name} size="sm" onClick={p.apply}>{p.name}</Button>
              ))}
              <Button size="sm" variant="ghost" onClick={()=>setFiles([])}>Clear</Button>
            </div>
          </div>
        </div>
      </Section>

      {results.length>0 && (
        <Section title="Results" actions={<Button size="sm" variant="ghost" onClick={()=>setResults([])}>Clear Results</Button>}>
          <div className="space-y-4">
            {results.map((r,i)=> (
              <div key={i} className="p-4 border rounded-xl bg-white">
                <div className="flex items-center justify-between">
                  <div className="font-medium truncate" title={r.original}>{r.original}</div>
                  {r.originalSizeKB && (
                    <div className="flex items-center gap-2 text-xs">
                      <Badge>{r.originalSizeKB} KB</Badge>
                      {r.compressedSizeKB && <Badge variant="green">{r.compressedSizeKB} KB</Badge>}
                      {r.compressionRatio && <Badge variant="blue">Saved {r.compressionRatio}%</Badge>}
                    </div>
                  )}
                </div>
                <div className="mt-3">
          {r.success && r.originalUrl && r.compressedViewUrl ? (
            <>
              <CompareSlider original={r.originalUrl} compressed={r.compressedViewUrl}/>
              <div className="mt-2 flex gap-3 text-sm">
                <a href={r.compressedViewUrl} target="_blank" className="text-blue-600 hover:underline">Open</a>
                {r.compressedUrl && <a href={r.compressedUrl} className="text-blue-600 hover:underline">Download</a>}
              </div>
            </>
          ) : (
            <div className="text-sm text-red-600">{r.error||'Failed'}</div>
          )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {toast.msg && <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-3 py-2 rounded-md shadow">{toast.msg}</div>}
    </div>
  );
}

type GridItem = { name:string; sizeKB?:string; viewUrl:string };
type GridItemEx = GridItem & { downloadUrl?: string };
const Grid: React.FC<{items:GridItemEx[]}> = ({items}) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
    {items.map((it,i)=> (
      <a key={i} href={it.viewUrl} target="_blank" className="group border rounded-lg bg-white overflow-hidden hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        <div className="relative">
          <img src={it.viewUrl} className="w-full h-32 object-cover"/>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition"/>
        </div>
        <div className="px-2 py-1 text-xs text-gray-600">
          <div className="flex justify-between">
            <span className="truncate" title={it.name}>{it.name}</span>
            <span>{it.sizeKB? `${it.sizeKB} KB`:''}</span>
          </div>
          {it.downloadUrl && (
            <div className="mt-1 flex gap-2">
              <a href={it.viewUrl} target="_blank" className="text-blue-600 hover:underline">View</a>
              <a href={it.downloadUrl} className="text-blue-600 hover:underline">Download</a>
            </div>
          )}
        </div>
      </a>
    ))}
  </div>
);

const SplitView: React.FC = () => {
  const [files,setFiles]=useState<File[]>([]);
  const [parts,setParts]=useLocalStorage<number>('ui.split.parts',6);
  const [top,setTop]=useLocalStorage<number>('ui.split.top',0);
  const [results,setResults]=useState<any[]>([]);
  const [loading,setLoading]=useState(false);
  const toast=useToast();
  const submit=async()=>{
    try {
      setLoading(true);
      const fd=new FormData(); 
      (files||[]).forEach(f=>fd.append('files',f));
      fd.append('parts',String(parts)); 
      fd.append('topOffset',String(top));
      const r=await fetch('/api/split',{method:'POST',body:fd}); 
      const j=await r.json(); 
      if(!r.ok){toast.setMsg(j.error||'Failed');return;}
      setResults(j.results||[]); 
      toast.setMsg('Split complete');
    } catch (e) {
      console.warn('Split failed', e);
      toast.setMsg('Split failed');
    } finally { setLoading(false); }
  };
  return (
    <div className="space-y-4">
      <Section
        title="Input & Layout"
        actions={
          <Button onClick={submit} variant="primary" disabled={loading || !(files && files.length)}>
            {loading? (<span className="inline-flex items-center gap-2"><Spinner/> Running…</span>):(<span className="inline-flex items-center gap-2">Run</span>)}
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <Dropzone accept="image/*" onFiles={(fs)=>setFiles((fs as any) as File[])} label="Drop images here or click to select" />
            {files && files.length>0 && (
              <div className="mt-3">
                <SelectedFiles
                  files={files}
                  onRemove={(idx)=> setFiles(prev => prev.filter((_,i)=>i!==idx))}
                />
              </div>
            )}
          </div>
          <div className="grid gap-3 content-start">
            <LabeledInput label="Parts" suffix={<Kbd>Horizontal</Kbd>}>
              <input type="number" className="w-full border rounded-md px-2 py-1" value={parts} onChange={e=>setParts(parseInt(e.target.value||'6'))} />
            </LabeledInput>
            <LabeledInput label="Top Offset (px)">
              <input type="number" className="w-full border rounded-md px-2 py-1" value={top} onChange={e=>setTop(parseInt(e.target.value||'0'))} />
            </LabeledInput>
            <div className="pt-1">
              <Button size="sm" variant="ghost" onClick={()=>setFiles([])}>Clear</Button>
            </div>
          </div>
        </div>
      </Section>

      {results.map((r,i)=> (
        <Section key={i} title={r.original}>
          {r.partDetails? <Grid items={r.partDetails.map((p:any)=>({name:p.name,sizeKB:p.sizeKB,viewUrl:p.viewUrl, downloadUrl:p.downloadUrl}))}/> : <div className="text-sm text-gray-600">{r.parts?.length||0} parts</div>}
        </Section>
      ))}
    </div>
  );
}

const PdfView: React.FC = () => {
  const [files,setFiles]=useState<File[]>([]);
  const [format,setFormat]=useLocalStorage<'png'|'jpeg'>('ui.pdf.format','png');
  const [scale,setScale]=useLocalStorage<number>('ui.pdf.scale',150);
  const [results,setResults]=useState<any[]>([]);
  const [loading,setLoading]=useState(false);
  const toast=useToast();
  const submit=async()=>{
    try {
      setLoading(true);
      const fd=new FormData(); 
      (files||[]).forEach(f=>fd.append('files',f)); 
      fd.append('format',format); 
      fd.append('scale',String(scale));
      const r=await fetch('/api/pdf-split',{method:'POST',body:fd}); 
      const j=await r.json(); 
      if(!r.ok){toast.setMsg(j.error||'Failed');return;}
      setResults(j.results||[]); 
      toast.setMsg('PDF conversion complete');
    } catch (e) {
      console.warn('PDF conversion failed', e);
      toast.setMsg('PDF conversion failed');
    } finally { setLoading(false); }
  };
  return (
    <div className="space-y-4">
      <Section
        title="Input & Options"
        actions={<Button onClick={submit} variant="primary" disabled={loading || !(files && files.length)}>{loading? (<span className="inline-flex items-center gap-2"><Spinner/> Running…</span>):(<span className="inline-flex items-center gap-2">Run</span>)}</Button>}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <Dropzone accept="application/pdf" onFiles={(fs)=>setFiles((fs as any) as File[])} label="Drop PDFs here or click to select" />
            {files && files.length>0 && (
              <div className="mt-3">
                <SelectedFiles
                  files={files}
                  onRemove={(idx)=> setFiles(prev => prev.filter((_,i)=>i!==idx))}
                />
              </div>
            )}
          </div>
          <div className="grid gap-3 content-start">
            <LabeledInput label="Format">
              <select className="border rounded-md px-2 py-1 w-full" value={format} onChange={e=>setFormat(e.target.value as any)}><option value="png">PNG</option><option value="jpeg">JPEG</option></select>
            </LabeledInput>
            <LabeledInput label="Scale (%)">
              <input type="number" className="border rounded-md px-2 py-1 w-full" value={scale} onChange={e=>setScale(parseInt(e.target.value||'150'))}/>
            </LabeledInput>
            <div className="pt-1">
              <Button size="sm" variant="ghost" onClick={()=>setFiles([])}>Clear</Button>
            </div>
          </div>
        </div>
      </Section>
      {results.map((r,i)=> (
        <Section key={i} title={r.original}>
          {r.pageDetails? <Grid items={r.pageDetails.map((p:any)=>({name:p.name,sizeKB:p.sizeKB,viewUrl:p.viewUrl, downloadUrl:p.downloadUrl}))}/> : <div className="text-sm text-gray-600">{r.pages?.length||0} images</div>}
        </Section>
      ))}
    </div>
  );
}

type ChainTool = 'compress'|'split'|'pdf-split';
type ChainStep = { tool: ChainTool; config: any };

const ChainsView: React.FC = () => {
  const [chains,setChains]=useState<any[]>([]);
  const [selected,setSelected]=useLocalStorage<string>('ui.chains.selected','');
  const [files,setFiles]=useState<File[]>([]);
  const [result,setResult]=useState<any>();
  const [progress,setProgress]=useState<{executionId:string; stepCount:number; currentStep:number; status:string}|null>(null);
  const pollRef = useRef<any>(null);
  const [chainName,setChainName]=useState('');
  const [steps,setSteps]=useState<ChainStep[]>([]);
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const r = await fetch('/api/chains', { signal: ac.signal });
        if (!r.ok) {
          throw new Error(`HTTP error! status: ${r.status}`);
        }
        const j = await r.json();
        if (!ac.signal.aborted) {
          setChains(j);
        }
      } catch (e:any) {
        if (e?.name !== 'AbortError' && !ac.signal.aborted) {
          console.warn('Failed to load chains', e);
        }
      }
    })();
    return () => ac.abort();
  }, []);
  const run=async()=>{
    if(!selected) return;
    try {
      const fd=new FormData(); 
      (files||[]).forEach(f=>fd.append('files',f));
      const r=await fetch(`/api/chains/${selected}/execute-async`,{method:'POST',body:fd});
      if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
      const j=await r.json();
      setResult(undefined);
      setProgress({ executionId:j.executionId, stepCount:j.stepCount, currentStep:0, status:'running' });
      // start polling
      if (pollRef.current) clearTimeout(pollRef.current);
      const poll = async()=>{
        try{
          const s = await fetch(`/api/chain-executions/${j.executionId}`);
          const data = await s.json();
          setProgress(p=>p? ({...p, currentStep: data.current_step ?? 0, status: data.status}):null);
          if (data.status === 'completed'){
            setResult({ results: data.results });
            pollRef.current = null; return;
          }
          if (data.status === 'failed'){
            pollRef.current = null; return;
          }
          pollRef.current = setTimeout(poll, 700);
        }catch(err){ pollRef.current = setTimeout(poll, 1200); }
      };
      poll();
    } catch (e) {
      console.warn('Failed to execute chain', e);
      setResult({ error: 'Failed to execute chain' });
    }
  }
  return (
    <div className="space-y-4">
      <Section
        title="Create Chain"
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={()=>setSteps(s=>[...s, { tool:'compress', config:{ compressionLevel:'medium', convertToWebP:false, grayscale:false } }])}>+ Add Step</Button>
            <Button size="sm" variant="primary" onClick={async()=>{
              if(!chainName || steps.length===0) return;
              try{
                const r=await fetch('/api/chains',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:chainName,steps})});
                if(!r.ok){ throw new Error('Failed to save'); }
                setChainName(''); setSteps([]);
                // refresh list
                const j=await (await fetch('/api/chains')).json(); setChains(j);
              }catch(e){ console.warn('Failed to save chain',e); }
            }} disabled={!chainName || steps.length===0}>Save Chain</Button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <LabeledInput label="Chain Name">
              <input value={chainName} onChange={e=>setChainName(e.target.value)} placeholder="e.g., PDF → Split → Compress"
                     className="w-full border rounded-md px-2 py-1"/>
            </LabeledInput>
          </div>
          <div className="md:col-span-2 space-y-3">
            {steps.length===0 && <div className="text-sm text-gray-500">No steps yet. Add your first step.</div>}
            {steps.map((step,idx)=> (
              <ChainStepEditor key={idx} index={idx} step={step} onChange={(ns)=>setSteps(prev=>prev.map((s,i)=>i===idx?ns:s))} onRemove={()=>setSteps(prev=>prev.filter((_,i)=>i!==idx))}/>
            ))}
          </div>
        </div>
      </Section>

      {progress && (
        <Section title="Execution Progress">
          <ProgressBar current={progress.currentStep} total={progress.stepCount} status={progress.status}/>
        </Section>
      )}

      <Section
        title="Chain & Input"
        actions={<Button onClick={run} variant="primary" disabled={!selected || !!progress}>Execute</Button>}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-3">
            <label className="text-sm font-medium">Select Chain</label>
            <select className="border rounded-md px-2 py-1 w-full" value={selected} onChange={e=>setSelected(e.target.value)}>
              <option value="">Select chain…</option>
              {chains.map((c:any)=>(<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <div className="text-xs text-gray-500">{chains.length} chain(s) available</div>
          </div>
          <div className="md:col-span-2">
            <Dropzone onFiles={(fs)=>setFiles((fs as any) as File[])} label="Drop files for chain or click to select" />
            {files && files.length>0 && (<div className="mt-3 text-xs text-gray-600">{files.length} file(s) selected</div>)}
          </div>
        </div>
      </Section>
      {result && (
        <div className="space-y-4">
          {result.results?.map((step:any,idx:number)=> (
            <Section key={idx} title={`Step ${idx+1}: ${step.tool}`}>
              {step.tool==='compress' && step.results?.map((it:any,i:number)=> (
                it.success && it.originalViewUrl && it.compressedViewUrl ? (
                  <div key={i} className="mb-4">
                    <CompareSlider original={it.originalViewUrl} compressed={it.compressedViewUrl}/>
                    {(it.originalSizeKB || it.compressedSizeKB || it.compressionRatio) && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        {it.originalSizeKB && <Badge>{it.originalSizeKB} KB</Badge>}
                        {it.compressedSizeKB && <Badge variant="green">{it.compressedSizeKB} KB</Badge>}
                        {it.compressionRatio && <Badge variant="blue">Saved {it.compressionRatio}%</Badge>}
                      </div>
                    )}
                    <div className="mt-2 text-sm flex gap-3">
                      <a href={it.compressedViewUrl} target="_blank" className="text-blue-600 hover:underline">Open</a>
                      {it.compressedDownloadUrl && <a href={it.compressedDownloadUrl} className="text-blue-600 hover:underline">Download</a>}
                    </div>
                  </div>
                ): (<div key={i} className="text-sm">{it.original} - {it.success? '✅':'❌'}</div>)
              ))}
              {(step.tool==='split' || step.tool==='pdf-split') && step.webFiles && <Grid items={step.webFiles}/>} 
            </Section>
          ))}
        </div>
      )}
    </div>
  );
}

const JobsView: React.FC = () => {
  const [jobs,setJobs]=useState<any[]>([]);
  const [chains,setChains]=useState<any[]>([]);
  const [chainDetails,setChainDetails]=useState<Record<string, any>>({});
  // Initial fetch with cleanup
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const r = await fetch('/api/jobs', { signal: ac.signal });
        if (!r.ok) {
          throw new Error(`HTTP error! status: ${r.status}`);
        }
        const j = await r.json();
        if (!ac.signal.aborted) {
          setJobs(j);
        }
      } catch (e:any) {
        if (e?.name !== 'AbortError' && !ac.signal.aborted) {
          console.warn('Failed to load jobs', e);
        }
      }
      try {
        const r2 = await fetch('/api/chain-executions', { signal: ac.signal });
        if (r2.ok) {
          const j2 = await r2.json();
          if (!ac.signal.aborted) setChains(j2);
        }
      } catch (e:any) {
        if (e?.name !== 'AbortError' && !ac.signal.aborted) console.warn('Failed to load chain executions', e);
      }
    })();
    return () => ac.abort();
  },[]);

  // Manual refresh for the button
  const refresh = async () => {
    try {
      const r = await fetch('/api/jobs');
      if (!r.ok) {
        throw new Error(`HTTP error! status: ${r.status}`);
      }
      const j = await r.json();
      setJobs(j);
    } catch (e) {
      console.warn('Failed to refresh jobs');
    }
    try {
      const r2 = await fetch('/api/chain-executions');
      if (r2.ok) setChains(await r2.json());
    } catch (e) {
      console.warn('Failed to refresh chain executions');
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-lg font-semibold">Recent Jobs</div>
        <div className="flex items-center gap-2">
          <Button onClick={refresh} variant="ghost">Refresh</Button>
        </div>
      </div>
      <div className="grid gap-2">
        {jobs.map(j=>(
          <div key={j.id} className="p-3 border rounded-lg bg-white grid grid-cols-[1fr_auto] items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium capitalize">{j.type}</span>
                <Badge variant={j.status==='completed'?'green':j.status==='failed'?'red':'gray'}>{j.status}</Badge>
              </div>
              <div className="text-xs text-gray-600">{new Date(j.created_at).toLocaleString()}</div>
            </div>
            <div className="text-xs text-gray-600">
              {j.completed_at? <>completed {new Date(j.completed_at).toLocaleString()}</> : 'in progress'}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4">
        <div className="text-lg font-semibold mb-2">Chain Executions</div>
        <div className="grid gap-2">
          {chains.map(c=>(
            <div key={c.id} className="p-3 border rounded-lg bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.chain_name || c.chain_id}</span>
                  <Badge variant={c.status==='completed'?'green':c.status==='failed'?'red':'gray'}>{c.status}</Badge>
                </div>
                <div className="text-xs text-gray-600">{new Date(c.created_at).toLocaleString()}</div>
              </div>
              <div className="mt-2">
                <Button size="sm" variant="ghost" onClick={async()=>{
                  try{ const r=await fetch(`/api/chain-executions/${c.id}`); if(!r.ok) return; const d=await r.json(); setChainDetails(prev=>({...prev,[c.id]:d})); }catch{}
                }}>View Details</Button>
              </div>
              {chainDetails[c.id] && chainDetails[c.id].results && (
                <div className="mt-3 space-y-3">
                  {chainDetails[c.id].results.map((step:any, idx:number)=> (
                    <Section key={idx} title={`Step ${idx+1}: ${step.tool}`}>
                      {step.tool==='compress' && step.results?.map((it:any,i:number)=> (
                        it.success && it.originalViewUrl && it.compressedViewUrl ? (
                          <div key={i} className="mb-4">
                            <CompareSlider original={it.originalViewUrl} compressed={it.compressedViewUrl}/>
                            {(it.originalSizeKB || it.compressedSizeKB || it.compressionRatio) && (
                              <div className="mt-2 flex items-center gap-2 text-xs">
                                {it.originalSizeKB && <Badge>{it.originalSizeKB} KB</Badge>}
                                {it.compressedSizeKB && <Badge variant="green">{it.compressedSizeKB} KB</Badge>}
                                {it.compressionRatio && <Badge variant="blue">Saved {it.compressionRatio}%</Badge>}
                              </div>
                            )}
                            <div className="mt-2 text-sm flex gap-3">
                              <a href={it.compressedViewUrl} target="_blank" className="text-blue-600 hover:underline">Open</a>
                              {it.compressedDownloadUrl && <a href={it.compressedDownloadUrl} className="text-blue-600 hover:underline">Download</a>}
                            </div>
                          </div>
                        ): (<div key={i} className="text-sm">{it.original} - {it.success? '✅':'❌'}</div>)
                      ))}
                      {(step.tool==='split' || step.tool==='pdf-split') && step.webFiles && <Grid items={step.webFiles}/>}
                    </Section>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const App: React.FC = () => {
  const [tab,setTab]=useState<Tab>('compress');
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase();
      if((e.metaKey||e.ctrlKey)&&k==='k'){ e.preventDefault(); setPaletteOpen(true); return; }
      if(k>='1'&&k<='5'){ const i=Number(k)-1; setTab((['compress','split','pdf','chains','jobs'] as Tab[])[i]); return; }
      if(k==='j'){ setTab('jobs'); return; }
    }; window.addEventListener('keydown',onKey); return ()=>window.removeEventListener('keydown',onKey);
  },[]);
  useEffect(()=>{
    document.title = `Image Utils — ${labelFor(tab)}`;
  },[tab]);
  const [paletteOpen,setPaletteOpen]=useState(false);
  const [query,setQuery]=useState('');
  const commands = useMemo(()=>{
    const switchTo = (t:Tab)=>({ id:`tab-${t}`, label:`Switch: ${labelFor(t)}`, hint:keyFor(t), run:()=>setTab(t)});
    return [ switchTo('compress'), switchTo('split'), switchTo('pdf'), switchTo('chains'), switchTo('jobs') ];
  },[]);
  const filtered = useMemo(()=>commands.filter(c=>c.label.toLowerCase().includes(query.toLowerCase())),[commands,query]);
  return (
    <div className="h-full max-w-7xl mx-auto p-4">
      <div className="bg-white border rounded-xl shadow-sm min-h-[70vh] grid grid-cols-[220px_1fr]">
        <aside className="border-r p-3 space-y-2">
          <div className="px-1 py-2">
            <div className="text-sm font-bold tracking-wide">Image Utils</div>
            <div className="text-[11px] text-gray-500">Power tools</div>
          </div>
          {(['compress','split','pdf','chains','jobs'] as Tab[]).map(t=> {
            const active = tab===t;
            return (
              <Button
                key={t}
                aria-current={active? 'page': undefined}
                className={`w-full justify-start border-l-2 ${active? 'border-blue-600 bg-gradient-to-r from-blue-50 to-transparent text-blue-700 font-semibold':'border-transparent bg-white hover:bg-gray-50'}`}
                onClick={()=>setTab(t)}
              >
                <TabIcon tab={t}/>
                <span className="flex-1 text-left">{labelFor(t)}</span>
                <Kbd>{keyFor(t)}</Kbd>
              </Button>
            );
          })}
          <div className="pt-2">
            <Button onClick={()=>setPaletteOpen(true)} className="w-full justify-between" variant="ghost">
              <span className="inline-flex items-center gap-2">Command Palette</span>
              <span className="inline-flex items-center gap-1"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
            </Button>
          </div>
        </aside>
        <main className="p-5 space-y-4">
          <HeaderBar tab={tab} onOpenPalette={()=>setPaletteOpen(true)} />
          {tab==='compress' && <CompressView/>}
          {tab==='split' && <SplitView/>}
          {tab==='pdf' && <PdfView/>}
          {tab==='chains' && <ChainsView/>}
          {tab==='jobs' && <JobsView/>}
        </main>
      </div>

      {paletteOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-start justify-center p-8" onClick={()=>setPaletteOpen(false)}>
          <div className="w-full max-w-xl rounded-xl border bg-white shadow-lg overflow-hidden" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Type a command…" className="flex-1 outline-none bg-transparent text-sm py-1"/>
              <Button size="sm" variant="ghost" onClick={()=>setPaletteOpen(false)}>Close</Button>
            </div>
            <div className="max-h-80 overflow-auto">
              {filtered.map(cmd=> (
                <button key={cmd.id} onClick={()=>{cmd.run(); setPaletteOpen(false); setQuery('');}} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between">
                  <span className="text-sm">{cmd.label}</span>
                  {cmd.hint && <Kbd>{cmd.hint}</Kbd>}
                </button>
              ))}
              {filtered.length===0 && <div className="px-3 py-6 text-sm text-gray-600">No results</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

// UI helpers and small components
const SelectedFiles: React.FC<{files:File[]; onRemove:(index:number)=>void}> = ({files,onRemove}) => {
  return (
    <div>
      <div className="text-xs text-gray-600 mb-2">{files.length} file(s) selected</div>
      <ul className="flex flex-wrap gap-2">
        {files.map((f, i)=> (
          <li key={i} className="inline-flex items-center gap-2 max-w-full px-2 py-1 border rounded-md bg-white text-xs">
            <span className="truncate max-w-[220px]" title={`${f.name} — ${formatBytes(f.size)}`}>{f.name}</span>
            <span className="text-gray-500">{formatBytes(f.size)}</span>
            <button
              type="button"
              className="ml-1 rounded p-0.5 hover:bg-gray-100 text-gray-600"
              aria-label={`Remove ${f.name}`}
              onClick={()=>onRemove(i)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" className="pointer-events-none"><path fill="currentColor" d="M18.3 5.71L12 12.01l-6.3-6.3-1.4 1.41 6.3 6.3-6.3 6.3 1.4 1.41 6.3-6.3 6.3 6.3 1.41-1.41-6.3-6.3 6.3-6.3z"/></svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

function formatBytes(n:number){
  const units=['B','KB','MB','GB'];
  let v=n; let u=0;
  while(v>=1024 && u<units.length-1){ v/=1024; u++; }
  return `${Math.round(v*10)/10} ${units[u]}`;
}

const Spinner = ()=> (
  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
  </svg>
);

const TabIcon: React.FC<{tab:Tab}> = ({tab})=>{
  const icon = tab==='compress'? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z"/></svg>
  ) : tab==='split'? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></svg>
  ) : tab==='pdf'? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zm0 0l6 6"/></svg>
  ) : tab==='chains'? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M7.5 7a4.5 4.5 0 000 9H10v-2H7.5a2.5 2.5 0 010-5H10V7H7.5zm6.5 0h2.5a4.5 4.5 0 010 9H14v-2h2.5a2.5 2.5 0 000-5H14V7z"/></svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M4 4h16v2H4zM4 11h16v2H4zM4 18h16v2H4z"/></svg>
  );
  return <span className="text-current">{icon}</span>;
};

const HeaderBar: React.FC<{tab:Tab; onOpenPalette:()=>void}> = ({tab,onOpenPalette})=>{
  return (
    <div className="flex items-center justify-between border rounded-lg bg-white p-3">
      <div className="text-sm text-gray-600">
        <span className="font-semibold text-gray-900">{labelFor(tab)}</span>
        <span className="ml-2 hidden md:inline text-gray-500">Quick keys: <Kbd>1</Kbd>…<Kbd>5</Kbd>, <Kbd>J</Kbd> jobs, <Kbd>⌘</Kbd><Kbd>K</Kbd> palette</span>
      </div>
      <div>
        <Button variant="ghost" onClick={onOpenPalette}>Search actions</Button>
      </div>
    </div>
  );
}

const Badge: React.FC<React.PropsWithChildren<{variant?:'gray'|'green'|'blue'|'red'}>> = ({children, variant='gray'}) => {
  const classes = {
    gray: 'bg-gray-100 text-gray-800',
    green: 'bg-emerald-100 text-emerald-800',
    blue: 'bg-blue-100 text-blue-800',
    red: 'bg-rose-100 text-rose-800',
  }[variant];
  return <span className={["inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", classes].join(' ')}>{children}</span>;
};

const Switch: React.FC<{checked:boolean; onChange:(v:boolean)=>void}> = ({checked,onChange}) => (
  <button onClick={()=>onChange(!checked)} className={[
    'w-10 h-6 rounded-full transition flex items-center',
    checked? 'bg-blue-600':'bg-gray-300'
  ].join(' ')}>
    <span className={[
      'w-5 h-5 bg-white rounded-full shadow transition transform',
      checked? 'translate-x-4':'translate-x-1'
    ].join(' ')} />
  </button>
);

const LabeledInput: React.FC<React.PropsWithChildren<{label:string; suffix?:React.ReactNode}>> = ({label,suffix,children}) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-xs text-gray-600">
      <span className="font-medium text-gray-800">{label}</span>
      {suffix}
    </div>
    {children}
  </div>
);

function labelFor(t:Tab){
  return t==='compress'? 'Compress Images' : t==='split'? 'Split Images' : t==='pdf'? 'PDF to Images' : t==='chains'? 'Tool Chains' : 'Job History';
}
function keyFor(t:Tab){
  return String((['compress','split','pdf','chains','jobs'] as Tab[]).indexOf(t)+1);
}

// Chain step editor
const ChainStepEditor: React.FC<{ index:number; step: ChainStep; onChange:(s:ChainStep)=>void; onRemove:()=>void }>=({index,step,onChange,onRemove})=>{
  const setTool=(tool:ChainTool)=>{
    const next: ChainStep = { tool, config: defaultConfig(tool) };
    onChange(next);
  };
  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold grid place-items-center">{index+1}</span>
          <select className="border rounded-md px-2 py-1" value={step.tool} onChange={e=>setTool(e.target.value as ChainTool)}>
            <option value="compress">Image Compression</option>
            <option value="split">Image Splitting</option>
            <option value="pdf-split">PDF to Images</option>
          </select>
        </div>
        <Button size="sm" variant="danger" onClick={onRemove}>Remove</Button>
      </div>
      {step.tool==='compress' && (
        <div className="grid gap-3 md:grid-cols-3">
          <LabeledInput label="Compression Level">
            <select className="border rounded-md px-2 py-1 w-full" value={step.config.compressionLevel||'medium'} onChange={e=>onChange({...step, config:{...step.config, compressionLevel:e.target.value}})}>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="extreme">Extreme</option>
            </select>
          </LabeledInput>
          <div className="flex items-center justify-between">
            <div className="text-sm">Convert to WebP</div>
            <Switch checked={!!step.config.convertToWebP} onChange={(v)=>onChange({...step, config:{...step.config, convertToWebP:v}})}/>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm">Grayscale</div>
            <Switch checked={!!step.config.grayscale} onChange={(v)=>onChange({...step, config:{...step.config, grayscale:v}})}/>
          </div>
        </div>
      )}
      {step.tool==='split' && (
        <div className="grid gap-3 md:grid-cols-3">
          <LabeledInput label="Parts">
            <input type="number" className="border rounded-md px-2 py-1 w-full" value={step.config.parts??6} onChange={e=>onChange({...step, config:{...step.config, parts:parseInt(e.target.value||'6')}})}/>
          </LabeledInput>
          <LabeledInput label="Top Offset (px)">
            <input type="number" className="border rounded-md px-2 py-1 w-full" value={step.config.topOffset??0} onChange={e=>onChange({...step, config:{...step.config, topOffset:parseInt(e.target.value||'0')}})}/>
          </LabeledInput>
          <LabeledInput label="Slice Height (px)">
            <input type="number" className="border rounded-md px-2 py-1 w-full" value={step.config.sliceHeight??0} onChange={e=>onChange({...step, config:{...step.config, sliceHeight:parseInt(e.target.value||'0')}})}/>
          </LabeledInput>
        </div>
      )}
      {step.tool==='pdf-split' && (
        <div className="grid gap-3 md:grid-cols-3">
          <LabeledInput label="Format">
            <select className="border rounded-md px-2 py-1 w-full" value={step.config.format||'png'} onChange={e=>onChange({...step, config:{...step.config, format:e.target.value}})}>
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="tiff">TIFF</option>
            </select>
          </LabeledInput>
          <LabeledInput label="Scale (DPI)">
            <input type="number" className="border rounded-md px-2 py-1 w-full" value={step.config.scale??150} onChange={e=>onChange({...step, config:{...step.config, scale:parseInt(e.target.value||'150')}})}/>
          </LabeledInput>
        </div>
      )}
    </div>
  );
};

function defaultConfig(tool:ChainTool){
  if(tool==='compress') return { compressionLevel:'medium', convertToWebP:false, grayscale:false };
  if(tool==='split') return { parts:6, topOffset:0, sliceHeight:0 };
  return { format:'png', scale:150 };
}

const ProgressBar: React.FC<{current:number; total:number; status:string}> = ({current,total,status})=>{
  const pct = Math.min(100, Math.round((status==='completed' ? 1 : (total? current/total : 0))*100));
  return (
    <div className="space-y-1">
      <div className="h-2 w-full bg-gray-200 rounded">
        <div className={`h-2 rounded ${status==='failed'?'bg-rose-500':'bg-blue-600'}`} style={{width:`${pct}%`}}/>
      </div>
      <div className="text-xs text-gray-600">{status==='failed'? 'Failed' : `Step ${Math.min(current+1,total)} of ${total}`}</div>
    </div>
  );
}
