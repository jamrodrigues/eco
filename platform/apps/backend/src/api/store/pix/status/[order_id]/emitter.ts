import { EventEmitter } from "events"

/**
 * In-memory bridge entre o webhook do Pagar.me e os streams SSE abertos
 * em GET /store/pix/status/:order_id. Suficiente para um único processo
 * de dev (Fase 1); em multi-instância isso precisaria virar um pub/sub
 * (Redis) em vez de EventEmitter local.
 */
class PixStatusEmitter extends EventEmitter {
  emit(orderId: string, payload: Record<string, unknown>): boolean {
    return super.emit(orderId, payload)
  }
}

export const pixStatusEmitter = new PixStatusEmitter()
