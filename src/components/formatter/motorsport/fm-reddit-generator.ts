import { capitalCase } from 'change-case';
import { computed, Ref } from 'vue';
import { useRoute } from 'vue-router';

import { getUnitsForGlobalUnit } from '../../../lib/conversions';
import {
  DifferentialTuneSettings,
  DriveType,
  FrontAndRearSettings,
  FrontAndRearWithUnits,
  GlobalUnit,
  UnitOfMeasure,
} from '../../../lib/types';
import { formatUnit, formatUnitHeaders } from '../../../lib/unitsOfMeasure';
import { formatFloat, addSuffix as suffixize } from '../../../lib/utils';

import { FMSetup, PerformanceUpgrades, TuneSettings, V2PerformanceUpgrades } from './FMSetup';

const tableSeparator = '\n######\n';

function bold(value: string): string {
  if (!value) return value;
  return `**${value.replace(/\*\*/g, '')}**`;
}

function formatTableRow(row: string[], boldFirstCol = false) {
  const r = [...row];
  if (boldFirstCol) r[0] = bold(r[0]);
  return `|${r.join('|')}|`;
}

const falseyValues = [null, undefined, '', 'N/A', 'Stock', 'None'];

function showValue(value: string | undefined): boolean {
  return !falseyValues.includes(value);
}

enum TextAlign {
  left = ':--',
  right = '--:',
  center = ':-:',
}

function formatTable(header: string[], body: string[][], boldFirstCol = false, textAlign = TextAlign.right): string[] {
  const rowSeparator = [':--', textAlign];
  for (let index = 2; index < header.length; index++) {
    rowSeparator.push(textAlign);
  }
  return [
    formatTableRow(header.map(bold)),
    formatTableRow(rowSeparator),
    ...body.map((row) => formatTableRow(row, boldFirstCol)),
    tableSeparator,
  ];
}

function formatFrontRear(headers: string[], values: FrontAndRearSettings[], precision = 1, suffix = ''): string[] {
  if (values.every((v) => v.na)) {
    const cells = Array.from({ length: values.length }, () => '');
    return formatTable(headers, [['Not Applicable', ...cells]]);
  }
  const body: string[][] = [
    ['Front', ...values.map((value) => formatFloat(value.front, precision, suffix))],
    ['Rear', ...values.map((value) => formatFloat(value.rear, precision, suffix))],
  ];

  return formatTable(headers, body);
}

function separate(values: string[], separator: string) {
  const separated: string[] = [];
  for (let index = 0; index < values.length; index++) {
    separated.push(values[index]);
    if (index < values.length - 1) {
      separated.push(separator);
    }
  }
  return separated;
}

function formatFrontRearWithUnit(header: string, value: FrontAndRearWithUnits, precision = 1): string[] {
  const headers = [header, ...formatUnitHeaders(value.units)];

  if (value.na) {
    return formatTable(headers, [['Not Applicable', ...formatUnit('', value.units, precision)]]);
  }

  const body: string[][] = [
    ['Front', ...formatUnit(value.front, value.units, precision)],
    ['Rear', ...formatUnit(value.rear, value.units, precision)],
  ];

  return formatTable(headers, body);
}

function formatTires(tune: TuneSettings): string[] {
  return formatFrontRearWithUnit('Tires', tune.tires, 1);
}

function formatGears(tune: TuneSettings): string[] {
  const precision = 2;
  const headers = ['Gears', 'Ratio'];

  if (tune.gears.na) {
    return formatTable(headers, [['Not Applicable', '']]);
  }

  const body: string[][] = [['Final Drive', parseFloat(tune.gears.ratios[0]).toFixed(precision)]];
  for (let index = 1; index < tune.gears.ratios.length; index++) {
    const value = parseFloat(tune.gears.ratios[index]);
    if (!value) break;
    body.push([`${index}${suffixize(index)}`, value.toFixed(precision)]);
  }

  if (body.length === 1 && tune.gears.ratios[0] === '') return [];

  return formatTable(headers, body);
}

