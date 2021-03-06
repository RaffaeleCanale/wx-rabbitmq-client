import amqp from 'amqplib';
import Joi from 'joi';
import { getLogger } from 'js-utils/logger';
import DurableChannel from './_internal/durableChannel';
import BroadcastEmitter from './_internal/broadcastEmitter';
import BroadcastReceiver from './_internal/broadcastReceiver';

const Logger = getLogger('rabbitmq.factory');

export const rabbitmqOptionsValidator = Joi.object().keys({
    protocol: Joi.string().default('amqp'),
    hostname: Joi.string().hostname().required(),
    port: Joi.number().integer().positive().default(5672),
    username: Joi.string().required(),
    password: Joi.string().required(),
}).unknown().required();

function validateOptions(options) {
    const result = Joi.validate(options, rabbitmqOptionsValidator);
    if (result.error) {
        throw result.error;
    }

    return result.value;
}

export default class {

    constructor(options) {
        this.options = validateOptions(options);
    }

    connect() {
        return amqp.connect(this.options).then((conn) => {
            this.connection = conn;
            Logger.info('Connected to', this.options.hostname);
        });
    }

    getDurableChannel(queueName) {
        this._ensureIsConnected();

        return this.connection.createChannel()
            .then(ch => new DurableChannel(ch, queueName).init());
    }

    getBroadcastEmitter(exchangeName) {
        this._ensureIsConnected();

        return this.connection.createChannel()
            .then(ch => new BroadcastEmitter(ch, exchangeName).init());
    }

    getBroadcastReceiver(exchangeName, bindings) {
        this._ensureIsConnected();

        return this.connection.createChannel()
            .then(ch => new BroadcastReceiver(ch, exchangeName, bindings).init());
    }

    close() {
        this._ensureIsConnected();
        return this.connection.close()
            .finally(() => {
                this.connection = null;
            });
    }

    _ensureIsConnected() {
        if (!this.connection) {
            throw Error('Must connect first');
        }
    }

}
