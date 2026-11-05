# Jogo das Nações — Regras e Mecânicas

Nov 4, 2026 · @William

## Ideia do jogo

Cada grupo governa um país fictício e, a cada rodada de 15 minutos, precisa sustentar a população, cuidar das áreas que fazem um país funcionar e negociar com os outros. Vence quem terminar com a economia mais forte.

Este documento descreve as regras e também o que o sistema precisa fazer, para servir de base na construção das telas. Os países em si ficam em outro documento.

O jogo tem três camadas, que o professor liga aos poucos durante a aula:

| Camada | O que contém | Quando entra |
| --- | --- | --- |
| Economia | moedas, população, ganho, custo de alimentar, desemprego | Rodada 1 |
| Áreas | segurança, tecnologia, inovação, saúde, educação, infraestrutura, poder militar e estabilidade, cada uma com um nível | Rodada 3 |
| Mundo | acordos, notícias, dado e ações arriscadas, eventos ocultos | A partir da rodada 4 |

Todos os grupos e o professor usam **uma tela pública única**, que mostra os países, os acordos e as notícias. Só o professor tem a **tela de administração**: ele muda variáveis, registra acordos, publica notícias e rola o dado. Os grupos ficam nas suas salas e só procuram o professor para fazer um acordo, uma ação ou pedir uma notícia.

Cada país tem de 5 a 7 alunos, sem papéis individuais: cada pessoa pode acompanhar uma área diferente, mas a decisão é do grupo. O jogo roda só com conversa, decisão, dado e conta simples, sem uso de IA pelos alunos.

## Como uma rodada funciona

Uma rodada dura cerca de 15 minutos: 13 para situação, decisões e negociação e 2 para o fechamento automático.

1. **Situação (1 min).** A tela pública mostra o placar, os níveis de cada país e as notícias novas.
2. **Decisões e negociação (12 min).** Cada grupo discute na sua sala. Quando quer fazer algo que depende do professor, um ou dois representantes falam com ele, que registra na hora na tela de administração. Em acordos, vai pelo menos um representante de cada país envolvido.
3. **Fechamento (2 min).** O professor fecha a rodada e o sistema calcula tudo de uma vez, publica o resumo e as notícias automáticas e atualiza o placar.

### O que conta como ação

Cada país tem até **2 ações por rodada**. O controle é do professor, sem trava no sistema. São ações:

- mexer no dinheiro das áreas (colocar ou retirar, em quantas áreas quiser, conta como uma ação);
- propor ou assinar um acordo;
- tentar uma ação arriscada ou uma ação contra outro país;
- pedir a publicação de uma notícia.

O limite força o grupo a escolher o que importa mais naquela rodada.

### O que o sistema faz sozinho no fechamento

Para cada país, ele calcula a receita, cobra o custo de alimentar, aplica fome ou crescimento, atualiza os níveis das áreas, desconta a duração dos acordos e recalcula o placar. A ordem exata está na seção “Ordem do fechamento e parâmetros”. O núcleo da conta é:

```latex
\text{saldo} = \text{receita} - \text{custo de alimentar}
```

```latex
\text{moedas novas} = \text{moedas atuais} + \text{saldo}
```

Se as moedas novas ficarem negativas, falta comida e a população encolhe. Se não, a população pode crescer.

## As variáveis do país

Todo país tem as mesmas variáveis; o que muda entre eles são os valores iniciais. Os exemplos deste documento usam um “país modelo”.

### Economia

| Variável | O que é | País modelo |
| --- | --- | --- |
| Moedas | Dinheiro em caixa. Paga a comida, os fundos das áreas e as trocas. | 50 |
| População (mil hab.) | Quantas pessoas vivem no país. Define o custo de alimentar e vale pontos no fim. | 100 |
| Ganho base (moedas por rodada) | O que o país produz por rodada se todos tiverem trabalho. | 150 |
| Desemprego (%) | Parte da população sem trabalho. Reduz o ganho. | 20 |
| Custo por mil hab. (moedas) | Quanto custa alimentar mil pessoas durante uma rodada. | 1 |
| Crescimento (% por rodada) | Quanto a população aumenta quando o país está bem alimentado. | 2 |

### Áreas

Cada país tem oito áreas. Todas têm um **nível de 0 a 150**. Sete delas recebem investimento e têm um **fundo** (moedas guardadas nela). A oitava, estabilidade, não recebe investimento direto.

| Área | O que representa | Nível inicial no país modelo |
| --- | --- | --- |
| Segurança | polícia, justiça e proteção contra crime | 60 |
| Tecnologia | produtividade, indústria e sistemas | 60 |
| Inovação | pesquisa e capacidade de se renovar | 60 |
| Saúde | hospitais, saneamento e prevenção | 60 |
| Educação | escolas, universidades e formação de trabalhadores | 60 |
| Infraestrutura | energia, transporte e logística | 60 |
| Poder militar | força para defender e para ameaçar | 60 |
| Estabilidade | confiança da população e do governo | 70 |

