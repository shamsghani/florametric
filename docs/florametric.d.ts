// Type definitions for Florametric 2.0
// Living, procedural ASCII flowers and plants. https://github.com/shamsghani/florametric

export type Species =
  | 'sunflower' | 'hibiscus' | 'iris' | 'thistle' | 'marigold'
  | 'daffodil' | 'rose' | 'dandelion' | 'tulip' | 'flytrap';

export type PaletteName = 'botanical' | 'phosphor' | 'amber' | 'cyberpunk' | 'monochrome';
export type PresetName = 'living' | 'static' | 'calm' | 'classic' | 'minimal';
export type PointerMode = 'reach' | 'flinch' | 'none';
export type GardenEvent = 'germinate' | 'death' | 'reseed' | 'blow';

/** Heritable traits a plant is born with. Factors are around 1.0; colour genes are -1..1. */
export interface GenomeTraits {
  lifeFactor?: number;      // 0.70 - 1.40  longevity
  vigor?: number;           // 0.80 - 1.25  growth rate
  branching?: number;       // 0.25 - 1.50
  leafing?: number;         // 0.60 - 1.50
  flowering?: number;       // 0.65 - 1.40
  size?: number;            // 0.85 - 1.22
  hue?: number;             // -1 - 1
  saturation?: number;      // -1 - 1
  lightness?: number;       // -1 - 1
  growthNoise?: number;     // 0.08 - 0.28
  shapeNoise?: number;      // 0.35 - 1.10
  windSensitivity?: number; // 0.75 - 1.30
  habit?: 'erect' | 'curved_left' | 'curved_right' | 's_curve' | 'windswept' | 'zigzag';
}

/** Every feature of a garden. All optional; see Florametric.defaults for the values. */
export interface GardenOptions {
  // Look
  palette?: PaletteName;
  /** Any CSS colour, or 'transparent'. */
  background?: string;
  glow?: boolean;
  glowStrength?: number;
  /** false = classic upright ASCII (no glyph rotation). */
  rotation?: boolean;
  grass?: boolean;
  soil?: boolean;
  /** Pixels from the bottom of the canvas to the soil line. */
  groundOffset?: number;
  // Motion
  /** Breeze strength, 0 = still air. */
  wind?: number | boolean;
  gusts?: boolean;
  /** null = follow prefers-reduced-motion. */
  reducedMotion?: boolean | null;
  /** Frame-rate cap, 0 = display refresh rate. */
  fps?: number;
  pauseOffscreen?: boolean;
  // Life
  growth?: boolean;
  timeSpeed?: number;
  aging?: boolean;
  flowerCycles?: boolean;
  reproduction?: boolean;
  immigration?: boolean;
  variation?: boolean;
  /** Default genome traits for every new plant. */
  genome?: GenomeTraits | null;
  /** Master seed: plants added without a seed derive theirs from it. */
  seed?: number;
  // Interaction
  interactive?: boolean;
  pointerMode?: PointerMode;
  pollen?: boolean;
  particles?: boolean;
  dandelionBlow?: boolean;
  /** Apply a named bundle of options first. */
  preset?: PresetName;
}

export interface PlantOptions {
  type?: Species;
  /** Biological age: 0-1 growth, 1-21 prime, 21-23.5 old age. */
  age?: number;
  /** 0-1 bloom override, or null to follow the plant's age. */
  bloom?: number | null;
  height?: number;
  seed?: number;
  genome?: GenomeTraits | Genome;
  curvature?: number;
  leafDensity?: number;
  branching?: number;
  pointerMode?: PointerMode;
  /** false: this plant never ages. */
  growth?: boolean;
  /** false: this plant's flowers stay in bloom. */
  flowerCycles?: boolean;
  metabolicRate?: number;
  palette?: PaletteName;
  interactive?: boolean;
}

/** A plant placed in a garden: x is pixels, or a fraction 0..1 / 'NN%' of the width. */
export interface PlantSpec extends PlantOptions {
  x?: number | string;
}

export interface GardenHelperOptions extends GardenOptions {
  /** Plants to place: species names or full specs. */
  plants?: Array<Species | PlantSpec>;
  /** Otherwise: species to cycle through, and how many plants. */
  species?: Species[] | string;
  count?: number;
  /** Shared by every plant. */
  age?: number;
  bloom?: number | null;
  height?: number;
  curvature?: number;
  /** false: draw a single frame (no animation loop). */
  animate?: boolean;
  /** false: create without starting the loop. */
  autoStart?: boolean;
}

export type PlantHelperOptions = GardenOptions & PlantOptions & { animate?: boolean; autoStart?: boolean };

export interface Glyph {
  x: number;
  y: number;
  char: string;
  fg: string;
  size: number;
  rot?: number;
  alpha?: number;
}

export class Genome implements GenomeTraits {
  constructor(traits?: GenomeTraits & { species?: Species; seed?: number });
  static random(species?: Species, seed?: number, overrides?: GenomeTraits): Genome;
  static canonical(species?: Species, seed?: number, overrides?: GenomeTraits): Genome;
  species: Species;
  seed: number;
  generation: number;
  lifeFactor: number;
  vigor: number;
  branching: number;
  leafing: number;
  flowering: number;
  size: number;
  hue: number;
  saturation: number;
  lightness: number;
  growthNoise: number;
  shapeNoise: number;
  windSensitivity: number;
  habit: GenomeTraits['habit'];
  mutate(seed: number, rate?: number): Genome;
  toJSON(): GenomeTraits & { species: Species; seed: number; generation: number };
}

