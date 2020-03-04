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
    private connect (): Promise<Object> {
        return connect.bind( this )();
    }

    /**
     * Create channel
     */
    private createChannel (): Promise<Object> {
        return createChannel.bind( this )()
            .then(() => this.ch.prefetch( 1 ));
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

    public async consume ( queue: String, controller: Function ): Promise<void> {
        // Initialize connection
        if ( !this.conn )
            await this.connect();
        if ( !this.ch )
            await this.createChannel();
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


                    try {
                        let result = await controller( deserealize( msg ), msg );
                        
                        if ( result instanceof Error )
                            throw result;
                        else 
                            replyBody.body.data = result
                    } catch ( err ) {
                        console.error( err );
                        replyBody.body.err = err;
                    } finally {
                        this.ch.ack( msg );
                        this.reply( replyBody );
                    }
                })
            });
    }
}

export default Server;


