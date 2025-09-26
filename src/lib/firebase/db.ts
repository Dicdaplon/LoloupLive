import { getDatabase } from "firebase/database";
import { app } from "./app";

export const db = getDatabase(app);