O que cada nível causa está na seção “Áreas, investimento e níveis”.

### Valores calculados

O sistema calcula estes valores e ninguém precisa digitá-los:

- **Receita:** o que o país ganha na rodada (ganho ajustado pelo desemprego, mais efeitos de áreas e acordos).
- **Custo de alimentar:** população × custo por mil hab., ajustado por infraestrutura e acordos.
- **Saldo:** receita menos custo de alimentar.
- **Reputação:** de −2 a +2, resume como os outros países enxergam este (ver “Notícias e reputação”).
- **Pontos:** a nota do país no placar.

Regra geral: as variáveis do país só mudam por decisões do grupo, acordos, ações com dado, eventos do professor e pelo cálculo de fechamento. O professor também pode alterar qualquer valor direto, em um país ou em todos de uma vez.

## Fome e população

A fome acontece quando as moedas do país ficam negativas depois de pagar a comida. Então o país perde habitantes; caso contrário, a população cresce.

**País alimentado.** Com as moedas em zero ou mais, a comida está paga e a população cresce pelo percentual de crescimento. No país modelo, 100 mil habitantes com 2% passam a 102 mil.

**País com fome.** Se o saldo da rodada não cobre o custo e as moedas em caixa também não, o que faltou pagar vira perda de população:

```latex
\text{perda} = \text{população} \times \frac{\text{moedas que faltaram}}{\text{custo de alimentar}} \times 20\%
```

Exemplo: o país modelo tem 30 moedas, recebe 60 e precisa pagar 100. Faltam 10 moedas, ou seja, 10% do custo. A perda é 100 × 10% × 20% = 2 mil habitantes, e o país termina a rodada com 98 mil e zero moedas.

O 20% é a perda máxima numa rodada, quando nada da comida foi paga. Esse percentual é um parâmetro que o professor pode mudar para deixar o jogo mais leve ou mais duro.

### O tamanho do país muda o efeito

O custo e a perda crescem junto com a população. Um país grande vale mais pontos, mas precisa de mais moedas por rodada e perde mais gente quando falha.

| População (mil) | Custo por rodada | Perda se faltar 10% | Perda se faltar 50% | Perda se faltar tudo |
| --- | --- | --- | --- | --- |
| 50 | 50 | 1 | 5 | 10 |
| 100 | 100 | 2 | 10 | 20 |
| 200 | 200 | 4 | 20 | 40 |

As contas usam custo de 1 moeda por mil habitantes. Se o custo for maior (um país de alimentos caros, por exemplo), todos os valores de custo sobem na mesma proporção.

## Desemprego e produção

O desemprego não muda o custo da comida, só o quanto o país produz: cada ponto percentual de desemprego tira 1% do ganho base.

```latex
\text{produção} = \text{ganho base} \times \left(1 - \frac{\text{desemprego}}{100}\right)
```

No país modelo (ganho base 150, custo de alimentar 100), o desemprego decide se sobra ou falta dinheiro:

| Desemprego | Produção | Saldo da rodada |
| --- | --- | --- |
| 0% | 150 | +50 |
| 10% | 135 | +35 |
| 20% | 120 | +20 |
| 30% | 105 | +5 |
| 40% | 90 | −10 |

A cadeia completa é: desemprego sobe, produção cai, o saldo fica negativo, as moedas acabam e a fome começa a tirar habitantes. Por isso o desemprego, mesmo sem mexer no custo da comida, pode levar um país à fome.

### Como o desemprego muda

O desemprego usado na conta soma o valor do país com o efeito da Educação (ver “Áreas, investimento e níveis”). O professor também ajusta o número com regras combinadas com a turma. Alguns exemplos de regras simples:

- Um projeto que emprega muita gente (indústria, construção) tira de 1 a 3 pontos de desemprego.
- Um acordo que abre um mercado novo para os produtos do país tira de 1 a 2 pontos.
- Um evento (greve, fechamento de fábrica, crise mundial) soma de 3 a 10 pontos.

Esses valores são sugestões de partida e podem ser mudados, desde que valham igual para todos os países.

## Áreas, investimento e níveis

O nível de uma área diz quão bem aquela parte do país funciona. Quando o nível cruza uma faixa, a área passa a ajudar ou prejudicar a economia, o dado ganha bônus e o sistema sugere uma notícia.

### Faixas

| Nível | Nome | Bônus no dado |
| --- | --- | --- |
| 0 a 24 | Crítico | +0 |
| 25 a 49 | Baixo | +0 |
| 50 a 99 | Médio | +1 |
| 100 a 124 | Alto | +2 |
| 125 a 150 | Excelente | +3 |

### O que cada área causa