function formatAlignment(tune: TuneSettings): string[] {
  return formatFrontRear(
    ['Alignment', 'Camber', 'Toe', 'Caster', 'Steering Angle'],
    [
      tune.alignment.camber,
      tune.alignment.toe,
      { front: tune.alignment.caster, rear: '' },
      { front: tune.alignment.steeringAngle, rear: '' },
    ],
    1,
    '°',
  );
}

function formatAntiRollbars(tune: TuneSettings): string[] {
  const headers = ['Anti-roll Bars', ''];
  if (tune.arb.na) {
    return formatTable(headers, [['Not Applicable', '']]);
  }
  return formatFrontRear(headers, [tune.arb]);
}

function formatSprings(tune: TuneSettings): string[] {
  const headers = ['ARBs', ''];
  if (tune.arb.na) {
    return formatTable(headers, [['Not Applicable', '']]);
  }
  return [
    ...formatFrontRearWithUnit('Springs', tune.springs, 1),
    ...formatFrontRearWithUnit('Ride Height', tune.rideHeight, 1),
  ];
}

function formatDamping(tune: TuneSettings): string[] {
  return formatFrontRear(['Damping', 'Bump', 'Rebound'], [tune.bump, tune.rebound]);
}

function getFormattedRollCenterOffset(value: FrontAndRearWithUnits) {
  const front = formatUnit(value.front, value.units, 1, true).join(' / ');
  const rear = formatUnit(value.rear, value.units, 1, true).join(' / ');

  return { front, rear };
}

function formatSuspensionGeometry(tune: TuneSettings): string[] {
  const offset = getFormattedRollCenterOffset(tune.rollCenterHeightOffset);

  return formatTable(
    ['Suspension Geometry', 'Roll Center Offset', 'Anti-Geometry'],
    [
      ['Front', offset.front, `${tune.antiGeometryPercent.front}%`],
      ['Rear', offset.rear, `${tune.antiGeometryPercent.rear}%`],
    ],
    true,
  );
}

function formatAero(tune: TuneSettings): string[] {
  const headers = ['Aero', ...formatUnitHeaders(tune.aero.units)];

  if (tune.aero.na) {
    return formatTable(headers, [['Not Applicable', ...formatUnit('', tune.aero.units)]]);
  }

  const front = ['Front'];
  const rear = ['Rear'];
  if (tune.aero.front === '') {
    front.push('N/A', '', '');
  } else {
    front.push(...formatUnit(tune.aero.front, tune.aero.units, 1));
  }
  if (tune.aero.rear === '') {
    rear.push('N/A', '', '');
  } else {
    rear.push(...formatUnit(tune.aero.rear, tune.aero.units, 1));
  }
  return formatTable(headers, [front, rear]);
}

function formatBrakes(tune: TuneSettings): string[] {
  const headers = ['Brakes', '%'];

  if (!tune.brake.bias && !tune.brake.pressure) {
    return formatTable(headers, [['Not Applicable', '']]);
  }

  return formatTable(headers, [
    ['Balance', formatFloat(tune.brake.bias, 0, '%')],
    ['Pressure', formatFloat(tune.brake.pressure, 0, '%')],
  ]);
}

function formatDifferential(diff: DifferentialTuneSettings, driveType: DriveType): string[] {
  const header = ['Differential', 'Accel', 'Decel'];

  if (diff.na) {
    return formatTable(header, [['Not Applicable', '', '']]);
  }

  const body: string[][] = [];

  if (showValue(diff.front.accel) || showValue(diff.front.decel)) {
    body.push(['Front', formatFloat(diff.front.accel, 0, '%'), formatFloat(diff.front.decel, 0, '%')]);
  }

  if (showValue(diff.rear.accel) || showValue(diff.rear.decel)) {
    body.push(['Rear', formatFloat(diff.rear.accel, 0, '%'), formatFloat(diff.rear.decel, 0, '%')]);
  }

  if (showValue(diff.center)) {
    body.push(['Center', formatFloat(diff.center, 0, '%'), '']);
  }

  return formatTable(header, body);
}

