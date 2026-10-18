import { execSync } from "child_process"

/**
 * O carrinho de visitante (guest) sempre reutiliza o mesmo customer
 * `cus_guest_dev` (ver /store/carts/:id/guest-customer no backend), e o
 * saldo de moedas dele é debitado a cada resgate real de teste manual ou
 * de execução anterior da suíte. Reseta um saldo alto antes de rodar,
 * para o Teste 3 (resgate de moedas) ser determinístico.
 */
export default async function globalSetup() {
  try {
    execSync(
      `docker exec eco_postgres psql -U medusa_user -d medusa_br -c "update customer set metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{store_coins_balance}', '5000') where id = 'cus_guest_dev';"`,
      { stdio: "pipe" }
    )
  } catch {
    // Docker/psql indisponível neste ambiente — segue sem resetar; o
    // Teste 3 pode falhar se o saldo do guest já estiver zerado.
  }
}
