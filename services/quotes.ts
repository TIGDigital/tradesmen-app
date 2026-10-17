import { notifyCounterparty } from '@/services/projects';
import { supabase } from '@/services/supabase';

/**
 * Itemised quotes (Sprint 53). A quote is composed and sent in one step;
 * the customer approves or declines in-app via the decide_quote RPC, which
 * atomically feeds the agreed price + audit trail server-side.
 */

export type QuoteStatus = 'sent' | 'approved' | 'rejected' | 'withdrawn';

export type QuoteItemInput = {
  description: string;
  qty: number;
  unit_price: number;
};

export type QuoteItem = QuoteItemInput & { id: string; sort_order: number };

export type Quote = {
  id: string;
  project_id: string;
  created_by: string;
  status: QuoteStatus;
  vat_registered: boolean;
  vat_rate: number;
  discount_amount: number;
  notes: string | null;
  pdf_document_id: string | null;
  subtotal: number;
  vat_amount: number;
  total: number;
  decided_at: string | null;
  response_note: string | null;
  created_at: string;
  items: QuoteItem[];
  creator: { full_name: string | null } | null;
};

/** Pure maths shared by the composer preview and the insert. */
export function quoteTotals(args: {
  items: QuoteItemInput[];
  vat_registered: boolean;
  vat_rate?: number;
  discount_amount: number;
}): { subtotal: number; vat_amount: number; total: number } {
  const rate = args.vat_rate ?? 20;
  const subtotal = args.items.reduce((sum, i) => sum + i.qty * i.unit_price, 0);
  const afterDiscount = Math.max(0, subtotal - args.discount_amount);
  const vat_amount = args.vat_registered ? round2(afterDiscount * (rate / 100)) : 0;
  return { subtotal: round2(subtotal), vat_amount, total: round2(afterDiscount + vat_amount) };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const QUOTE_SELECT = `
  id, project_id, created_by, status, vat_registered, vat_rate,
  discount_amount, notes, pdf_document_id, subtotal, vat_amount, total,
  decided_at, response_note, created_at,
  items:project_quote_items ( id, description, qty, unit_price, sort_order ),
  creator:profiles!project_quotes_created_by_fkey ( full_name )
`;

/**
 * Create + send a quote in one go. Inserts the quote, then its line items
 * (rolling the quote back if items fail), then pings the customer.
 */
export async function createAndSendQuote(args: {
  project_id: string;
  items: QuoteItemInput[];
  vat_registered: boolean;
  discount_amount: number;
  notes?: string;
  pdf_document_id?: string | null;
}): Promise<Quote> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const cleanItems = args.items
    .map((i) => ({ ...i, description: i.description.trim() }))
    .filter((i) => i.description.length > 0 && i.qty > 0);
  if (cleanItems.length === 0) throw new Error('Add at least one line to the quote');

  const totals = quoteTotals({
    items: cleanItems,
    vat_registered: args.vat_registered,
    discount_amount: args.discount_amount,
  });

  const { data: quote, error } = await supabase
    .from('project_quotes')
    .insert({
      project_id: args.project_id,
      created_by: user.id,
      vat_registered: args.vat_registered,
      discount_amount: args.discount_amount,
      notes: args.notes?.trim() || null,
      pdf_document_id: args.pdf_document_id ?? null,
      ...totals,
    })
    .select('id')
    .single();
  if (error) throw error;

  const { error: itemsErr } = await supabase.from('project_quote_items').insert(
    cleanItems.map((i, idx) => ({
      quote_id: quote.id,
      description: i.description,
      qty: i.qty,
      unit_price: i.unit_price,
      sort_order: idx,
    })),
  );
  if (itemsErr) {
    // Best-effort rollback so a half-made quote doesn't linger.
    await supabase.from('project_quotes').delete().eq('id', quote.id);
    throw itemsErr;
  }

  void notifyCounterparty({
    project_id: args.project_id,
    sender_id: user.id,
    title: 'New quote for you',
    body: `Quote for ${formatQuoteGbp(totals.total)} — tap to review and approve.`,
  });

  return fetchQuote(quote.id);
}

export async function fetchQuote(id: string): Promise<Quote> {
  const { data, error } = await supabase
    .from('project_quotes')
    .select(QUOTE_SELECT)
    .eq('id', id)
    .single();
  if (error) throw error;
  return normalise(data);
}

/** All quotes on a project, newest first. */
export async function fetchQuotes(project_id: string): Promise<Quote[]> {
  const { data, error } = await supabase
    .from('project_quotes')
    .select(QUOTE_SELECT)
    .eq('project_id', project_id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalise);
}

/** Customer approves or declines. Server-side RPC keeps price + audit honest. */
export async function decideQuote(args: {
  quote_id: string;
  approve: boolean;
  note?: string;
}): Promise<void> {
  const { error } = await supabase.rpc('decide_quote', {
    p_quote_id: args.quote_id,
    p_approve: args.approve,
    p_note: args.note?.trim() || undefined,
  });
  if (error) throw new Error(error.message);

  // Ping the tradesman — fire-and-forget, mirrors the send direction.
  const { data: { user } } = await supabase.auth.getUser();
  const { data: quote } = await supabase
    .from('project_quotes')
    .select('project_id, total')
    .eq('id', args.quote_id)
    .single();
  if (user && quote) {
    void notifyCounterparty({
      project_id: quote.project_id,
      sender_id: user.id,
      title: args.approve ? 'Quote approved ✓' : 'Quote declined',
      body: args.approve
        ? `${formatQuoteGbp(quote.total)} is now the agreed price.`
        : 'Tap to see their note and send a revised quote.',
    });
  }
}

/** Tradesman withdraws a sent quote (e.g. priced wrong). */
export async function withdrawQuote(id: string): Promise<void> {
  const { error } = await supabase
    .from('project_quotes')
    .update({ status: 'withdrawn' })
    .eq('id', id)
    .eq('status', 'sent');
  if (error) throw error;
}

function formatQuoteGbp(n: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalise(row: any): Quote {
  return {
    ...row,
    items: [...(row.items ?? [])].sort(
      (a: QuoteItem, b: QuoteItem) => a.sort_order - b.sort_order,
    ),
  } as Quote;
}