| Área | Variável afetada | Abaixo de 50 | Abaixo de 25 | Acima de 100 |
| --- | --- | --- | --- | --- |
| Segurança | Moedas em caixa | Crime: perde 5% do caixa por rodada | Desordem: perde 10% do caixa | Ações ocultas contra o país têm −1 no dado |
| Tecnologia | Ganho | −3% do ganho | −6% do ganho | +5% do ganho |
| Inovação | Desgaste das outras áreas | Desgaste vai a 2 por rodada | Desgaste vai a 3 por rodada | Desgaste zero |
| Saúde | Crescimento | Cresce 1 ponto a menos | Epidemia: perde 2% da população e não cresce | Cresce 1 ponto a mais |
| Educação | Desemprego | +3 pontos | +6 pontos | −3 pontos |
| Infraestrutura | Custo de alimentar | +5% | +10% | −5% |
| Poder militar | Só o dado | Sem efeito direto | Sem efeito direto | Rola 3 dados em ataque aberto |
| Estabilidade | Receita | Protestos: −5% da receita | Crise política: −10% da receita | +3% da receita |

Efeitos em % da mesma variável se somam, e nenhum total reduz o ganho ou a receita em mais de 30%. Os efeitos são recalculados a cada fechamento a partir do nível atual e não alteram o valor base digitado do país.

### Como o investimento sobe o nível

Moedas colocadas numa área formam o fundo dela. O fundo fica guardado, conta pontos no placar e pode ser retirado quando o grupo quiser. A cada fechamento o nível muda assim:

```latex
F = \frac{\text{fundo}}{\text{população em centenas de mil}} \qquad \Delta\text{nível} = \frac{F}{10} - \text{desgaste}
```

O desgaste padrão é 1 ponto por rodada, e a variação por rodada fica limitada a ±5. Um fundo de F = 10 só mantém o nível, F = 30 sobe 2 por rodada e F = 60 sobe 5 (o máximo). Sem fundo, a área perde 1 por rodada.

O tamanho do país muda o custo: quanto mais gente, mais moedas são necessárias no fundo.

| População (mil) | Fundo para manter | Fundo para +2 por rodada | Fundo para +5 por rodada |
| --- | --- | --- | --- |
| 50 | 5 | 15 | 30 |
| 100 | 10 | 30 | 60 |
| 200 | 20 | 60 | 120 |

**Exemplo.** O país modelo (100 mil habitantes) põe 30 moedas em Educação. Cada rodada o nível sobe 30 ÷ 10 − 1 = 2, então em 5 rodadas vai de 60 a 70 e o fundo continua valendo 30 pontos.

### O peso de retirar

Retirar o fundo devolve as moedas na hora, mas tem preço. Sem fundo, a área volta a perder 1 ponto por rodada. Retirar mais da metade do fundo de uma vez causa um choque de confiança de −5 níveis imediatos. No exemplo acima, retirar as 30 moedas de Educação derruba o nível de 70 para 65 na hora e depois 1 por rodada. Se isso cruzar uma faixa, o sistema sugere a notícia correspondente.

### Estabilidade

Estabilidade não recebe fundo. Valores sugeridos de variação por rodada: −10 se faltou comida, −5 se o desemprego usado na conta passa de 25%, −10 para quem sofreu um ataque aberto, −5 para quem o fez e +2 se o país fechou com saldo positivo e sem fome. O professor também pode mudá-la por eventos.

### Níveis iniciais

Cada país começa com níveis entre 40 e 80, conforme o seu perfil, e fundos zerados. Um país com poder militar alto e saúde baixa, por exemplo, nasce forte em confrontos, mas frágil no crescimento.

## Notícias e reputação

As notícias dão sentido aos números: quando uma área cruza uma faixa, o sistema sugere uma manchete e o professor decide se publica, adapta ou segura. Todos veem as notícias publicadas na tela pública, e é por elas que os países percebem os problemas e as forças dos outros.

### Tipos de notícia

- **Automática:** o sistema cria um rascunho quando um nível passa de 50, 25 ou 100 (para cima ou para baixo). O professor publica, edita ou descarta.
- **Manual:** o professor escreve livremente, inclusive a pedido de um grupo que quer divulgar algo sobre si ou sobre outro país.
- **De ação ou acordo:** criada ao registrar uma ação aberta ou um acordo global.
- **Oculta:** rascunho guardado sem publicar, para revelar no fim do jogo.

Cada notícia tem título, texto, país de destino (ou global), rodada e estado (rascunho, agendada, publicada ou oculta). A notícia não aplica efeito numérico por si: os efeitos vêm das faixas, dos eventos e dos acordos.

### Manchetes sugeridas por faixa

