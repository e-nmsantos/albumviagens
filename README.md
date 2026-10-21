# Memórias — diário e planeador de viagens

Diário de viagens com fotos, mapa, passaporte de carimbos, linha do tempo, lista de desejos,
álbum para imprimir e um planeador (roteiro, reservas, orçamento, mala).

Feito com TanStack Start, React, Tailwind CSS e Supabase.

## Onde ficam os dados

- **Sem conta:** tudo fica guardado só neste navegador (IndexedDB). Faz cópias de segurança
  no botão **Backup** — incluem as fotos.
- **Com conta:** tudo fica na nuvem (Supabase) e podes partilhar memórias por link. No Backup
  há um botão para copiar para a conta o que tinhas guardado sem sessão.

## Correr no computador

Precisas de Node.js 22 ou mais recente.

1. Copia `.env.example` para `.env` e preenche-o (ver Supabase, abaixo).
2. Faz duplo clique em `run.bat`, ou:

```sh
npm install
npm run dev        # http://localhost:8080
```

Outros comandos: `npm test`, `npm run lint`, `npm run build` e depois `npm start` (servidor de produção).

## Supabase

1. Cria um projeto em [supabase.com](https://supabase.com).
2. Aplica as migrações de `supabase/migrations` — com a [Supabase CLI](https://supabase.com/docs/guides/cli)
   (`supabase link --project-ref <ref>` e `supabase db push`) ou colando os ficheiros, por ordem, no SQL Editor.
   Criam as tabelas, as regras de acesso e o bucket `photos`.
3. Em **Project Settings → API**, copia o URL e a *publishable key* para o `.env`.
4. Em **Authentication → URL Configuration**, junta o endereço da app (por ex. `http://localhost:8080`)
   aos *Redirect URLs*, para os emails de confirmação e de nova palavra-passe funcionarem.

Para mudar de projeto Supabase sem perder nada: entra na app antiga, **Backup → Descarregar cópia**;
depois entra na nova e **Backup → Restaurar**.

## Publicar

A app está em **https://memorias-tau.vercel.app** (Vercel, plano gratuito). O repositório está ligado
à Vercel: **cada `git push` para `main` publica a versão nova** em cerca de um minuto.

Para publicar à mão (sem passar pelo GitHub):

```sh
NITRO_PRESET=vercel npm run build
npx vercel deploy --prebuilt --prod
```

As variáveis de produção (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `GEMINI_API_KEY`) estão guardadas no projeto da Vercel.

## IA (opcional)

Para textos e sugestões de melhor qualidade, junta uma destas chaves ao `.env`:
`GEMINI_API_KEY`, `OPENAI_API_KEY` ou `GROQ_API_KEY`. Sem chave, a app tenta um serviço
gratuito (só texto) e, se não responder, deixa um rascunho simples — e diz-te qual foi o caso.
