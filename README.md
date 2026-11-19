# Campeonato Caseiro FIFA

App web para apresentar e acompanhar um campeonato caseiro de FIFA. A fase de grupos é todos contra todos e depois vem o mata-mata. Funciona 100% offline e salva tudo no `localStorage` do navegador.

Requisitos completos: [docs/PRD.md](docs/PRD.md).

## Rodar

```bash
npm install
npm run dev        # desenvolvimento → http://localhost:5173
# ou
npm run build      # gera dist/
npm run preview    # serve dist/ → http://localhost:4173
```

Outros comandos: `npm test` (testes da lógica do campeonato) e `npm run typecheck`.

## Adicionar uma liga

Copie a pasta baixada do football-logos.cc para `logos/`, sem renomear nada:

```
logos/spain-la-liga-2026-2027.football-logos.cc/
├── 128x128/*.png     ← obrigatório
├── 256x256/*.png     ← recomendado (card do próximo jogo)
├── *.svg             ← opcional: logo da liga
└── names.json        ← opcional: nomes com acento
```

Exemplo de `names.json`, em que só os times que precisam de correção são listados:

```json
{ "league": "La Liga", "teams": { "atletico-madrid": "Atlético de Madrid" } }
```

Depois de copiar, reinicie o `npm run dev` ou rode o `npm run build` de novo.

## Personalizar cores e fontes

Todas as cores, fontes e espessuras de borda ficam em [src/theme/theme.ts](src/theme/theme.ts). Por exemplo, a cor de destaque é `ACCENT` e as paletas dos temas dark e light ficam em `PALETTES`.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `src/data/catalog.ts` | descoberta das ligas e times em `logos/` (`import.meta.glob`) |
| `src/domain/` | regras puras: geração dos jogos, classificação e desempate, chaveamento, reducer do estado; com testes |
| `src/store/` | persistência no localStorage e contexto React |
| `src/screens/` | Inscrição, Formato do mata-mata, Painel (card da partida, classificação, jogos, chave) |
| `src/components/` | Carrossel, escudo, cabeçalho/menu, diálogo de confirmação, toggle |
