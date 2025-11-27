"use strict";

import { Question, IQuestion } from "./qna.interface";

export function articleValidationCheck(validation: any) {
    console.log("RabbitMQ Consume ArticleValidation : " + JSON.stringify(validation.message));
    Question.findById(validation.message.referenceId, function (err: any, question: IQuestion) {
        if (err) return;

        if (question) {
            if (validation.message.valid) {
                question.enabled = true;
                question.save(function (err: any) {
                    if (err) {
                        console.error("Error saving question after validation: " + err);
                    } else {
                        console.log("Question " + question._id + " enabled successfully.");
                    }
                });
            } else {
                question.deleteOne(function (err: any) {
                    if (err) {
                        console.error("Error deleting question after failed validation: " + err);
                    } else {
                        console.log("Question " + question._id + " deleted successfully due to failed validation.");
                    }
                });
            }
        }
    });
}
