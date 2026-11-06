import express, { application } from 'express'
import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb';
import multer from 'multer';
import cors from 'cors'
import {  createRemoteJWKSet, jwtVerify } from 'jose';
const app = express();
const PORT = 8000

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true,
}))
app.use(express.json())



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
const mongoClient = await connectToMongoDB();
const db = mongoClient.db("booklibrary-website")
const addbookcollection = db.collection("addbook")
const borrowbookCollection = db.collection("borrowbook")

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization
    console.log(authHeader)

    if(!authHeader){
        return res.status(401).send({msg: 'unauthorized!'})
    }

    const token = authHeader.split(" ")[1]
    if(!token){
        return res.status(401).send({msg: 'unauthorized!'})
    }

    const JWKS = createRemoteJWKSet(new URL('http://localhost:3000/api/auth/jwks'))

    try {
        const{payload} = await jwtVerify(token, JWKS)
          next() 
    } catch (error) {
         return res.status(500).send({msg: 'server error'})
    }

    
}

// Image upload setup
const upload = multer({
    storage: multer.memoryStorage()
});

// Upload image to ImgBB
app.post('/upload-image', upload.single('bookImage'), async (req, res) => {
    try {
        // Check image
        if (!req.file) {
            return res.status(400).send({
                message: "Please select an image"
            });
        }

        // Prepare image data
        const imageData = new FormData();

        const imageBlob = new Blob(
            [req.file.buffer],
            { type: req.file.mimetype }
        );

        imageData.append('image', imageBlob, req.file.originalname);

        // Upload image to ImgBB
        const response = await fetch(
            `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
            {
                method: 'POST',
                body: imageData
            }
        );

        const result = await response.json();

        // Check upload result
        if (!response.ok || !result.success) {
            console.log(result);

            return res.status(500).send({
                message: "Image upload failed"
            });
        }

        // Send image URL to frontend
        res.send({
            message: "Image uploaded successfully",
            imageUrl: result.data.url
        });

    } catch (error) {
        console.log(error);

        res.status(500).send({
            message: "Something went wrong"
        });
    }
});

//http://localhost:8000/

app.post('/addbook',verifyToken, async (req, res) => {
    const data = req.body

    const result = await addbookcollection.insertOne(data)
    console.log(result)
    res.send(result)
})

app.patch('/addbook/:id', verifyToken, async (req, res) => {
    const {id} = req.params
    const updatedData = req.body
    const result = await addbookcollection.updateOne(
        {_id: new ObjectId(id)},
        {$set: updatedData}
    )
    res.status(200).json(result)
})

app.delete('/addbook/:id',verifyToken,async (req, res) => {
    const {id} = req.params
    const result = await addbookcollection.deleteOne(
        {_id: new ObjectId(id)},
    )
    res.status(200).json(result)
}) 

app.post('/borrowbook', async (req, res) => {
    const data = req.body
    data.borrowedAt = new Date();
    const result = await borrowbookCollection.insertOne(data)
    res.send(result)
})
app.get('/my-borrows/:email', async(req,res) => {
    const {email} = req.params
    const result = await borrowbookCollection.find({userEmail: email }).toArray()
    res.send(result)
})
app.delete('/my-borrows/:id', async (req, res) => {
    const { id } = req.params;

    const result = await borrowbookCollection.deleteOne({
        _id: new ObjectId(id)
    });

    res.send(result);
});

app.get('/allbooks', async (req, res) => {
    const result = await addbookcollection.find().toArray()
    res.send(result)
});

app.get('/homebooks', async (req, res) => {
    try {
        const result = await addbookcollection
            .find()
            .sort({ _id: -1 })
            .limit(6)
            .toArray();

        res.send(result);
    } catch (error) {
        res.status(500).send({
            message: "Failed to fetch home books"
        });
    }
});

app.get('/allbooks/:id',
    verifyToken, 
    async(req,res) => {
    const {id} = req.params
    const result = await addbookcollection.findOne({_id: new ObjectId(id)})

    res.send(result)
})



app.get('/', (req, res) => {
    res.send({ message: 'server is running fine!' })
})

app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`)
})