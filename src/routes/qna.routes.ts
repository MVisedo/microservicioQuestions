"use strict";

import { Express } from "express";
import * as token from "../token";
import * as qna from "../qna/qna.service";
import * as error from "../server/error";
import * as express from "express";
import { NextFunction } from "connect";

export function init(app: Express) {
  app.route("/v1/questions").post(validateToken, createQuestion);
  app.route("/v1/questions/article/:articleId").get(validateToken, getQuestionsByArticle);
  app.route("/v1/questions/:questionId/answers").post(validateToken, addAnswer);
  app.route("/v1/questions/:questionId").delete(validateToken, deleteQuestion);
  app.route("/v1/questions/:questionId/answers/:answerId").delete(validateToken, deleteAnswer);
}

interface IUserSessionRequest extends express.Request {
  user: token.ISession;
}

function validateToken(req: IUserSessionRequest, res: express.Response, next: NextFunction) {
  const auth = req.header("Authorization");
  if (!auth) {
    res.status(error.ERROR_UNAUTHORIZED).send("Unauthorized");
    return;
  }

  token.validate(auth)
    .then(user => {
      req.user = user;
      next();
    })
    .catch(err => res.status(error.ERROR_FORBIDDEN).send("forbidden"));
}

function createQuestion(req: IUserSessionRequest, res: express.Response) {
  if (!req.user.user) {
    res.status(error.ERROR_UNAUTHORIZED).send("Unauthorized");
    return;
  }
  qna.createQuestion(req.user.user.id, req.body)
    .then((question: any) => {
      res.json(question);
    })
    .catch((err: any) => {
      error.handle(res, err);
    });
}

function getQuestionsByArticle(req: IUserSessionRequest, res: express.Response) {
  const articleId = escape(req.params.articleId);
  qna.getQuestionsByArticle(articleId)
    .then((questions: any) => {
      res.json(questions);
    })
    .catch((err: any) => {
      error.handle(res, err);
    });
}

function addAnswer(req: IUserSessionRequest, res: express.Response) {
  const user = req.user.user;
  if (!user) {
    return error.handle(res, error.newError(error.ERROR_UNAUTHORIZED, "Unauthorized"));
  }
  const questionId = escape(req.params.questionId);
  qna.addAnswer(user, questionId, req.body)
    .then(question => res.json(question))
    .catch(err => error.handle(res, err));
}

function deleteQuestion(req: IUserSessionRequest, res: express.Response) {
  const user = req.user.user;
  if (!user) {
    return error.handle(res, error.newError(error.ERROR_UNAUTHORIZED, "Unauthorized"));
  }
  const questionId = escape(req.params.questionId);
  qna.deleteQuestion(user, questionId)
    .then(() => {
      res.status(204).send();
    })
    .catch((err: any) => {
      error.handle(res, err);
    });
}

function deleteAnswer(req: IUserSessionRequest, res: express.Response) {
  const questionId = escape(req.params.questionId);
  const answerId = escape(req.params.answerId);
  const user = req.user.user;

  if (!user) {
    return error.handle(res, error.newError(error.ERROR_UNAUTHORIZED, "Unauthorized"));
  }

  qna.deleteAnswer(user, questionId, answerId)
    .then(() => {
      res.status(204).send();
    })
    .catch((err: any) => {
      error.handle(res, err);
    });
}
