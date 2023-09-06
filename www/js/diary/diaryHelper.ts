// here we have some helper functions used throughout the label tab
// these functions are being gradually migrated out of services.js

import i18next from "i18next";
import moment from "moment";
import { DateTime } from "luxon";

const modeColors = {
  red: '#b9003d',         // oklch(50% 0.37 15)     // car
  orange: '#b25200',      // oklch(55% 0.37 50)     // air, hsr
  green: '#007e46',       // oklch(52% 0.37 155)    // bike
  blue: '#0068a5',        // oklch(50% 0.37 245)    // walk
  periwinkle: '#5e45cd',  // oklch(50% 0.2 285)     // light rail, train, tram, subway
  magenta: '#8e35a1',     // oklch(50% 0.18 320)    // bus
  grey: '#484848',        // oklch(40% 0 0)         // unprocessed / unknown
  taupe: '#7d5857',       // oklch(50% 0.05 15)     // ferry, trolleybus, nonstandard modes
}

type MotionType = {
  name: string,
  icon: string,
  color: string
}
const MotionTypes: {[k: string]: MotionType} = {
  IN_VEHICLE: { name: "IN_VEHICLE", icon: "speedometer", color: modeColors.red },
  ON_FOOT: { name: "ON_FOOT", icon: "walk", color: modeColors.blue },
  BICYCLING: { name: "BICYCLING", icon: "bike", color: modeColors.green },
  UNKNOWN: { name: "UNKNOWN", icon: "help", color: modeColors.grey },
  WALKING: { name: "WALKING", icon: "walk", color: modeColors.blue },
  CAR: { name: "CAR", icon: "car", color: modeColors.red },
  AIR_OR_HSR: { name: "AIR_OR_HSR", icon: "airplane", color: modeColors.orange },
  // based on OSM routes/tags:
  BUS: { name: "BUS", icon: "bus-side", color: modeColors.magenta },
  LIGHT_RAIL: { name: "LIGHT_RAIL", icon: "train-car-passenger", color: modeColors.periwinkle },
  TRAIN: { name: "TRAIN", icon: "train-car-passenger", color: modeColors.periwinkle },
  TRAM: { name: "TRAM", icon: "fas fa-tram", color: modeColors.periwinkle },
  SUBWAY: { name: "SUBWAY", icon: "subway-variant", color: modeColors.periwinkle },
  FERRY: { name: "FERRY", icon: "ferry", color: modeColors.taupe },
  TROLLEYBUS: { name: "TROLLEYBUS", icon: "bus-side", color: modeColors.taupe },
  UNPROCESSED: { name: "UNPROCESSED", icon: "help", color: modeColors.grey }
}

type MotionTypeKey = keyof typeof MotionTypes;
/**
 * @param motionName A string like "WALKING" or "MotionTypes.WALKING"
 * @returns A MotionType object containing the name, icon, and color of the motion type
 */
export function motionTypeOf(motionName: MotionTypeKey | `MotionTypes.${MotionTypeKey}`) {
  let key = ('' + motionName).toUpperCase();
  key = key.split(".").pop(); // if "MotionTypes.WALKING", then just take "WALKING"
  return MotionTypes[motionName] || MotionTypes.UNKNOWN;
}

/**
 * @param beginFmtTime An ISO 8601 formatted timestamp (with timezone)
 * @param endTs An ISO 8601 formatted timestamp (with timezone)
 * @returns true if the start and end timestamps fall on different days
 * @example isMultiDay("2023-07-13T00:00:00-07:00", "2023-07-14T00:00:00-07:00") => true
 */
export function isMultiDay(beginFmtTime: string, endFmtTime: string) {
  if (!beginFmtTime || !endFmtTime) return false;
  return moment.parseZone(beginFmtTime).format('YYYYMMDD') != moment.parseZone(endFmtTime).format('YYYYMMDD');
}

/**
 * @param beginFmtTime An ISO 8601 formatted timestamp (with timezone)
 * @param endTs An ISO 8601 formatted timestamp (with timezone)
 * @returns A formatted range if both params are defined, one formatted date if only one is defined
 * @example getFormattedDate("2023-07-14T00:00:00-07:00") => "Fri, Jul 14, 2023"
 */
