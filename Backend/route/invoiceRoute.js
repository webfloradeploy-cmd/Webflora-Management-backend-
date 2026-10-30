import express from "express";
import { AddInvoice, getInvoice, getAllInvoice, deleteInvoice, updateInvoice, recordPayment, getInvoicesByProject } from '../controller/invoiceController.js';
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.post('/', authMiddleware(["admin"]), AddInvoice);

router.get('/project/:projectId', authMiddleware(["admin", "employee"]), getInvoicesByProject);

router.get('/:id', authMiddleware(["admin", "employee"]), getInvoice);

router.get('/', authMiddleware(["admin", "employee"]), getAllInvoice);

router.post('/:id/pay', authMiddleware(["admin", "employee"]), recordPayment);

router.put('/update/:id', authMiddleware(["admin", "employee"]), updateInvoice);

router.delete('/delete/:id', authMiddleware(["admin"]), deleteInvoice);

export default router;