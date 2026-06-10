import { useDashboardData } from '@/hooks/useDashboardData';
import type { Buchungsuebersicht } from '@/types/app';
import { LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { IconAlertCircle, IconTool, IconRefresh, IconCheck, IconPlus, IconPencil, IconTrash, IconCalendar, IconBed, IconUsers, IconClock, IconSearch, IconX } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatCard } from '@/components/StatCard';
import { CalendarWidget } from '@/components/widgets/CalendarWidget';
import type { CalendarEvent } from '@/components/widgets/CalendarWidget';
import { RecordOverlay, RecordHeader, RecordSection, RecordField } from '@/components/widgets/RecordView';
import { de } from 'date-fns/locale';
import { parseISO, differenceInDays } from 'date-fns';
import { BuchungsuebersichtDialog } from '@/components/dialogs/BuchungsuebersichtDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';

const APPGROUP_ID = '6a293e056addd834b32c0308';
const REPAIR_ENDPOINT = '/claude/build/repair';

const STATUS_COLORS: Record<string, string> = {
  bestaetigt: 'bg-blue-100 text-blue-800',
  ausstehend: 'bg-yellow-100 text-yellow-800',
  storniert: 'bg-red-100 text-red-800',
  eingecheckt: 'bg-green-100 text-green-800',
  ausgecheckt: 'bg-gray-100 text-gray-700',
};

const STATUS_TONES: Record<string, CalendarEvent['tone']> = {
  bestaetigt: 'primary',
  ausstehend: 'warning',
  storniert: 'destructive',
  eingecheckt: 'success',
  ausgecheckt: 'default',
};

function getStatusTone(b: Buchungsuebersicht): CalendarEvent['tone'] {
  const key = b.fields.buchungsstatus?.key ?? '';
  return STATUS_TONES[key] ?? 'default';
}

