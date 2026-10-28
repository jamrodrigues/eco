/**
 * Dados estáticos do seletor "Serve na Minha Moto?" (Fase 5 / Vruumoto,
 * doc seção 3A). Lista de montadoras/modelos é curada à mão — não vem
 * do catálogo, é o universo de motos suportado pelo filtro.
 */
export const MOTORCYCLE_MAKES = [
  "Honda",
  "Yamaha",
  "Bajaj",
  "Suzuki",
  "Haojue",
  "Shineray",
  "BMW",
  "Kawasaki",
] as const

export const MOTORCYCLE_MODELS_BY_MAKE: Record<string, string[]> = {
  Honda: [
    "CG 160 Titan",
    "CG 160 Fan",
    "CG 160 Start",
    "NXR 160 Bros",
    "Biz 125",
    "PCX 160",
    "CB 300F Twister",
    "XRE 300 / Sahara 300",
  ],
  Yamaha: ["Fazer 250", "Lander 250", "Factor 150", "XTZ 150 Crosser", "MT-03"],
  Bajaj: ["Dominar 400", "Pulsar 160"],
  Suzuki: ["GSR 150i", "Intruder 125"],
  Haojue: ["DK 150", "NK 150"],
  Shineray: ["Phoenix 50", "SHI 175"],
  BMW: ["G 310 R", "F 850 GS"],
  Kawasaki: ["Ninja 300", "Z400"],
}

export const MOTORCYCLE_YEARS = [
  2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018,
]

export type SelectedMotorcycle = {
  make: string
  model: string
  year: number
}

export type CompatibleMotorcycle = {
  make: string
  model: string
  year_start: number
  year_end: number
}

const STORAGE_KEY = "vruumoto_my_bike"

export function saveSelectedMotorcycle(bike: SelectedMotorcycle) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bike))
  } catch {
    // localStorage indisponível — a selecao so nao persiste entre visitas
  }
}

export function loadSelectedMotorcycle(): SelectedMotorcycle | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SelectedMotorcycle) : null
  } catch {
    return null
  }
}

/** Compara a moto selecionada contra as aplicações compatíveis de uma variante. */
export function isMotorcycleCompatible(
  bike: SelectedMotorcycle,
  compatibleList: CompatibleMotorcycle[] | undefined
): boolean {
  if (!compatibleList?.length) return false
  return compatibleList.some(
    (c) =>
      c.make.toLowerCase() === bike.make.toLowerCase() &&
      c.model.toLowerCase().includes(bike.model.toLowerCase().split(" ")[0]) &&
      bike.year >= c.year_start &&
      bike.year <= c.year_end
  )
}
