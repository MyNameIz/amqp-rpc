import { v4 as uuid } from "uuid";
import * as short from "short-uuid";
import { AmqpConnectionArguments } from "../interface";
import { 
    connect,
    serealize,
    deserealize } from "../utils";

class Client {
    private ch;
    private name;
    private conn;
    private connArgs;

    /**
     * Create new instance of RPC Client
     * @param {AmqpConnectionArguments} args amqp connection params
     * @param {string} name client custom identifier
     */
    constructor ( args: AmqpConnectionArguments, name?: string ) {
        this.connArgs = args;
        this.name = name ? name : `Client_${short.generate()}` ;
    }

    /**
     * Connect to RabbitMQ
     */
    public connect (): Promise<Object> {
        return connect.bind( this )();
    }

    private rpcError ( message?: string ): Error {
        let err = new Error();
        err.name = "Rpc.ClientError";
        err.message = `${this.name ? 
            `[${this.name}]: ` : ""}${message || ""}`;
        return err;
    }

    /**
     * Consume specified queue
     * Listen to messages
     * Handle reply message
     * Return deserealized result
     * @param {AMQP.Channel} ch channel instance
     * @param {String} queue queue identifier,
     * @param {String} correlationId request identifier
     * @param {Number} timeout reply awaiting deadline
     * @param {function cb(err:Error, data:Object)}
     */
    private handleReply ( queue: String, correlationId: String, timeout: number, cb: Function ): void {
        let 
            ch = this.ch,
            consumerTag = uuid();

        function finish ( err, data ): void{
            // Consumer liquidation
            ch.cancel( consumerTag );
            
            // Run callback
            cb( err, data );
        }
        
        setTimeout( finish, timeout, this.rpcError( "NO_RESPONSE_FROM_SERVICE" ) );

        ch.consume(queue, msg => {
            if ( correlationId === msg.properties.correlationId ) {
                // Get parsed response
                let { data, err } = deserealize( msg );
                
                // Move message from queue
                ch.ack( msg );

                finish( err, data );
            }
        },{ consumerTag });
    }

    /**
     * Send message to specified queue
     * Wait for reply
     * If reply received before the reply deadline reached, handle it
     * else stop waiting and reject
     * @param queue identifier of queue to push the message in
     * @param message message object to push
     * @param reply_timeout number of miliseconds to wait for the reply
     */
    public produce ( queue: String, message: Object, reply_timeout?: number ): Promise<Object | Error> {
        return new Promise( async ( resolve, reject ) => {
            const 
                replyTo = `response_${queue}`,
                correlationId = uuid();

            // Prepare required queues
            this.ch.assertQueue(queue);
            this.ch.assertQueue(replyTo);
            
            // Receive deadline and return the result
            this.handleReply( replyTo, correlationId, reply_timeout || 10000, ( err, data ) => 
                err ? reject ( err ) : resolve ( data ) );

            // Push the message
            this.ch.sendToQueue( 
                queue,
                Buffer.from( 
                    serealize( message )),
                { replyTo, correlationId, contentType: "application/json" });            
        });
    }
}

export default Client;



