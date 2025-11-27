"use strict";

/**
 *  Servicios de escucha de eventos rabbit
 */
import * as env from "../server/environment";
import * as token from "../token";
import { RabbitFanoutConsumer } from "./tools/fanoutConsumer";

const conf = env.getConfig(process.env);

interface IAuthMessage {
    correlation_id: string;
    exchange: string;
    routing_key: string;
    message: string; // Este es el token
}


export function init() {
    // El consumidor de logout recibe directamente el token, no un objeto IRabbitMessage
    const fanout = new RabbitFanoutConsumer("auth", (message: any) => {
        processLogout(message);
    });
    fanout.init();
}

/**
 * @api {fanout} auth/logout Logout de Usuarios
 * @apiGroup RabbitMQ GET
 *
 * @apiDescription Escucha de mensajes logout desde auth.
 *
 * @apiSuccessExample {json} Mensaje
 *     {
 *        "type": "logout",
 *        "message": "{tokenId}"
 *     }
 */
function processLogout(message: string) {
    console.log("RabbitMQ Consume logout " + message);
    try {
        const authMessage: IAuthMessage = JSON.parse(message);
        token.invalidate(authMessage.message);
    } catch (e) {
        console.error("Error al procesar mensaje de logout de RabbitMQ:", e);
    }
}
