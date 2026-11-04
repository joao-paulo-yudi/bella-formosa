# Bella Formosa

Site da Bella Formosa Moda Evangélica, loja de vestidos, saias, conjuntos e moda festa em Sorocaba (SP).

O site apresenta a loja e exibe um catálogo de peças que o cliente pode pedir pelo WhatsApp. A própria loja mantém o catálogo por um painel, sem mexer em código.

## Funcionalidades

- **Catálogo:** peças com foto, nome, categoria, preço opcional, tamanhos e descrição, com uma peça em destaque no topo.
- **Pedido pelo WhatsApp:** cada peça abre a conversa com a loja com a mensagem já preenchida.
- **Informações da loja:** endereço com mapa e botão "Como chegar", Instagram e horários, com indicação automática de "Aberto agora".
- **Painel da loja (`/admin`):** área com login para cadastrar, editar, excluir e ocultar peças, escolher o destaque e atualizar WhatsApp, Instagram, faixa do topo, endereço, horários e categorias. Também permite recuperar a senha por e-mail.
- **Modo demonstração:** sem banco configurado, o site mostra peças de exemplo e o painel salva as alterações apenas no navegador.

## Tecnologias

- HTML, CSS e JavaScript puro, sem framework.
- [Supabase](https://supabase.com) para o catálogo, o armazenamento das fotos e o login do painel.
- Hospedagem na [Vercel](https://vercel.com), com um script de build que gera a configuração a partir de variáveis de ambiente.
- Fonte Instrument Sans auto-hospedada (licença SIL Open Font).

## Estrutura

```
site/                 site publicado
  index.html          página principal
  admin/              painel da loja
  js/                 interface e acesso aos dados
  data/seed.json      peças de exemplo do modo demonstração
  css/, fonts/, img/  estilo, fonte e imagens
supabase/schema.sql   tabelas, regras de acesso e funções do banco
build.js              gera o config.js e preenche o endereço do site no build
vercel.json           configuração de publicação
```
