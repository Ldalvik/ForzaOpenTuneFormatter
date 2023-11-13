import {
  ForceUnit,
  ForceValues,
  LengthUnit,
  LengthValues,
  PressureUnit,
  PressureValues,
  SpeedUnit,
  SpeedValues,
  SpringRateUnit,
  SpringRateValues,
  UnitOfMeasure,
  WeightUnit,
} from './types';
import { ensureFloat } from './utils';

export const multipliers = {
  springs: {
    newtonsKgf: 0.1019716212978,
    newtonsLbs: 0.57101471743224,
  },
  force: 0.45359236844386,
  pressure: 0.0689475728,
  length: 0.39370078740214,
  weightNewtonsToMass: 9.80665,
  speed: 0.621371,
};

const convertToMap: Record<UnitOfMeasure, (value: string | number) => number> = {
  [PressureUnit.bar]: (value) => convertPressure(value, PressureUnit.psi),
  [PressureUnit.psi]: (value) => convertPressure(value, PressureUnit.bar),
  [SpringRateUnit.kgf]: (value) => convertSpringRate(value, SpringRateUnit.kgf, SpringRateUnit.lbs),
  [SpringRateUnit.lbs]: (value) => convertSpringRate(value, SpringRateUnit.lbs, SpringRateUnit.kgf),
  [LengthUnit.cm]: (value) => convertLength(value, LengthUnit.in),
  [LengthUnit.in]: (value) => convertLength(value, LengthUnit.cm),
  [ForceUnit.kgf]: (value) => convertForce(value, ForceUnit.lbf),
  [ForceUnit.lbf]: (value) => convertForce(value, ForceUnit.kgf),
  [SpeedUnit.kph]: (value) => convertSpeed(value, SpeedUnit.mph),
  [SpeedUnit.mph]: (value) => convertSpeed(value, SpeedUnit.kph),
};

export function convertTo<T extends UnitOfMeasure>(value: string | number, to: T, precision = 0): string {
  return convertToMap[to](value).toFixed(precision);
}

const switchUnitMap: Record<UnitOfMeasure, UnitOfMeasure> = {
  [PressureUnit.bar]: PressureUnit.psi,
  [PressureUnit.psi]: PressureUnit.bar,
  [SpringRateUnit.kgf]: SpringRateUnit.lbs,
  [SpringRateUnit.lbs]: SpringRateUnit.kgf,
  [LengthUnit.cm]: LengthUnit.in,
  [LengthUnit.in]: LengthUnit.cm,
  [ForceUnit.kgf]: ForceUnit.lbf,
  [ForceUnit.lbf]: ForceUnit.kgf,
  [SpeedUnit.kph]: SpeedUnit.mph,
  [SpeedUnit.mph]: SpeedUnit.kph,
};

export function switchUnit<U extends UnitOfMeasure>(unit: U): U {
  return switchUnitMap[unit] as U;
}

export function convertWeightToMass(value: string | number, from: WeightUnit) {
  const v = ensureFloat(value);
  const newtons = from === WeightUnit.kg
    ? v / multipliers.springs.newtonsKgf
    : v / multipliers.springs.newtonsLbs;
  return newtons / multipliers.weightNewtonsToMass;
}

export function convertPressure(value: string | number, from: PressureUnit) {
  const v = ensureFloat(value);
  if (from === PressureUnit.bar) {
    return v / multipliers.pressure;
  }
  return v * multipliers.pressure;
}
// Spring rate kg /mm to lb/in 55.9974146
// Springs: kgf/mm lb/in
// 1234.7 n/mm 1651.6 n/mm
// 705.1 lb/in 943.1 lb/in
// 125.9 kgf/mm 168.4 kgf/mm
// Aero: kgf lb
// 53 kgf 268 kgf
// 116 lb 590 lb

export function convertPressureFrom(value: string | number, from: PressureUnit): PressureValues<number> {
  const v = ensureFloat(value);
  const c = convertPressure(v, from);

  if (from === PressureUnit.bar) {
    return {
      bar: v,
      psi: c,
    };
  }
  return {
    bar: c,
    psi: v,
  };
}

export function convertLength(value: string | number, from: LengthUnit) {
  const v = ensureFloat(value);
  if (from === LengthUnit.cm) {
    return v * multipliers.length;
  }
  return v / multipliers.length;
}

export function convertLengthFrom(value: string | number, from: LengthUnit): LengthValues<number> {
  const v = ensureFloat(value);
  const c = convertLength(v, from);

  if (from === LengthUnit.in) {
    return {
      in: v,
      cm: c,
    };
  }
  return {
    in: c,
    cm: v,
  };
}

export function convertForce(value: string | number, from: ForceUnit) {
  const v = ensureFloat(value);
  if (from === ForceUnit.kgf) {
    return v / multipliers.force;
  }
  return v * multipliers.force;
}

export function convertForceFrom(value: string | number, from: ForceUnit): ForceValues<number> {
  const v = ensureFloat(value);
  const c = convertForce(v, from);

  if (from === ForceUnit.kgf) {
    return {
      kgf: v,
      lbf: c,
    };
  }
  return {
    kgf: c,
    lbf: v,
  };
}

export function convertSpeed(value: string | number, from: SpeedUnit) {
  const v = ensureFloat(value);
  if (from === SpeedUnit.mph) {
    return v / multipliers.speed;
  }
  return v * multipliers.speed;
}

export function getSpeedValuesFrom(value: string | number, from: SpeedUnit): SpeedValues<number> {
  const v = ensureFloat(value);
  const c = convertSpeed(v, from);

  if (from === SpeedUnit.kph) {
    return {
      kph: v,
      mph: c,
    };
  }
  return {
    kph: c,
    mph: v,
  };
}

function convertSpringRateToNewtons(value: string | number, from: SpringRateUnit): number {
  const v = ensureFloat(value);
  if (from === SpringRateUnit.kgf) {
    return v / multipliers.springs.newtonsKgf;
  } if (from === SpringRateUnit.lbs) {
    return v / multipliers.springs.newtonsLbs;
  }

  return v;
}

function convertSpringRateFromNewtons(value: number | number, to: SpringRateUnit): number {
  if (to === SpringRateUnit.kgf) {
    return value * multipliers.springs.newtonsKgf;
  } if (to === SpringRateUnit.lbs) {
    return value * multipliers.springs.newtonsLbs;
  }
  return value;
}

export function convertSpringRate(value: string | number, from: SpringRateUnit, to: SpringRateUnit) {
  const newtons = convertSpringRateToNewtons(value, from);
  return convertSpringRateFromNewtons(newtons, to);
}

export function convertSpringRateFrom(value: string | number, from: SpringRateUnit): SpringRateValues<number> {
  const newtons = convertSpringRateToNewtons(value, from);
  const kgf = convertSpringRateFromNewtons(newtons, SpringRateUnit.kgf);
  const lbs = convertSpringRateFromNewtons(newtons, SpringRateUnit.lbs);
  return {
    newtons,
    kgf,
    lbs,
  };
}
