# Memórias — diário e planeador de viagens

Diário de viagens com fotos, mapa, passaporte de carimbos, linha do tempo, lista de desejos,
álbum para imprimir e um planeador (roteiro, reservas, orçamento, mala).

Feito com [Lovable](https://lovable.dev) — TanStack Start, React, Tailwind CSS e Supabase.

## Onde ficam os dados

- **Sem conta:** tudo fica guardado só neste navegador (IndexedDB). Faz cópias de segurança
  no botão **Backup** — incluem as fotos.
- **Com conta:** tudo fica na nuvem (Supabase) e podes partilhar memórias por link. No Backup
  há um botão para copiar para a conta o que tinhas guardado sem sessão.

## Correr no computador

Precisas de Node.js. Faz duplo clique em `run.bat`, ou:

```sh
npm install
npm run dev
```

Outros comandos: `npm test`, `npm run lint`, `npm run build`.

## IA (opcional)

Para textos e sugestões de melhor qualidade, junta uma destas chaves ao `.env`:
`GEMINI_API_KEY`, `OPENAI_API_KEY` ou `GROQ_API_KEY`. Sem chave, a app tenta um serviço
gratuito (só texto) e, se não responder, deixa um rascunho simples — e diz-te qual foi o caso.

## Base de dados

As migrações estão em `drizzle/migrations`. A `0004_create_trips.sql` cria a tabela do
planeador na nuvem; até ser aplicada, o planeador com sessão iniciada mostra um aviso.
