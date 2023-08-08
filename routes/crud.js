const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongoose').Types;
const cookieParser = require('cookie-parser');

// 1. Obtenir tous les serveurs et les cuisiniers
router.get("/crud", async (req, res) => {
    try {
      const users = await db.collection('Auth').find({ role: { $in: ['serveur', 'cuisinier'] } }).toArray();
      res.json(users);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'An error occurred while retrieving the data.' });
    }
  });
  
  // 2. Ajouter un nouveau serveur ou cuisinier
  router.post("/crud", async (req, res) => {
    try {
      const newUser = req.body;
      const hashedPassword = bcrypt.hashSync(newUser.password, saltRounds);
      newUser.password = hashedPassword;
  
      await db.collection('Auth').insertOne(newUser);
      res.status(200).json({ message: 'User added successfully.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'An error occurred while adding the user.' });
    }
  });
  
  // 3. Modifier un serveur ou un cuisinier existant
  router.put("/crud/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      const updatedUser = req.body;
      const hashedPassword = bcrypt.hashSync(updatedUser.password, saltRounds);
      updatedUser.password = hashedPassword;
  
      await db.collection('Auth').updateOne({ _id: new ObjectId(userId) }, { $set: updatedUser });
      res.status(200).json({ message: 'User updated successfully.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'An error occurred while updating the user.' });
    }
  });
  
  // 4. Supprimer un serveur ou un cuisinier
  router.delete("/crud/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      await db.collection('Auth').deleteOne({ _id: new ObjectId(userId) });
      res.status(200).json({ message: 'User deleted successfully.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'An error occurred while deleting the user.' });
    }
  });
  