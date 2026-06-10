import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/DatePicker';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6a293dfc0fbbb8ba791abca3';
const SUBMIT_PATH = `/rest/apps/${APP_ID}/records`;
const ALTCHA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';

async function submitPublicForm(fields: Record<string, unknown>, captchaToken: string) {
  const res = await fetch(`${PROXY_BASE}/api${SUBMIT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': captchaToken,
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Submission failed');
  }
  return res.json();
}


function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormBuchungsuebersicht() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLElement | null>(null);

  // Load the ALTCHA web component script once per page.
  useEffect(() => {
    if (document.querySelector(`script[src="${ALTCHA_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = ALTCHA_SCRIPT_SRC;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  function readCaptchaToken(): string | null {
    const el = captchaRef.current as any;
    if (!el) return null;
    return el.value || el.getAttribute('value') || null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = readCaptchaToken();
    if (!token) {
      setError('Bitte warte auf die Spam-Prüfung und versuche es erneut.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields), token);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Eingabe wurde erfolgreich übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            Weitere Eingabe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Buchungsübersicht — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="gast_vorname">Vorname des Gastes</Label>
            <Input
              id="gast_vorname"
              placeholder=""
              value={fields.gast_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, gast_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gast_nachname">Nachname des Gastes</Label>
            <Input
              id="gast_nachname"
              placeholder=""
              value={fields.gast_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, gast_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zimmernummer">Zimmernummer</Label>
            <Input
              id="zimmernummer"
              placeholder=""
              value={fields.zimmernummer ?? ''}
              onChange={e => setFields(f => ({ ...f, zimmernummer: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anreise">Anreisedatum</Label>
            <DatePicker
              id="anreise"
              placeholder=""
              mode="date"
              value={fields.anreise ?? null}
              onChange={v => setFields(f => ({ ...f, anreise: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="abreise">Abreisedatum</Label>
            <DatePicker
              id="abreise"
              placeholder=""
              mode="date"
              value={fields.abreise ?? null}
              onChange={v => setFields(f => ({ ...f, abreise: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anzahl_personen">Anzahl der Personen</Label>
            <Input
              id="anzahl_personen"
              type="number"
              step="any"
              min={0}
              placeholder=""
              value={fields.anzahl_personen ?? ''}
              onChange={e => { const n = e.target.value ? Math.max(0, Number(e.target.value)) : undefined; setFields(f => ({ ...f, anzahl_personen: n })); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="buchungsstatus">Buchungsstatus</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.buchungsstatus) === 'bestaetigt'}
                onClick={() => setFields(f => ({ ...f, buchungsstatus: (lookupKey(f.buchungsstatus) === 'bestaetigt' ? undefined : 'bestaetigt') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.buchungsstatus) === 'bestaetigt'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Bestätigt
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.buchungsstatus) === 'ausstehend'}
                onClick={() => setFields(f => ({ ...f, buchungsstatus: (lookupKey(f.buchungsstatus) === 'ausstehend' ? undefined : 'ausstehend') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.buchungsstatus) === 'ausstehend'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Ausstehend
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.buchungsstatus) === 'storniert'}
                onClick={() => setFields(f => ({ ...f, buchungsstatus: (lookupKey(f.buchungsstatus) === 'storniert' ? undefined : 'storniert') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.buchungsstatus) === 'storniert'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Storniert
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.buchungsstatus) === 'eingecheckt'}
                onClick={() => setFields(f => ({ ...f, buchungsstatus: (lookupKey(f.buchungsstatus) === 'eingecheckt' ? undefined : 'eingecheckt') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.buchungsstatus) === 'eingecheckt'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Eingecheckt
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.buchungsstatus) === 'ausgecheckt'}
                onClick={() => setFields(f => ({ ...f, buchungsstatus: (lookupKey(f.buchungsstatus) === 'ausgecheckt' ? undefined : 'ausgecheckt') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.buchungsstatus) === 'ausgecheckt'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Ausgecheckt
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hinweise">Hinweise</Label>
            <Textarea
              id="hinweise"
              placeholder=""
              value={fields.hinweise ?? ''}
              onChange={e => setFields(f => ({ ...f, hinweise: e.target.value }))}
              rows={3}
            />
          </div>

          <altcha-widget
            ref={captchaRef as any}
            challengeurl={`${PROXY_BASE}/api/_challenge?path=${encodeURIComponent(SUBMIT_PATH)}`}
            auto="onsubmit"
            hidefooter
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}
