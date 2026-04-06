"use client"

import { useState, useRef, useEffect } from "react"

export interface CityWeather {
  temp: number
  feelsLike: number
  humidity: number
  windSpeed: number
  code: number
}

export interface CityAir {
  aqi: number
  pm25: number
  pm10: number
}

export interface CityData {
  id: string
  name: string
  weather: CityWeather | null
  air: CityAir | null
}

function weatherInfo(code: number) {
  if (code === 0) return { label: "Ведро", icon: "☀️" }
  if (code <= 2) return { label: "Претежно ведро", icon: "🌤️" }
  if (code === 3) return { label: "Облачно", icon: "☁️" }
  if (code <= 48) return { label: "Магла", icon: "🌫️" }
  if (code <= 57) return { label: "Ситна киша", icon: "🌦️" }
  if (code <= 67) return { label: "Дожд", icon: "🌧️" }
  if (code <= 77) return { label: "Снег", icon: "❄️" }
  if (code <= 82) return { label: "Врнежи", icon: "🌦️" }
  if (code <= 86) return { label: "Снежни врнежи", icon: "🌨️" }
  return { label: "Бура", icon: "⛈️" }
}

function aqiInfo(aqi: number): { label: string; color: string } {
  if (aqi <= 20) return { label: "Одличен", color: "#10b981" }
  if (aqi <= 40) return { label: "Добар", color: "#84cc16" }
  if (aqi <= 60) return { label: "Умерен", color: "#f59e0b" }
  if (aqi <= 80) return { label: "Лош", color: "#f97316" }
  if (aqi <= 100) return { label: "Многу лош", color: "#ef4444" }
  return { label: "Опасен", color: "#8b5cf6" }
}

export function WeatherAirClient({ cities }: { cities: CityData[] }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  const city = cities[activeIdx]!
  const { weather, air } = city
  const wInfo = weather ? weatherInfo(weather.code) : null
  const aInfo = air ? aqiInfo(air.aqi) : null
  const aqiPct = air ? Math.min((air.aqi / 120) * 100, 96) : 0

  function checkScroll() {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }

  useEffect(() => {
    checkScroll()
  }, [])

  useEffect(() => {
    buttonRefs.current[activeIdx]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    })
  }, [activeIdx])

  function scrollBy(dir: -1 | 1) {
    scrollRef.current?.scrollBy({ left: dir * 120, behavior: "smooth" })
  }

  function select(i: number) {
    setActiveIdx(i)
  }

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm overflow-hidden">
      {/* ── City tabs ── */}
      <div className="relative flex items-center border-b border-neutral-100 dark:border-neutral-800/80">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scrollBy(-1)}
            className="absolute left-0 z-10 h-full px-1.5 bg-gradient-to-r from-white dark:from-neutral-950 to-transparent flex items-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex items-center gap-0.5 px-3 py-2 overflow-x-auto scrollbar-none flex-1"
        >
          <span className="text-base mr-1.5 shrink-0 select-none">🇲🇰</span>
          {cities.map((c, i) => (
            <button
              key={c.id}
              ref={(el) => {
                buttonRefs.current[i] = el
              }}
              onClick={() => select(i)}
              className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                i === activeIdx ?
                  "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              {c.name}
              {c.weather && i !== activeIdx && (
                <span className="text-[11px] font-normal text-neutral-400">
                  {c.weather.temp}°
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scrollBy(1)}
            className="absolute right-0 z-10 h-full px-1.5 bg-gradient-to-l from-white dark:from-neutral-950 to-transparent flex items-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2">
        {/* Weather panel */}
        <div className="flex items-center gap-5 px-5 py-5 sm:border-r border-neutral-100 dark:border-neutral-800 border-b sm:border-b-0">
          <div className="text-6xl leading-none select-none shrink-0">
            {wInfo?.icon ?? "—"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-end gap-2 leading-none">
              <span className="text-5xl font-black text-neutral-900 dark:text-white tabular-nums">
                {weather?.temp ?? "—"}°
              </span>
              {weather?.feelsLike !== undefined && (
                <span className="text-sm text-neutral-400 mb-1">
                  чув. {weather.feelsLike}°
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mt-1.5">
              {wInfo?.label ?? "Нема податоци"}
            </p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs font-medium text-neutral-400">
              {weather?.humidity !== undefined && (
                <span className="flex items-center gap-1">
                  <span>💧</span>
                  {weather.humidity}%
                </span>
              )}
              {weather?.windSpeed !== undefined && (
                <span className="flex items-center gap-1">
                  <span>💨</span>
                  {weather.windSpeed} km/h
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Air quality panel */}
        <div className="px-5 py-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
              Квалитет на воздух
            </span>
            {aInfo && (
              <span
                className="text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: aInfo.color + "22",
                  color: aInfo.color,
                }}
              >
                {aInfo.label}
              </span>
            )}
          </div>

          {air ?
            <div className="space-y-3">
              <div>
                <div
                  className="relative h-2.5 rounded-full"
                  style={{
                    background:
                      "linear-gradient(to right, #10b981, #84cc16, #f59e0b, #f97316, #ef4444, #8b5cf6)",
                  }}
                >
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-[3px] shadow-md transition-all duration-500"
                    style={{
                      left: `calc(${aqiPct}% - 8px)`,
                      borderColor: aInfo?.color ?? "#10b981",
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                  <span>Одличен</span>
                  <span
                    className="font-bold tabular-nums"
                    style={{ color: aInfo?.color }}
                  >
                    AQI {air.aqi}
                  </span>
                  <span>Опасен</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-neutral-50 dark:bg-neutral-900 px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide mb-0.5">
                    PM2.5
                  </p>
                  <p className="text-lg font-black text-neutral-800 dark:text-neutral-100 tabular-nums leading-tight">
                    {air.pm25}
                    <span className="text-xs font-normal text-neutral-400 ml-0.5">
                      μg/m³
                    </span>
                  </p>
                </div>
                <div className="rounded-xl bg-neutral-50 dark:bg-neutral-900 px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide mb-0.5">
                    PM10
                  </p>
                  <p className="text-lg font-black text-neutral-800 dark:text-neutral-100 tabular-nums leading-tight">
                    {air.pm10}
                    <span className="text-xs font-normal text-neutral-400 ml-0.5">
                      μg/m³
                    </span>
                  </p>
                </div>
              </div>
            </div>
          : <p className="text-sm text-neutral-400 mt-2">
              Нема податоци за квалитетот на воздухот.
            </p>
          }
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="px-5 py-2 bg-neutral-50/80 dark:bg-neutral-900/50 border-t border-neutral-100 dark:border-neutral-800/60 flex justify-between items-center">
        <span className="text-[10px] text-neutral-400">
          Извор: Open-Meteo · Реал-тајм
        </span>
        <a
          href="https://open-meteo.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
        >
          open-meteo.com →
        </a>
      </div>
    </div>
  )
}
