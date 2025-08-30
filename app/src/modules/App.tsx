import React, { useEffect, useMemo, useState } from 'react';
import { Button } from "../components/ui/button";
import { Kbd } from "../components/ui/kbd";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../components/ui/command";
import { HeaderBar } from "../components/HeaderBar";
import { TabIcon, type Tab } from "../components/TabIcon";
import { CompressView } from "./CompressView";
import { SplitView } from "./SplitView";
import { PdfView } from "./PdfView";
import { ChainsView } from "./ChainsView";
import { JobsView } from "./JobsView";

function labelFor(t: Tab) {
  return t === 'compress' ? 'Compress Images' : t === 'split' ? 'Split Images' : t === 'pdf' ? 'PDF to Images' : t === 'chains' ? 'Tool Chains' : 'Job History';
}
function keyFor(t: Tab) {
  return String((['compress', 'split', 'pdf', 'chains', 'jobs'] as Tab[]).indexOf(t) + 1);
}

const App: React.FC = () => {
  const [tab, setTab] = useState<Tab>('compress');
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === 'k') { e.preventDefault(); setPaletteOpen(true); return; }
      if (k >= '1' && k <= '5') { const i = Number(k) - 1; setTab((['compress', 'split', 'pdf', 'chains', 'jobs'] as Tab[])[i]); return; }
      if (k === 'j') { setTab('jobs'); return; }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => { document.title = `Image Utils — ${labelFor(tab)}`; }, [tab]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState('');
  const commands = useMemo(() => {
    const switchTo = (t: Tab) => ({ id: `tab-${t}`, label: `Switch: ${labelFor(t)}`, hint: keyFor(t), run: () => setTab(t) });
    return [switchTo('compress'), switchTo('split'), switchTo('pdf'), switchTo('chains'), switchTo('jobs')];
  }, []);
  const filtered = useMemo(() => commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase())), [commands, query]);
  const isElectron = typeof window !== 'undefined' && (window as any).appWindow;
  return (
    <div className={`h-screen ${isElectron ? 'p-0' : 'max-w-7xl mx-auto p-4'}`}>
      <div className="bg-card border border-border rounded-xl shadow-xl h-full grid grid-cols-[240px_1fr] overflow-hidden">
        <aside className="border-r border-border bg-muted/50 p-4 space-y-3 rounded-l-xl overflow-hidden">
          <div className="px-2 py-3">
            <div className="text-lg font-bold tracking-tight text-foreground">Image Utils</div>
            <div className="text-sm text-muted-foreground">Power tools for images</div>
          </div>
          <nav className="space-y-1">
            {(['compress', 'split', 'pdf', 'chains', 'jobs'] as Tab[]).map(t => {
              const active = tab === t;
              return (
                <Button
                  key={t}
                  variant={active ? "default" : "ghost"}
                  size="sm"
                  aria-current={active ? 'page' : undefined}
                  className={`w-full justify-start gap-3 h-10 ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-accent hover:text-accent-foreground'}`}
                  onClick={() => setTab(t)}
                >
                  <TabIcon tab={t} />
                  <span className="flex-1 text-left">{labelFor(t)}</span>
                  <Kbd className="ml-auto">{keyFor(t)}</Kbd>
                </Button>
              );
            })}
          </nav>
          <div className="pt-4 border-t border-border">
            <Button 
              onClick={() => setPaletteOpen(true)} 
              className="w-full justify-between h-9" 
              variant="outline"
              size="sm"
            >
              <span className="text-sm">Command Palette</span>
              <span className="inline-flex items-center gap-1 text-xs"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
            </Button>
          </div>
        </aside>
        <main className="p-6 space-y-6 overflow-y-auto">
          <HeaderBar title={labelFor(tab)} onOpenPalette={() => setPaletteOpen(true)} />
          <div className="space-y-6">
            <div className={tab === 'compress' ? '' : 'hidden'}>
              <CompressView />
            </div>
            <div className={tab === 'split' ? '' : 'hidden'}>
              <SplitView />
            </div>
            <div className={tab === 'pdf' ? '' : 'hidden'}>
              <PdfView />
            </div>
            <div className={tab === 'chains' ? '' : 'hidden'}>
              <ChainsView />
            </div>
            <div className={tab === 'jobs' ? '' : 'hidden'}>
              <JobsView />
            </div>
          </div>
        </main>
      </div>

      <Dialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <DialogContent className="overflow-hidden p-0 shadow-lg">
          <DialogTitle className="sr-only">Command Palette</DialogTitle>
          <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
            <CommandInput 
              placeholder="Type a command or search..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Navigation">
                {filtered.map(cmd => (
                  <CommandItem
                    key={cmd.id}
                    value={cmd.label}
                    onSelect={() => {
                      cmd.run();
                      setPaletteOpen(false);
                      setQuery('');
                    }}
                    className="flex items-center justify-between"
                  >
                    <span>{cmd.label}</span>
                    {cmd.hint && <Kbd className="ml-auto">{cmd.hint}</Kbd>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
