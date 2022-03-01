# Deferred remote procedure call POC

## Objective

Defer the execution of an arbitrary procedure, with arbitrary parameters, by a specified amount of time, such that it persists after process teardown, and can live in a load-balanced environment.

## How it works

Utilizing a Message Broker, specifically [RabbitMQ](https://www.rabbitmq.com/), via the AMQP0-9-1 protocol using [amqplib](https://www.npmjs.com/package/amqplib):
1. Create a queue (A) of messages that are ready to be executed - "mature"
2. Create a queue (B) of messages that wait for a specified amount of time - "maturing"
3. Create an exchange of messages, such that when a message in (B) matures it is moved to (A)
4. Publish to (B), and subscribe to (A)
5. Maintain a map of supported procedures, and invoke the correct one based on messages in (A)

## Scripts

* `npm run start-rmq` - Starts RabbitMQ (via Docker), bound to port `5672`
* `npm run start-rmq-managed` Starts RabbitMQ (via Docker) with management plugin, bound to port `5672`, management web to port `15672`
* `npm start` - Starts the proof of concept NodeJS process
