# Bridge Lab — Busca em Estruturas de Dados

Simulador acadêmico que descobre a capacidade máxima de uma ponte por meio de
algoritmos de busca. Esta versão contém a **Etapa 1**, responsável pela interface,
validação e busca linear. A busca binária e o comparador permanecem deliberadamente
pendentes para a Etapa 2.

## Estado da implementação

| Recurso | Estado | Responsável |
| --- | --- | --- |
| Interface escura e responsiva | Concluído | Aluno 1 |
| Validação do intervalo de cargas | Concluído | Aluno 1 |
| Capacidade secreta aleatória | Concluído | Aluno 1 |
| Busca linear e animação | Concluído | Aluno 1 |
| Testes automatizados | Concluído | Aluno 1 |
| Busca binária | Pendente | Aluno 2 |
| Comparação de eficiência | Pendente | Aluno 2 |
| Revisão visual e GitHub Pages | Pendente | Aluno 2 |

## Funcionalidades da Etapa 1

- cargas mínima e máxima configuráveis;
- valores padrão de 500 kg e 2.000 kg;
- aceitação exclusiva de números inteiros entre 1 kg e 10.000 kg;
- exigência de carga máxima maior que a mínima;
- geração uniforme de uma capacidade secreta, incluindo as duas extremidades;
- busca linear iniciada na carga mínima, com incremento de 1 kg;
- interrupção na primeira carga acima da capacidade;
- conclusão sem ruptura quando a capacidade é igual à carga máxima;
- animação acelerada das tentativas e bloqueio dos controles durante a execução;
- apresentação da carga testada, tentativas, maior carga suportada e resultado;
- estados visuais de ponte pronta, testando, suportou, quebrou, concluída e entrada
  inválida.

## Execução local

O projeto usa apenas HTML, CSS e JavaScript. Como os scripts utilizam módulos ES,
sirva a pasta por HTTP em vez de abrir o `index.html` diretamente:

```bash
python3 -m http.server 8000
```

Depois, acesse <http://localhost:8000>.

## Testes

Requisito: Node.js 20 ou superior. Não há dependências externas.

```bash
npm test
```

O comando executa o test runner nativo do Node e verifica:

- presença dos controles obrigatórios no HTML;
- estado inicial do botão de busca;
- entradas vazias, decimais, invertidas e fora dos limites;
- aceitação de um intervalo válido;
- geração da capacidade nas duas extremidades;
- parada da busca na primeira carga não suportada;
- capacidade igual ao limite máximo;
- rejeição de capacidade fora do intervalo;
- habilitação da busca depois da geração da ponte;
- bloqueio dos controles durante a simulação;
- apresentação do resultado na interface;
- manutenção explícita da busca binária como pendência.

## Como funciona a busca linear

Para um intervalo `[mínimo, máximo]`, o algoritmo testa cada valor em ordem crescente.
Uma carga é suportada enquanto for menor ou igual à capacidade secreta. O primeiro
valor acima dela quebra a ponte e encerra o processo.

Exemplo com capacidade secreta de 503 kg:

```text
500 ✓ → 501 ✓ → 502 ✓ → 503 ✓ → 504 ✗
```

No pior caso, são realizadas `máximo - mínimo + 1` tentativas. Portanto, a
complexidade de tempo é **O(n)** e a sequência de tentativas ocupa **O(n)** para
permitir a animação e a inspeção do resultado.

## Divisão equilibrada

### Aluno 1 — concluído nesta etapa

- estrutura visual e responsiva;
- campos, validações e geração da ponte;
- algoritmo e animação da busca linear;
- integração entre domínio e interface;
- testes da busca linear, entradas e interface;
- documentação inicial e automação dos testes.

### Aluno 2 — próxima etapa

- criar `js/binary-search.js`;
- transformar o cartão pendente em painel interativo;
- mostrar limites inferior, central e superior;
- executar os dois algoritmos sobre a mesma capacidade secreta;
- criar a comparação final de tentativas e eficiência;
- adicionar testes da busca binária e da comparação;
- realizar a revisão visual final;
- publicar o projeto no GitHub Pages.

## Estrutura

```text
.
├── .github/
│   └── workflows/
│       └── tests.yml
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   └── linear-search.js
├── tests/
│   ├── helpers/
│   │   └── fake-dom.js
│   ├── interface.test.js
│   └── linear-search.test.js
├── index.html
├── package.json
└── README.md
```

## Tecnologias

- HTML5 semântico;
- CSS responsivo;
- JavaScript ES Modules;
- Node.js Test Runner;
- GitHub Actions.