| Área | Abaixo de 50 | Abaixo de 25 | Acima de 100 |
| --- | --- | --- | --- |
| Segurança | Crimes aumentam em \[País\] | Desordem toma as ruas de \[País\] | \[País\] vira referência em segurança |
| Tecnologia | \[País\] fica para trás na tecnologia | Fábricas de \[País\] param por falta de sistemas | \[País\] lidera a nova onda tecnológica |
| Inovação | Novos negócios de \[País\] não decolam | Fuga de pesquisadores de \[País\] | Laboratórios de \[País\] atraem investidores |
| Saúde | Hospitais de \[País\] ficam lotados | Epidemia avança em \[País\] | Sistema de saúde de \[País\] é elogiado |
| Educação | Escolas de \[País\] perdem alunos | Jovens de \[País\] saem sem preparação | Universidades de \[País\] viram destino mundial |
| Infraestrutura | Apagões e estradas ruins em \[País\] | Transporte de alimentos para em \[País\] | Obras de \[País\] ligam o país ao mundo |
| Poder militar | \[País\] é visto como vulnerável nas fronteiras | Fronteiras de \[País\] estão sem defesa | Exército de \[País\] impressiona vizinhos |
| Estabilidade | Protestos crescem em \[País\] | Governo de \[País\] entra em crise | \[País\] vive um momento de confiança |

### Reputação

A reputação resume como os outros países enxergam um país:

```latex
\text{reputação} = (\text{áreas acima de 100}) - (\text{áreas abaixo de 50}) \quad \text{limitada a } [-2,\,+2]
```

O valor aparece como um selo na tela pública e entra no dado de negociações incertas (ver “Dado e ações arriscadas”). Um país com tecnologia, inovação e segurança acima de 100 tem reputação +2 e chega à mesa de negociação em vantagem. Um país com duas áreas abaixo de 50 chega em desvantagem, e o professor pode pedir condições piores a ele nos acordos.

## Dado e ações arriscadas

O dado entra onde o resultado é incerto: uma negociação sem números prontos, um projeto ousado ou uma ação contra outro país. A regra é aberta para todos, e o investimento “vicia” o dado: quem investiu mais na área certa parte na frente, mas o acaso ainda decide.

### A rolagem

```latex
\text{total} = d6 + \text{bônus da área} \;(+\text{reputação, só em negociação})
```

O bônus (+0 a +3) vem da faixa em que a área está (ver “Áreas, investimento e níveis”). O professor escolhe a área conforme a ação:

| Ação | Área do bônus |
| --- | --- |
| Ataque aberto | Poder militar |
| Ataque tecnológico ou espionagem | Tecnologia |
| Defesa contra ação oculta | Segurança |
| Projeto ousado (nova indústria, pesquisa) | Inovação |
| Negociação incerta | A área mais ligada ao tema do acordo |

### Resultado de uma ação sem oponente

O professor define o efeito base antes de rolar. O resultado multiplica esse efeito:

| Rolagem | Resultado | Multiplica o efeito por |
| --- | --- | --- |
| 1 natural | Desastre | −1 (efeito contrário) |
| Total até 3 | Falha | 0 |
| Total 4 ou 5 | Parcial | 0,5 |
| Total 6 ou 7 | Sucesso | 1 |
| Total 8 ou mais, ou 6 natural | Total | 1,5 |

**Exemplo.** Um país com Tecnologia 110 (bônus +2) tenta um projeto de efeito base +10 níveis em Inovação. Se tirar 4, o total é 6 e o efeito é +10. Se tirar 2, o total é 4 e o efeito cai para +5. Se tirar 1, o projeto dá errado e custa −10. Se tirar 6, o efeito chega a +15.

### Confronto entre dois países

Quem age e quem sofre rolam, cada um com o bônus da sua área. O alvo, por estar em casa, soma +1. Empate vai para o alvo.

- Se o alvo vence ou empata, a ação falha e não tem efeito.
- Se quem age vence por 1 ou 2, o resultado é parcial (0,5). Por 3 ou 4, é sucesso (1). Por 5 ou mais, é total (1,5).

Antes de rolar, o professor define o prêmio: 10% das moedas em caixa do alvo (até 30), 3% da população do alvo passando para quem age, ou −10 níveis numa área do alvo. Ações ocultas custam 10 moedas a quem as faz, qualquer que seja o resultado.

**Exemplo.** O país A (Tecnologia 100, bônus +2) faz um ataque tecnológico contra B (Segurança 60, bônus +1, mais +1 em casa), com prêmio de 10% do caixa de B. A tira 4 e soma 6. B tira 3 e soma 5. A vence por 1, o resultado é parcial e A leva 5% do caixa de B. Com 80 moedas, são 4 moedas, e a operação custou 10 a A.

### Ataque aberto, estilo War

Para tomar um território à vista de todos. O número de dados depende do poder militar: 1 dado abaixo de 50, 2 dados de 50 a 99 e 3 dados de 100 para cima.

1. Os dois lados rolam seus dados e ordenam do maior para o menor.
2. Comparam par a par, na quantidade do lado que tem menos dados. O defensor soma +1 ao seu maior dado, e empate vai para o defensor.
3. Cada comparação perdida custa 5 de poder militar a quem perdeu.
4. O atacante leva o prêmio combinado só se vencer mais comparações do que perder. Empate nas comparações mantém o território com o defensor.

O ataque aberto vira notícia na hora. Quem atacou perde 5 de estabilidade e quem foi atacado perde 10.

