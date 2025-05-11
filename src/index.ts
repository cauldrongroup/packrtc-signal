import WebSocket, { WebSocketServer } from 'ws';
import http from "http";
import express from 'express'
import SessionsRoute from './routes/sessions'
import { countSessions } from './utils/sesssions';
import cors from 'cors'

const app = express()
const port = process.env.PORT || 3000

const server = http.createServer({}, app)

app.use(express.json())
app.use(cors())

app.use("/", express.static("./page"))

SessionsRoute.init(server)
app.use("/session", SessionsRoute.router)

app.get("/stats/session-count", (req, res) => {
    res.send(countSessions().toString())
})

server.listen(port, () => {
    console.log("Ready! ", port)
})