const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongoose').Types;
const cookieParser = require('cookie-parser');
const crypto = require("crypto");

router.use(cookieParser()); const saltRounds = 10;
module.exports = (db) => {

   const transporter = nodemailer.createTransport({
      service: 'Outlook365', // Pour utiliser Outlook/Office365
      auth: {
        user: 'handh.corp@outlook.com', // Remplacez par votre adresse e-mail Outlook
        pass: 'Didou12+', // Remplacez par votre mot de passe Outlook
      },
    });

  function generateVerificationCode() {
   return crypto.randomBytes(4).toString("hex");
  }
  
  
   function hasCrudPermissions(role) {
      return role === 'restaurateur' || role === 'dev' || role === 'cuisinier' || role === 'client';
   }

   router.post("/login", (request, response) => {
    try {
      const { email, password, restaurant } = request.body;
  
      console.log(`${email}, ${password}, ${restaurant}`);
  
      db.collection('Auth').findOne({
        email: email,
        restaurant: restaurant,
      }, (err, user) => {
        if (user === null) {
          return response.json({
            error: "Informations not match. Please create account first"
          });
        } else if (err) throw err;
  
        // Use bcrypt to compare hashed passwords
        bcrypt.compare(password, user.password, (error, result) => {
          if (error) {
            console.log(error);
            return response.json({
              error: "Error occurred while comparing passwords"
            });
          } else if (result === true) {
            console.log("Login Succesfully");
  
            // Store user ID, role, first name and last name in the session
            request.session.user = {
              id: user._id.toString(),
              role: user.role,
              first_name: user.first_name,   // Add these lines
              last_name: user.last_name,     // to include first and last name
            };
  
            console.log("User ID:", user._id.toString());
            console.log("User Role:", user.role);
            console.log("User First Name:", user.first_name);   // Add these lines
            console.log("User Last Name:", user.last_name);     // to log first and last name
  
            return response.json({
              error: ""
            });
          } else {
            console.log("Password not match");
            return response.json({
              error: "Wrong Password"
            });
          }
        });
      });
    } catch (error) {
      console.log("Invalid information");
    }
  });
  
  
  
    
   
    router.post("/sign&", (request, response) => {
      try {
        const firstname = request.body.firstName;
        const lastname = request.body.lastName;
        const email = request.body.email;
        const password = request.body.password;
        const restaurant = request.body.restaurant;
    
        // Ajustez la recherche pour vérifier à la fois l'e-mail et le restaurant
        db.collection('Auth').findOne({
          email: email,
          restaurant: restaurant // Ajoutez cette ligne
        }, (err, res) => {
          if (err) throw err;
          if (res) {
            return response.json({
              error: "Email already exists for this restaurant. Please use another email."
            });
          } else {
            const hashedPassword = bcrypt.hashSync(password, saltRounds);
    
            const data = {
              "first_name": firstname,
              "last_name": lastname,
              "email": email,
              "password": hashedPassword,
              "role": "client",
              "restaurant": restaurant,
            }
    
            db.collection('Auth').insertOne(data, (err, insertResult) => {
              if (err) throw err;
              response.cookie('user_id', insertResult.insertedId.toString(), {
                maxAge: 86400000,
                sameSite: 'strict'
              });
              response.cookie('user_role', 'client', {
                maxAge: 86400000,
                sameSite: 'strict'
              });
              console.log("Record insert Succesfully");
              return response.json({
                error: "",
                first_name: firstname,
                last_name: lastname
              });
            });            
          }
        })
    
      } catch (error) {
        console.log(error)
      }
    })
    
    router.get("/logout", (req, res) => {
      // Clear the session data
      req.session.user = null;
   
      // Clear the cookies
      res.clearCookie('user_id');
      res.clearCookie('user_role');
   
      // Redirect user to login page or send success response
      res.status(200).json({ message: 'Logout successful' });
   });
   
   router.post("/forgot-password", async (req, res) => {
      const email = req.body.email;
      const user = await db.collection("Auth").findOne({ email });
   
      if (!user) {
          res.json({ error: "No account with that email address exists." });
      } else {
          const verificationCode = generateVerificationCode();
          await db.collection("Auth").updateOne({ email }, { $set: { verificationCode } });
   
          const mailOptions = {
              from: "handh.corp@outlook.com",
              to: email,
              subject: "Fastbook Password Reset",
              text: `Your Fastbook password reset code is: ${verificationCode}`
          };
   
          transporter.sendMail(mailOptions, (err, info) => {
              if (err) {
                  console.error(err);
                  res.json({ error: "Error sending email." });
              } else {
                  res.json({ error: "" });
              }
          });
      }
      });
   
   
      router.post("/reset-password", async (req, res) => {
         const { email, verificationCode, newPassword } = req.body;
         const user = await db.collection("Auth").findOne({ email });
     
         if (!user) {
             res.json({ error: "No account with that email address exists." });
         } else if (user.verificationCode !== verificationCode) {
             res.json({ error: "Incorrect verification code." });
         } else {
             const hashedPassword = bcrypt.hashSync(newPassword, saltRounds);
             await db.collection("Auth").updateOne({ email }, { $set: { password: hashedPassword }, $unset: { verificationCode: "" } });
             res.json({ error: "" });
         }
     });

   // Récupérer les informations de profil
   router.get("/profile", async (req, res) => {
      const userRole = req.cookies.user_role;
      if (hasCrudPermissions(userRole)) {
            // Récupérer les informations de l'utilisateur depuis la base de données
            // Vous devez remplacer "userId" par l'ID de l'utilisateur actuellement connecté
            const userId = req.cookies.user_id; // Retrieve user ID from cookie
            const user = await db.collection('Auth').findOne({
               _id: new ObjectId(userId)
            });
            if (user) {
               delete user.password;
         
               res.json(user);
            } else {
               res.status(404).json({
                  error: "User not found"
               });
            }
      } else {
         res.redirect('/login');
      }
   });
   
   // Récupérer les informations de profil
   router.get("/namedisplay", (req, res) => {
    if (req.session.user) {
      res.json({
        first_name: req.session.user.first_name,
        last_name: req.session.user.last_name
      });
    } else {
      res.status(404).json({
        error: "User not found"
      });
    }
  });
  
   // Mettre à jour les informations de profil
   router.post("/updateProfile/:userId", async (req, res) => {
      const userId = req.params.userId;
      const userData = req.body;
   
      const oldPassword = userData.old_password;
      const newPassword = userData.new_password;
   
      delete userData.old_password;
      delete userData.new_password;
   
      try {
         const user = await db.collection('Auth').findOne({
            _id: new ObjectId(userId)
         }); // <-- Change this line
   
         if (user) {
            // Vérifier si l'ancien mot de passe est correct
            console.log('Old password (plain-text):', oldPassword);
            console.log('Password from database (hashed):', user.password);
            const passwordMatch = await bcrypt.compare(oldPassword, user.password);
   
            if (passwordMatch) {
               // Si l'ancien mot de passe est correct, mettez à jour le mot de passe dans la base de données
               userData.password = await bcrypt.hash(newPassword, saltRounds);
   
               // Mettre à jour les données de l'utilisateur dans la base de données
               await db.collection("Auth").updateOne({
                  _id: new ObjectId(userId)
               }, {
                  $set: userData
               }); // <-- Change this line
   
               res.status(200).json({
                  success: true
               });
            } else {
               // Si l'ancien mot de passe est incorrect, renvoyer une erreur
               res.status(401).json({
                  success: false,
                  message: "Old password is incorrect"
               });
            }
         } else {
            res.status(404).json({
               success: false,
               message: "User not found"
            });
         }
      } catch (err) {
         console.error(err);
         res.status(500).json({
            success: false,
            message: "An error occurred while updating the profile"
         });
      }
   });

   return router;
};