**Exemplo.** O atacante (poder 100) rola 6, 4 e 2. O defensor (poder 60) rola 5 e 3, e o 5 vira 6 com o bônus de casa. Comparam-se dois pares: 6 contra 6 (empate, vence o defensor) e 4 contra 3 (vence o atacante). Cada lado ganhou uma, então o território fica com o defensor, e cada um perde 5 de poder militar.

### Aberta ou oculta

Toda ação é combinada em segredo com o professor, que decide se é aberta ou oculta.

- **Aberta** (tomar território, bloqueio, ameaça pública): vira notícia na hora e todos ficam sabendo.
- **Oculta** (ataque tecnológico, espionagem, sabotagem): só o alvo percebe o efeito nos números e ninguém sabe quem fez. No fim do jogo o professor conta tudo.

O sistema guarda um registro privado dessas ações, visível só na tela de administração: quem fez, contra quem, rolagens, resultado e efeito.

O conflito não é o centro do jogo, e as regras ficam curtas de propósito. O valor está na discussão final: o que cada país escolheu fazer quando ninguém estava olhando.

## Negociação e acordos

A negociação é onde um país muda as próprias variáveis usando os outros. Qualquer conversa entre grupos vale, mas só conta no jogo o que o professor transforma em número e registra.

### Como um combinado acontece

- Todo combinado passa pelo professor. Vai pelo menos um representante de cada país envolvido, e podem ser 2, 3, 4 ou mais países no mesmo acordo.
- O professor define os números com os representantes e confirma com todos os lados antes de registrar.
- Cada país tem até 2 ações por rodada, e um acordo conta como uma. O controle é do professor, sem trava no sistema.

### Tipos de combinado

- **Troca:** moedas passam de um país para outro na hora, uma só vez. Serve para ajuda, compra de favor ou pagamento por um acordo.
- **Acordo entre países:** uma lista de países, cada um com os seus efeitos, por um número de rodadas.
- **Acordo global:** vale para todos os países, como um pacto de comércio, um embargo ou uma crise mundial. Aparece numa lista à parte na tela pública.

### O que um acordo pode mudar

| Efeito | O que faz na conta | Quem mais ganha |
| --- | --- | --- |
| Ganho (%) | Aumenta ou reduz a produção depois do desemprego. Ex.: +10% sobre 100 = +10 moedas. | Países com ganho base alto |
| Desconto no custo (%) | Reduz o custo de alimentar. Ex.: 10% sobre 100 = 10 moedas a menos. | Países com muita população |
| Moedas por rodada | Soma ou subtrai um valor fixo na receita. Ex.: +8 por rodada. | Países pequenos, pois o valor pesa mais |
| Nível de uma área | Sobe ou desce a área por rodada, sem precisar de fundo. Ex.: +2 em Infraestrutura. | Países com a área baixa |
| Duração (rodadas) | Por quantas rodadas o efeito vale, ou até o fim do jogo. | — |

Um acordo guarda título, descrição livre (a história do combinado), países, efeitos de cada país, duração, rodada de início, estado (ativo ou encerrado) e se é público ou oculto. Efeitos de acordos diferentes se somam. Um acordo pode ter só texto, sem efeito automático, e o professor aplica o que combinaram à mão.

Quando o resultado depende do acaso, o professor usa a rolagem sem oponente (ver “Dado e ações arriscadas”), e o resultado multiplica os efeitos do acordo.

### Exemplo 1: energia solar por alimento mais barato

O país A (100 mil habitantes) e o país B fazem um acordo de 3 rodadas. B constrói usinas solares para A, e A abre o seu mercado de alimentos para B.

- Efeito para A: desconto de 10% no custo de alimentar. Com custo 100, são 10 moedas por rodada, 30 no total.
- Efeito para B: +8 moedas por rodada, 24 no total.

Nenhum dos dois paga nada na hora, e os dois fecham o acordo com ganho.

### Exemplo 2: ajuda para evitar a fome

O país B tem 100 mil habitantes e vai faltar 20 moedas para a comida. Sem ajuda, perde 100 × 20% × 20% = 4 mil habitantes, que valem 20 pontos no placar (4 × peso 5). O país A tem moedas sobrando e faz uma troca de 20 moedas para B.

B não perde habitantes e ainda cresce 2% na rodada. A perdeu 20 moedas, que também valem 20 pontos. Por isso A vai querer algo em troca, por exemplo um desconto de 10% no custo por 3 rodadas (30 moedas). A ajuda só vale a pena para A se o acordo pagar mais que isso.

### Exemplo 3: acordo global

Os países fecham um pacto de comércio mundial: ganho de +5% para todos por 4 rodadas. No país modelo (produção 120), são 6 moedas por rodada. O professor registra um único acordo global, e ele aparece na lista de acordos globais da tela pública.

### Exemplo 4: aliança de defesa

Três países combinam que, se um deles for atacado, os outros dois emprestam +1 ao dado de defesa. Não há efeito automático: o acordo é só texto e o professor aplica o bônus na rolagem quando acontecer.

### Regras do bom combinado

