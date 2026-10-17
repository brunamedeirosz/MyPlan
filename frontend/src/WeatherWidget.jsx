import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import {
  fetchWeather,
  readWeatherCity,
  readWeatherMode,
  requestDeviceRegion,
  searchCities,
  temperatureLabel,
  weatherCondition,
} from "./weather";

export default function WeatherWidget({ username }) {
  const storageKey = `myplan:${username}:weather-city`;
  const modeKey = `myplan:${username}:weather-mode`;
  const [mode, setMode] = useState(() => readWeatherMode(modeKey));
  const [city, setCity] = useState(() =>
    mode === "manual" ? readWeatherCity(storageKey) : null,
  );
  const [locationStatus, setLocationStatus] = useState(
    mode === "auto" ? "locating" : "idle",
  );
  const [locationRefresh, setLocationRefresh] = useState(0);
  const [resource, setResource] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const details = useRef(null);
  const requestKey = city
    ? `${city.latitude}:${city.longitude}:${refresh}`
    : "";
  const current = resource?.key === requestKey ? resource : null;
  const weather = current?.data;
  const loading = Boolean(city && !current);
  const condition = weatherCondition(weather?.code, weather?.isDay);

  useEffect(() => {
    try {
      localStorage.setItem(modeKey, mode);
      if (mode === "manual" && city)
        localStorage.setItem(storageKey, JSON.stringify(city));
      else localStorage.removeItem(storageKey);
    } catch {
      /* Weather also works without local storage. */
    }
  }, [city, storageKey, mode, modeKey]);
  useEffect(() => {
    if (mode !== "auto") return;
    let disposed = false;
    requestDeviceRegion().then(
      (region) => {
        if (disposed) return;
        setCity(region);
        setLocationStatus("ready");
        setMessage("");
      },
      (error) => {
        if (disposed) return;
        setCity(null);
        setLocationStatus("error");
        setMessage(error.message);
      },
    );
    const startedAt = Date.now();
    const updateLocation = () => {
      if (!document.hidden && Date.now() - startedAt >= 30 * 60 * 1000)
        setLocationRefresh((value) => value + 1);
    };
    const interval = setInterval(updateLocation, 30 * 60 * 1000);
    document.addEventListener("visibilitychange", updateLocation);
    return () => {
      disposed = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", updateLocation);
    };
  }, [mode, locationRefresh]);
  useEffect(() => {
    if (!city) return;
    const controller = new AbortController();
    let disposed = false;
    const timeout = setTimeout(() => controller.abort(), 12000);
    fetchWeather(city, controller.signal)
      .then(
        (data) => {
          if (!disposed) setResource({ key: requestKey, data });
        },
        () => {
          if (!disposed)
            setResource({
              key: requestKey,
              error: "Não foi possível carregar o tempo. Tente novamente.",
            });
        },
      )
      .finally(() => clearTimeout(timeout));
    const startedAt = Date.now();
    const onVisible = () => {
      if (!document.hidden && Date.now() - startedAt >= 30 * 60 * 1000)
        setRefresh((value) => value + 1);
    };
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(
      () => {
        if (!document.hidden) setRefresh((value) => value + 1);
      },
      30 * 60 * 1000,
    );
    return () => {
      disposed = true;
      clearTimeout(timeout);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      controller.abort();
    };
  }, [city, requestKey]);
  useEffect(() => {
    const node = details.current;
    const dismiss = (event) => {
      if (!node.open) return;
      if (event.type === "keydown" && event.key === "Escape") {
        node.open = false;
        node.querySelector("summary").focus();
      } else if (
        (event.type === "pointerdown" || event.type === "focusin") &&
        !node.contains(event.target)
      )
        node.open = false;
    };
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismiss);
    return () => {
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("focusin", dismiss);
    };
  }, []);
  const chooseCity = (next) => {
    setMode(next ? "manual" : "off");
    setLocationStatus("idle");
    setCity(next);
    setResource(null);
    setMessage("");
    setResults([]);
    setQuery("");
  };
  const activateLocation = () => {
    setMode("auto");
    setCity(null);
    setResource(null);
    setMessage("");
    setResults([]);
    setLocationStatus("locating");
    setLocationRefresh((value) => value + 1);
  };
  const search = async (event) => {
    event.preventDefault();
    if (query.trim().length < 2 || busy) return;
    setBusy(true);
    setMessage("");
    setResults([]);
    try {
      const cities = await searchCities(query, AbortSignal.timeout(12000));
      setResults(cities);
      if (!cities.length)
        setMessage("Cidade não encontrada. Tente incluir o estado.");
    } catch {
      setMessage("Não foi possível buscar a cidade. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      className="weather-widget weather-card"
      aria-label="Previsão do tempo"
    >
      <div className="weather-heading">
        <h2>Tempo hoje</h2>
        <a
          className="weather-source"
          href="https://open-meteo.com/"
          target="_blank"
          rel="noreferrer"
        >
          Open-Meteo
        </a>
      </div>
      {city && <p className="weather-place">{city.name}</p>}
      <div className="weather-current" aria-live="polite">
        {mode === "auto" && locationStatus === "locating" && (
          <p role="status">Localizando…</p>
        )}
        {loading && <p role="status">Consultando a previsão…</p>}
        {!city && locationStatus !== "locating" && (
          <p className="weather-placeholder">
            <span className="weather-placeholder-full">
              Permita a localização ou escolha uma cidade nas opções abaixo.
            </span>
            <span className="weather-placeholder-short">
              Ative o tempo nas opções.
            </span>
          </p>
        )}
        {current?.error && <p className="weather-error">{current.error}</p>}
        {weather && (
          <>
            <div className="weather-now">
              <Icon name={condition.icon} size={32} />
              <strong>
                {temperatureLabel(weather.temperature)}
                <small>C</small>
              </strong>
              <span>{condition.label}</span>
            </div>
            <WeatherStats weather={weather} />
          </>
        )}
      </div>

      <details className="weather-settings" ref={details}>
        <summary>{city ? "Opções" : "Escolher localização"}</summary>
        <div className="weather-mobile-details">
          {city && <p className="weather-place">{city.name}</p>}
          {weather && <WeatherStats weather={weather} />}
        </div>
        {weather && (
          <p className="weather-updated">
            Atualizado às{" "}
            {new Date(weather.updatedAt).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
        {city && (
          <div className="weather-actions">
            <button
              disabled={loading}
              onClick={() => {
                if (mode === "auto") activateLocation();
                else setRefresh((value) => value + 1);
              }}
            >
              Atualizar tempo
            </button>
            <button onClick={() => chooseCity(null)}>
              {mode === "auto" ? "Desativar tempo" : "Remover cidade"}
            </button>
          </div>
        )}
        <button
          className="weather-location-button secondary-button"
          disabled={mode === "auto" && locationStatus === "locating"}
          onClick={activateLocation}
        >
          {mode === "auto" && locationStatus === "locating"
            ? "Localizando…"
            : "Usar minha localização"}
        </button>
        {mode === "auto" && !city && (
          <button
            className="weather-location-button secondary-button"
            onClick={() => chooseCity(null)}
          >
            Desativar tempo
          </button>
        )}
        <form className="weather-search" onSubmit={search}>
          <label htmlFor="weather-city">
            {city ? "Trocar cidade" : "Buscar cidade"}
          </label>
          <div>
            <input
              id="weather-city"
              autoComplete="off"
              placeholder="Ex.: Brasília"
              minLength={2}
              maxLength={100}
              value={query}
              disabled={busy}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button
              className="secondary-button"
              disabled={busy || query.trim().length < 2}
            >
              {busy ? "Buscando…" : "Buscar"}
            </button>
          </div>
        </form>
        {message && (
          <p role="status" className="weather-message">
            {message}
          </p>
        )}
        {results.length > 0 && (
          <ul className="weather-results" aria-label="Cidades encontradas">
            {results.map((result) => (
              <li key={`${result.latitude}:${result.longitude}`}>
                <button disabled={busy} onClick={() => chooseCity(result)}>
                  {result.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="weather-privacy">
          Com sua permissão, usamos a localização aproximada para consultar o
          tempo na Open-Meteo. Você também pode escolher uma cidade.
        </p>
        <p className="weather-credit">
          Previsão:{" "}
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>{" "}
          · Cidades:{" "}
          <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">
            GeoNames
          </a>
        </p>
      </details>
    </section>
  );
}

function WeatherStats({ weather }) {
  return (
    <div className="weather-stats">
      <span>
        Mínima<strong>{temperatureLabel(weather.min)}</strong>
      </span>
      <span>
        Máxima<strong>{temperatureLabel(weather.max)}</strong>
      </span>
      <span>
        Chuva
        <strong>
          {Number.isFinite(weather.rain) ? `${Math.round(weather.rain)}%` : "—"}
        </strong>
      </span>
    </div>
  );
}
