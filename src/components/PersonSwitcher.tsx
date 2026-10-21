import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, Users, ScanFace } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { personDataKey, clearFaceData } from '../db/people';

/** Dropdown next to the settings button for switching which supervised member the dashboard shows. */
export default function PersonSwitcher({ glass = false }: { glass?: boolean }) {
  const { people, user, selectPerson } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (people.length < 1) return null;
  const current = people.find(p => personDataKey(p) === user?.key);

  const buttonCls = glass
    ? 'flex items-center gap-1.5 bg-white/60 hover:bg-white border border-gray-200/50 rounded-full pl-3 pr-2.5 h-9 text-xs font-semibold text-gray-700 transition-all'
    : 'flex items-center gap-1.5 border border-[#E7ECE7] bg-white hover:bg-brevo-field rounded-full pl-3 pr-2.5 h-9 text-sm font-semibold text-[#15241D] transition-colors';

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} title="Switch user" className={buttonCls}>
        <Users className="w-4 h-4 text-[#4B5C53]" />
        <span className="max-w-[110px] truncate">{current?.display ?? 'Switch user'}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#8A9A8F] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 min-w-[180px] z-50 rounded-2xl border border-[#E7ECE7] bg-white shadow-lg p-1.5">
          <div className="px-3 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#8A9A8F]">Switch user</div>
          {people.map(p => {
            const active = personDataKey(p) === user?.key;
            return (
              <div key={p.id} className={`flex items-center rounded-xl transition-colors ${active ? 'bg-brevo-field' : 'hover:bg-brevo-field'}`}>
                <button
                  onClick={() => { selectPerson(p.id); setOpen(false); }}
                  className={`flex-1 min-w-0 flex items-center justify-between gap-3 px-3 py-2 text-sm text-left ${
                    active ? 'font-bold text-[#15241D]' : 'text-[#33493D]'
                  }`}
                >
                  <span className="truncate">{p.display}</span>
                  {active && <Check className="w-4 h-4 text-brevo-teal shrink-0" />}
                </button>
                <button
                  title={`Clear ${p.display}'s face data`}
                  onClick={async () => {
                    if (!window.confirm(`Delete the stored face data for ${p.display}? They will need to enrol again on the phone.`)) return;
                    const err = await clearFaceData(p.id);
                    window.alert(err ? `Could not clear face data: ${err}` : `${p.display}'s face data was cleared.`);
                  }}
                  className="p-2 mr-1 rounded-lg text-[#9AA89E] hover:text-brevo-danger hover:bg-white shrink-0"
                >
                  <ScanFace className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