- Todo combinado tem números claros: quanto, para quem e por quantas rodadas.
- O professor confirma com os dois lados antes de registrar.
- Para o jogo não quebrar, o professor pode definir um teto, por exemplo no máximo 30% de desconto no custo somando todos os acordos de um país.

## Eventos ocultos

Módulo opcional: o professor tem uma lista de acontecimentos que os alunos não conhecem e os aplica em certas rodadas, mudando as mesmas variáveis do jogo. Isso cria surpresa sem criar regra nova.

Há dois tipos:

- **Eventos globais:** atingem todos os países ou um grupo deles, como uma crise mundial.
- **Desafios do país:** um problema só de um país, entregue em segredo ao grupo antes da rodada em que começa a valer, para ele decidir como reagir.

| Evento (exemplo genérico) | Variável que muda | Efeito sugerido |
| --- | --- | --- |
| Crise mundial | Ganho base de todos | −10% por 2 rodadas |
| Quebra de safra | Custo por mil habitantes | +20% por 2 rodadas |
| Greve geral | Desemprego | +5 pontos |
| Epidemia | População | −2% de uma vez |
| Descoberta de recurso | Moedas | +30 de uma vez |
| Boom tecnológico | Ganho base | +15% para quem tem Tecnologia acima de 100 |

O efeito de um evento depende do tamanho do país. Uma quebra de safra de +20% no custo cobra 20 moedas a mais de um país com 100 mil habitantes e 40 de um país com 200 mil. Uma epidemia de −2% tira 2 mil habitantes do primeiro e 4 mil do segundo.

Na tela pública, o aviso do evento fica sem números (“um choque atingiu a economia mundial”). Os grupos descobrem o tamanho do estrago olhando o próprio saldo e conversando com os outros países, o que dá assunto para novas negociações.

Se os alunos acharem o jogo difícil demais, o professor reduz os eventos. Se acharem fácil, aumenta a dose.

Eventos também podem mexer nos níveis das áreas, por exemplo −10 em Segurança de um país depois de um escândalo. Se o nível cruzar uma faixa, o sistema sugere a notícia correspondente.

## Pontuação e fim do jogo

A economia mais forte é a que soma mais pontos, e a pontuação mistura o que o país tem em caixa, o que investiu e quantas pessoas sustenta.

```latex
\text{pontos} = \text{moedas} + \text{moedas nos fundos das áreas} + \text{população (mil)} \times 5
```

O 5 é o peso da população. O professor pode mudar esse valor: um peso maior premia quem cresce e cuida das pessoas, um peso menor premia quem acumula moedas.

Com o peso em 5, os caminhos para vencer são parecidos em pontos, mas bem diferentes em estratégia:

| País | Moedas | Fundos das áreas | População (mil) | Pontos |
| --- | --- | --- | --- | --- |
| A, pequeno e investidor | 400 | 150 | 80 | 950 |
| B, grande e bem alimentado | 200 | 100 | 180 | 1.200 |
| C, guardador de moedas | 600 | 0 | 90 | 1.050 |

B vence sem ter quase moedas, porque a população vale mais que o caixa. Esse resultado dá uma boa discussão final sobre o que é “uma economia forte”.

**Fim do jogo.** O jogo acaba depois da última rodada combinada, que pode ser a 10ª ou a 12ª dependendo do tempo da aula. O professor avisa a turma duas rodadas antes, para ninguém ser pego de surpresa. Em caso de empate, vence o país com mais população.

A tela pública mostra o placar durante todo o jogo, com a posição de cada país e a variação desde a rodada anterior. O professor pode deixar o placar visível o tempo todo ou mostrá-lo só de vez em quando, para manter o suspense.

## Telas do sistema

O sistema tem duas telas: a **pública**, que todos veem, e a de **administração**, só do professor. As duas mostram os mesmos dados, atualizados em tempo real, de modo que o que o professor registra aparece na hora para todos.

### Tela pública (somente leitura)

Aberta por link, sem login. Serve para o professor compartilhar na reunião e para os alunos abrirem nos próprios aparelhos, no computador ou no celular. Conteúdo:

- **Topo:** número da rodada, cronômetro (controlado pelo professor) e uma mensagem de aviso opcional.
- **Países:** um cartão por país, com nome e cor, população, moedas, desemprego, as oito áreas como barras de 0 a 150 coloridas pela faixa (crítico, baixo, médio, alto, excelente), selo de reputação, pontos e acordos ativos do país.
- **Placar:** ranking com a variação desde a rodada anterior.
- **Acordos globais:** lista à parte, com título, efeito e rodadas restantes.
- **Acordos entre países:** lista dos acordos públicos, com título, países, efeitos e rodadas restantes.
- **Jornal:** notícias publicadas, da mais nova para a mais antiga, com filtro por país.
- **Resumo da última rodada:** o que mudou em cada país (moedas, população, faixas cruzadas).
- **Dado:** o último resultado rolado, quando o professor escolher exibir.

