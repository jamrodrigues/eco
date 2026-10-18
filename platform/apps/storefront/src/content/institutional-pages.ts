export type InstitutionalPage = {
  title: string
  body: string[]
}

export const institutionalPages: Record<string, InstitutionalPage> = {
  "central-de-ajuda": {
    title: "Central de Ajuda",
    body: [
      "Tire suas dúvidas sobre pedidos, pagamentos, entregas e devoluções.",
      "Em breve: busca por tópico e chat com nosso time de suporte.",
    ],
  },
  "como-comprar": {
    title: "Como Comprar",
    body: [
      "Escolha o produto, selecione cor/tamanho quando disponível, adicione ao carrinho e finalize no checkout com Pix, cartão ou boleto.",
      "Acompanhe o status do seu pedido pela tela de confirmação após a compra.",
    ],
  },
  "como-vender": {
    title: "Como Vender",
    body: [
      "Quer vender na nossa plataforma? Cadastre sua loja na Central do Vendedor e comece a publicar produtos.",
    ],
  },
  "devolucoes-reembolsos": {
    title: "Devoluções e Reembolsos",
    body: [
      "Você tem até 7 dias corridos após o recebimento para solicitar devolução, conforme o Código de Defesa do Consumidor.",
      "O reembolso é processado no mesmo método de pagamento usado na compra.",
    ],
  },
  entrega: {
    title: "Entrega",
    body: [
      "Calculamos o frete pelo seu CEP: Envio Padrão (Transportadora/Correios) ou Entrega Expressa quando há um ponto de estoque na sua cidade.",
      "Prazos e valores exatos aparecem na página do produto e no checkout.",
    ],
  },
  pagamento: {
    title: "Formas de Pagamento",
    body: [
      "Aceitamos Pix (com desconto exclusivo), cartão de crédito em até 3x sem juros, boleto bancário e carteira digital.",
    ],
  },
  "fale-conosco": {
    title: "Fale Conosco",
    body: [
      "Precisa falar com a gente? Em breve você poderá abrir um chamado diretamente por aqui.",
    ],
  },
  "sobre-nos": {
    title: "Sobre Nós",
    body: [
      "Somos uma plataforma de e-commerce e marketplace hiperlocal, conectando lojas e clientes com entrega rápida na sua cidade.",
    ],
  },
  politicas: {
    title: "Políticas",
    body: [
      "Termos de uso, política de privacidade e política de cookies da plataforma.",
    ],
  },
  carreiras: {
    title: "Carreiras",
    body: ["Ainda não temos vagas abertas publicadas. Volte em breve."],
  },
  blog: {
    title: "Blog",
    body: ["Novidades, dicas e bastidores da plataforma. Em breve."],
  },
  "vendedores-oficiais": {
    title: "Vendedores Oficiais",
    body: [
      "Lojas com o selo OFICIAL passam por verificação e seguem nossos padrões de qualidade e atendimento.",
    ],
  },
  "marketing-e-afiliados": {
    title: "Marketing e Afiliados",
    body: [
      "Programa de afiliados em construção — indique produtos e ganhe comissão por venda.",
    ],
  },
  imprensa: {
    title: "Imprensa",
    body: ["Para contato com a imprensa, utilize o canal de Fale Conosco."],
  },
  "central-do-vendedor": {
    title: "Central do Vendedor",
    body: [
      "Painel para lojistas gerenciarem produtos, pedidos e estoque.",
      "Em breve: cadastro self-service de novas lojas.",
    ],
  },
}
