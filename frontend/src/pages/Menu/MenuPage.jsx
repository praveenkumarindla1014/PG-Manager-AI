import React, { useEffect, useMemo, useState } from 'react';
import { UtensilsCrossed, Pencil, Plus, Trash2, Sparkles, Loader2, Flame, Salad, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApi, useToast } from '../../context/AppContext';
import { api } from '../../services/api';
import { PageHeader, Card, Badge, Modal, EmptyState, Skeleton } from '../../components/ui';
import { HBars, DonutChart } from '../../components/ui/Charts';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MEALS = [
  { key: 'breakfast', label: 'Breakfast', emoji: '🍳', start: 7, end: 10 },
  { key: 'lunch', label: 'Lunch', emoji: '🍛', start: 12, end: 15 },
  { key: 'snacks', label: 'Evening snacks', emoji: '☕', start: 16, end: 18 },
  { key: 'dinner', label: 'Dinner', emoji: '🍽️', start: 19, end: 22 }
];
const TARGETS = { calories: 2000, protein: 60, carbs: 275, fat: 70 };
const QUICK_GOALS = ['High protein', 'Weight loss', 'Diabetic friendly', 'Gym bulking', 'Light dinner'];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function totalsOf(menu) {
  const t = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const m of MEALS) {
    for (const it of menu?.[m.key]?.items || []) {
      for (const k of Object.keys(t)) t[k] += Number(it.nutrition?.[k]) || 0;
    }
  }
  return t;
}

function currentMeal() {
  const h = new Date().getHours();
  return MEALS.find(m => h >= m.start && h < m.end)?.key;
}