O professor escolhe quais campos ficam visíveis ou ocultos para os alunos, por exemplo esconder as moedas para criar mistério. Ações ocultas e notícias não publicadas nunca aparecem aqui.

### Tela de administração (só o professor)

Acesso por senha. Funções:

1. **Países:** criar (de 3 a 12), remover, renomear e editar qualquer variável, nível ou fundo.
2. **Mudança em massa:** aplicar numa variável de todos os países de uma vez (somar, definir ou variar em %), por exemplo para uma crise mundial.
3. **Fundos das áreas:** colocar ou retirar moedas de uma área de um país. O sistema avisa quando uma retirada vai causar o choque de confiança.
4. **Trocas e acordos:** formulário com países, efeitos de cada país, duração e visibilidade (público ou oculto). Permite encerrar, reativar e apagar.
5. **Notícias:** criar, editar, agendar, publicar e ocultar, com uma fila de rascunhos automáticos para revisar.
6. **Dado:** botão para rolar um d6 com campo de bônus. O professor escolhe país e área, e o sistema mostra o total, o resultado e o multiplicador. Pode exibir na tela pública e salvar no registro da ação.
7. **Ações:** registro de ações abertas e ocultas (quem, contra quem, tipo, rolagens, resultado, prêmio). As ocultas só aparecem aqui.
8. **Eventos:** lista de eventos preparados, com rodada prevista e um botão aplicar, que muda as variáveis e cria a notícia.
9. **Rodada:** iniciar e pausar o cronômetro, ver uma prévia do fechamento antes de confirmar, fechar a rodada e desfazer a última.
10. **Parâmetros e módulos:** ligar ou desligar as camadas do jogo e ajustar os parâmetros.
11. **Histórico e segurança:** registro de toda mudança (o que, quando, valor anterior), exportação e importação do estado completo como cópia de segurança e relatório final do jogo.

O limite de 2 ações por país é controlado pelo professor e não trava o sistema. Se for útil, a tela de administração pode mostrar um contador visual por país, sem bloquear nada.

### Dados que o sistema guarda

| Entidade | Campos principais |
| --- | --- |
| País | nome, cor, moedas, população, ganho base, desemprego, custo por mil, crescimento |
| Área | país, tipo (as oito), nível, fundo (estabilidade não tem fundo) |
| Acordo | título, descrição, tipo (entre países ou global), países, efeitos de cada país (ganho %, desconto %, moedas por rodada, nível de uma área), duração, rodadas restantes, estado, visibilidade, rodada de início |
| Troca | de, para, moedas, rodada, nota |
| Notícia | título, texto, país (ou global), rodada, estado, origem (automática, manual, ação ou acordo) |
| Ação | tipo (aberta, oculta ou sem oponente), autor, alvo, área do bônus, rolagens, resultado, prêmio, rodada, nota privada |
| Evento | nome, mudanças, rodada prevista, se já foi aplicado |
| Rodada | número, cópia completa do estado antes e depois, resumo |
| Parâmetros | os valores da seção seguinte |

Valores calculados (receita, custo, saldo, reputação, pontos) não precisam ser guardados, pois podem ser recalculados a qualquer momento.

## Ordem do fechamento e parâmetros

Ao fechar a rodada, o sistema faz os passos abaixo, nesta ordem, para cada país. Valores são guardados com uma casa decimal e mostrados arredondados.

1. Guardar uma cópia do estado atual, para poder desfazer a rodada.
2. Ler o nível de cada área e obter os efeitos de faixa (ver “Áreas, investimento e níveis”).
3. Somar os efeitos dos acordos ativos que incluem o país.
4. Calcular o desemprego usado: o desemprego do país mais o efeito de Educação, entre 0% e 100%.
5. Calcular a receita:

```latex
\text{receita} = \text{ganho base} \times \left(1 - \frac{\text{desemprego usado}}{100}\right) \times \left(1 + \frac{S}{100}\right) + \text{moedas fixas dos acordos}
```

S é a soma, em %, dos efeitos de Tecnologia, Estabilidade e acordos de ganho, nunca menor que −30.

6. Calcular o custo de alimentar:

```latex
\text{custo} = \text{população} \times \text{custo por mil} \times \left(1 + \frac{\text{infraestrutura} - \text{descontos de acordos}}{100}\right)
```

O custo não fica abaixo de zero, e o desconto total de acordos tem teto de 30%.

7. Aplicar a perda por crime (Segurança baixa): percentual do caixa que o país tinha no início da rodada.
8. Calcular o saldo (receita menos custo) e as moedas novas (moedas do início, menos crime, mais saldo).
9. Se as moedas novas forem negativas, aplicar a fome: a população perde população × (moedas que faltaram ÷ custo, no máximo 1) × perda máxima, e as moedas vão a zero. Se não, a população cresce pelo crescimento do país mais o efeito de Saúde. Com Saúde abaixo de 25, a população perde 2% e não cresce.
10. Atualizar a estabilidade com as variações sugeridas.
11. Atualizar o nível de cada área com fundo: aplicar a variação do investimento (limitada a ±5) e os efeitos de acordos sobre níveis, mantendo o nível entre 0 e 150. O cálculo de F usa a população do início da rodada.
12. Reduzir em 1 as rodadas restantes de cada acordo e encerrar os que chegaram a zero.
13. Recalcular reputação, pontos e placar, e criar rascunhos de notícia para cada faixa cruzada.
14. Guardar o resumo da rodada no histórico, avançar o contador e zerar o cronômetro.

