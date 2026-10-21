// Countries by ISO code, recognised from the text of a place ("Mónaco, Mónaco" → MC).

/** ISO 3166 alpha-2 → numeric (the ids used by the world-atlas map), packed as "AD020AE784…". */
const TABLE =
  "AD020AE784AF004AG028AI660AL008AM051AO024AQ010AR032AS016AT040AU036AW533AX248AZ031BA070BB052BD050BE056" +
  "BF854BG100BH048BI108BJ204BL652BM060BN096BO068BQ535BR076BS044BT064BV074BW072BY112BZ084CA124CC166CD180" +
  "CF140CG178CH756CI384CK184CL152CM120CN156CO170CR188CU192CV132CW531CX162CY196CZ203DE276DJ262DK208DM212" +
  "DO214DZ012EC218EE233EG818EH732ER232ES724ET231FI246FJ242FK238FM583FO234FR250GA266GB826GD308GE268GF254" +
  "GG831GH288GI292GL304GM270GN324GP312GQ226GR300GS239GT320GU316GW624GY328HK344HM334HN340HR191HT332HU348" +
  "ID360IE372IL376IM833IN356IO086IQ368IR364IS352IT380JE832JM388JO400JP392KE404KG417KH116KI296KM174KN659" +
  "KP408KR410KW414KY136KZ398LA418LB422LC662LI438LK144LR430LS426LT440LU442LV428LY434MA504MC492MD498ME499" +
  "MF663MG450MH584MK807ML466MM104MN496MO446MP580MQ474MR478MS500MT470MU480MV462MW454MX484MY458MZ508NA516" +
  "NC540NE562NF574NG566NI558NL528NO578NP524NR520NU570NZ554OM512PA591PE604PF258PG598PH608PK586PL616PM666" +
  "PN612PR630PS275PT620PW585PY600QA634RE638RO642RS688RU643RW646SA682SB090SC690SD729SE752SG702SH654SI705" +
  "SJ744SK703SL694SM674SN686SO706SR740SS728ST678SV222SX534SY760SZ748TC796TD148TF260TG768TH764TJ762TK772" +
  "TL626TM795TN788TO776TR792TT780TV798TW158TZ834UA804UG800UM581US840UY858UZ860VA336VC670VE862VG092VI850" +
  "VN704VU548WF876WS882XK983YE887YT175ZA710ZM894ZW716";

const NUMERIC = new Map<string, string>();
for (let i = 0; i < TABLE.length; i += 5)
  NUMERIC.set(TABLE.slice(i, i + 2), TABLE.slice(i + 2, i + 5));

/** World-map id of a country code. */
export const numericOf = (alpha2: string) => NUMERIC.get(alpha2);

/** Countries too small to see on the world map: shown as a dot instead of a painted area. */
export const MICROSTATES = new Set(["MC", "VA", "SM", "AD", "LI", "MT", "SG", "BH", "MV", "LU"]);

/** Lower-case, no accents or punctuation — for comparing names. */
export const normalizeName = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Common ways of writing a country that the official names don't cover.
const ALIASES: Record<string, string> = {
  holanda: "NL",
  eua: "US",
  usa: "US",
  "estados unidos da america": "US",
  america: "US",
  inglaterra: "GB",
  escocia: "GB",
  "pais de gales": "GB",
  uk: "GB",
  "reino unido": "GB",
  "republica checa": "CZ",
  chequia: "CZ",
  "coreia do sul": "KR",
  "coreia do norte": "KP",
  russia: "RU",
  vaticano: "VA",
  "cidade do vaticano": "VA",
  "emirados arabes": "AE",
  "cabo verde": "CV",
  timor: "TL",
  macau: "MO",
};

let byName: Map<string, string> | null = null;
function names(): Map<string, string> {
  if (byName) return byName;
  byName = new Map(Object.entries(ALIASES));
  for (const locale of ["pt-PT", "pt-BR", "en"]) {
    const display = new Intl.DisplayNames([locale], { type: "region" });
    for (const code of NUMERIC.keys()) {
      const name = display.of(code);
      if (name && name !== code && !byName.has(normalizeName(name))) {
        byName.set(normalizeName(name), code);
      }
    }
  }
  return byName;
}

/** ISO alpha-2 code of the country a place names in its last part ("Nazaré, Portugal" → PT). */
export function countryCodeOf(place: string): string | undefined {
  const parts = place
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const last = parts[parts.length - 1];
  return last ? names().get(normalizeName(last)) : undefined;
}

/** The place without a repeated country: "Mónaco, Mónaco" → { place: "Mónaco", country: "" }. */
export function placeAndCountry(place: string): { place: string; country: string } {
  const parts = place
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const first = parts[0] ?? place;
  const country = parts.length > 1 ? parts[parts.length - 1]! : "";
  return normalizeName(first) === normalizeName(country)
    ? { place: first, country: "" }
    : { place: first, country };
}