function formatSteeringWheel(tune: TuneSettings): string[] {
  const headers = ['Steering Wheel', ''];

  if (tune.steeringWheel.na) {
    return formatTable(headers, [['Not Applicable', '']]);
  }

  return formatTable(headers, [
    ['FFB Scale', tune.steeringWheel.ffbScale],
    ['Steering Lock Range', tune.steeringWheel.steeringLockRange],
  ]);
}

export function formatTune(form: FMSetup, model: string): string[] {
  const text = [
    ...formatTires(form.tune),
    ...formatGears(form.tune),
    ...formatAlignment(form.tune),
    ...formatAntiRollbars(form.tune),
    ...formatSprings(form.tune),
    ...formatDamping(form.tune),
    ...formatSuspensionGeometry(form.tune),
    ...formatAero(form.tune),
    ...formatBrakes(form.tune),
    ...formatDifferential(form.tune.diff, form.upgrades.conversions.drivetrain),
    ...formatSteeringWheel(form.tune),
  ];

  return text;
}

function formatConversions(upgrades: PerformanceUpgrades, driveType: DriveType): string[] {
  const headers = ['Conversions', ''];

  const body = [
    ['Engine', upgrades.conversions.engine || 'Stock'],
    ['Drivetrain', driveType || 'Stock'],
  ];
  if (upgrades.conversions.aspiration) {
    body.push(['Aspiration', upgrades.conversions.aspiration || 'Stock']);
  }
  if (upgrades.conversions.aspiration) {
    body.push(['Body Kit', upgrades.conversions.bodyKit || 'Stock']);
  }
  return formatTable(headers, body, false, TextAlign.left);
}

function formatTireUpgrades(upgrades: PerformanceUpgrades): string[] {
  return formatTable(
    ['Tires', ''],
    [
      ['Compound', upgrades.tires.compound],
      ['Tire Width', `Front ${upgrades.tires.width.front} mm, Rear ${upgrades.tires.width.rear} mm`],
      // ['Track Width', `Front ${upgrades.tires.trackWidth.front}, Rear ${upgrades.tires.trackWidth.rear}`],
    ],
    false,
    TextAlign.left,
  );
}

function formatWheelUpgrades(upgrades: PerformanceUpgrades): string[] {
  return formatTable(
    ['Wheels', ''],
    [
      ['Style', `${upgrades.wheels.style} ${upgrades.wheels.style}`],
      ['Size', `Front ${upgrades.wheels.size.front} in, Rear ${upgrades.wheels.size.rear} in`],
    ],
    false,
    TextAlign.left,
  );
}

function formatAeroBuild(upgrades: PerformanceUpgrades): string[] {
  const aero: string[][] = [];
  if (upgrades.aeroAndAppearance.frontBumper) {
    aero.push(['Front Bumper', upgrades.aeroAndAppearance.frontBumper]);
  }
  if (upgrades.aeroAndAppearance.rearBumper) {
    aero.push(['Rear Bumper', upgrades.aeroAndAppearance.rearBumper]);
  }
  if (upgrades.aeroAndAppearance.rearWing) {
    aero.push(['Rear Wing', upgrades.aeroAndAppearance.rearWing]);
  }
  if (upgrades.aeroAndAppearance.sideSkirts) {
    aero.push(['Side Skirts', upgrades.aeroAndAppearance.sideSkirts]);
  }
  if (upgrades.aeroAndAppearance.hood) {
    aero.push(['Hood', upgrades.aeroAndAppearance.hood]);
  }

  if (aero.length === 0) return [];

  return formatTable(['Aero and Appearance', ''], aero, false, TextAlign.left);
}