### Parâmetros ajustáveis

Todos ficam na tela de administração, com estes valores iniciais:

| Parâmetro | Valor inicial |
| --- | --- |
| Duração da rodada | 15 minutos |
| Peso da população no placar | 5 |
| Perda máxima por fome | 20% da população |
| Desgaste dos níveis por rodada | 1 ponto |
| Divisor do fundo (F ÷ 10) | 10 |
| Variação máxima de nível por rodada | ±5 |
| Choque ao retirar mais da metade do fundo | −5 níveis |
| Nível mínimo e máximo | 0 e 150 |
| Faixas e bônus do dado | 25, 50, 100 e 125 → +0, +0, +1, +2, +3 |
| Teto de redução de ganho ou receita por efeitos | 30% |
| Teto de desconto no custo de alimentar | 30% |
| Estabilidade por rodada | −10 com fome, −5 com desemprego acima de 25%, −10 se sofreu ataque aberto, −5 se atacou, +2 com saldo positivo e sem fome |
| Prêmios de ação | 10% do caixa do alvo (até 30), 3% da população ou −10 níveis |
| Custo de uma ação oculta | 10 moedas |
| Perda de poder militar por comparação perdida | 5 |
| Ações por país por rodada | 2 (só informativo) |

### Módulos que o professor liga e desliga

A economia fica sempre ligada. As outras camadas têm um interruptor cada: **áreas**, **acordos**, **notícias**, **dado e ações** e **eventos**. Com um módulo desligado, os efeitos dele não entram no fechamento e os campos dele ficam escondidos na tela pública. Assim o professor segue o roteiro da aula sem mudar o sistema.

## Introduzindo o jogo na aula de 4 horas

Com 10 rodadas de 15 minutos, o jogo ocupa cerca de 2h30 dos 240 minutos. A ideia é começar só com o núcleo e ligar um módulo novo a cada bloco, para ninguém ser atropelado por regras.

| Horário | Etapa | O que é ligado |
| --- | --- | --- |
| 00:00–00:40 | Abertura, regras da economia, formação dos grupos e escolha dos países | Apresentação da tela pública |
| 00:40–01:10 | Rodadas 1 e 2 | Economia: moedas, ganho, desemprego, custo de alimentar |
| 01:10–01:20 | Intervalo | — |
| 01:20–02:05 | Rodadas 3 a 5 | Áreas na rodada 3, acordos e notícias na rodada 4 |
| 02:05–02:50 | Rodadas 6 a 8 | Dado e ações na rodada 6, eventos ocultos na rodada 7, aviso de fim do jogo na rodada 8 |
| 02:50–03:20 | Rodadas 9 e 10 | Sem novidades, só estratégia |
| 03:20–03:50 | Debate final | Placar, revelação das ações e eventos ocultos, perguntas abaixo |
| 03:50–04:00 | Folga e encerramento | — |

Na abertura, o professor mostra o país modelo deste documento e fecha uma rodada de teste na frente da turma. Ver as contas acontecendo explica mais do que qualquer regra falada.

**Perguntas para o debate final**

- Qual decisão mudou o rumo do seu país?
- Qual acordo foi o mais justo e qual foi o mais esperto?
- O que vocês fariam diferente se soubessem dos eventos antes?
- Uma economia forte é a que tem mais moedas ou mais gente?

Cada grupo acompanha os próprios números na tela pública, aberta nos aparelhos dos alunos, então não é preciso voltar à sala principal a cada rodada. Antes do debate, o professor revela as ações e os eventos ocultos e pergunta o que cada país escolheu fazer quando ninguém estava olhando.

## O que fica para os outros documentos

Este documento descreve só as regras gerais. Os itens abaixo ficam em documentos próprios, para não misturar regra com conteúdo.

- **Os países:** nome, perfil, valores iniciais de cada variável e de cada área, e o desafio oculto de cada um.
- **Lista de eventos:** as cartas do professor, com a rodada em que cada uma entra e os números exatos.
- **Folha de regras para os alunos:** uma página com o núcleo, para entregar no começo da aula.
- **Valores finais do equilíbrio:** custo por mil, peso da população e perda por fome, depois de testar com uma rodada simulada.

Um teste rápido antes da aula ajuda a calibrar: rodar 3 rodadas no sistema com os países prontos e ver se algum país está fácil ou difícil demais. Se um país sai com saldo negativo logo na rodada 1 sem ter feito nada errado, o valor inicial dele precisa ser revisto.
