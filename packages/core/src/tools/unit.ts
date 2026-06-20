import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

const unitCategories = [
  'length',
  'area',
  'volume',
  'mass',
  'temperature',
  'pressure',
  'speed',
  'data',
  'time',
  'angle',
  'power',
  'energy',
  'density',
  'force'
] as const;

export type UnitCategory = (typeof unitCategories)[number];

export type UnitConvertInput = {
  value: number | string;
  fromUnit: string;
  toUnit: string;
  category?: UnitCategory;
  precision?: number;
};

export type UnitConvertOutput = {
  input: number;
  category: UnitCategory;
  fromUnit: string;
  toUnit: string;
  converted: number;
  precision: number;
  result: string;
};

type LinearUnit = {
  aliases: string[];
  factor: number;
};

type TemperatureUnit = {
  aliases: string[];
  toKelvin: (value: number) => number;
  fromKelvin: (value: number) => number;
};

type UnitDefinition =
  | {
      type: 'linear';
      units: Record<string, LinearUnit>;
    }
  | {
      type: 'temperature';
      units: Record<string, TemperatureUnit>;
    };

const linear = (factor: number, aliases: string[] = []): LinearUnit => ({
  factor,
  aliases
});

const categoryDefinitions: Record<UnitCategory, UnitDefinition> = {
  length: {
    type: 'linear',
    units: {
      mm: linear(0.001, ['millimeter', 'millimeters']),
      cm: linear(0.01, ['centimeter', 'centimeters']),
      m: linear(1, ['meter', 'meters']),
      km: linear(1000, ['kilometer', 'kilometers']),
      in: linear(0.0254, ['inch', 'inches']),
      ft: linear(0.3048, ['foot', 'feet']),
      yd: linear(0.9144, ['yard', 'yards']),
      mi: linear(1609.344, ['mile', 'miles']),
      nmi: linear(1852, ['nauticalmile', 'nauticalmiles'])
    }
  },
  area: {
    type: 'linear',
    units: {
      mm2: linear(0.000001, ['mm^2']),
      cm2: linear(0.0001, ['cm^2']),
      m2: linear(1, ['m^2']),
      ha: linear(10000, ['hectare', 'hectares']),
      km2: linear(1000000, ['km^2']),
      in2: linear(0.00064516, ['in^2']),
      ft2: linear(0.09290304, ['ft^2']),
      yd2: linear(0.83612736, ['yd^2']),
      acre: linear(4046.8564224, ['acres']),
      mi2: linear(2589988.110336, ['mi^2'])
    }
  },
  volume: {
    type: 'linear',
    units: {
      ml: linear(0.000001, ['milliliter', 'milliliters']),
      l: linear(0.001, ['liter', 'liters']),
      cm3: linear(0.000001, ['cm^3']),
      m3: linear(1, ['m^3']),
      in3: linear(0.000016387064, ['in^3']),
      ft3: linear(0.028316846592, ['ft^3']),
      gal_us: linear(0.003785411784, ['gal', 'gallon', 'gallons']),
      qt_us: linear(0.000946352946, ['quart', 'quarts']),
      pt_us: linear(0.000473176473, ['pint', 'pints']),
      cup_us: linear(0.0002365882365, ['cup', 'cups']),
      floz_us: linear(0.0000295735295625, ['floz', 'fl_oz'])
    }
  },
  mass: {
    type: 'linear',
    units: {
      mg: linear(0.000001, ['milligram', 'milligrams']),
      g: linear(0.001, ['gram', 'grams']),
      kg: linear(1, ['kilogram', 'kilograms']),
      t: linear(1000, ['tonne', 'tonnes', 'metricton']),
      oz: linear(0.028349523125, ['ounce', 'ounces']),
      lb: linear(0.45359237, ['pound', 'pounds'])
    }
  },
  temperature: {
    type: 'temperature',
    units: {
      C: {
        aliases: ['c', 'celsius'],
        toKelvin: (value) => value + 273.15,
        fromKelvin: (value) => value - 273.15
      },
      F: {
        aliases: ['f', 'fahrenheit'],
        toKelvin: (value) => ((value - 32) * 5) / 9 + 273.15,
        fromKelvin: (value) => ((value - 273.15) * 9) / 5 + 32
      },
      K: {
        aliases: ['k', 'kelvin'],
        toKelvin: (value) => value,
        fromKelvin: (value) => value
      }
    }
  },
  pressure: {
    type: 'linear',
    units: {
      Pa: linear(1, ['pa', 'pascal', 'pascals']),
      kPa: linear(1000, ['kpa']),
      MPa: linear(1000000, ['mpa']),
      bar: linear(100000, ['bars']),
      atm: linear(101325, ['atmosphere', 'atmospheres']),
      psi: linear(6894.757293168),
      torr: linear(133.3223684211),
      mmHg: linear(133.322387415, ['mmhg'])
    }
  },
  speed: {
    type: 'linear',
    units: {
      'm/s': linear(1, ['mps']),
      'km/h': linear(1000 / 3600, ['kmh', 'kph']),
      mph: linear(1609.344 / 3600),
      knot: linear(1852 / 3600, ['knots', 'kt']),
      'ft/s': linear(0.3048, ['fps'])
    }
  },
  data: {
    type: 'linear',
    units: {
      b: linear(1 / 8, ['bit', 'bits']),
      B: linear(1, ['byte', 'bytes']),
      KB: linear(1e3, ['kb']),
      MB: linear(1e6, ['mb']),
      GB: linear(1e9, ['gb']),
      TB: linear(1e12, ['tb']),
      PB: linear(1e15, ['pb']),
      EB: linear(1e18, ['eb']),
      KiB: linear(1024, ['kib']),
      MiB: linear(1024 ** 2, ['mib']),
      GiB: linear(1024 ** 3, ['gib']),
      TiB: linear(1024 ** 4, ['tib']),
      PiB: linear(1024 ** 5, ['pib']),
      EiB: linear(1024 ** 6, ['eib'])
    }
  },
  time: {
    type: 'linear',
    units: {
      ms: linear(0.001, ['millisecond', 'milliseconds']),
      s: linear(1, ['sec', 'second', 'seconds']),
      min: linear(60, ['minute', 'minutes']),
      h: linear(3600, ['hr', 'hour', 'hours']),
      d: linear(86400, ['day', 'days']),
      week: linear(604800, ['weeks']),
      month: linear(2629800, ['months']),
      year: linear(31557600, ['years'])
    }
  },
  angle: {
    type: 'linear',
    units: {
      rad: linear(1, ['radian', 'radians']),
      deg: linear(Math.PI / 180, ['degree', 'degrees']),
      grad: linear(Math.PI / 200, ['gon']),
      turn: linear(Math.PI * 2, ['turns'])
    }
  },
  power: {
    type: 'linear',
    units: {
      W: linear(1, ['w', 'watt', 'watts']),
      kW: linear(1000, ['kw']),
      MW: linear(1000000, ['mw']),
      hp: linear(745.6998715822702, ['horsepower'])
    }
  },
  energy: {
    type: 'linear',
    units: {
      J: linear(1, ['j', 'joule', 'joules']),
      kJ: linear(1000, ['kj']),
      MJ: linear(1000000, ['mj']),
      cal: linear(4.184, ['calorie', 'calories']),
      kcal: linear(4184, ['kilocalorie', 'kilocalories']),
      Wh: linear(3600, ['wh']),
      kWh: linear(3600000, ['kwh']),
      BTU: linear(1055.05585262, ['btu'])
    }
  },
  density: {
    type: 'linear',
    units: {
      'kg/m3': linear(1, ['kg/m^3']),
      'g/cm3': linear(1000, ['g/cm^3']),
      'g/ml': linear(1000),
      'lb/ft3': linear(16.01846337396014, ['lb/ft^3']),
      'lb/gal_us': linear(119.82642731689662, ['lb/gal'])
    }
  },
  force: {
    type: 'linear',
    units: {
      N: linear(1, ['n', 'newton', 'newtons']),
      kN: linear(1000, ['kn']),
      lbf: linear(4.4482216152605),
      kgf: linear(9.80665),
      dyn: linear(0.00001, ['dyne', 'dynes'])
    }
  }
};