function formatUpgradesSection<T extends object>(section: T) {
  const keys = Object.keys(section);
  return keys
    .filter((key) => {
      const value = section[key as keyof T];
      return value && value.toString() !== 'N/A';
    })
    .map((key) => [capitalCase(key), section[key as keyof T]]);
}

export function formatUpgrades(upgrades: PerformanceUpgrades | V2PerformanceUpgrades, driveType: DriveType): string[] {
  const text = [
    ...formatConversions(upgrades as PerformanceUpgrades, driveType),
    ...formatTable(['Fuel and Air', ''], formatUpgradesSection(upgrades.fuelAndAir), false, TextAlign.left),
    ...formatTable(['Engine', ''], formatUpgradesSection(upgrades.engine), false, TextAlign.left),
    ...formatTable(
      ['Platform And Handling', ''],
      formatUpgradesSection(upgrades.platformAndHandling),
      false,
      TextAlign.left,
    ),
    ...formatTireUpgrades(upgrades as PerformanceUpgrades),
    ...formatWheelUpgrades(upgrades as PerformanceUpgrades),
    ...formatTable(['Drivetrain', ''], formatUpgradesSection(upgrades.drivetrain), false, TextAlign.left),
    ...formatAeroBuild(upgrades as PerformanceUpgrades),
  ];

  return text;
}

function formatUnitWithSeparator(value: string | number, unit: UnitOfMeasure, precision = 1, showUnit = false) {
  const formatted = formatUnit(value, unit, precision, showUnit);
  return separate(formatted, '/');
}

function formatStatisticsTable(form: FMSetup, globalUnit: 'Metric' | 'Imperial') {
  const units = getUnitsForGlobalUnit(globalUnit);
  const stats: string[][] = [];

  if (form.stats.carPoints) stats.push(['CP', `${form.stats.carPoints}`, '']);
  if (form.stats.weight) stats.push(['Weight', ...formatUnit(form.stats.weight, units.weight, 0, true)]);
  if (form.stats.balance) stats.push(['Balance', `${form.stats.balance}%`]);
  if (form.stats.hp) stats.push(['Power', ...formatUnit(form.stats.hp, units.power, 0, true)]);
  if (form.stats.torque) stats.push(['Torque', ...formatUnit(form.stats.torque, units.torque, 0, true)]);
  if (form.stats.topSpeed) stats.push(['Top Speed', ...formatUnit(form.stats.topSpeed, units.speed, 0, true)]);
  if (form.stats.zeroToSixty) stats.push(['0-60', `${form.stats.zeroToSixty}s`, '']);
  if (form.stats.zeroToHundred) stats.push(['0-100', `${form.stats.zeroToHundred}s`, '']);

  if (stats.length === 0) return [];

  return formatTable(['Stats', '', ''], stats, true, TextAlign.left);
}

function formatHeader(form: FMSetup) {
  const text: string[] = [];
  text.push([form.year, form.make, form.model].filter((val) => val).join(' '));
  text.push(`${form.stats.classification} ${form.stats.pi}`);
  const header = `# ${text.join(' - ')}\n`;

  return header;
}

export default function fmRedditGenerator(form: FMSetup, globalUnit: GlobalUnit, linkUrl: string) {
  return [
    formatHeader(form),
    ...formatStatisticsTable(form, globalUnit),
    `[View this tune on optn.club](${linkUrl})\n`,
    '---\n',
    '## Performance\n',
    ...formatUpgrades(form.upgrades, form.upgrades.conversions.drivetrain),
    '---\n',
    '## Tune\n',
    ...formatTune(form, form.model),
    '---\n',
    'Formatted text generated by the [OPTN.club FM Setup Formatter](https://optn.club/formatter/forza/motorsport/v2)  \n',
    'Submit bugs, feature requests, and questions on [Github](https://github.com/OPTN-Club/optn.club/issues)',
  ].join('\n');
}
