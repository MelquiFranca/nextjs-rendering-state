# Especificação funcional

## Objetivo

Demonstrar que uma interface pode exibir estoque desatualizado enquanto o backend continua responsável pela integridade do negócio.

## Critérios de aceite

- CA-01: duas sessões podem consultar e reservar os mesmos três produtos.
- CA-02: uma atualização concorrente nunca deixa `available` negativo.
- CA-03: o modo vulnerável preserva a cópia local após uma alteração externa.
- CA-04: o modo corrigido invalida queries, sincroniza abas e desfaz atualizações otimistas rejeitadas.
- CA-05: o diagnóstico mostra origem, versão, horário e divergência do dado.
- CA-06: as estratégias cacheada, dinâmica e cliente são selecionáveis por URL.

## Limites

Sem autenticação, histórico, múltiplos depósitos ou sincronização SSE entre navegadores. BroadcastChannel cobre abas na mesma origem e no mesmo navegador.

## Riscos mitigados

- Overselling: `UPDATE` condicional atômico e constraint de estoque não negativo.
- Estado remoto duplicado: permitido apenas no experimento vulnerável.
- Erro otimista: snapshot anterior preservado e restaurado antes da invalidação.