const exactUnitAliases = new Map<
  string,
  { category: UnitCategory; unit: string }
>();
const foldedUnitAliases = new Map<
  string,
  { category: UnitCategory; unit: string }
>();

for (const category of unitCategories) {
  const definition = categoryDefinitions[category];
  for (const [unit, config] of Object.entries(definition.units)) {
    const aliases = [unit, ...config.aliases];
    for (const alias of aliases) {
      const compactAlias = alias.trim().replace(/\s+/g, '');
      exactUnitAliases.set(compactAlias, { category, unit });
      foldedUnitAliases.set(compactAlias.toLowerCase(), { category, unit });
    }
  }
}

const normalizePrecision = (value: unknown): number => {
  if (value === undefined || value === null) return 6;
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (
    typeof numeric !== 'number' ||
    !Number.isInteger(numeric) ||
    numeric < 0 ||
    numeric > 12
  ) {
    throw new ToolboxError(
      'UNIT_INVALID_PRECISION',
      'precision must be an integer from 0 to 12'
    );
  }

  return numeric;
};

const normalizeValue = (value: unknown): number => {
  const numeric = typeof value === 'string' ? Number(value.trim()) : value;
  if (typeof numeric !== 'number' || !Number.isFinite(numeric)) {
    throw new ToolboxError(
      'UNIT_INVALID_VALUE',
      'value must be a finite number'
    );
  }

  return numeric;
};

