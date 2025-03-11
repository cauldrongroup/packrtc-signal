import express from 'express'
import { createSession, findSession } from '../utils/sesssions'
import http from "http";

const router = express.Router()
const packrayWS = process.env.PACKRTC_WS ?? "ws://127.0.0.1:3000"

router.post("/host", (req, res) => {
    if (!req.body.channel) {
        res.status(400)
        res.json({
            success: false,
            code: "MISSING_CHANNEL_ID"
        })
        return
    }
    const session = createSession(req.body.channel, req.body.is_debug)

    res.json({
        success: true,
        code: session.sessionID,
        ws_url: `${packrayWS}/ws/${req.body.channel}/${session.sessionID}`
    })
})

router.post("/join/:code", (req, res) => {
    if (!req.body.channel) {
        res.status(400)
        res.json({
            success: false,
            code: "MISSING_CHANNEL_ID"
        })
        return
    }
    const channel = req.body.channel
    const session = findSession(req.params.code.toUpperCase(), channel)
    
    if (session) {
        res.json({
            success: true,
            code: session.sessionID,
            ws_url: `${packrayWS}/ws/${channel}/${session.sessionID}`,
        })
    } else {
        res.status(404)
        res.json({
            success: false,
            code: "SESSION_NOT_FOUND"
        })
    }
})

function init(server: http.Server) {
    server.on('upgrade', function upgrade(request, socket, head) {
        const pathname = request.url;

        if (pathname.startsWith(`/ws/`)) {
            const pathSplit = pathname.split("/")
            let channelCode = pathSplit[pathSplit.length - 2]
            let roomCode = pathSplit[pathSplit.length - 1]

            console.log("Forwarding WS ", roomCode)

            const session = findSession(roomCode, channelCode)

            if (session) {
                session.clientHandlerWSS.handleUpgrade(request, socket, head, function done(ws) {
                    session.clientHandlerWSS.emit('connection', ws, request);
                })
            } else {
                socket.destroy();
            }
        } else {
            socket.destroy();
        }
    });

}

export default { router, init }