import { capitalCase } from 'change-case';

import { getUnitsForGlobalUnit } from '../../../lib/conversions';
import {
  AccelDecelSettings,
  DifferentialTuneSettings,
  DriveType,
  FrontAndRearSettings,
  FrontAndRearWithUnits,
  GlobalUnit,
  UnitOfMeasure,
} from '../../../lib/types';
import { formatUnit } from '../../../lib/unitsOfMeasure';
import { formatFloat, addSuffix as suffixize } from '../../../lib/utils';

import {
  FMSetup,
  PerformanceUpgrades,
  TuneSettings,
} from './FMSetup';

const tableSeparator = '';

function bold(value: string): string {
  if (!value) return value;
  return `** ${value.replace(/\*\*/g, '')} **`;
}

function h1(text: string): string {
  return `== ${text} ==\n`;
}

function h2(text: string): string {
  return `-- ${text} --`;
}

function h3(text: string): string {
  return `**${text}**`;
}

const falseyValues = [
  null,
  undefined,
  '',
  'N/A',
  'Stock',
  'None',
];

function showValue(value: string | undefined): boolean {
  return !falseyValues.includes(value);
}

function showFrontRearValues(values: FrontAndRearSettings) {
  return showValue(values.front) || showValue(values.rear);
}

enum TextAlign {
  left = ':--',
  right = '--:',
  center = ':-:',
}

// const BOX_LINE_HORIZONTAL = '─';
// const BOX_LINE_VERTICAL = '│';
// const BOX_LINE_TOP_LEFT = '┌';
// const BOX_LINE_TOP_RIGHT = '┐';
// const BOX_LINE_BOTTOM_LEFT = '└';
// const BOX_LINE_BOTTOM_RIGHT = '┘';
// const BOX_LINE_TOP = '┬';
// const BOX_LINE_BOTTOM = '┴';
// const BOX_LINE_LEFT = '├';
// const BOX_LINE_RIGHT = '┤';
// const BOX_LINE_CROSS = '┼';

function getColumnWidths(rows: string[][]) {
  const widths = Array.from({ length: rows[0].length }, () => 0);
  rows.forEach((row) => {
    row.forEach((cell, index) => {
      widths[index] = Math.max(widths[index], cell.length);
    });
  });
  return widths;
}

function formatTable(header: string, body: string[][], alignment = TextAlign.left): string[] {
  if (body.length === 0) return [];
  const widths = getColumnWidths(body);
  const table: string[] = [];
  if (header) table.push(h2(header));
  table.push(...body.map((row) => formatTableRow(row, widths, alignment)));
  table.push(tableSeparator);

  return table;
}

function bumpUpToMultipleOf(value: number, multipleOf: number) {
  const remainder = value % multipleOf;
  if (remainder) {
    return value + (multipleOf - remainder);
  }
  return value;
}

function getPaddingFor(text: string, width: number) {
  const padding = {
    spaces: '',
    tabs: '',
  };

  if (width <= 4) {
    padding.spaces = ' '.repeat(width - text.length);
  } else {
    const normalizedWidth = bumpUpToMultipleOf(width, 4);
    const spacesNeeded = bumpUpToMultipleOf(text.length, 4) - text.length;
    const paddingNeeded = normalizedWidth - text.length - spacesNeeded;
    const tabsNeeded = Math.floor(paddingNeeded / 4);

    padding.spaces = ' '.repeat(spacesNeeded);
    padding.tabs = '\t'.repeat(tabsNeeded);
  }

  return padding;
}

function padText(text: string, width: number, alignment: TextAlign) {
  const padding = getPaddingFor(text, width);

  if (alignment === TextAlign.left) {
    return `${text}${padding.spaces}${padding.tabs}`;
  }
  return `${padding.tabs}${padding.spaces}${text}`;
}

// function formatTableRow(row: string[], widths: number[], alignment = TextAlign.left) {
//   const rowText = row.map((cell, index) => {
//     const cellAlign = index === 0 ? TextAlign.left : alignment;
//     return padText(cell, widths[index], cellAlign);
//   });
//   return rowText.join(' ').trim();
// }

function formatTableRow(row: string[], widths: number[], alignment = TextAlign.left) {
  const rowText = row.map((cell, index) => {
    const width = widths[index];
    if (cell === '/') {
      return cell;
    }
    if (alignment === TextAlign.center) {
      return cell.padStart(width / 2).padEnd(width);
    }
    if (alignment === TextAlign.left) {
      return cell.padEnd(width);
    }
    return cell.padStart(width);
  });
  return rowText.join(' ').trim();
}

