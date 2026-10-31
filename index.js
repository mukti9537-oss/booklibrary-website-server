import express from 'express'
import 'dotenv/config'
import { MongoClient } from 'mongodb';
const app = express();
const PORT = 8000



const client = new MongoClient(process.env.MONGODB_URL);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}
connectToMongoDB()


app.get('/', (req, res) => {
  res.send({message: 'server is running fine!'})
})

app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`)
})