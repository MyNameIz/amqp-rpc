import * as amqp from "amqplib";

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

function connect() {
    console.info(` [.] Connecting to message broker`);
    let onerror = connectionError.bind( this );

    return amqp
        .connect( this.connArgs )
        .then(connection => {
            this.conn = connection
            this.conn.on( "error", onerror );
            this.conn.on( "close", onerror );
            console.info(` [v] Connection initialized`);
        })
        .catch( onerror );
}

function connectionError ( err ) {
    console.log(" [x] %s", err.toString());
    console.log(" [x] Message Broker connection failed");
    setTimeout(connect.bind( this ), 500);
}

function createChannel() {
    console.info(" [.] Initializing channel");
    let onerror = channelError.bind( this );

    return this.conn.createConfirmChannel()
            .then(channel => {
                this.ch = channel;
                this.ch.on( "error", onerror );
                this.ch.on( "close", onerror );
                console.log(" [v] Channel created");
            })
            .catch( onerror ) 
}

function channelError( err ) {
    console.log(" [x] %s", err.toString());
    console.log(" [x] Message Broker connection failed");
    setTimeout(createChannel.bind( this ), 500);
}

export { serealize, deserealize, connect, createChannel };