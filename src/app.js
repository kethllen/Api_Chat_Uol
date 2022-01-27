import express, {json} from 'express'
import cors from 'cors'
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();


const server = express();
server.use(cors())
server.use(json());

async function getDB(collection){
    try {
        
        const mongoClient = new MongoClient(process.env.MONGO_URI);
        
        await mongoClient.connect();
        console.log("agora eu ja conectei")
        const dbApiChatUol = mongoClient.db("ApiChatUol")
        const Collection = dbApiChatUol.collection(collection);
    
        return [mongoClient, dbApiChatUol, Collection]
        
    } catch (error) {
        console.log(" dataBase Connection error")
        console.log(error)
    }

}


server.get('/participants', async (req,res) => {
    try {
          
          const [mongoClient, dbApiChatUol, Collection] = await getDB("users");
          const users = await Collection.find({}).toArray();
                  
          res.send(users)
          mongoClient.close()
       } catch (error) {
          res.status(500).send('A culpa foi do estagiário')
          mongoClient.close()
       }
  });

 server.listen(5000, () => {console.log("Servidor Inicializado")})