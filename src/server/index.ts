import * as short from "short-uuid";
import { v4 as uuid } from "uuid";
import { AmqpConnectionArguments, ReplyConfig } from "../interface";
import { 
    connect,
    serealize,
    deserealize,
    createChannel } from "../utils";

class Server {
    private ch;
    private name;
    private conn;
    private connArgs;

    /**
     * Create new instance of RPC Client
     * @param {AmqpConnectionArguments} args amqp connection params
     * @param {string} name name of the server
     */
    constructor ( args: AmqpConnectionArguments, name: string ) {
        this.connArgs = args;
        this.name = name ? name : `Server_${short.generate()}`
    }

    /**
     * Connect to RabbitMQ
     */
    public connect (): Promise<Object> {
        return connect.bind( this )()
            .then(() => 
                createChannel.bind( this )()
                .then(() => this.ch.prefetch( 1 )));
    }

    /**
     * Consume specified queue
     * Listen to messages
     * Handle reply message
     * Return deserealized result
     */
    private reply ( config ): void {
        let { correlationId, replyTo, body } = config;
        if ( replyTo ) {
            let contentType = "application/json";
            this.ch.sendToQueue(
                replyTo,
                Buffer.from( JSON.stringify( body ) ),
                { correlationId, contentType });
        }
    }

    public consume ( queue: String, controller: Function ): void {
        this.ch.assertQueue( queue )
            .then(async ok => {
                this.ch.consume(queue, async msg => {                
                    let correlationId: String = msg.properties.correlationId,
                        replyTo: String = msg.properties.replyTo;
                    var replyBody = { 
                        correlationId, replyTo,
                        body: {
                            data: {}, err: null
                        }
                    };

                    this.ch.ack( msg );

                    Promise.resolve( controller( deserealize( msg ), msg ) )
                        .then(result => replyBody.body.data = result)
                        .catch(err => {
                            console.error(err);
                            replyBody.body.err = err;    
                        })
                        .finally(() => this.reply( replyBody ));
                })
            });
    }
}

export default Server;


