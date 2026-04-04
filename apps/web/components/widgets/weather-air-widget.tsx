// Server component — pre-fetches weather + air quality for all major Macedonian cities
// Uses Open-Meteo (100% free, no API key needed)

import { WeatherAirClient, type CityData } from "./weather-air-client";

const CITIES = [
  { id: "skopje",    name: "Скопје",    lat: 41.9965, lon: 21.4314 },
  { id: "bitola",    name: "Битола",    lat: 41.0297, lon: 21.3294 },
  { id: "kumanovo",  name: "Куманово",  lat: 42.1322, lon: 21.7144 },
  { id: "prilep",    name: "Прилеп",    lat: 41.3453, lon: 21.5536 },
  { id: "tetovo",    name: "Тетово",    lat: 42.0103, lon: 20.9714 },
  { id: "gostivar",  name: "Гостивар",  lat: 41.7961, lon: 20.9086 },
  { id: "shtip",     name: "Штип",      lat: 41.7456, lon: 22.1961 },
  { id: "ohrid",     name: "Охрид",     lat: 41.1172, lon: 20.8016 },
  { id: "strumica",  name: "Струмица",  lat: 41.4363, lon: 22.6432 },
  { id: "struga",    name: "Струга",    lat: 41.1779, lon: 20.6778 },
  { id: "kavadarci", name: "Кавадарци", lat: 41.4330, lon: 22.0119 },
  { id: "gevgelija", name: "Гевгелија", lat: 41.1389, lon: 22.5058 },
  { id: "dojran",    name: "Дојран",    lat: 41.1925, lon: 22.6994 },
  { id: "kicevo",    name: "Кичево",    lat: 41.5128, lon: 20.9633 },
] as const;

async function fetchCityData(lat: number, lon: number): Promise<Pick<CityData, "weather" | "air">> {
  const [weatherRes, airRes] = await Promise.allSettled([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&timezone=Europe%2FBelgrade`,
      { next: { revalidate: 1800 } },
    ).then((r) => r.json()),
    fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,european_aqi`,
      { next: { revalidate: 3600 } },
    ).then((r) => r.json()),
  ]);

  const w = weatherRes.status === "fulfilled" ? (weatherRes.value as any)?.current : null;
  const a = airRes.status === "fulfilled" ? (airRes.value as any)?.current : null;

  return {
    weather: w
      ? {
          temp:      Math.round(w.temperature_2m),
          feelsLike: Math.round(w.apparent_temperature),
          humidity:  Math.round(w.relative_humidity_2m),
          windSpeed: Math.round(w.wind_speed_10m),
          code:      w.weather_code as number,
        }
      : null,
    air: a
      ? {
          aqi:  Math.round(a.european_aqi ?? 0),
          pm25: +((a.pm2_5 ?? 0) as number).toFixed(1),
          pm10: +((a.pm10  ?? 0) as number).toFixed(1),
        }
      : null,
  };
}

export async function WeatherAirWidget() {
  const cities: CityData[] = await Promise.all(
    CITIES.map(async (city) => ({
      ...city,
      ...(await fetchCityData(city.lat, city.lon).catch(() => ({ weather: null, air: null }))),
    })),
  );

  return <WeatherAirClient cities={cities} />;
}
