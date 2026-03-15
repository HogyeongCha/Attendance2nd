import { getServerEnv } from "@/lib/env";

function formatInKorea(date, options) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    ...options
  }).format(date);
}

export function getTodayInKorea() {
  return formatInKorea(new Date(), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

export function getTimeInKorea() {
  return formatInKorea(new Date(), {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

export function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * earthRadius * Math.asin(Math.sqrt(a));
}

export function getEventConfig() {
  const env = getServerEnv();

  return {
    centerLat: env.eventCenterLat,
    centerLng: env.eventCenterLng,
    radiusMeters: env.eventRadiusMeters
  };
}

export function isWithinOperatingWindow(startTime, endTime) {
  const now = getTimeInKorea();
  return now >= startTime && now <= endTime;
}