export function getFormattedDate(beginFmtTime: string, endFmtTime?: string) {
  if (!beginFmtTime && !endFmtTime) return;
  if (isMultiDay(beginFmtTime, endFmtTime)) {
    return `${getFormattedDate(beginFmtTime)} - ${getFormattedDate(endFmtTime)}`;
  }
  // only one day given, or both are the same day
  const t = moment.parseZone(beginFmtTime || endFmtTime);
  // We use ddd LL to get Wed, May 3, 2023 or equivalent
  // LL only has the date, month and year
  // LLLL has the day of the week, but also the time
  return t.format('ddd LL');
}

/**
 * @param beginFmtTime An ISO 8601 formatted timestamp (with timezone)
 * @param endTs An ISO 8601 formatted timestamp (with timezone)
 * @returns A formatted range if both params are defined, one formatted date if only one is defined
 * @example getFormattedDate("2023-07-14T00:00:00-07:00") => "Fri, Jul 14"
 */
export function getFormattedDateAbbr(beginFmtTime: string, endFmtTime?: string) {
  if (!beginFmtTime && !endFmtTime) return;
  if (isMultiDay(beginFmtTime, endFmtTime)) {
    return `${getFormattedDateAbbr(beginFmtTime)} - ${getFormattedDateAbbr(endFmtTime)}`;
  }
  // only one day given, or both are the same day
  const dt = DateTime.fromISO(beginFmtTime || endFmtTime, { setZone: true });
  return dt.toLocaleString({ weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * @param beginFmtTime An ISO 8601 formatted timestamp (with timezone)
 * @param endFmtTime An ISO 8601 formatted timestamp (with timezone)
 * @returns A human-readable, approximate time range, e.g. "2 hours"
 */
export function getFormattedTimeRange(beginFmtTime: string, endFmtTime: string) {
  if (!beginFmtTime || !endFmtTime) return;
  const beginMoment = moment.parseZone(beginFmtTime);
  const endMoment = moment.parseZone(endFmtTime);
  return endMoment.to(beginMoment, true);
};

// Temporary function to avoid repear in getPercentages ret val.
const filterRunning = (mode) =>
  (mode == 'MotionTypes.RUNNING') ? 'MotionTypes.WALKING' : mode;

export function getPercentages(trip) {
  if (!trip.sections?.length) return {};

  // sum up the distances for each mode, as well as the total distance
  let totalDist = 0;
  const dists: Record<string, number> = {};
  trip.sections.forEach((section) => {
    const filteredMode = filterRunning(section.sensed_mode_str);
    dists[filteredMode] = (dists[filteredMode] || 0) + section.distance;
    totalDist += section.distance;
  });

  // sort modes by the distance traveled (descending)
  const sortedKeys = Object.entries(dists).sort((a, b) => b[1] - a[1]).map(e => e[0]);
  let sectionPcts = sortedKeys.map(function (mode) {
    const fract = dists[mode] / totalDist;
    return {
      mode: mode,
      icon: motionTypeOf(mode)?.icon,
      color: motionTypeOf(mode)?.color || 'black',
      pct: Math.round(fract * 100) || '<1' // if rounds to 0%, show <1%
    };
  });

  return sectionPcts;
}

export function getFormattedSectionProperties(trip, ImperialConfig) {
  return trip.sections?.map((s) => ({
    fmt_time: getLocalTimeString(s.start_local_dt),
    fmt_time_range: getFormattedTimeRange(s.start_fmt_time, s.end_fmt_time),
    fmt_distance: ImperialConfig.getFormattedDistance(s.distance),
    fmt_distance_suffix: ImperialConfig.distanceSuffix,
    icon: motionTypeOf(s.sensed_mode_str)?.icon,
    color: motionTypeOf(s.sensed_mode_str)?.color || "#333",
  }));
}

export function getLocalTimeString(dt) {
  if (!dt) return;
  /* correcting the date of the processed trips knowing that local_dt months are from 1 -> 12
    and for the moment function they need to be between 0 -> 11 */
  const mdt = { ...dt, month: dt.month-1 };
  return moment(mdt).format("LT");
}
