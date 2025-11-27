"use strict";

export interface IRabbitMessage {
    type: string;
    exchange?: string;
    queue?: string;
    routingKey?: string;
    message: any;
}

export interface RabbitProcessor {
    (source: IRabbitMessage): void;
}
