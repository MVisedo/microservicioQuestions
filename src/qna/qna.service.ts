"use strict";

import { Question, IQuestion, IAnswer, CreateQuestionRequest, AddAnswerRequest } from "./qna.interface";
import * as token from "../token";
import * as error from "../server/error";
import { sendArticleValidation } from "../rabbit/articleExistConsumer";




export async function createQuestion(userId: string, body: CreateQuestionRequest): Promise<IQuestion> {
    try {
        const validatedBody = await validateCreateQuestion(body);
        const question = new Question({
            userId: userId,
            articleId: validatedBody.articleId,
            text: validatedBody.text,
            enabled: false // Create as disabled
        });

        const savedQuestion = await question.save();

        await sendArticleValidation(savedQuestion._id, savedQuestion.articleId);

        return Promise.resolve(savedQuestion);

    } catch (err) {
        return Promise.reject(err);
    }
}

export function getQuestion(questionId: string): Promise<IQuestion> {
    return new Promise((resolve, reject) => {
        Question.findById(questionId)
            .populate("user")
            .populate("answers.user")
            .exec(function (err: any, question: IQuestion) {
                if (err) return reject(err);
                resolve(question);
            });
    });
}
function validateCreateQuestion(body: CreateQuestionRequest): Promise<CreateQuestionRequest> {
    const result: error.ValidationErrorMessage = {
        messages: []
    };

    if (!body.articleId) {
        result.messages.push({ path: "articleId", message: "No puede quedar vacío." });
    }

    if (!body.text) {
        result.messages.push({ path: "text", message: "No puede quedar vacío." });
    }

    if (result.messages.length > 0) {
        return Promise.reject(result);
    }
    return Promise.resolve(body);
}

export function getQuestionsByArticle(articleId: string): Promise<IQuestion[]> {
    return new Promise((resolve, reject) => {
        Question.find({
            articleId: articleId,
            enabled: true
        }, function (err: any, questions: IQuestion[]) {
            if (err) return reject(err);
            resolve(questions);
        });
    });
}



export async function addAnswer(user: token.IUser, questionId: string, body: AddAnswerRequest): Promise<IQuestion> {
    try {
        const validatedBody = await validateAddAnswer(body);
        const question = await Question.findById(questionId);

        if (!question || !question.enabled) {
            return Promise.reject(error.newError(error.ERROR_NOT_FOUND, "Question not found"));
        }

        const isAdmin = user.permissions.includes("admin");
        const isOwner = question.userId.toString() === user.id;

        if (!isAdmin && !isOwner) {
            return Promise.reject(error.newError(error.ERROR_UNAUTHORIZED, "User is not authorized to answer this question"));
        }


        const answer = {
            userId: user.id,
            text: validatedBody.text,
            enabled: true
        };

        question.answers.push(answer);

        return new Promise<IQuestion>((resolve, reject) => {
            question.save(function (err: any) {
                if (err) return reject(err);
                resolve(question);
            });
        });
    } catch (err) {
        return Promise.reject(err);
    }
}

function validateAddAnswer(body: AddAnswerRequest): Promise<AddAnswerRequest> {
    const result: error.ValidationErrorMessage = {
        messages: []
    };

    if (!body.text) {
        result.messages.push({ path: "text", message: "No puede quedar vacío." });
    }

    if (result.messages.length > 0) {
        return Promise.reject(result);
    }
    return Promise.resolve(body);
}

export async function deleteQuestion(user: token.IUser, questionId: string): Promise<void> {
    try {
        const question = await Question.findById(questionId);
        if (!question) {
            return Promise.reject(error.newError(error.ERROR_NOT_FOUND, "La pregunta no existe o no pudo ser encontrada."));
        }
        const isAdmin = user.permissions.includes("admin");
        const isOwner = question.userId.toString() === user.id;

        if (!isAdmin && !isOwner) {
            return Promise.reject(error.newError(error.ERROR_UNAUTHORIZED, "User is not authorized to delete this question"));
        }

        await question.deleteOne();
    } catch (err) {
        return Promise.reject(err);
    }
}

export async function deleteAnswer(user: token.IUser, questionId: string, answerId: string): Promise<void> {
    try {
        const question = await Question.findById(questionId);
        if (!question) {
            return Promise.reject(error.newError(error.ERROR_NOT_FOUND, "La pregunta no existe o no pudo ser encontrada."));
        }

        const answer = (question.answers as any).id(answerId);
        if (!answer) {
            return Promise.reject(error.newError(error.ERROR_NOT_FOUND, "La respuesta no existe o no pudo ser encontrada."));
        }

        const isAdmin = user.permissions.includes("admin");
        const isQuestionOwner = question.userId.toString() === user.id;
        const isAnswerOwner = answer.userId.toString() === user.id;

        if (!isAdmin && !isQuestionOwner && !isAnswerOwner) {
            return Promise.reject(error.newError(error.ERROR_UNAUTHORIZED, "User is not authorized to delete this answer"));
        }

        answer.remove();
        await question.save();

    } catch (err) {
        return Promise.reject(err);
    }
}
