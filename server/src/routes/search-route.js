import express from "express";
import { handleSearchRequest } from "../controllers/search-controller.js"

export const searchRouter = express.Router();

searchRouter.post('/search', handleSearchRequest);