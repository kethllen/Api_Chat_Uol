import express, {json} from 'express'
import cors from 'cors'
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import 'dayjs/locale/br.js';
import joi from'joi'

dotenv.config();


const server = express();
server.use(cors())
server.use(json());

const participantSchema = joi.object(
    {
        name :joi.string().required()
    }
)

const messageSchema = joi.object(
    {
        
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.string().valid('message','private_message').required()
        
    }
)



async function getDB(){
    let mongoClient;
    try {
        mongoClient = new MongoClient(process.env.MONGO_URI);
        await mongoClient.connect();
        const dbApiChatUol = mongoClient.db("ApiChatUol")
    
        return [mongoClient, dbApiChatUol]
        
    } catch (error) {
        console.log("dataBase Connection error")
        console.log(error)
        mongoClient.close();
    }
}

async function removeUser(){
    let mongoClient, dbApiChatUol;
    try {
        [mongoClient, dbApiChatUol] = await getDB();
        const users = await dbApiChatUol.collection("users").find({}).toArray();
        if(users){
            for (let user of users) {
                if(Date.now() - parseInt(user.lastStatus) > 10000)
                {
                    await dbApiChatUol.collection("users").deleteOne({ _id: new ObjectId(user._id) });
                    const hora = dayjs().locale('pt-br').format('HH:mm:ss');
                    const messages = await dbApiChatUol.collection("messages").insertOne({from: user.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: hora});
                }
            }
            mongoClient.close();
        }         
       } catch (error) {
          res.status(500).send('A culpa foi do estagiário que nao fez o remover usuario inativo correto')
          mongoClient.close()
       }
}
        
setInterval(() => removeUser(),15000);
        
server.get('/participants', async (req,res) => {
    let mongoClient, dbApiChatUol;
    try {
        [mongoClient, dbApiChatUol] = await getDB();
        const users = await dbApiChatUol.collection("users").find({}).toArray();         
        res.send(users);
        mongoClient.close();
       } catch (error) {
          res.status(500).send('A culpa foi do estagiário que nao fez o GET de participantes correto')
          mongoClient.close()
       }
  });

  server.delete('/participants/:id', async (req,res) => {
    let mongoClient, dbApiChatUol;
    const {id} = req.params;
    try {
         [mongoClient, dbApiChatUol] = await getDB();
         await dbApiChatUol.collection("users").deleteOne({ _id: new ObjectId(id) });
                  
          res.send(200);
          mongoClient.close();
       } catch (error) {
          res.status(500).send('A culpa foi do estagiário que nao fez o DELETE de participantes correto')
          mongoClient.close()
       }
  });

server.post('/participants', async (req,res) => {
    let mongoClient, dbApiChatUol;
    const validation = participantSchema.validate(req.body, { abortEarly: true });

    if (validation.error) {
      console.log(validation.error.details)
      return res.send(422);
    }
    try {
          [mongoClient, dbApiChatUol] = await getDB();
          const user = await dbApiChatUol.collection("users").findOne({name: req.body.name})
          if(user){
            mongoClient.close()
            return res.send(409);
          }
          const lastStatus = Date.now();
          const hora = dayjs().locale('pt-br').format('HH:mm:ss');
          const users = await dbApiChatUol.collection("users").insertOne({...req.body, "lastStatus":lastStatus});
          const messages = await dbApiChatUol.collection("messages").insertOne({from: req.body.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: hora});    
          res.send(201)
          mongoClient.close()
       } catch (error) {
          res.status(500).send('A culpa foi do estagiário que nao fez o POST de participantes correto')
          mongoClient.close()
       }
  });

  server.get('/messages', async (req,res) => {
    let mongoClient, dbApiChatUol;
    let limit = parseInt(req.query.limit);
    try {
        [mongoClient, dbApiChatUol] = await getDB();
        const messages = await dbApiChatUol.collection("messages").find( { $or: [ { to: 'Todos'}, { to: req.headers.user}, { from:req.headers.user} ] } ).toArray();
        if(messages.length > limit){
            const messagesFilter = [messages].slice(messages.length-limit,messages.length)
            res.send(messagesFilter);
            mongoClient.close();
        }else{
            res.send(messages);
            mongoClient.close();
        }
       } catch (error) {
          res.status(500).send('A culpa foi do estagiário que nao fez o GET de mensagem correto')
          mongoClient.close();
       }
  });

  server.post('/messages', async (req,res) => {
    let mongoClient, dbApiChatUol;
    const validation = messageSchema.validate(req.body, { abortEarly: true });

    if (validation.error) {
      console.log(validation.error.details)
      return res.send(422);
    }
    try {
          [mongoClient, dbApiChatUol] = await getDB();
          const user = await dbApiChatUol.collection("users").findOne({name: req.headers.user})
          if(!user){
            mongoClient.close()
            return res.send(422);
          }
          const hora = dayjs().locale('pt-br').format('HH:mm:ss');
          const messages = await dbApiChatUol.collection("messages").insertOne({from: req.headers.user, ...req.body, time: hora});    
          res.send(201)
          mongoClient.close()
       } catch (error) {
          res.status(500).send('A culpa foi do estagiário que nao fez o post de mensagem correto')
          mongoClient.close()
       }
  });

  server.post('/status', async (req,res) => {
    let mongoClient, dbApiChatUol;
    try {
        [mongoClient, dbApiChatUol] = await getDB();
        const user = await dbApiChatUol.collection("users").findOne({name: req.headers.user})
        if(!user){
            mongoClient.close();
            return res.send(404);
        }else{
            const lastStatus = Date.now();
            await dbApiChatUol.collection("users").updateOne({ 
                _id: user._id 
            }, { $set: {lastStatus: lastStatus }})
                    
            res.sendStatus(200);
            mongoClient.close();
        }
    } catch (error) {
          res.status(500).send('A culpa foi do estagiário que nao fez o POST de status correto')
          mongoClient.close();
       }
  });

 server.listen(5000, () => {console.log("Servidor Inicializado")})