export class AsciiPlant {
  constructor(options?: PlantOptions);
  type: Species;
  age: number;
  bloom: number | null;
  height: number;
  seed: number;
  growth: boolean;
  readonly genome: Genome;
  readonly effectiveBloom: number;
  setAge(age: number): void;
  setBloom(bloom: number | null): void;
  setGenome(traits: GenomeTraits | Genome): void;
  setPalette(name: PaletteName): void;
  /** Regrow to an age by replaying its life (deterministic). */
  growTo(age: number): void;
  feed(amount?: number): void;
  reseed(seed?: number, options?: { inherit?: boolean; genome?: Genome }): void;
  generateGlyphs(originX: number, groundY: number, time?: number, wind?: number, gust?: number): Glyph[];
  renderToCanvas(ctx: CanvasRenderingContext2D, originX: number, groundY: number, time?: number, wind?: number, options?: { bloom?: boolean }): void;
  toPlainText(cols?: number, rows?: number): string;
}

export class AsciiGarden {
  constructor(canvas: HTMLCanvasElement | string | null, options?: GardenOptions);
  readonly options: Required<GardenOptions>;
  plants: Array<{ x: number; fx: number | null; plant: AsciiPlant }>;
  readonly isRunning: boolean;
  /** Change any options at runtime. */
  set(options: GardenOptions): this;
  setOptions(options: GardenOptions): this;
  addPlant(x: number | string, options?: PlantOptions): AsciiPlant;
  addPlant(spec: PlantSpec): AsciiPlant;
  removePlant(plant: AsciiPlant): void;
  clear(): void;
  start(): void;
  stop(): void;
  /** Stop and detach every listener. */
  destroy(): void;
  resize(): void;
  render(): void;
  update(dt: number): void;
  nourishAt(x: number, y: number, radius?: number): void;
  blowDandelion(plant: AsciiPlant, x: number, y: number): void;
  on(event: GardenEvent, handler: (plant: AsciiPlant, x: number, y?: number) => void): this;
  off(event: GardenEvent, handler?: (...args: any[]) => void): this;
  collectGlyphs(): Glyph[];
}

export interface PersistentMeadowOptions extends GardenOptions {
  startTime?: number | string | Date;
  speed?: string | number;
  plantCount?: number;
  species?: Species[] | string;
  config?: string;
}

export interface PersistentMeadow extends AsciiGarden {
  syncToTime(timestamp?: number): unknown[];
  fastForwardTo(timestamp: number): void;
  getMeadowSummary(timestamp?: number): {
    elapsedMs: number; elapsedHours: string; elapsedDays: string;
    averageAge: number; stage: string; plantCount: number;
  };
}

/** A garden of plants in one call (target: selector, canvas or container element). */
export function garden(target: HTMLElement | string | null, options?: GardenHelperOptions): AsciiGarden;
/** One centred specimen. */
export function plant(target: HTMLElement | string | null, options?: PlantHelperOptions): AsciiGarden;
/** Draw once with the static preset; no animation loop. */
export function render(target: HTMLElement | string | null, options?: GardenHelperOptions & PlantOptions): AsciiGarden;
export function createPersistentMeadow(target: HTMLElement | string | null, options?: PersistentMeadowOptions | string): PersistentMeadow;
/** Plain-text ASCII art for terminals, READMEs and chat. */
export function generateString(options: PlantOptions & { cols?: number; rows?: number }): string;
/** Parse kebab-case attributes (element or plain object) into options. */
export function optionsFromAttributes(source: Element | Record<string, string>): GardenHelperOptions & PlantOptions;
export function encodeMeadowConfig(config: PersistentMeadowOptions): string;
export function decodeMeadowConfig(token: string): PersistentMeadowOptions | null;
export function parseTimeSpeed(value: string | number): number;

export const presets: Record<PresetName, GardenOptions>;
export const defaults: Required<GardenOptions>;
export const SPECIES: Species[];
export const PALETTES: Record<PaletteName, unknown>;
export const TRAIT_RANGES: Record<keyof Omit<GenomeTraits, 'habit'>, [number, number]>;
export const version: string;

declare const Florametric: {
  garden: typeof garden;
  plant: typeof plant;
  render: typeof render;
  createPersistentMeadow: typeof createPersistentMeadow;
  generateString: typeof generateString;
  optionsFromAttributes: typeof optionsFromAttributes;
  encodeMeadowConfig: typeof encodeMeadowConfig;
  decodeMeadowConfig: typeof decodeMeadowConfig;
  parseTimeSpeed: typeof parseTimeSpeed;
  AsciiGarden: typeof AsciiGarden;
  AsciiPlant: typeof AsciiPlant;
  Genome: typeof Genome;
  presets: typeof presets;
  defaults: typeof defaults;
  SPECIES: typeof SPECIES;
  PALETTES: typeof PALETTES;
  TRAIT_RANGES: typeof TRAIT_RANGES;
  version: string;
};
export default Florametric;

declare global {
  interface Window {
    Florametric: typeof Florametric;
  }
}
