import * as amqp from "amqplib";
import Server from '../server';
import Client from '../client';
import { timingSafeEqual } from "crypto";

/**
 * Prepare message for pushing to queue
 * @param {*} msg 
 * @return {String}
 */
function serealize( msg ) {
    if ( typeof msg === "object" )
        return JSON.stringify( msg );
    if ( msg === undefined || msg === null )
        return "";
    else 
        return msg.toString();
}

/**
 * Parse received message
 * @param {JSON} msg 
 * @return {JSON | String}
 */
function deserealize( msg ) {
    let { properties, content } = msg, 
        str = content.toString(),
        result;

    if ( properties.contentType === "application/json" )
        result = JSON.parse( str );
    else {
        try{
            result = JSON.parse( str );
        } catch( err ) {
            result = str;
        }
    }
    
    return result;
}
/*
FIXME:FIXME:FIXME:FIXME:FIXME:FIXME:FIXME:FIXME:FIXME:FIXME:FIXME:FIXME:FIXME:
*/
function connect() {
    var self = this;
    return new Promise(async (resolve, reject) => {
        async function connection () {
            console.info(` [.] Connecting to message broker`);
            self.conn = await amqp.connect(self.connArgs);
            console.info(` [v] Connection initialized`);
        }

        async function channel() {
            console.info(" [.] Initializing channel");
            self.ch = await self.conn.createConfirmChannel();
            console.log(" [v] Channel created");

            if ( self.consume )
                self.ch.prefetch(1);
        }
        
        async function trу() {
            try {
                await connection();
                await channel();
                
                resolve();
            } catch {
                console.error(" [x] Connection broken. Reconnect...")
                setTimeout(trу, 500);
            }
        }      

        await trу.bind(this)();
    });
}

export { serealize, deserealize, connect };