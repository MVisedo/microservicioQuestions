"use strict";

import { Document, model, Schema, Types } from "mongoose";

export interface IAnswer extends Document {
  userId: string;
  text: string;
  created: Date;
}

export interface AddAnswerRequest {
    text?: string;
}

export interface IQuestion extends Document {
  articleId: string;
  userId: string;
  text: string;
  answers: Types.DocumentArray<IAnswer>;
  created: Date;
  enabled: Boolean;
}

export interface CreateQuestionRequest {
    articleId?: string;
    text?: string;
}

const AnswerSchema = new Schema({
  userId: {
    type: String,
    trim: true,
    required: [true, "El userId del que responde la pregunta"]
  },
  text: {
    type: String,
    trim: true,
    required: [true, "El texto de la respuesta"]
  },
  created: {
    type: Date,
    default: Date.now()
  }
});

const QuestionSchema = new Schema({
  articleId: {
    type: String,
    trim: true,
    required: [true, "El articleId del producto"]
  },
  userId: {
    type: String,
    trim: true,
    required: [true, "El userId del que realiza la pregunta"]
  },
  text: {
    type: String,
    trim: true,
    required: [true, "El texto de la pregunta"]
  },
  answers: [AnswerSchema],
  created: {
    type: Date,
    default: Date.now()
  },
  enabled: {
    type: Boolean,
    default: true
  }
}, { collection: "questions" });

QuestionSchema.index({ articleId: 1, enabled: -1 });


export let Question = model<IQuestion>("Question", QuestionSchema);

