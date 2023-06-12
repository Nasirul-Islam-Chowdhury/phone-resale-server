const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 7000;
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bbqqyyb.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const categoriesCollection = client
      .db("phone-resale")
      .collection("category");
    const phonesCollection = client
      .db("phone-resale")
      .collection("phones");

    app.get("/", (req, res) => {
      res.send("Phone resale server running");
    });


    app.get("/categories", async (req, res) => {
      const query = {};
      const categories = await categoriesCollection.find(query).toArray();
      res.send(categories);
    });

    app.get("/category/:name", async (req, res) => {
        const name = req.params.name;
        const query = {}
      const phones = await phonesCollection.find(query).toArray();
      const categoryItems = phones.filter(p=> p.brand == name)
      res.send(categoryItems);
    });
  } finally {
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Phone resale server running on port ${port}`);
});
