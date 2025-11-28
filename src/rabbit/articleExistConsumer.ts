"use strict";

import * as validation from "../qna/qna.validation";
import { RabbitDirectConsumer } from "./tools/directConsumer";
import { RabbitDirectEmitter } from "./tools/directEmitter";
import { IRabbitMessage } from "./tools/common";

interface IArticleExistMessage {
    referenceId: string;
    articleId: string;
    valid: boolean;
}

export function init() {
    const questions = new RabbitDirectConsumer("questions", "questions");
    questions.addProcessor("article-exist", processArticleExist);
    questions.init();
}

function processArticleExist(rabbitMessage: IRabbitMessage) {
    const article = rabbitMessage.message as IArticleExistMessage;
    validation.articleValidationCheck(article);
}

export async function sendArticleValidation(questionId: string, articleId: string): Promise<IRabbitMessage> {
    const message: IRabbitMessage = {
        type: "article_exist",
        exchange: "questions",
        queue: "questions",
        message: {
            referenceId: questionId,
            articleId: articleId
        }
    };

    return RabbitDirectEmitter.getEmitter("article_exist", "article_exist").send(message);
}
