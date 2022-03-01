const amqp = require('amqplib');

const procedures = {
    // An exhaustive map of procedures that can be deferred. Add more here
    echo: (...params) => console.log(...params),
    now: () => console.log(new Date()),
};

(async () => {
    // Connect to local RabbitMQ server
    const conn = await amqp.connect('amqp://localhost');
    process.once('SIGINT', () => conn.close());
    const ch = await conn.createChannel();

    // Create queues and exchanges, and bind them
    const maturityExchange = 'maturity';
    const maturingQueue = 'maturing';
    const maturedQueue = 'mature';
    await ch.assertExchange(
        maturityExchange,
        'fanout', // All queues bound to the exchange will receive the messages, disregarding routing
        { internal: true } // Messages cannot be published directly to the exchange
    );
    await ch.assertQueue(maturedQueue, {
        durable: true, // Queue will survive broker restart
    });
    await ch.assertQueue(maturingQueue, {
        durable: true,
        deadLetterExchange: maturityExchange, // Messages that die will be published to this exchange
    });
    await ch.bindQueue(maturedQueue, maturityExchange, ''); // maturityExchange will publish messages to maturedQueue

    // How deferred procedure calls will be enqueued
    const defer = (procedureKey, timeMs, ...params) => {
        const json = { procedureKey, params };
        const buffer = Buffer.from(json);
        ch.sendToQueue(maturingQueue, buffer, {
            persistent: true, // Message will survive broker restart
            expiration: timeMs, // Message will die after this amount of milliseconds
        });
    }

    // Defer some procedure calls
    defer('echo', 5000, 'Hello ', 'World!');
    defer('now', 10000);

    // Listen for procedures ready to be executed
    await ch.consume(maturedQueue, (msg) => {
        const { procedureKey, params } = JSON.parse(msg.content.toString());

        // Nack the message if we lack a procedure implementation for the procedureKey
        if (!procedures[procedureKey]) {
            ch.nack(msg);
            return;
        }

        // Execute the procedure
        procedures[procedureKey](...params);

        // Ack the message if all went well
        ch.ack(msg);
    });
})();
