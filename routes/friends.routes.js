import { Router } from 'express';
import { query, validationResult } from 'express-validator';
import pool from '../db.js';
import pkg from 'firebase-admin';
import jwt from 'jsonwebtoken';
import CustomError from '../middleware/customError.js';

const friendRouter = Router();

friendRouter.get('/requests', [
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



// friendRouter.update('/add', async (req,res) => {});
// friendRouter.post('/add', async (req,res) => {});

export default friendRouter;