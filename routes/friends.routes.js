/**
 * @swagger
 * tags:
 *   name: Friends
 *   description: Friend management
 */


import { Router } from 'express';
import { query, validationResult } from 'express-validator';
import pool from '../utils/db.js';
import pkg from 'firebase-admin';
import jwt from 'jsonwebtoken';
import CustomError from '../middleware/customError.js';
import { authenticateFirebaseToken } from '../middleware/firebaseAuth.js';

const friendRouter = Router();


/**
 * @swagger
 * /api/friends/requests:
 *   get:
 *     tags: [Friends]
 *     summary: Get friendship requests for a user
 *     parameters:
 *       - in: query
 *         name: user_id1
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the user
 *     responses:
 *       200:
 *         description: A list of friendship requests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       400:
 *         description: Bad request (validation errors)
 *       500:
 *         description: Internal server error
 */
friendRouter.get('/requests', authenticateFirebaseToken, [
    //validation
    query('user_id1').exists().withMessage('user id is required')
    .trim()
    .notEmpty().withMessage('user id cannot be empty')
    .isInt().withMessage('must be int')
],
    async (req,res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { user_id1 } = req.query;
        const query = await pool.query(
            `
            SELECT * FROM user_schema.friendships 
            WHERE user2_id = $1 or user1_id = $1`
            , [user_id1]);
        console.log(query.rows);
        res.status(200).json(query.rows);
    } catch ( err ) {
        console.error(err);
        res.status(500);
    }

});


/**
 * @swagger
 * /api/friends/send-request:
 *   post:
 *     tags: [Friends]
 *     summary: Send a friend request
 *     parameters:
 *       - in: query
 *         name: sender
 *         schema:
 *           type: integer
 *         required: true
 *         description: Sender user ID
 *       - in: query
 *         name: receiver
 *         schema:
 *           type: integer
 *         required: true
 *         description: Receiver user ID
 *     responses:
 *       200:
 *         description: Friend request sent
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
friendRouter.post('/send-request',[
    //validation
    query('sender')
    .exists().withMessage('sender is required')
    .trim()
    .isInt().withMessage('id must be valid number'),
    query('receiver')
    .exists().withMessage('sender is required')
    .trim()
    .isInt().withMessage('id must be valid number')
], async (req,res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const {sender,receiver} = req.query;
        const created_at = new Date().toISOString();    
        let status = "pending";
    
        let query = await pool.query(
            `INSERT INTO user_schema.friendships 
            (user1_id,user2_id,status,created_at) 
            VALUES ($1,$2,$3,$4)`
            ,[sender,receiver,status,created_at]);
        res.status(200).json(query.rows);
    }catch (err) {
        res.status(500).send('something went wrong');
        console.error(err);
    }
});

/**
 * @swagger
 * /api/friends/resolve-request:
 *   put:
 *     summary: Resolve a friend request
 *     description: Updates the friendship status between two users as either accepted or rejected.
 *     tags:
 *       - Friends
 *     parameters:
 *       - in: query
 *         name: user_id1
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user who sent the friend request.
 *       - in: query
 *         name: user_id2
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user who received the friend request.
 *       - in: query
 *         name: accept
 *         required: true
 *         schema:
 *           type: integer
 *           enum: [0, 1]
 *         description: 1 to accept, 0 to reject the request.
 *     responses:
 *       200:
 *         description: Friendship request resolved (accepted or rejected)
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: user with id 2 accepted user with id 1
 *       400:
 *         description: Bad request, missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                       param:
 *                         type: string
 *                       location:
 *                         type: string
 *       500:
 *         description: Internal server error
 */
friendRouter.put('/resolve-request',[
    //validation
    query('user_id1').exists().withMessage('sender is required')
    .trim()
    .isInt().withMessage('id must be valid number'),
    query('user_id2').exists().withMessage('object is required')
    .trim()
    .isInt().withMessage('id must be valid number'),
    query('accept').exists().withMessage('decision is required')
    .isInt().withMessage('id must be valid number')
], async (req,res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const {user_id1,user_id2,accept} = req.query;
        const resolution = Number(accept) === 1 ? "accepted" : "rejected";

        const query = await pool.query(
            `UPDATE user_schema.friendships 
            SET status = $1 
            WHERE user2_id = $2 AND user1_id = $3`
            , [resolution,user_id2,user_id1]);
        console.log(accept);
        res.status(200).send('user with id'+user_id2+' '+resolution+' user with id'+user_id1);
    }catch (err) { 
        res.status(500).send('something went wrong');
        console.error(err);
    }
});

/**
 * @swagger
 * /api/friends/delete:
 *   delete:
 *     summary: Delete a friendship between two users
 *     description: Deletes a friendship from the database only if its status is `accepted`.
 *     tags:
 *       - Friends
 *     parameters:
 *       - in: query
 *         name: user_id1
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the first user (requesting deletion).
 *       - in: query
 *         name: user_id2
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the second user.
 *     responses:
 *       200:
 *         description: Friendship deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Friendship deleted successfully
 *                 count:
 *                   type: integer
 *                   example: 1
 *       400:
 *         description: Bad request, missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                       param:
 *                         type: string
 *                       location:
 *                         type: string
 *       404:
 *         description: No friendship found to delete
 *       500:
 *         description: Internal server error
 */
friendRouter.delete('/delete',[
    query('user_id1').exists().withMessage('sender is required')
    .trim()
    .isInt().withMessage('id must be valid number'),
    query('user_id2').exists().withMessage('object is required')
    .trim()
    .isInt().withMessage('id must be valid number'),
], async (req,res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try{
        const { user_id1,user_id2 } = req.query;

        const query = await pool.query(
            `DELETE FROM user_schema.friendships 
            WHERE ((user1_id = $1 OR user2_id = $1) 
            AND (user1_id = $2 OR user2_id = $2) 
            AND status = 'accepted') `
        , [user_id1,user_id2]);
        if (query.rowCount > 0) {
            return res.status(200).json({ message: "Friendship deleted successfully", count: query.rowCount });
        } else {
            return res.status(404).json({ message: "No friendship found to delete" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Something went wrong');
    }
})

export default friendRouter;