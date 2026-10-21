import type { PackingItem } from "@/lib/types";

type Item = Omit<PackingItem, "id">;

const COLD =
  /pol[óo]nia|poland|isl[âa]ndia|iceland|noruega|norway|su[ée]cia|sweden|finl[âa]ndia|finland|lap[óo]nia|canad[áa]|alpes|alps|neve|snow|ski|inverno|winter/i;
const BEACH =
  /praia|beach|bali|tail[âa]ndia|thailand|caribe|caribbean|brasil|brazil|maldivas|cabo verde|algarve|ver[ãa]o|summer|tropical/i;

const BASE: Item[] = [
  { name: "Cartão de Cidadão ou passaporte", category: "documentos", packed: false },
  { name: "Cartão bancário e algum dinheiro", category: "documentos", packed: false },
  { name: "Carregador do telemóvel e powerbank", category: "eletronica", packed: false },
  { name: "Medicamentos habituais", category: "farmacia", packed: false },
  { name: "Escova e pasta de dentes", category: "farmacia", packed: false },
  { name: "Calçado confortável para caminhar", category: "roupa", packed: false },
];

/** A base packing list adapted to the destination's climate (from keywords in its name and dates). */
export function suggestPacking(destination: string, dates = ""): Item[] {
  const text = `${destination} ${dates}`;
  const list = [...BASE];
  if (!/portugal/i.test(destination)) {
    list.push(
      { name: "Adaptador de corrente universal", category: "eletronica", packed: false },
      {
        name: "Seguro de viagem / Cartão Europeu de Seguro de Doença",
        category: "documentos",
        packed: false,
      },
    );
  }
  if (COLD.test(text)) {
    list.push(
      { name: "Casaco quente e impermeável", category: "roupa", packed: false },
      { name: "Gorro, luvas e cachecol", category: "roupa", packed: false },
      { name: "Bálsamo labial e creme hidratante", category: "farmacia", packed: false },
    );
  } else if (BEACH.test(text)) {
    list.push(
      { name: "Fato de banho e toalha de praia", category: "roupa", packed: false },
      { name: "Protetor solar 50+", category: "farmacia", packed: false },
      { name: "Repelente de insetos", category: "farmacia", packed: false },
      { name: "Óculos de sol e chapéu", category: "roupa", packed: false },
    );
  } else {
    list.push({ name: "Casaco leve ou corta-vento", category: "roupa", packed: false });
  }
  return list;
}
