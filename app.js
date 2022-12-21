const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
const convert = require("xml-js");

const fs = require("fs");

const Koa = require("koa");
const app = new Koa();

const cors = require('@koa/cors');
app.use(cors());

app.use(async (ctx) => {
  const carparksInfo = await getCarparks();

  const id = ctx.query.id || null;
  const { lat, lng } = ctx.query;

  let xml;
  let data;

  try {
    const response = await fetch("https://dsat.apigateway.data.gov.mo/car_park_maintance", {
      method: "get",
      headers: {
        Authorization: "APPCODE 09d43a591fba407fb862412970667de4",
      },
    });

    xml = await response.text();

    data = JSON.parse(
      convert.xml2json(xml, {
        compact: true,
        spaces: 2,
      })
    );

    fs.writeFileSync("./car_park_maintance.xml", xml);
  } catch (error) {
    xml = fs.readFileSync("./car_park_maintance.xml", "utf8");

    data = JSON.parse(
      convert.xml2json(xml, {
        compact: true,
        spaces: 2,
      })
    );
  }

  const carparks = data.CarPark.Car_park_info.map((carpark) => {
    const carparkInfo = carparksInfo.find((one) => {
      return one._attributes.CP_ID === carpark._attributes.ID;
    });

    return {
      ID: carpark._attributes.ID,
      name: carpark._attributes.name,
      address: carparkInfo._attributes.LocationC,
      car: carpark._attributes.Car_CNT,
      motor: carpark._attributes.MB_CNT,
      time: carpark._attributes.Time,
      coordinates: {
        lat: carparkInfo._attributes.X_coords,
        lng: carparkInfo._attributes.Y_coords,
      },
    };
  });

  if (id) {
    ctx.body = carparks.find((one) => {
      return one.ID === id;
    });
  } else {
    if (lat && lng) {
      const coordinates = {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      };

      carparks.forEach((carpark) => {
        carpark.distance = calculateDistance(
          coordinates.lat,
          coordinates.lng,
          carpark.coordinates.lat,
          carpark.coordinates.lng,
          "K"
        );
      });

      carparks.sort((a, b) => {
        return a.distance - b.distance;
      });
    }

    ctx.body = carparks;
  }
});

app.listen(3000);

async function getCarparks() {
  let xml;
  let data;

  try {
    const response = await fetch("https://dsat.apigateway.data.gov.mo/car_park_detail", {
      method: "get",
      headers: {
        Authorization: "APPCODE 09d43a591fba407fb862412970667de4",
      },
    });

    xml = await response.text();

    data = JSON.parse(
      convert.xml2json(xml, {
        compact: true,
        spaces: 2,
      })
    );

    fs.writeFileSync("./car_park_detail.xml", xml);
  } catch (error) {
    xml = fs.readFileSync("./car_park_detail.xml", "utf8");

    data = JSON.parse(
      convert.xml2json(xml, {
        compact: true,
        spaces: 2,
      })
    );
  }

  return data.CarPark.Car_park_info;
}

function calculateDistance(lat1, lon1, lat2, lon2, unit) {
  var radlat1 = (Math.PI * lat1) / 180;
  var radlat2 = (Math.PI * lat2) / 180;
  var radlon1 = (Math.PI * lon1) / 180;
  var radlon2 = (Math.PI * lon2) / 180;
  var theta = lon1 - lon2;
  var radtheta = (Math.PI * theta) / 180;
  var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
  dist = Math.acos(dist);
  dist = (dist * 180) / Math.PI;
  dist = dist * 60 * 1.1515;
  if (unit == "K") {
    dist = dist * 1.609344;
  }
  if (unit == "N") {
    dist = dist * 0.8684;
  }
  return dist;
}