export default function DashboardOverview() {
  const {
    buchungsuebersicht,
    loading, error, fetchAll,
  } = useDashboardData();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Buchungsuebersicht | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Buchungsuebersicht | null>(null);
  const [overlayRecord, setOverlayRecord] = useState<Buchungsuebersicht | null>(null);
  const [tableSearch, setTableSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('alle');

  // KPI calculations
  const heute = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return buchungsuebersicht.filter(b => {
      const an = b.fields.anreise;
      const ab = b.fields.abreise;
      if (!an || !ab) return false;
      return an <= today && ab >= today;
    });
  }, [buchungsuebersicht]);

  const heuteAnreisen = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return buchungsuebersicht.filter(b => b.fields.anreise?.slice(0, 10) === today);
  }, [buchungsuebersicht]);

  const heuteAbreisen = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return buchungsuebersicht.filter(b => b.fields.abreise?.slice(0, 10) === today);
  }, [buchungsuebersicht]);

  const ausstehend = useMemo(() =>
    buchungsuebersicht.filter(b => b.fields.buchungsstatus?.key === 'ausstehend'),
    [buchungsuebersicht]
  );

  // Calendar events
  const calendarEvents = useMemo<CalendarEvent[]>(() =>
    buchungsuebersicht
      .filter(b => b.fields.anreise && b.fields.abreise)
      .map(b => ({
        id: b.record_id,
        start: b.fields.anreise!.slice(0, 10),
        end: b.fields.abreise!.slice(0, 10),
        allDay: true,
        title: `${b.fields.gast_vorname ?? ''} ${b.fields.gast_nachname ?? ''}`.trim() || 'Gast',
        subtitle: b.fields.zimmernummer ? `Zi. ${b.fields.zimmernummer}` : undefined,
        tone: getStatusTone(b),
      })),
    [buchungsuebersicht]
  );

  // Table data
  const filteredBuchungen = useMemo(() => {
    let list = [...buchungsuebersicht];
    if (statusFilter !== 'alle') {
      list = list.filter(b => b.fields.buchungsstatus?.key === statusFilter);
    }
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      list = list.filter(b =>
        (b.fields.gast_vorname ?? '').toLowerCase().includes(q) ||
        (b.fields.gast_nachname ?? '').toLowerCase().includes(q) ||
        (b.fields.zimmernummer ?? '').toLowerCase().includes(q)
      );
    }
    // Sort by anreise ascending
    list.sort((a, b) => (a.fields.anreise ?? '').localeCompare(b.fields.anreise ?? ''));
    return list;
  }, [buchungsuebersicht, statusFilter, tableSearch]);

  const handleEventClick = useCallback((ev: CalendarEvent) => {
    const found = buchungsuebersicht.find(b => b.record_id === ev.id);
    if (found) setOverlayRecord(found);
  }, [buchungsuebersicht]);

  const handleEmptyClick = useCallback((_date: Date) => {
    setEditRecord(null);
    setDialogOpen(true);
  }, []);

  const handleRangeCreate = useCallback((_start: Date, _end: Date) => {
    setEditRecord(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((b: Buchungsuebersicht) => {
    setEditRecord(b);
    setDialogOpen(true);
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteBuchungsuebersichtEntry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  };

  const getNights = (b: Buchungsuebersicht) => {
    if (!b.fields.anreise || !b.fields.abreise) return null;
    try {
      return differenceInDays(parseISO(b.fields.abreise), parseISO(b.fields.anreise));
    } catch { return null; }
  };

  const getRowHighlight = (b: Buchungsuebersicht) => {
    const today = new Date().toISOString().slice(0, 10);
    const an = b.fields.anreise?.slice(0, 10);
    const ab = b.fields.abreise?.slice(0, 10);
    if (an === today) return 'bg-blue-50';
    if (ab === today) return 'bg-orange-50';
    if (an && ab && an <= today && ab >= today) return 'bg-green-50/40';
    return '';
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Buchungsübersicht</h1>
          <p className="text-sm text-muted-foreground">{buchungsuebersicht.length} Buchungen gesamt</p>
        </div>
        <Button onClick={() => { setEditRecord(null); setDialogOpen(true); }} size="sm">
          <IconPlus size={16} className="mr-1.5 shrink-0" />
          Neue Buchung
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Aktuell belegt"
          value={String(heute.length)}
          description="Zimmer heute belegt"
          icon={<IconBed size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Anreisen heute"
          value={String(heuteAnreisen.length)}
          description="Gäste kommen heute an"
          icon={<IconCalendar size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Abreisen heute"
          value={String(heuteAbreisen.length)}
          description="Gäste reisen heute ab"
          icon={<IconClock size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Ausstehend"
          value={String(ausstehend.length)}
          description="Bestätigung erforderlich"
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Calendar */}
      <div className="rounded-2xl overflow-hidden border border-border">
        <CalendarWidget
          events={calendarEvents}
          locale={de}
          defaultView="month"
          views={['month', 'week', 'agenda']}
          onEventClick={handleEventClick}
          onEmptyClick={handleEmptyClick}
          onRangeCreate={handleRangeCreate}
        />
      </div>

      {/* Bookings Table */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border bg-secondary/30">
          <h2 className="font-semibold text-sm text-foreground">Alle Buchungen</h2>
          <div className="flex flex-wrap items-center gap-2">
            {/* Status filter */}
            <div className="flex flex-wrap gap-1">
              {[{ key: 'alle', label: 'Alle' }, ...LOOKUP_OPTIONS.buchungsuebersicht.buchungsstatus].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setStatusFilter(opt.key)}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                    statusFilter === opt.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {/* Search */}
            <div className="relative">
              <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
              <Input
                value={tableSearch}
                onChange={e => setTableSearch(e.target.value)}
                placeholder="Suchen..."
                className="pl-7 h-7 text-xs w-40"
              />
              {tableSearch && (
                <button onClick={() => setTableSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <IconX size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/20">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Gast</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Zimmer</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Anreise</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Abreise</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Nächte</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Personen</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filteredBuchungen.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Keine Buchungen gefunden
                  </td>
                </tr>
              )}
              {filteredBuchungen.map(b => {
                const nights = getNights(b);
                const highlight = getRowHighlight(b);
                const statusKey = b.fields.buchungsstatus?.key ?? '';
                return (
                  <tr
                    key={b.record_id}
                    className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer ${highlight}`}
                    onClick={() => setOverlayRecord(b)}
                  >
                    <td className="px-4 py-2.5">
                      <span className="font-medium truncate max-w-[140px] block">
                        {[b.fields.gast_vorname, b.fields.gast_nachname].filter(Boolean).join(' ') || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {b.fields.zimmernummer ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className={b.fields.anreise?.slice(0,10) === new Date().toISOString().slice(0,10) ? 'font-semibold text-blue-700' : ''}>
                        {formatDate(b.fields.anreise)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className={b.fields.abreise?.slice(0,10) === new Date().toISOString().slice(0,10) ? 'font-semibold text-orange-700' : ''}>
                        {formatDate(b.fields.abreise)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-center">
                      {nights !== null ? nights : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-center text-muted-foreground">
                      {b.fields.anzahl_personen ?? '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      {b.fields.buchungsstatus ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[statusKey] ?? 'bg-gray-100 text-gray-700'}`}>
                          {b.fields.buchungsstatus.label}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEdit(b)}
                        >
                          <IconPencil size={14} className="shrink-0" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(b)}
                        >
                          <IconTrash size={14} className="shrink-0" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredBuchungen.length > 0 && (
          <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border bg-secondary/10">
            {filteredBuchungen.length} {filteredBuchungen.length === 1 ? 'Buchung' : 'Buchungen'}
            {statusFilter !== 'alle' && ` · Filter: ${LOOKUP_OPTIONS.buchungsuebersicht.buchungsstatus.find(o => o.key === statusFilter)?.label}`}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <BuchungsuebersichtDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); }}
        onSubmit={async (fields) => {
          if (editRecord) {
            await LivingAppsService.updateBuchungsuebersichtEntry(editRecord.record_id, fields);
          } else {
            await LivingAppsService.createBuchungsuebersichtEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editRecord?.fields}
        recordId={editRecord?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Buchungsuebersicht']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Buchungsuebersicht']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Buchung löschen"
        description={`Buchung von ${[deleteTarget?.fields.gast_vorname, deleteTarget?.fields.gast_nachname].filter(Boolean).join(' ') || 'diesem Gast'} wirklich löschen?`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {overlayRecord && (
        <RecordOverlay
          open={!!overlayRecord}
          onClose={() => setOverlayRecord(null)}
          onEdit={() => { handleEdit(overlayRecord); setOverlayRecord(null); }}
        >
          <RecordHeader
            title={[overlayRecord.fields.gast_vorname, overlayRecord.fields.gast_nachname].filter(Boolean).join(' ') || 'Gast'}
            subtitle={overlayRecord.fields.zimmernummer ? `Zimmer ${overlayRecord.fields.zimmernummer}` : undefined}
            badges={overlayRecord.fields.buchungsstatus ? (
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[overlayRecord.fields.buchungsstatus.key] ?? 'bg-gray-100 text-gray-700'}`}>
                {overlayRecord.fields.buchungsstatus.label}
              </span>
            ) : undefined}
          />
          <RecordSection title="Aufenthalt" cols={2}>
            <RecordField label="Anreise" value={formatDate(overlayRecord.fields.anreise)} />
            <RecordField label="Abreise" value={formatDate(overlayRecord.fields.abreise)} />
            <RecordField label="Nächte" value={getNights(overlayRecord) !== null ? String(getNights(overlayRecord)) : '—'} />
            <RecordField label="Personen" value={overlayRecord.fields.anzahl_personen !== undefined ? String(overlayRecord.fields.anzahl_personen) : '—'} />
          </RecordSection>
          {overlayRecord.fields.hinweise && (
            <RecordSection title="Hinweise">
              <RecordField label="" value={overlayRecord.fields.hinweise} />
            </RecordSection>
          )}
        </RecordOverlay>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
