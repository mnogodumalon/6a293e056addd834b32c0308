import type { Buchungsuebersicht } from '@/types/app';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface BuchungsuebersichtViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Buchungsuebersicht | null;
  onEdit: (record: Buchungsuebersicht) => void;
}

export function BuchungsuebersichtViewDialog({ open, onClose, record, onEdit }: BuchungsuebersichtViewDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buchungsübersicht anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorname des Gastes</Label>
            <p className="text-sm">{record.fields.gast_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachname des Gastes</Label>
            <p className="text-sm">{record.fields.gast_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zimmernummer</Label>
            <p className="text-sm">{record.fields.zimmernummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anreisedatum</Label>
            <p className="text-sm">{formatDate(record.fields.anreise)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Abreisedatum</Label>
            <p className="text-sm">{formatDate(record.fields.abreise)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anzahl der Personen</Label>
            <p className="text-sm">{record.fields.anzahl_personen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Buchungsstatus</Label>
            <Badge variant="secondary">{record.fields.buchungsstatus?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hinweise</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.hinweise ?? '—'}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.BUCHUNGSUEBERSICHT} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}