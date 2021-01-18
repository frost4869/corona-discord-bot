require("dotenv").config();
const fetch = require("node-fetch");
const Discord = require("discord.js");
const Nightmare = require('nightmare')
const screenshotSelector = require('nightmare-screenshot-selector');
Nightmare.action('screenshotSelector', screenshotSelector)
Nightmare.action('scrollIntoView', function (selector, done) {
  this.evaluate_now((selector) => {
    // https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView
    document.querySelector(selector).scrollIntoView(true)
  }, done, selector)
})

const client = new Discord.Client();
client.once("ready", () => {
  console.log("BOT READY !");
});

const ambulanceIcon = "\u{1F691}";
const deathIcon = "\u{1F480}";
const recoverIcon = "\u{1F496}";
const activeIcon = "\u{1F637}";
const mortalityIcon = "\u{1F4A4}";
const recoverRateIcon = "\u{1F4AA}";

console.log("[DEBUG] Bot is starting...");

client.on("message", (msg) => {
  if (msg.content != null) {
    if (isMentioned(msg.content)) fetchCovid(msg);
    if (isDaily(msg.content)) fetchDailyCovid(msg);
  }
});

function isMentioned(message) {
  return message.includes(".c ");
}

function isDaily(message) {
  return message.includes(".d ");
}


async function fetchDailyCovid(msg) {
  const { content, channel } = msg;
  const keyword = content.trim().split(".d ")[1];
  console.log(keyword);
  fetchDailyCountryCases(keyword, channel);
}

async function fetchCovid(msg) {
  const { content, channel } = msg;
  const keyword = content.trim().split(".c ")[1];
  const resp = await fetchCountryCases(keyword);
  fetchHistory(keyword, channel);
  if (resp.message) {
    channel.send(resp.message);
  } else {
    try {
      const {
        country,
        countryInfo,
        cases,
        todayCases,
        deaths,
        todayDeaths,
        recovered,
        active,
        updated,
      } = resp;
      const { flag } = countryInfo;
      const embed = new Discord.MessageEmbed()
        .setTitle(country)
        .setThumbnail(flag)
        .setDescription(`Last updated ${new Date(updated).toUTCString()}`)
        .addFields(
          {
            name: `Confirmed ${ambulanceIcon}`,
            value: `${formatNumber(cases)} ${todayCases > 0 ? `(+${todayCases})` : ""
              }`,
            inline: true,
          },
          {
            name: `Death ${deathIcon}`,
            value: `${formatNumber(deaths)} ${todayDeaths > 0 ? `(+${todayDeaths})` : ""
              }`,
            inline: true,
          }
        )
        .addFields(
          {
            name: `Recovered ${recoverIcon}`,
            value: `${formatNumber(recovered)}`,
            inline: true,
          },
          {
            name: `Actives ${activeIcon}`,
            value: `${formatNumber(active)}`,
            inline: true,
          }
        )
        .addFields(
          {
            name: `Mortality Rate ${mortalityIcon}`,
            value: `${((deaths * 100) / cases).toFixed(2)} %`,
            inline: true,
          },
          {
            name: `Recovery Rate ${recoverRateIcon}`,
            value: `${((recovered * 100) / cases).toFixed(2)}%`,
            inline: true,
          }
        );

      channel.send(embed);
    } catch (error) {
      channel.send("Bot dính covid mẹ gòi.");
      console.log(error);
    }
  }
}

async function fetchCountryCases(country) {
  const url = `https://corona.lmao.ninja/v3/covid-19/countries/${country}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.log(error);
  }
}

async function fetchDailyCountryCases(country, channel) {
  const url = `https://www.google.com/search?q=covid+${country}&hl=en`;
  try {
    const nightmare = Nightmare({
      // show: true,
      // waitTimeout: 1000,
      pollInterval: 50 //in ms
    })
    await nightmare
      .viewport(1440, 900)
      .goto(url)
      .wait('div.a6JJ0e')
      .scrollIntoView('div.PDn9ad')
      .wait(2000)
      .screenshotSelector({ selector: 'div.ZCpU8d' })

      // .screenshot('/Users/buufung/Desktop/Playground/corona-discord-bot/time.png')
      .end()
      .then(image => {
        const attachment = new Discord.MessageAttachment(image, 'chart.png');
        console.log(image)
        const embed = new Discord.MessageEmbed()
          .attachFiles(attachment)
          .setImage('attachment://chart.png');
        channel.send({ embed });
      })
      .catch(error => {
        console.error('Search failed:', error)
      })
  } catch (error) {
    console.log(error);
  }
}

function formatNumber(num) {
  return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
}

async function fetchHistory(country, channel) {
  const url = `https://corona.lmao.ninja/v3/covid-19/historical/${country}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data && data.timeline) {
      const { timeline } = data;
      const { cases, deaths, recovered } = timeline;
      const labels = Object.keys(cases);
      const chartData = {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Cases",
              data: Object.values(cases),
              fill: false,
              borderColor: "orange",
              pointBackgroundColor: "orange",
            },
            {
              label: "Deaths",
              data: Object.values(deaths),
              fill: false,
              borderColor: "red",
              pointBackgroundColor: "red",
            },
            {
              label: "Recovered",
              data: Object.values(recovered),
              fill: false,
              borderColor: "green",
              pointBackgroundColor: "green",
            },
          ],
        },
      };
      const chartUrl = `https://quickchart.io/chart?bkg=white&c=${JSON.stringify(
        chartData
      )}`;
      const embed = new Discord.MessageEmbed().setImage(chartUrl);
      channel.send(embed);
    }
  } catch (error) {
    console.log(error);
  }
}

client.login(process.env.TOKEN);