const normalizeCategory = (value: unknown): UnitCategory | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (
    typeof value !== 'string' ||
    !unitCategories.includes(value as UnitCategory)
  ) {
    throw new ToolboxError(
      'UNIT_INVALID_CATEGORY',
      `category must be one of: ${unitCategories.join(', ')}`
    );
  }

  return value as UnitCategory;
};

const normalizeUnit = (
  value: unknown,
  expectedCategory?: UnitCategory
): { category: UnitCategory; unit: string } => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ToolboxError('UNIT_REQUIRED', 'fromUnit and toUnit are required');
  }

  const normalized = value.trim().replace(/\s+/g, '');
  const resolved =
    exactUnitAliases.get(normalized) ??
    foldedUnitAliases.get(normalized.toLowerCase());
  if (!resolved) {
    throw new ToolboxError('UNIT_UNKNOWN', `Unknown unit: ${value}`);
  }

  if (expectedCategory && resolved.category !== expectedCategory) {
    throw new ToolboxError(
      'UNIT_INCOMPATIBLE',
      `${value} is not a ${expectedCategory} unit`
    );
  }

  return resolved;
};

const roundNumber = (value: number, precision: number): number => {
  const rounded = Number(value.toFixed(precision));
  return Object.is(rounded, -0) ? 0 : rounded;
};

export const convertUnit = (input: UnitConvertInput): UnitConvertOutput => {
  const value = normalizeValue(input.value);
  const precision = normalizePrecision(input.precision);
  const requestedCategory = normalizeCategory(input.category);
  const from = normalizeUnit(input.fromUnit, requestedCategory);
  const to = normalizeUnit(input.toUnit, requestedCategory ?? from.category);

  if (from.category !== to.category) {
    throw new ToolboxError(
      'UNIT_INCOMPATIBLE',
      `Cannot convert ${from.category} to ${to.category}`
    );
  }

  const definition = categoryDefinitions[from.category];
  const converted =
    definition.type === 'temperature'
      ? definition.units[to.unit].fromKelvin(
          definition.units[from.unit].toKelvin(value)
        )
      : (value * definition.units[from.unit].factor) /
        definition.units[to.unit].factor;
  const rounded = roundNumber(converted, precision);

  return {
    input: value,
    category: from.category,
    fromUnit: from.unit,
    toUnit: to.unit,
    converted: rounded,
    precision,
    result: String(rounded)
  };
};

export const unitTools: ToolboxTool[] = [
  {
    name: 'unit.convert',
    title: 'Unit Converter',
    description:
      'Convert common engineering units across length, area, volume, temperature, pressure, speed, data, time, angle, power, energy, density, and force.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['value', 'fromUnit', 'toUnit'],
      additionalProperties: false,
      properties: {
        value: { type: ['number', 'string'] },
        fromUnit: { type: 'string' },
        toUnit: { type: 'string' },
        category: { type: 'string', enum: unitCategories },
        precision: { type: 'integer', minimum: 0, maximum: 12, default: 6 }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'input',
        'category',
        'fromUnit',
        'toUnit',
        'converted',
        'precision',
        'result'
      ],
      additionalProperties: false,
      properties: {
        input: { type: 'number' },
        category: { type: 'string', enum: unitCategories },
        fromUnit: { type: 'string' },
        toUnit: { type: 'string' },
        converted: { type: 'number' },
        precision: { type: 'integer' },
        result: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok(convertUnit(input as UnitConvertInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
