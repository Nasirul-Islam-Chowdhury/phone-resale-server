const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const categoriesCollection = client.db("phone-resale").collection("category");
    const phonesCollection = client.db("phone-resale").collection("phones");
    const usersCollection = client.db("phone-resale").collection("users");
    const ordersCollection = client.db("phone-resale").collection("orders");

    app.get("/", (req, res) => {
      res.send("Phone resale server running");
    });

    app.get("/categories", async (req, res) => {
      const query = {};
      const categories = await categoriesCollection.find(query).toArray();
      res.send(categories);
    });

    app.get("/buyers", async (req, res) => {
      const query = {role: "Buyer"};
      const buyers = await usersCollection.find(query).toArray();
      res.send(buyers);
    });
    app.get("/sellers", async (req, res) => {
      const query = {role: "Seller"};
      const sellers = await usersCollection.find(query).toArray();
      res.send(sellers);
    });

    app.get("/category/:name", async (req, res) => {
      const name = req.params.name;
      const query = {};
      const phones = await phonesCollection.find(query).toArray();
      const categoryItems = phones.filter((p) => p.brand == name);
      res.send(categoryItems);
    });

    app.get("/phone/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const phone = await phonesCollection.find(query).toArray();
      res.send(phone);
    });

    app.get("/orders", async (req, res) => { 
      const email = req.query.email;
      const query = { email: email };
      const orders = await ordersCollection.find(query).toArray();
      res.send(orders);
    });

    app.post("/orders", async (req, res) => {
      const query = req.body;
      const order = await ordersCollection.insertOne(query);
      res.send(order);
    });

    app.post("/users", async (req, res) => {
      const query = req.body;
      const result = await usersCollection.insertOne(query);
      console.log(query, result);
      res.send(result);
    });
  } finally {
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Phone resale server running on port ${port}`);
});
