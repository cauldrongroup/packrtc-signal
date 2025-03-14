import { customAlphabet } from 'nanoid'
import { WebSocketServer } from 'ws'

const sessions: { [key: string]: { [key: string]: PackRaySession } } = {}

const idRNG = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 4)

class PackRaySession {
    sessionID = ""
    channelID = ""
    isDebug: boolean
    connections: { [key: number]: any } = {}
    clientHandlerWSS: WebSocketServer = null

    clientPRWSS: WebSocketServer = null

    data = {

    }

    hostPeer: WebSocket

    playerCount = 0
    idCount = 0
    peers: Array<number> = []

    constructor() {

    }

    createSocket() {
        this.sessionID = idRNG(4)
        if (this.isDebug) {
            this.sessionID = "TEST"
        }

        this.createClientSocket()
        setTimeout(() => {
            if (this.playerCount <= 0) {
                this.closeConnection()
            }
        }, 50000);
    }

    private createClientSocket() {
        this.clientHandlerWSS = new WebSocketServer({ noServer: true });

        this.clientHandlerWSS.on('connection', (cws) => {
            this.playerCount++
            this.idCount++
            const peerID = this.idCount
            this.connections[peerID] = cws

            cws.on("close", () => {
                delete this.connections[peerID]
            })

            cws.on("message", (raw: any) => {
                const data = JSON.parse(raw)
                const dataType = data.data_type

                if (dataType == "ready") {
                    this.peers.push(peerID)

                    for (const clws of Object.values(this.connections)) {
                        clws.send(JSON.stringify({
                            data_type: "new_connection",
                            peer_id: peerID,
                        }))
                    }
                }

                if (dataType == "offer" || dataType == "answer" || dataType == "ice") {
                    const toCWS = this.connections[data.to]

                    if (toCWS) {
                        toCWS.send(JSON.stringify({
                            ...data,
                            from: peerID
                        }))
                    }
                }
            })

            cws.once("close", () => {
                this.playerCount--

                if (this.playerCount <= 0) {
                    this.closeConnection()
                }
            })

            cws.send(JSON.stringify({
                data_type: "initialize",
                id: peerID,
                peers: this.peers
            }))
        });
    }

    closeConnection() {
        this.clientHandlerWSS.close()
        delete sessions[this.channelID][this.sessionID]
    }
}

export function createSession(channelID: string, isDebug: boolean = false) {
    const pkS = new PackRaySession()
    pkS.isDebug = isDebug
    pkS.channelID = channelID
    pkS.createSocket()
    if (!sessions[channelID]) {
        sessions[channelID] = {}
    }
    sessions[channelID][pkS.sessionID] = pkS

    return pkS
}

export function findSession(sessionID: string, channelID: string) {
    if (sessions[channelID][sessionID]) {
        return sessions[channelID][sessionID]
    }
}

export function countSessions() {
    let a = 0
    for (const c of Object.keys(sessions)) {
        for (const s of Object.keys(sessions[c])) {
            a++
        }
    }
    return a
}