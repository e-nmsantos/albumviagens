import { dateOfDay, formatWeekday, formatWhen, tripDatesLabel } from "@/lib/dates";
import type { TripPlan } from "@/lib/trips";

/** The trip as a printable booklet; only visible when printing. */
export function TripPrintBook({ trip, urls }: { trip: TripPlan; urls: Record<string, string> }) {
  return (
    <section className="hidden bg-white p-8 text-stone-900 print:block">
      <div className="border-b border-stone-300 py-16 text-center">
        <p className="font-serif text-xs uppercase tracking-[0.4em] text-stone-500">
          Roteiro de viagem
        </p>
        <h1 className="mt-4 font-serif text-6xl italic">{trip.title}</h1>
        <p className="mt-3 font-serif text-lg text-stone-600">
          {trip.destination}
          {tripDatesLabel(trip) && ` · ${tripDatesLabel(trip)}`}
        </p>
      </div>

      <div className="mt-12 space-y-12">
        {trip.days.length > 0 && (
          <div>
            <h2 className="border-b border-stone-200 pb-2 font-serif text-3xl italic">Dia a dia</h2>
            <div className="mt-6 space-y-8">
              {trip.days.map((day) => (
                <div key={day.id} className="break-inside-avoid border-b border-stone-100 pb-6">
                  <span className="text-xs font-bold uppercase text-stone-400">
                    Dia {day.day_number}
                    {dateOfDay(trip, day.day_number) &&
                      ` · ${formatWeekday(dateOfDay(trip, day.day_number)!)}`}
                    {day.time && ` · ${day.time}`}
                  </span>
                  <h3 className="mt-1 font-serif text-2xl">{day.title}</h3>
                  <p className="mt-0.5 text-sm italic text-stone-600">{day.place}</p>
                  {day.notes && (
                    <p className="mt-2 text-sm leading-relaxed text-stone-700">{day.notes}</p>
                  )}
                  {day.photo && urls[day.photo] && (
                    <img
                      src={urls[day.photo]}
                      alt={day.title}
                      className="mt-4 max-h-72 w-full rounded-lg object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {trip.reservations.length > 0 && (
          <div className="break-before-page pt-8">
            <h2 className="border-b border-stone-200 pb-2 font-serif text-2xl italic">Reservas</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
              {trip.reservations.map((r) => (
                <div key={r.id} className="break-inside-avoid rounded border border-stone-200 p-3">
                  <strong>{r.title}</strong>
                  <p>
                    {formatWhen(r.date_start)}
                    {r.date_end && ` → ${formatWhen(r.date_end)}`}
                    {r.reference && ` · ${r.reference}`}
                  </p>
                  {r.location && <p>{r.location}</p>}
                  {r.details && <p className="text-stone-500">{r.details}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {trip.packing_list.length > 0 && (
          <div className="break-inside-avoid pt-8">
            <h2 className="border-b border-stone-200 pb-2 font-serif text-2xl italic">Mala</h2>
            <ul className="mt-4 columns-2 text-sm">
              {trip.packing_list.map((i) => (
                <li key={i.id}>
                  {i.packed ? "☑" : "☐"} {i.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
