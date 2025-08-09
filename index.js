const express = require("express");
const cors = require("cors");
const {MongoClient, ServerApiVersion, ObjectId} = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

//firebase admin sdk
const admin = require("firebase-admin");

const decoded = Buffer.from(process.env.FB_SECRET_KEY, "base64").toString(
  "utf8"
);
const serviceAccount = JSON.parse(decoded);

//middleware
app.use(cors());
app.use(express.json());

const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({message: "authorized access"});
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.decoded = decoded;
    next();
  } catch {
    return res.status(401).send({message: "authorized access"});
  }
};
const verifyEmail = (req, res, next) => {
  if (req.query.email != req.decoded.email) {
    return res.status(403).send({message: "forbidden access"});
  }
  next();
};
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uri = `${process.env.DB_URI}`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // await client.connect();
    const eventCollection = client.db("unityworksDB").collection("events");
    const joinedEventCollection = client
      .db("unityworksDB")
      .collection("joinedEvents");
    const communityCollection = client
      .db("unityworksDB")
      .collection("communities");
    const subscibeCollection = client
      .db("unityworksDB")
      .collection("subscibers");
    app.get("/events", async (req, res) => {
      const category = req.query.category;
      const search = req.query.search;
      const today = new Date().toISOString();
      let query = {
        eventDate: {$gte: today},
      };
      if (search) {
        query.$or = [
          {title: {$regex: search, $options: "i"}},
          {description: {$regex: search, $options: "i"}},
          {location: {$regex: search, $options: "i"}},
        ];
      }
      if (category && category !== "all") {
        query.eventType = category;
      }
      const result = await eventCollection
        .find(query)
        .sort({eventDate: 1})
        .toArray();

      res.send(result);
    });

    //my events
    app.get("/myEvents", verifyFirebaseToken, verifyEmail, async (req, res) => {
      const email = req.query.email;
      const query = {email: email};
      const result = await eventCollection
        .find(query)
        .sort({eventDate: 1})
        .toArray();

      res.send(result);
    });

    //add events
    app.post("/add-event", verifyFirebaseToken, async (req, res) => {
      const eventData = req.body;
      const email = eventData.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({message: "forbidden access"});
      }

      const result = await eventCollection.insertOne(eventData);
      res.status(201).send({...result, message: "added event"});
    });

    // Update Events
    app.patch("/events/:id", verifyFirebaseToken, async (req, res) => {
      const {id} = req.params;
      if (req.headers.email !== req.decoded.email) {
        return res.status(403).send({message: "forbidden access"});
      }
      const updatedEventData = req.body;

      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set: updatedEventData,
      };
      const result = await eventCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Delete Events
    app.delete("/events/:id", verifyFirebaseToken, async (req, res) => {
      const {id} = req.params;

      if (req.headers.email !== req?.decoded.email) {
        return res.status(403).send({message: "forbidden access"});
      }
      const query = {_id: new ObjectId(id)};
      const result = await eventCollection.deleteOne(query);
      res.send(result);
    });

    //get single event
    app.get("/view-event/:id", verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      if (req.headers.email !== req.decoded.email) {
        return res.status(403).send({message: "forbidden access"});
      }
      const query = {_id: new ObjectId(id)};
      const result = await eventCollection.findOne(query);
      res.send(result);
    });

    // Joined event
    app.get(
      "/joined-events",
      verifyFirebaseToken,
      verifyEmail,
      async (req, res) => {
        const email = req.query.email;
        let query = {};
        if (email) {
          query = {userEmail: email};
        }
        const result = await joinedEventCollection
          .find(query)
          .sort({eventDate: 1})
          .toArray();

        res.send(result);
      }
    );
    app.get("/already-joined/:id", async (req, res) => {
      const id = req.params.id;
      const email = req.headers.email;
      const result = await joinedEventCollection.findOne({
        eventId: id,
        userEmail: email,
      });
      if (result) {
        res.send({isJoined: true});
      } else {
        res.send({isJoined: false});
      }
    });
    app.post("/join-event", async (req, res) => {
      const joinedEventData = req.body;
      const result = await joinedEventCollection.insertOne(joinedEventData);
      res.send(result);
    });
    app.patch("/join-event/:id", async (req, res) => {
      const {id} = req.params;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $inc: {
          participant: 1,
        },
      };
      const options = {upsert: true};
      const result = await eventCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    //community apis
    app.get("/community", async (req, res) => {
      const result = await communityCollection.find().toArray();
      res.send(result);
    });
    app.patch("/joinCommunity", async (req, res) => {
      try {
        const {communityId} = req.body;
        const {email} = req.body;

        const filter = {_id: new ObjectId(communityId)};
        const updateDoc = {
          $addToSet: {joinedMembers: email},
        };

        const result = await communityCollection.updateOne(filter, updateDoc);

        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .json({message: "Community not found or already joined"});
        }

        res.json({message: "Successfully joined the community"});
      } catch (error) {
        console.error(error);
        res.status(500).json({message: "Internal server error"});
      }
    });

    //subscribe
    app.post("/subscribe", async (req, res) => {
      const data = req.body
      const result = await subscibeCollection.insertOne(data);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ping: 1});
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    //     await client.close();
  }
}
run().catch(console.dir);
app.get("/", (req, res) => res.send("Hello World!"));
app.listen(port, () => console.log(`Example app listening on port ${port}!`));