export default function MenuPage() {
  const { isOwner } = useAuth();
  const toast = useToast();
  const { data, loading, reload } = useApi('/menu/week', { transform: (r) => ({ week: r.data, today: r.today }) });
  const [day, setDay] = useState(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (data?.today && !day) setDay(data.today);
  }, [data, day]);

  const selected = data?.week?.find(w => w.day === day)?.menu;
  const isToday = day === data?.today;
  const nowMeal = isToday ? currentMeal() : null;
  const totals = useMemo(() => totalsOf(selected), [selected]);

  return (
    <div className="page">
      <PageHeader
        title="Food menu"
        subtitle="What's cooking this week — with nutrition for every meal"
        actions={isOwner && selected && (
          <button className="btn btn-primary" onClick={() => setEditing(true)}><Pencil size={16} />Edit {cap(day || '')}'s menu</button>
        )}
      />

      <div className="row wrap" style={{ gap: 8 }}>
        {DAYS.map(d => (
          <button key={d} className={`chip ${day === d ? 'active' : ''}`} onClick={() => setDay(d)}>
            {cap(d).slice(0, 3)}
            {d === data?.today && <span className="badge tone-brand" style={{ height: 18, padding: '0 6px' }}>Today</span>}
          </button>
        ))}
        {selected?.isDefault && <Badge tone="neutral" className="right">Default menu</Badge>}
      </div>

      {loading ? (
        <div className="grid-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} height={220} style={{ borderRadius: 18 }} />)}</div>
      ) : !selected ? (
        <Card><EmptyState icon={UtensilsCrossed} title="No menu for this day" message={isOwner ? 'Add one with the Edit button.' : 'The kitchen hasn\'t published this day yet.'} /></Card>
      ) : (
        <>
          <div className="grid-4">
            {MEALS.map(m => {
              const meal = selected[m.key] || {};
              const kcal = (meal.items || []).reduce((s, i) => s + (Number(i.nutrition?.calories) || 0), 0);
              const live = nowMeal === m.key;
              return (
                <div key={m.key} className="card card-pad stack" style={live ? { borderColor: 'var(--brand)', boxShadow: 'var(--ring)' } : undefined}>
                  <div className="row between">
                    <div className="row-sm">
                      <span style={{ fontSize: '1.5rem' }}>{m.emoji}</span>
                      <span className="bold">{m.label}</span>
                    </div>
                    {live && <Badge tone="brand" dot>Serving now</Badge>}
                  </div>
                  <div className="tiny faint row-sm"><Clock size={12} />{meal.timing || '—'}</div>
                  <div className="stack-sm grow">
                    {(meal.items || []).length === 0 && <span className="small faint">Nothing listed</span>}
                    {(meal.items || []).map((it, i) => (
                      <div key={i} className="row" style={{ alignItems: 'flex-start' }}>
                        <span title={it.isVeg === false ? 'Non-veg' : 'Veg'} style={{ marginTop: 5, width: 10, height: 10, borderRadius: 2, flexShrink: 0, border: `1.5px solid ${it.isVeg === false ? 'var(--danger)' : 'var(--success)'}`, display: 'grid', placeItems: 'center' }}>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: it.isVeg === false ? 'var(--danger)' : 'var(--success)' }} />
                        </span>
                        <div className="grow">
                          <div className="small bold">{it.name}</div>
                          {it.nutrition?.calories ? <div className="tiny faint">{it.nutrition.calories} kcal · {it.nutrition.protein || 0}g protein</div> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="divider" />
                  <div className="row between small"><span className="muted row-sm"><Flame size={13} />Meal total</span><span className="bold">{Math.round(kcal)} kcal</span></div>
                </div>
              );
            })}
          </div>

          <div className="grid-2">
            <Card title="Daily nutrition" icon={Salad} subtitle="Compared with a typical adult daily target">
              <div className="stack-lg">
                <HBars items={[
                  { label: 'Calories', value: Math.round(totals.calories), max: TARGETS.calories, display: `${Math.round(totals.calories)} / ${TARGETS.calories} kcal`, color: 'var(--brand)' },
                  { label: 'Protein', value: Math.round(totals.protein), max: TARGETS.protein, display: `${Math.round(totals.protein)} / ${TARGETS.protein} g`, color: 'var(--success)' },
                  { label: 'Carbs', value: Math.round(totals.carbs), max: TARGETS.carbs, display: `${Math.round(totals.carbs)} / ${TARGETS.carbs} g`, color: 'var(--warning)' },
                  { label: 'Fat', value: Math.round(totals.fat), max: TARGETS.fat, display: `${Math.round(totals.fat)} / ${TARGETS.fat} g`, color: 'var(--info)' }
                ]} />
                <DonutChart
                  centerValue={Math.round(totals.calories)}
                  centerLabel="kcal"
                  segments={[
                    { label: 'Protein', value: Math.round(totals.protein * 4), color: 'var(--success)', display: `${Math.round(totals.protein * 4)} kcal` },
                    { label: 'Carbs', value: Math.round(totals.carbs * 4), color: 'var(--warning)', display: `${Math.round(totals.carbs * 4)} kcal` },
                    { label: 'Fat', value: Math.round(totals.fat * 9), color: 'var(--info)', display: `${Math.round(totals.fat * 9)} kcal` }
                  ]}
                />
              </div>
            </Card>
            <DietAdvisor toast={toast} />
          </div>
        </>
      )}

      {editing && selected && (
        <EditMenuModal
          day={day}
          menu={selected}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); toast(`${cap(day)}'s menu saved`); reload({ silent: true }); }}
          toast={toast}
        />
      )}
    </div>
  );
}

