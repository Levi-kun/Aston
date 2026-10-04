/**
 * 
 *  This is the connection start point for the Postgres Database
 * 
 */

const postgres = require('postgres');

const sql = postgres(`postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${DB_PORT}/${DB_NAME}`);

module.exports = sql;