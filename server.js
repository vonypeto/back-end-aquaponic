require("dotenv").config();
// Dear Developer I am too lazy to  organize the file so I put all schema and routes on a single file :D
// Declare Middleware

//Application
const mongoose = require("mongoose");
const express = require("express");
//Middleware
const app = express();
const http = require("http");
const server = http.createServer(app);
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.json());

mongoose.set("strictQuery", false);
mongoose
  .connect(
    "mongodb+srv://vonypet:hetC55yOwwjI7ySR@cluster0.ljfkg0l.mongodb.net/?retryWrites=true&w=majority",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log("Connected to the database!");
  })
  .catch((err) => {
    console.log("Cannot connect to the database!", err);
    process.exit();
  });

// Welcome page API
app.get("/", (_, res) => {
  res.json({ message: "Welcome to Aquaponic application anjo and friends." });
});

const aquaponicSchema = mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId },

    battery_percentage: { type: String },
    led_status: { type: Boolean },
    data_sensors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "data_sensors",
      },
    ],
  },
  { timestamps: true }
);
aquaponicSchema.method("toJSON", function () {
  const { __v, _id, ...object } = this.toObject();
  object.auth_id = _id;
  return object;
});

const sensorsSchema = mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId },
    tds: { type: String },
    ph_leveling: { type: String },
    battery_percentage: { type: String },
    temperature: { type: String },
  },
  { timestamps: true }
);
sensorsSchema.method("toJSON", function () {
  const { __v, _id, ...object } = this.toObject();
  object.auth_id = _id;
  return object;
});
const dataCollection = mongoose.model("data_collection", aquaponicSchema);
const dataSensors = mongoose.model("data_sensors", sensorsSchema);

app.post("/api/send", async (req, res) => {
  const sensorDataId = new mongoose.Types.ObjectId();
  const dataCollectionDataId = new mongoose.Types.ObjectId();
  console.log(req.body);
  try {
    const prevData = await dataCollection.find();
    if (prevData.length) {
      const sensorData = new dataSensors({
        _id: sensorDataId,
        tds: req.body?.tds,
        ph_leveling: req.body?.ph_leveling,
        temperature: req.body?.temperature,
        battery_percentage: req.body?.battery_percentage,
      });
      await sensorData.save();

      const dataCollectionData = await dataCollection.findOneAndUpdate(
        { _id: prevData[0]._id },
        {
          $set: {
            battery_percentage: req.body.battery_percentage,
            led_status: req.body.led_status,
          },
          $push: { data_sensors: sensorDataId },
        },
        { new: true }
      );
      await dataCollectionData.save();

      return res.json({ data: "prev" });
    } else {
      const sensorData = new dataSensors({
        _id: sensorDataId,
        tds: req.body?.tds,
        ph_leveling: req.body?.ph_leveling,
        temperature: req.body?.temperature,
        battery_percentage: req.body?.battery_percentage,
      });
      await sensorData.save();

      const dataCollectionData = new dataCollection({
        _id: dataCollectionDataId,
        data_sensors: [sensorDataId],
      });
      await dataCollectionData.save();
      return res.json("Data Saved");
    }
  } catch (error) {
    return res.json("Error: " + error);
  }
});

app.get("/api/get_data", async (req, res) => {
  console.log(req.query);
  try {
    await dataCollection
      .find()
      .populate({
        path: "data_sensors",
        model: "data_sensors",
        options: {
          limit: req.query?.result,
          sort: { createdAt: -1 },
          skip: req.query?.start,
        },
      })
      .then((response) => {
        //  console.log(response);
        var t = JSON.stringify(response[0]);

        res.json(t);
      });
  } catch (error) {
    return res.json("Error: " + error);
  }
});
// set port, listen for requests
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
