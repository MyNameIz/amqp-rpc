enum Protocol {
    "amqp", "amqps"
}

interface AmqpConnectionArguments {
    protocol: Protocol,
    hostname: String,
    port: Number,
    username?: String,
    password?: String,
    locale?: String,
    frameMax?: Number,
    channelMax?: Number,
    heartbeat?: Number,
    vhost?: String
}

interface ReplyBody {
    data: Object,
    err: Error
}

interface ReplyConfig {
    replyTo: String,
    correlationId: String,
    body: ReplyBody
}

export { AmqpConnectionArguments, ReplyConfig };