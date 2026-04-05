import express from 'express';
import * as serverController from '../controllers/serverController.js';

const router = express.Router();

// Dashboard API
router.get('/dashboard', serverController.getDashboardStats);

// Server CRUD operations
router.get('/', serverController.getAllServers);
router.get('/:id', serverController.getServer);
router.post('/', serverController.createServer);
router.put('/:id', serverController.updateServer);
router.delete('/:id', serverController.deleteServer);

// Server logging and monitoring
router.get('/:id/logs', serverController.getServerLogs);
router.get('/:id/stats', serverController.getServerStats);
router.post('/:id/check', serverController.manualHealthCheck);

export default router;