function DietAdvisor({ toast }) {
  const [need, setNeed] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const ask = async (goal) => {
    const q = (goal ?? need).trim();
    if (!q) return;
    setNeed(q);
    setBusy(true);
    setResult(null);
    try {
      const res = await api.post('/menu/recommend', { dietaryNeed: q });
      setResult(res.data);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="AI diet advisor" icon={Sparkles} subtitle="Get picks from today's menu for your goal">
      <div className="stack">
        <form className="row" onSubmit={e => { e.preventDefault(); ask(); }}>
          <input className="input grow" value={need} onChange={e => setNeed(e.target.value)} placeholder="e.g. I go to the gym and need more protein" />
          <button className="btn btn-primary" disabled={busy || !need.trim()}>{busy ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}Ask</button>
        </form>
        <div className="row wrap" style={{ gap: 6 }}>
          {QUICK_GOALS.map(g => <button key={g} className="chip" style={{ height: 28, fontSize: '0.76rem' }} onClick={() => ask(g)} disabled={busy}>{g}</button>)}
        </div>
        {busy && <div className="stack-sm"><Skeleton height={14} /><Skeleton height={14} width="80%" /><Skeleton height={14} width="60%" /></div>}
        {result && (
          <div className="stack">
            {(result.recommendations || []).map((r, i) => (
              <div key={i} className="card-soft" style={{ padding: 12 }}>
                <div className="row between"><span className="bold capitalize">{r.meal}</span></div>
                <div className="row wrap mt-1" style={{ gap: 6 }}>
                  {(r.recommended_items || []).map(x => <span key={x} className="feature-tag">{x}</span>)}
                </div>
                {r.reason && <p className="small muted mt-2">{r.reason}</p>}
              </div>
            ))}
            {result.generalAdvice && <div className="callout callout-brand small">{result.generalAdvice}</div>}
            {result.additionalSuggestions?.length > 0 && (
              <ul className="small muted" style={{ paddingLeft: 18 }}>
                {result.additionalSuggestions.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

const emptyItem = () => ({ name: '', isVeg: true, calories: '', protein: '' });

function EditMenuModal({ day, menu, onClose, onSaved, toast }) {
  const [form, setForm] = useState(() => Object.fromEntries(MEALS.map(m => [m.key, {
    timing: menu[m.key]?.timing || '',
    items: (menu[m.key]?.items || []).map(i => ({
      name: i.name,
      isVeg: i.isVeg !== false,
      calories: i.nutrition?.calories ?? '',
      protein: i.nutrition?.protein ?? '',
      carbs: i.nutrition?.carbs,
      fat: i.nutrition?.fat
    }))
  }])));
  const [saving, setSaving] = useState(false);

  const update = (meal, fn) => setForm(f => ({ ...f, [meal]: fn(f[meal]) }));
  const setItem = (meal, idx, patch) => update(meal, m => ({ ...m, items: m.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }));

  const save = async () => {
    setSaving(true);
    try {
      const body = { dayOfWeek: day };
      for (const m of MEALS) {
        body[m.key] = {
          timing: form[m.key].timing,
          items: form[m.key].items.filter(i => i.name.trim()).map(i => {
            const hasKcal = i.calories !== '' && i.calories !== null && i.calories !== undefined;
            return {
              name: i.name.trim(),
              isVeg: i.isVeg,
              nutrition: hasKcal
                ? { calories: Number(i.calories) || 0, protein: Number(i.protein) || 0, carbs: Number(i.carbs) || 0, fat: Number(i.fat) || 0 }
                : undefined
            };
          })
        };
      }
      await api.post('/menu', body);
      onSaved();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title={`Edit ${cap(day)}'s menu`}
      subtitle="Leave calories empty and AI will estimate nutrition for you."
      footer={<>
        <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving && <Loader2 size={16} className="spin" />}Save menu</button>
      </>}
    >
      <div className="stack-lg">
        {MEALS.map(m => (
          <div key={m.key} className="stack-sm">
            <div className="row between wrap">
              <span className="bold">{m.emoji} {m.label}</span>
              <input className="input" style={{ width: 200, height: 34 }} value={form[m.key].timing} placeholder="7:30 AM - 9:30 AM"
                onChange={e => update(m.key, x => ({ ...x, timing: e.target.value }))} />
            </div>
            {form[m.key].items.map((it, idx) => (
              <div key={idx} className="row" style={{ gap: 6 }}>
                <input className="input grow" style={{ height: 36 }} placeholder="Dish name" value={it.name} onChange={e => setItem(m.key, idx, { name: e.target.value })} />
                <label className="check tiny" title="Vegetarian"><input type="checkbox" checked={it.isVeg} onChange={e => setItem(m.key, idx, { isVeg: e.target.checked })} />Veg</label>
                <input className="input" style={{ width: 80, height: 36 }} type="number" min="0" placeholder="kcal" value={it.calories} onChange={e => setItem(m.key, idx, { calories: e.target.value })} />
                <input className="input" style={{ width: 80, height: 36 }} type="number" min="0" placeholder="protein g" value={it.protein} onChange={e => setItem(m.key, idx, { protein: e.target.value })} />
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => update(m.key, x => ({ ...x, items: x.items.filter((_, i) => i !== idx) }))} aria-label="Remove"><Trash2 size={15} /></button>
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => update(m.key, x => ({ ...x, items: [...x.items, emptyItem()] }))}><Plus size={14} />Add dish</button>
          </div>
        ))}
        <p className="hint">Saved menus repeat every week on this day.</p>
      </div>
    </Modal>
  );
}
