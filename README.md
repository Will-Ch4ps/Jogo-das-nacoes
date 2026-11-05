# Jogo das Nações

Jogo de negociação entre países para aula a distância. Os alunos acompanham pelo celular e o professor registra tudo no admin. As regras estão em [Regras simples.md](Regras%20simples.md).

## Como as peças se conectam

```
Alunos e professor  →  Site no Vercel (pasta site)  →  Supabase, pelas funções jn_*
Computador do professor, só para configurar  →  conexão direta com o banco (.env)
```

O site é estático: não tem build nem servidor próprio. Cada envio para a branch `main` publica uma nova versão no Vercel.

## Variáveis

**No Vercel: nenhuma.** O endereço do Supabase e a chave pública ficam em [site/js/config.js](site/js/config.js). Essa chave foi feita para ficar no navegador: quem protege os dados são as regras do banco e a senha do admin.

**No arquivo `.env`, só no seu computador e nunca no Git** (modelo em [.env.example](.env.example)):

| Variável | Para que serve | Onde encontrar |
| --- | --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` | Endereço do banco, usado só pelos comandos abaixo | Supabase, botão **Connect** |
| `DB_PASSWORD` | Senha do banco | Supabase, **Project Settings → Database** |
| `SENHA_ADMIN` | Senha para entrar no admin do jogo | Você escolhe (mínimo de 10 caracteres) |

Nunca coloque `DB_PASSWORD`, `SENHA_ADMIN` ou a chave `service_role` no Vercel, no `config.js` ou em qualquer arquivo do Git.

## Missões secretas

Ficam em `tools/missoes.privado.mjs`, que não vai para o Git nem para o site, porque os dois são públicos. Guarde uma cópia desse arquivo. Depois de editar, rode `npm run db:setup`: as missões vão para a área protegida do banco, e só o admin as recebe. As partidas já criadas continuam com as missões que tinham; use **Começar novo jogo** para pegar as novas.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run teste` | Abre a tela de teste, com celular, transmissão e admin lado a lado, sem tocar no banco |
| `npm run verificar -- https://seu-site.vercel.app` | Confere o site publicado, sem senha e sem mudar o jogo |
| `npm run db:setup` | Aplica `sql/setup.sql` no banco e define a senha do admin. Não apaga a partida |
| `npm run db:teste` | Testa o banco de ponta a ponta. **Apaga a partida atual**: não use durante a aula |
| `npm test` | Testa as regras |
| `npm run dados` | Gera de novo o mapa e os países em `site/js/dados.js` |
