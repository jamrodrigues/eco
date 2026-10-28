import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

/**
 * Era o seed generico do template Medusa (regiao Europa, camisetas
 * demo) - nao tem nada a ver com a Vruumoto e nao era idempotente,
 * travava o boot em producao na segunda execucao ("Countries already
 * assigned to a region"). Dados reais da Vruumoto vem do
 * seed-vruumoto.ts, rodado manualmente, nao daqui.
 */
export default async function initial_data_seed({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  logger.info("initial-data-seed: desativado (seed generico nao usado nesta marca). skipped.");
}
