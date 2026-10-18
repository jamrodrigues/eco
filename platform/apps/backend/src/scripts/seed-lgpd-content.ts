import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { INSTITUTIONAL_PAGES_MODULE } from "../modules/institutional-pages"

/**
 * Reescreve "politicas" com conteudo no formato LGPD (em vez do stub de
 * uma linha da Fase 2) e cria a pagina "cookies". Idempotente: roda de
 * novo a qualquer momento, sempre sobrescreve com a versao atual.
 *
 * IMPORTANTE: isto nao e aconselhamento juridico. Os campos marcados
 * com [placeholder] precisam ser preenchidos pelo lojista (razao
 * social, CNPJ, encarregado/DPO) e o texto como um todo deveria passar
 * por revisao de um advogado antes de ir pra producao.
 */
const PRIVACY_BODY = [
  "Esta política descreve como coletamos, usamos e protegemos seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD). Este texto é um modelo de referência: recomendamos revisão por um profissional jurídico antes da operação em produção.",
  "Controlador dos dados: [Razão Social a definir], CNPJ [a definir]. Encarregado de Proteção de Dados (DPO): [contato a definir].",
  "Dados que coletamos: nome, e-mail, telefone, endereço de entrega e CEP, histórico de pedidos e dados de pagamento (processados por nosso parceiro de pagamentos, nunca armazenamos número completo de cartão). Para calcular frete e opções de retirada, consultamos o CEP informado junto ao serviço público ViaCEP.",
  "Finalidades e base legal: usamos seus dados para executar o contrato de compra e venda (processar pedidos, calcular frete, emitir cobrança), por consentimento (ex: cadastro de conta, comunicações de marketing que você optar por receber) e por legítimo interesse (prevenção a fraude, segurança da plataforma).",
  "Compartilhamento com terceiros: compartilhamos dados estritamente necessários com processadores de pagamento (Pagar.me) para processar Pix, cartão e boleto, e com o ViaCEP para consulta de endereço. Não vendemos seus dados a terceiros.",
  "Retenção: mantemos seus dados pelo tempo necessário para cumprir obrigações contratuais, fiscais e legais, e os eliminamos ou anonimizamos quando deixam de ser necessários.",
  "Seus direitos: você pode solicitar a qualquer momento acesso, correção, portabilidade, anonimização ou eliminação dos seus dados, e revogar consentimentos dados (como o de marketing). Para exercer esses direitos, entre em contato pela página Fale Conosco.",
  "Cookies: veja nossa página de Política de Cookies para detalhes sobre quais cookies usamos e como gerenciar suas preferências.",
]

const COOKIES_BODY = [
  "Usamos cookies para fazer o site funcionar e, com sua permissão, para entender como você usa a loja.",
  "Cookies essenciais: necessários para o funcionamento do carrinho de compras, login e checkout. Não podem ser desativados, pois sem eles a loja não funciona.",
  "Cookies de analytics/marketing: nos ajudariam a entender quais páginas são mais visitadas e medir a eficácia de campanhas. Só são ativados se você autorizar no banner de cookies — por padrão, vêm desligados. No momento esta loja não possui scripts de analytics ou publicidade em funcionamento; a preferência que você escolhe fica registrada para quando essa funcionalidade for ativada.",
  "Você pode mudar sua escolha a qualquer momento limpando os dados de navegação deste site no seu navegador, o que faz o banner de consentimento aparecer novamente.",
]

export default async function seedLgpdContent({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const service: any = container.resolve(INSTITUTIONAL_PAGES_MODULE)

  const [existingPolicy] = await service.listInstitutionalPages({ slug: "politicas" })
  if (existingPolicy) {
    await service.updateInstitutionalPages({
      id: existingPolicy.id,
      title: "Políticas — Privacidade e LGPD",
      body: PRIVACY_BODY,
    })
    logger.info('[lgpd] "politicas" atualizada com conteúdo LGPD.')
  } else {
    await service.createInstitutionalPages({
      slug: "politicas",
      title: "Políticas — Privacidade e LGPD",
      body: PRIVACY_BODY,
    })
    logger.info('[lgpd] "politicas" criada.')
  }

  const [existingCookies] = await service.listInstitutionalPages({ slug: "cookies" })
  if (existingCookies) {
    await service.updateInstitutionalPages({
      id: existingCookies.id,
      title: "Política de Cookies",
      body: COOKIES_BODY,
    })
    logger.info('[lgpd] "cookies" atualizada.')
  } else {
    await service.createInstitutionalPages({
      slug: "cookies",
      title: "Política de Cookies",
      body: COOKIES_BODY,
    })
    logger.info('[lgpd] "cookies" criada.')
  }
}
