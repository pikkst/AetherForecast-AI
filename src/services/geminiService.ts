import { GoogleGenAI } from "@google/genai";
import { WeatherData, WeatherAnalysis } from "../types";

export async function analyzeWeather(data: WeatherData): Promise<WeatherAnalysis | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const current = data.current;
    const daily = data.daily;
    
    const prompt = `You are an advanced data scientist and meteorologist. Analyze the following weather data and provide a deep "predictive model" and data science overview.
    
    CURRENT STATE:
    - Temperature: ${current.temperature_2m}°C
    - Apparent Temperature: ${current.apparent_temperature}°C
    - Humidity: ${current.relative_humidity_2m}%
    - Wind Speed: ${current.wind_speed_10m} km/h
    - Cloud Cover: ${current.cloud_cover}%
    - Pressure: ${current.surface_pressure} hPa
    
    7-DAY PROGRAM (Min/Max temp):
    ${daily.time.map((t, i) => `${t}: ${daily.temperature_2m_min[i]}...${daily.temperature_2m_max[i]}°C`).join('\n')}
    
    Respond in JSON format based on the following schema:
    {
      "summary": "Short summary of current situation",
      "prediction": "Data science prediction for next 48 hours based on trends",
      "scientificInsights": "Meteorological explanation of why the weather is like this (pressure systems, fronts, etc)",
      "recommendations": ["recommendation 1", "recommendation 2"]
    }
    
    Write responses in ENGLISH.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    if (response.text) {
      return JSON.parse(response.text.trim()) as WeatherAnalysis;
    }
    return null;
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return null;
  }
}

export async function predictLongTermWeather(location: string, date: string): Promise<{ prediction: string, confidence: number } | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `You are a climate scientist. A user wants to know the forecast at location "${location}" on date ${date}.
    Since this is the distant future, analyze historical climate patterns (climate normals) and provide a data science prediction.
    
    Consider:
    1. Regional seasonality.
    2. Global trends.
    3. Statistical probability.
    
    Respond in JSON format:
    {
      "prediction": "In-depth explanation and temperature/weather expectation (In English)",
      "confidence": 0-100 (number, how confident you are based on historical variability)
    }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
    return null;
  } catch (error) {
    console.error("Long term prediction error:", error);
    return null;
  }
}

export async function analyzeModelPerformance(logs: any[]): Promise<string | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const logSummary = logs.map(l => ({
      loc: l.location,
      err: l.errorDelta,
      var: l.modelVariant,
      time: l.timestamp
    })).slice(0, 20);

    const prompt = `You are a Data Science Auditor. Analyze the following model performance logs and provide a 2-sentence highly technical insight in English.
    Focus on specific patterns (e.g., "The model is overestimating in coastal areas due to dew point miscalculation").
    
    LOGS:
    ${JSON.stringify(logSummary)}
    
    Insight (Max 2 sentences, Technical English):`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });

    return response.text;
  } catch (error) {
    console.error("Performance analysis error:", error);
    return "Insufficient telemetry for neural drift analysis.";
  }
}
