// Weather requests never include MyPlan credentials. Device location requires browser permission.
export function validCity(city) {
  return (
    typeof city?.name === "string" &&
    city.name.length > 0 &&
    Number.isFinite(city.latitude) &&
    Math.abs(city.latitude) <= 90 &&
    Number.isFinite(city.longitude) &&
    Math.abs(city.longitude) <= 180
  );
}
export function readWeatherCity(key) {
  try {
    const city = JSON.parse(localStorage.getItem(key));
    return validCity(city) ? city : null;
  } catch {
    return null;
  }
}
async function getJson(url, signal) {
  const response = await fetch(url, {
    signal,
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) throw new Error("Serviço indisponível.");
  const data = await response.json();
  if (data.error) throw new Error("Resposta indisponível.");
  return data;
}
export async function searchCities(query, signal) {
  const params = new URLSearchParams({
    name: query.trim(),
    count: "5",
    language: "pt",
    format: "json",
  });
  const data = await getJson(
    `https://geocoding-api.open-meteo.com/v1/search?${params}`,
    signal,
  );
  return (data.results || [])
    .map((city) => ({
      name: [city.name, city.admin1, city.country]
        .filter((value, index, all) => value && all.indexOf(value) === index)
        .join(", "),
      latitude: city.latitude,
      longitude: city.longitude,
    }))
    .filter(validCity);
}
export async function fetchWeather(city, signal) {
  // Region coordinates come from a selected city or permission granted in the browser.
  const params = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    current: "temperature_2m,weather_code,is_day",
    daily:
      "temperature_2m_min,temperature_2m_max,precipitation_probability_max",
    forecast_days: "1",
    timezone: "auto",
    temperature_unit: "celsius",
  });
  const data = await getJson(
    `https://api.open-meteo.com/v1/forecast?${params}`,
    signal,
  );
  if (!Number.isFinite(data.current?.temperature_2m))
    throw new Error("Temperatura indisponível.");
  return {
    temperature: data.current.temperature_2m,
    code: data.current.weather_code,
    isDay: data.current.is_day !== 0,
    min: data.daily?.temperature_2m_min?.[0],
    max: data.daily?.temperature_2m_max?.[0],
    rain: data.daily?.precipitation_probability_max?.[0],
    updatedAt: Date.now(),
  };
}
export function weatherCondition(code, isDay = true) {
  if (code === 0) return { label: "Céu limpo", icon: isDay ? "sun" : "moon" };
  if (code === 1)
    return { label: "Poucas nuvens", icon: isDay ? "sun" : "moon" };
  if (code === 2) return { label: "Parcialmente nublado", icon: "cloud" };
  if (code === 3) return { label: "Nublado", icon: "cloud" };
  if ([45, 48].includes(code)) return { label: "Neblina", icon: "cloud" };
  if ([51, 53, 55, 56, 57].includes(code))
    return { label: "Garoa", icon: "rain" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code))
    return { label: "Chuva", icon: "rain" };
  if ([71, 73, 75, 77, 85, 86].includes(code))
    return { label: "Neve", icon: "snow" };
  if ([95, 96, 99].includes(code)) return { label: "Trovoadas", icon: "storm" };
  return { label: "Condição indisponível", icon: "cloud" };
}
export const temperatureLabel = (value) =>
  Number.isFinite(value) ? `${Math.round(value)}°` : "—";

export function readWeatherMode(key) {
  try {
    const value = localStorage.getItem(key);
    return ["auto", "manual", "off"].includes(value) ? value : "auto";
  } catch {
    return "auto";
  }
}
let pendingLocation;
export function requestDeviceRegion() {
  if (pendingLocation) return pendingLocation;
  pendingLocation = new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new Error("Localização indisponível. Você pode buscar uma cidade."),
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          name: "Sua localização atual",
          latitude: Number(coords.latitude.toFixed(2)),
          longitude: Number(coords.longitude.toFixed(2)),
        }),
      (error) =>
        reject(
          new Error(
            error.code === 1
              ? "Localização não autorizada. Permita o acesso no navegador ou busque uma cidade."
              : "Não foi possível localizar você. Tente novamente ou busque uma cidade.",
          ),
        ),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  }).finally(() => {
    pendingLocation = null;
  });
  return pendingLocation;
}