function formatFrontRear(header: string, values: FrontAndRearSettings, precision = 1, suffix = '', alignment = TextAlign.left): string[] {
  if (values.na || !showFrontRearValues(values)) {
    return [];
  }
  const body: string[][] = [
    ['F ', formatFloat(values.front, precision, suffix)],
    ['R ', formatFloat(values.rear, precision, suffix)],
  ];

  return formatTable(header, body, alignment);
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

function formatFrontRearWithUnit(header: string, value: FrontAndRearWithUnits, precision = 1, showAll = false): string[] {
  if (value.na) {
    return [];
  }

  const body: string[][] = [];
  if (showAll || showValue(value.front)) {
    const numValue = value.front === 'Stock' ? 0 : value.front;
    body.push(['F ', ...separate(formatUnit(numValue, value.units, precision, true), '/')]);
  }
  if (showAll || showValue(value.rear)) {
    const numValue = value.front === 'Stock' ? 0 : value.rear;
    body.push(['R ', ...separate(formatUnit(numValue, value.units, precision, true), '/')]);
  }

  if (body.length === 0) return [];
  return formatTable(header, body, TextAlign.right);
}

function formatTires(tune: TuneSettings): string[] {
  const table = formatFrontRearWithUnit('', tune.tires, 1);

  if (table.length === 0) return [];

  return [
    h1('Tires'),
    ...formatFrontRearWithUnit('', tune.tires, 1),
  ];
}

function formatGears(tune: TuneSettings): string[] {
  const precision = 2;

  if (tune.gears.na) {
    return [];
  }

  const body: string[][] = [
    ['FR', parseFloat(tune.gears.ratios[0]).toFixed(precision)],
  ];
  for (let index = 1; index < tune.gears.ratios.length; index++) {
    if (!showValue(tune.gears.ratios[index])) break;
    const value = parseFloat(tune.gears.ratios[index]);
    body.push([`${index}${suffixize(index)}`, value.toFixed(precision)]);
  }

  if (body.length === 1 && tune.gears.ratios[0] === '') return [];

  return [
    h1('Gearing'),
    ...formatTable('', body),
  ];
}

function formatAlignment(tune: TuneSettings): string[] {
  if (tune.alignment.na) {
    return [];
  }

  const lines: string[] = [];
  if (tune.alignment.camber.front || tune.alignment.camber.rear) {
    lines.push(...formatFrontRear('Camber', tune.alignment.camber, 1, '°', TextAlign.right));
  }
  if (tune.alignment.toe.front || tune.alignment.toe.rear) {
    lines.push(...formatFrontRear('Toe', tune.alignment.toe, 1, '°', TextAlign.right));
  }
  let addBlank = false;
  if (showValue(tune.alignment.caster)) {
    lines.push(`Caster ${tune.alignment.caster}°`);
    addBlank = true;
  }
  if (showValue(tune.alignment.steeringAngle)) {
    lines.push(`Steering Angle ${tune.alignment.steeringAngle}°`);
    addBlank = true;
  }

  if (lines.length === 0) return [];

  if (addBlank) {
    lines.push('');
  }

  return [
    h1('Alignment'),
    ...lines,
  ];
}

function formatAntiRollbars(tune: TuneSettings): string[] {
  if (tune.arb.na || !showFrontRearValues(tune.arb)) {
    return [];
  }

  return [
    h1('Anti-roll Bars'),
    ...formatFrontRear('', tune.arb),
  ];
}

function formatSprings(tune: TuneSettings): string[] {
  if (tune.springs.na) {
    return [];
  }

  const lines: string[] = [];
  if (showFrontRearValues(tune.springs)) {
    lines.push(...formatFrontRearWithUnit('Springs', tune.springs, 1));
  }
  if (showFrontRearValues(tune.rideHeight)) {
    lines.push(...formatFrontRearWithUnit('Ride Height', tune.rideHeight, 1));
  }

  if (lines.length === 0) return [];

  return [
    h1('Springs'),
    ...lines,
  ];
}

function formatDamping(tune: TuneSettings): string[] {
  if (tune.rebound.na && tune.bump.na) {
    return [];
  }
  const lines: string[] = [
    h1('Damping'),
  ];
  if (showFrontRearValues(tune.bump)) {
    lines.push(...formatFrontRear('Bump', tune.bump));
  }
  if (showFrontRearValues(tune.rebound)) {
    lines.push(...formatFrontRear('Rebound', tune.rebound));
  }

  if (lines.length === 1) return [];

  return lines;
}

function formatSuspensionGeometry(tune: TuneSettings): string[] {
  if (tune.rollCenterHeightOffset.na && tune.antiGeometryPercent.na) {
    return [];
  }
  const lines: string[] = [
    h1('Suspension Geometry'),
  ];

  if (showFrontRearValues(tune.rollCenterHeightOffset)) {
    lines.push(...formatFrontRearWithUnit('Roll Center Offset', tune.rollCenterHeightOffset, 1));
  }
  if (showFrontRearValues(tune.antiGeometryPercent)) {
    lines.push(...formatFrontRear('Anti-Geometry', tune.antiGeometryPercent, 1, '%'));
  }

  if (lines.length === 1) return [];

  return lines;
}

function formatAero(tune: TuneSettings): string[] {
  if (tune.aero.na) {
    return [];
  }
  const lines: string[] = [
    h1('Aero'),
    ...formatFrontRearWithUnit('', tune.aero, 1),
  ];

  if (lines.length === 1) return [];
  return lines;
}

function formatBrakes(tune: TuneSettings): string[] {
  if (tune.brake.na) {
    return [];
  }

  const lines = [];

  if (showValue(tune.brake.bias) && tune.brake.bias !== '50') {
    lines.push(['Balance', formatFloat(tune.brake.bias, 0, '%')]);
  }
  if (showValue(tune.brake.pressure) && tune.brake.pressure !== '100') {
    lines.push(['Pressure', formatFloat(tune.brake.pressure, 0, '%')]);
  }

  if (lines.length === 0) return [];

  return [
    h1('Brakes'),
    ...formatTable('', lines),
  ];
}

function formatDiffLine(label: string, setting: AccelDecelSettings) {
  const line = [label];
  if (showValue(setting.accel)) {
    line.push(formatFloat(setting.accel, 0, '%'));
  } else {
    line.push('-');
  }
  if (showValue(setting.decel)) {
    line.push(formatFloat(setting.decel, 0, '%'));
  } else {
    line.push('-');
  }
  if (line[1] === '-' && line[2] === '-') {
    return [];
  }
  return line;
}

function formatDifferential(diff: DifferentialTuneSettings, driveType: DriveType): string[] {
  if (diff.na) {
    return [];
  }

  const lines: string[] = [];

  const body: string[][] = [];

  const front = formatDiffLine('F ', diff.front);
  if (front.length) body.push(front);

  const rear = formatDiffLine('R ', diff.rear);
  if (rear.length) body.push(rear);

  if (body.length) {
    lines.push(...formatTable('', [
      ['-', 'Accel', 'Decel'],
      ...body,
    ]));
  }

  if (showValue(diff.center) && diff.center !== '50') {
    lines.push(`Center ${formatFloat(diff.center, 0, '%')}`, '');
  }

  if (lines.length === 0) return [];

  return [
    h1('Differential'),
    ...lines,
  ];
}

function formatSteeringWheel(tune: TuneSettings): string[] {
  if (tune.steeringWheel.na) {
    return [];
  }

  const lines: string[][] = [];

  if (showValue(tune.steeringWheel.ffbScale) && tune.steeringWheel.ffbScale !== '100') {
    lines.push(['FFB Scale', tune.steeringWheel.ffbScale]);
  }
  if (showValue(tune.steeringWheel.steeringLockRange) && tune.steeringWheel.steeringLockRange !== '900') {
    lines.push(['Steering Lock', tune.steeringWheel.steeringLockRange]);
  }

  if (lines.length === 0) return [];

  return [
    h1('Steering Wheel'),
    ...formatTable('', lines),
  ];
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

function formatTireUpgrades(upgrades: PerformanceUpgrades): string[] {
  const tires = {
    compound: upgrades.tires.compound,
    width: '',
  };

  if (showFrontRearValues(upgrades.tires.width)) {
    tires.width = `F ${upgrades.tires.width.front || 'Stock'} / R ${upgrades.tires.width.rear || 'Stock'}`;
  }

  return formatUpgradesSection('Tires', tires);
}

function formatWheelUpgrades(upgrades: PerformanceUpgrades): string[] {
  const wheels = {
    style: upgrades.wheels.style,
    size: '',
  };

  if (showFrontRearValues(upgrades.wheels.size)) {
    wheels.size = `F ${upgrades.wheels.size.front || 'Stock'} / R ${upgrades.wheels.size.rear || 'Stock'}`;
  }

  return formatUpgradesSection('Wheels', wheels);
}

const labelMap: Record<string, string> = {
  chassisReinforcement: 'Chassis',
  frontArb: 'ARB F',
  rearArb: 'ARB R',
  weightReduction: 'Weight',
  differential: 'Diff',
  frontBumper: 'F Bumper',
  rearBumper: 'R Bumper',
  rearWing: 'R Wing',
};

function formatLabel(label: string) {
  if (label in labelMap) {
    return labelMap[label];
  }
  return capitalCase(label);
}

function formatUpgradesSection<T extends object>(header: string, section: T) {
  const keys = Object.keys(section);
  const rows: string[][] = keys
    .filter((key) => {
      const value = section[key as keyof T];
      return showValue(value as string);
    })
    .map((key) => [formatLabel(key), section[key as keyof T] as string]);

  if (rows.length === 0) return [];

  return [
    h1(header),
    ...formatTable('', rows),
  ];
}

export function formatUpgrades(upgrades: PerformanceUpgrades, driveType: DriveType): string[] {
  const text = [
    ...formatUpgradesSection('Conversions', upgrades.conversions),
    ...formatUpgradesSection('Fuel and Air', upgrades.fuelAndAir),
    ...formatUpgradesSection('Engine', upgrades.engine),
    ...formatUpgradesSection('Platform And Handling', upgrades.platformAndHandling),
    ...formatTireUpgrades(upgrades),
    ...formatWheelUpgrades(upgrades),
    ...formatUpgradesSection('Drivetrain', upgrades.drivetrain),
    // ...formatAeroBuild(upgrades),
    ...formatUpgradesSection('Aero and Appearance', upgrades.aeroAndAppearance),
  ];

  return text;
}

function formatUnitWithSeparator(value: string | number, unit: UnitOfMeasure, precision = 1, showUnit = false) {
  const formatted = formatUnit(value, unit, precision, showUnit);
  return separate(formatted, '/');
}

function formatStatistics(form: FMSetup, globalUnit: 'Metric' | 'Imperial') {
  const stats: string[][] = [];

  const units = getUnitsForGlobalUnit(globalUnit);

  if (form.stats.carPoints) stats.push(['CP', `${form.stats.carPoints}`, '']);
  if (form.stats.hp) stats.push(['Power', ...formatUnitWithSeparator(form.stats.hp, units.power, 0, true)]);
  if (form.stats.torque) stats.push(['Torque', ...formatUnitWithSeparator(form.stats.torque, units.torque, 0, true)]);
  if (form.stats.weight) stats.push(['Weight', ...formatUnitWithSeparator(form.stats.weight, units.weight, 0, true)]);
  if (form.stats.balance) stats.push(['Balance', `${form.stats.balance}%`]);
  if (form.stats.topSpeed) stats.push(['Top Speed', ...formatUnitWithSeparator(form.stats.topSpeed, units.speed, 0, true)]);
  if (form.stats.zeroToSixty) stats.push(['0-60', `${form.stats.zeroToSixty}s`]);
  if (form.stats.zeroToHundred) stats.push(['0-100', `${form.stats.zeroToHundred}s`]);

  if (stats.length === 0) return [];

  return formatTable('', stats);
}

function formatHeader(form: FMSetup) {
  const text: string[] = [];
  text.push([form.year, form.make, form.model].filter((val) => val).join(' '));
  text.push(`${form.stats.classification} ${form.stats.pi}`);
  const header = `**${text.join(' - ')}**\n`;

  return header;
}

export default function fmDiscordGenerator(form: FMSetup, globalUnit: GlobalUnit, linkUrl: string) {
  const lines = [formatHeader(form)];

  const stats = formatStatistics(form, globalUnit);
  if (stats.length) {
    lines.push(
      bold('Stats'),
      '```',
      ...stats,
      '```',
    );
  }

  const upgrades = formatUpgrades(form.upgrades, form.upgrades.conversions.drivetrain);
  if (upgrades.length) {
    lines.push(
      bold('Upgrades'),
      '```',
      ...upgrades,
      '```',
    );
  }

  const tune = formatTune(form, form.model);
  if (tune.length) {
    lines.push(
      bold('Tune'),
      '```',
      ...tune,
      '```',
    );
  }

  lines.push(
    'Formatted using:',
    'https://optn.club/formatter/forza/motorsport/v3',
  );

  // `[View this tune on optn.club](${linkUrl})`,
  // 'Formatted text generated by the [OPTN.club FM Setup Formatter](https://optn.club/formatter/forza/motorsport/v3)  \n',
  // 'Submit bugs, feature requests, and questions on [Github](https://github.com/OPTN-Club/optn.club/issues)',
  return lines.join('\n');
}
