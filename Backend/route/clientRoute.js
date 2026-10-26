import express from "express";
import { Addclients, getAllClient, updatedClient, deleteClient } from '../controller/clientController.js'
import authMiddleware from "../middleware/auth.js";

const router = express.Router();


router.post('/', authMiddleware(["admin", "employee"]), Addclients);

router.get('/', authMiddleware(["admin", "employee"]), getAllClient);

router.put('/update/:id', authMiddleware(["admin", "employee"]), updatedClient);

router.delete('/delete/:id', authMiddleware(['admin']), deleteClient);

export default router;

