const { downloadMediaMessage } = require('baileys');
const { flag } = require("country-emoji");

const { Poll } = require('./Poll');
const messageAI = require("./ai/MessageAI");

const { saveMessage } = require('./MessageDatabase');

module.exports = async function messageRequest(sock, msg, polls) {
  const jid = msg.key.remoteJid;
  const message = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || "";
  const isGroup = jid?.endsWith('@g.us');

  const args = message.split(" ").slice(1).join(" ");
  if (message === ".weather") {
    const reply = msg.message.extendedTextMessage?.contextInfo;
    if (!reply) return;

    const location = reply.quotedMessage?.locationMessage;
    if (!location) return;

    const w = await weather(location.degreesLatitude, location.degreesLongitude);
    const { current_units, current, daily_units, daily } = w;
    const date = new Date(current.time);
    const iminutes = current.interval / 60;
    sock.sendMessage(jid, {
    text: `
*Good ${date.getHours() > 12 ? "afternoon" : date.getHours() > 18 ? "evening" : "morning"}!*

*Current Weather*
The time of update is ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")} in the ${w.timezone} timezone (${w.timezone_abbreviation}).
Weather updates every ${iminutes.toFixed(1)} minute${iminutes == 1 ? "" : "s"}.

_Temperature and humidity is always measured 2 meters above ground._
_Wind data is always measured 10 metres above ground._

*The current air temperature is ${current.temperature_2m}${current_units.temperature_2m}, but feels like ${current.apparent_temperature}${current_units.apparent_temperature}.*
The relative humidity is ${current.relative_humidity_2m}${current_units.relative_humidity_2m}.
It is currently ${current.is_day == 1 ? "day" : "night"}time.

*Precipitation is ${current.precipitation}${current_units.precipitation}.*
- Rain is ${current.rain}${current_units.rain}.
- Showers are ${current.showers}${current_units.showers}.
- Snowfall is ${current.snowfall}${current_units.snowfall}.

Clouds are covering ${current.cloud_cover}${current_units.cloud_cover} of the sky.
Winds speeds are reaching up to ${current.wind_speed_10m}${current_units.wind_speed_10m}, with gusts up to ${current.wind_gusts_10m}${current_units.wind_gusts_10m}, from ${current.wind_direction_10m}${current_units.wind_direction_10m}.

The current surface pressure is ${current.surface_pressure}${current_units.surface_pressure} and the atmospheric air pressure reduced to mean sea level is ${current.pressure_msl}${current_units.pressure_msl}.

*Weather for the week*
` + daily.time.map((time, i) => `
*${new Date(time).toDateString()}*
- Temperature: *${daily.temperature_2m_min[i]}${daily_units.temperature_2m_min} - ${daily.temperature_2m_max[i]}${daily_units.temperature_2m_max}*
- Feels like: *${daily.apparent_temperature_min[i]}${daily_units.apparent_temperature_min} - ${daily.apparent_temperature_max[i]}${daily_units.apparent_temperature_max}*
- Maximum Wind Speed: *${daily.wind_speed_10m_max[i]}${daily_units.wind_speed_10m_max}*
- Maximum UV Index: *${daily.uv_index_max[i]}${daily_units.uv_index_max}*
  `).join("")
    });
  }

  async function readRecipe(meal) {
    var ingredients = [];
    for (let i = 0; i < 20; i++) {
      const name = meal["strIngredient" + (i + 1)]?.trim?.();
      const measure = meal["strMeasure" + (i + 1)]?.trim?.();
      if (!name) break;

      ingredients.push(`${name.toLowerCase().replace(/\b\w/g, m => m.toUpperCase())}${measure ? ": *" + measure + "*" : ""}`);
    }
    sock.sendMessage(jid, {
    image: {
      url: meal.strMealThumb
    },
    caption: `
*${meal.strMeal.trim()}*
_${meal.strCategory} | ${meal.strCountry}_

*Ingredients*
${ingredients.join("\n")}

*Instructions*
${meal.strInstructions.split("\n").map(t => (t.trim() ? "> " + t.trim() : "").replace(/[a-zA-Z]/, m => m.toUpperCase())).join("\n")}
${meal.strSource ? `\nSource: ${meal.strSource}` : ""}${meal.strYoutube ? `\nYouTube Video: ${meal.strYoutube}` : ""}
  `
    });
  }

  async function listMeals(meals) {
    meals.length = Math.min(meals.length, 12);
    if (meals.length > 1) {
    const poll = new Poll(await sock.sendMessage(jid, {
      poll: {
      name: "Search Result(s)",
      values: meals.map((m, i) => `${flag(m.strCountry)} ${m.strMeal}`),
      selectableCount: 1,
      toAnnouncementGroup: false
      }
    }));
    poll.onUpdate = option => readRecipe(meals.find(m => `${flag(m.strCountry)} ${m.strMeal}` == option));
    polls.set(poll.msg.key.id, poll);
    } else if (meals.length == 1) {
    readRecipe(meals[0]);
    } else {
    await sock.sendMessage(
      jid,
      {
      react: {
        text: '❓',
        key: msg.key
      }
      }
    );
    }
  }

  if (message.startsWith(".meal")) {
    const search = encodeURIComponent(args);
    const searchResult = await fetch(MEAL_ENDPOINT + "search.php?s=" + search);
    console.log(searchResult.url);
    const res = await searchResult.json();
    const meals = res.meals ?? [];
    listMeals(meals);
  }

  if (message.startsWith(".dad")) {
    const headers = { "Accept": "text/plain" };
    const q = await fetch("https://icanhazdadjoke.com/", { headers });
    const text = await q.text();
    await sock.sendMessage(jid, { text });
  }
  
  messageAI(sock, msg, polls);
}