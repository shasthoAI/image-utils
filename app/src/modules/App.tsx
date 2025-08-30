import React, { useEffect, useMemo, useState, lazy, Suspense } from 'react';
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
import { ShortcutsDialog } from "../components/ShortcutsDialog";
import { TabIcon, type Tab } from "../components/TabIcon";
const CompressView = lazy(() => import('./CompressView').then(m => ({ default: m.CompressView })));
const SplitView = lazy(() => import('./SplitView').then(m => ({ default: m.SplitView })));
const PdfView = lazy(() => import('./PdfView').then(m => ({ default: m.PdfView })));
const ChainsView = lazy(() => import('./ChainsView').then(m => ({ default: m.ChainsView })));
const JobsView = lazy(() => import('./JobsView').then(m => ({ default: m.JobsView })));

function labelFor(t: Tab) {
  return t === 'compress' ? 'Compress Images' : t === 'split' ? 'Split Images' : t === 'pdf' ? 'PDF to Images' : t === 'chains' ? 'Tool Chains' : 'Job History';
}
function keyFor(t: Tab) {
  return String((['compress', 'split', 'pdf', 'chains', 'jobs'] as Tab[]).indexOf(t) + 1);
}

const App: React.FC = () => {
  const [tab, setTab] = useState<Tab>('compress');
  useEffect(() => { document.title = `Image Utils — ${labelFor(tab)}`; }, [tab]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [query, setQuery] = useState('');
  // Keep visited tabs mounted to preserve their state
  const [mountedTabs, setMountedTabs] = useState<Set<Tab>>(() => new Set(['compress']));
  useEffect(() => {
    setMountedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, [tab]);
  const commands = useMemo(() => {
    const switchTo = (t: Tab) => ({ id: `tab-${t}`, label: `Switch: ${labelFor(t)}`, hint: keyFor(t), run: () => setTab(t) });
    return [
      switchTo('compress'),
      switchTo('split'),
      switchTo('pdf'),
      switchTo('chains'),
      switchTo('jobs'),
      { id: 'show-shortcuts', label: 'Show Keyboard Shortcuts', hint: '?', run: () => setShortcutsOpen(true) },
    ];
  }, []);
  const filtered = useMemo(() => commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase())), [commands, query]);
  const isElectron = typeof window !== 'undefined' && (window as any).appWindow;

  useEffect(() => {
    const isTextInput = (el: Element | null) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toLowerCase();
      const editable = (el as HTMLElement).isContentEditable;
      return editable || tag === 'input' || tag === 'textarea' || tag === 'select';
    };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      const lower = k.toLowerCase();
      const target = e.target as Element | null;
      // existing nav
      if ((e.metaKey || e.ctrlKey) && lower === 'k') { e.preventDefault(); setPaletteOpen(true); return; }
      if (lower >= '1' && lower <= '5') { const i = Number(lower) - 1; setTab((['compress', 'split', 'pdf', 'chains', 'jobs'] as Tab[])[i]); return; }
      if (lower === 'j') { setTab('jobs'); return; }

      // show shortcuts
      if (lower === '?') { e.preventDefault(); setShortcutsOpen(true); return; }
      if ((e.metaKey || e.ctrlKey) && lower === '/') { e.preventDefault(); setShortcutsOpen(true); return; }

      // actions that should not trigger while typing
      if (isTextInput(target)) return;

      // open file selector on Space
      if (k === ' ' || lower === ' ') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('ui:open-file-picker', { detail: { scope: tab } }));
        return;
      }
      // run on Enter
      if (lower === 'enter') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('ui:execute', { detail: { scope: tab } }));
        return;
      }
      // new/clear on Cmd/Ctrl+N
      if ((e.metaKey || e.ctrlKey) && lower === 'n') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('ui:new', { detail: { scope: tab } }));
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tab]);
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
            <div className="mt-2" />
            <Button 
              onClick={() => setShortcutsOpen(true)} 
              className="w-full justify-between h-9" 
              variant="outline"
              size="sm"
            >
              <span className="text-sm">Keyboard Shortcuts</span>
              <Kbd>?</Kbd>
            </Button>
          </div>
        </aside>
        <main className="p-6 space-y-6 overflow-y-auto">
          <HeaderBar title={labelFor(tab)} onOpenPalette={() => setPaletteOpen(true)} />
          <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
            <div className="space-y-6">
              {mountedTabs.has('compress') && (
                <div key="compress" className={tab === 'compress' ? '' : 'hidden'}>
                  <CompressView />
                </div>
              )}
              {mountedTabs.has('split') && (
                <div key="split" className={tab === 'split' ? '' : 'hidden'}>
                  <SplitView />
                </div>
              )}
              {mountedTabs.has('pdf') && (
                <div key="pdf" className={tab === 'pdf' ? '' : 'hidden'}>
                  <PdfView />
                </div>
              )}
              {mountedTabs.has('chains') && (
                <div key="chains" className={tab === 'chains' ? '' : 'hidden'}>
                  <ChainsView />
                </div>
              )}
              {mountedTabs.has('jobs') && (
                <div key="jobs" className={tab === 'jobs' ? '' : 'hidden'}>
                  <JobsView />
                </div>
              )}
            </div>
          </Suspense>
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

      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}

export default App;
