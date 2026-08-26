/**
 * Local copy of the Valledupar barrio registry used by the survey form.
 * Coordinates live in `src/lib/mockData.ts` (not exported); only name + comuna
 * are needed here so this feature does not touch shared lib files.
 */
export interface BarrioOption {
  readonly name: string
  readonly comuna: string
}

export const BARRIOS: readonly BarrioOption[] = [
  { name: 'La Esperanza', comuna: 'Comuna 2' },
  { name: 'El Popul', comuna: 'Comuna 1' },
  { name: 'Los Cerros', comuna: 'Comuna 3' },
  { name: 'Villa Rosa', comuna: 'Comuna 2' },
  { name: 'Bello Horizonte', comuna: 'Comuna 4' },
  { name: 'La Paz', comuna: 'Comuna 3' },
  { name: 'Cañaveral', comuna: 'Comuna 5' },
  { name: 'La Nevada', comuna: 'Comuna 6' },
  { name: 'Los Cortijos', comuna: 'Comuna 5' },
  { name: 'El Prado', comuna: 'Comuna 1' },
  { name: 'Dangond', comuna: 'Comuna 4' },
  { name: 'Garupal', comuna: 'Comuna 6' },
  { name: 'Villa Castilla', comuna: 'Comuna 4' },
  { name: '450 Años', comuna: 'Comuna 2' },
  { name: 'Novalito', comuna: 'Comuna 6' },
]

/** Comuna for a registered barrio name, or undefined when the name is unknown. */
export function getComuna(barrio: string): string | undefined {
  return BARRIOS.find((option) => option.name === barrio)?.comuna
}
