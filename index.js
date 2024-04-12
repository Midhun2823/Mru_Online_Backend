const dotenv = require("dotenv").config();

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path"); // using this we can get direct connect to backend through express app
const cors = require("cors");
const { error, log } = require("console");
const connectDB = require("./config/connectDB");

app.use(express.json()); // what ever request is get from respones it automatically passed through json
app.use(express.urlencoded({extended : false}))

app.use(
  cors({
    origin: [
      "https://mru-online-midhun.onrender.com",
      "http://localhost:3000",
      "https://midhun2823.github.io",
    ],
  })
); // Using this the react js projectwill connect to express app on 4000 port

// intalise database
// dATABASE cONNECTION with mongoDB
// const psw = "Harshu@10122000"
// mongoose
//   .connect(process.env.MONGO_URI)
//   .then(() => {
//     console.log("Connection Successfull");
//   })
//   .catch((err) => {
//     console.log("not connection", err);
//   });

// API creation endpoint
const PORT = process.env.PORT || 4000;
// export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;


app.get("/", (req, res) => {
  res.send("Express appppp is running");
});

// Image storage system
const storage = multer.diskStorage({
  destination: "./upload/images",
  filename: (req, file, cb) => {
    console.log(file);
    return cb(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({ storage: storage });

// Creating upload endpoint for images

app.use("/images", express.static("upload/images"));

app.post("/upload", upload.single("product"), (req, res) => {
  res.json({
    success: 1,
    image_url: `http://localhost:4000/images/${req.file.filename}`,
  });
});

// Schema for creating products

const Product = mongoose.model("Product", {
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  sub_category: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  new_price: {
    type: Number,
    required: true,
  },
  old_price: {
    type: Number,
    required: true,
  },
  des: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  available: {
    type: Boolean,
    default: true,
  },
});

// Below is for creating the new product and saving in the database
app.post("/addproduct", async (req, res) => {
  let products = await Product.find({});
  let id;
  if (products.length > 0) {
    let last_order_array = products.slice(-1);
    let last_order = last_order_array[0];
    id = last_order.id + 1;
  } else {
    id = 1;
  }
  const product = new Product({
    id: id,
    name: req.body.name,
    image: req.body.image,
    sub_category: req.body.sub_category,
    category: req.body.category,
    new_price: req.body.new_price,
    old_price: req.body.old_price,
    des: req.body.des,
  });
  console.log(product);
  await product.save(); // by this it will save in mongoDB database
  console.log("Saved");
  res.json({
    success: true,
    name: req.body.name,
  });
});

// Creating API for deleting products

app.post("/removeproduct", async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  console.log("Removed");
  res.json({
    success: true,
    name: req.body.name,
  });
});

// Creating API for getting all products
app.get("/allproduct", async (req, res) => {
  let products = await Product.find({});
  console.log("All product feched");
  res.send(products);
});

// Shema creating for user module

const Users = mongoose.model("Users", {
  name: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
  },
  cartData: {
    type: Object,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

// Creating Endpoint for registration of user
app.post("/signup", async (req, res) => {
  let check = await Users.findOne({ email: req.body.email });
  if (check) {
    return res.status(400).json({
      success: false,
      error: "Existing User Found With Same Email Address",
    });
  }
  let cart = {};
  for (let id = 0; id < 300; id++) {
    cart[id] = 0;
  }

  const user = new Users({
    name: req.body.username,
    email: req.body.email,
    password: req.body.password,
    cartData: cart,
  });

  await user.save();

  // use jwt authentication
  // creating token using this object (data object)
  const data = {
    user: {
      id: user.id,
    },
  };
  const token = jwt.sign(data, "secret_ecom"); // when we use the salt out data will be encrypted by one layer
  res.json({ success: true, token });
});

// Creating endpoint for user login
app.post("/login", async (req, res) => {
  let user = await Users.findOne({ email: req.body.email });
  if (user) {
    const passCompare = req.body.password === user.password;
    if (passCompare) {
      const data = {
        user: {
          id: user.id,
        },
      };
      //use jwt to create the token
      const token = jwt.sign(data, "secret_ecom");
      res.json({ success: true, token });
    } else {
      res.json({ success: false, errors: "Wrong Password" });
    }
  } else {
    res.json({ success: false, errors: "Worng Email id" });
  }
});

// Creating end point for new collection, popular
// upcoming

// creating middleware to fetch user
const fetchUser = async (req, res, next) => {
  const token = req.header("auth-token");
  if (!token) {
    res.status(401).send({ errors: "Please authenticate using valid token" });
  } else {
    try {
      // using the below the token will be decoded
      const data = jwt.verify(token, "secret_ecom");
      req.user = data.user;
      next();
    } catch (error) {
      res
        .status(401)
        .send({ errors: "Please authenticate using a valid token" });
    }
  }
};

// creating end point for adding product in cart data
app.post("/addtocart", fetchUser, async (req, res) => {
  console.log("Added", req.body.itemId);

  // console.log(req.body, req.user); the below in the terminal output
  let userData = await Users.findOne({ _id: req.user.id });
  userData.cartData[req.body.itemId] += 1;
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send("Added");
});

// Creating end point to remove porduct form cart data

app.post("/removefromcart", fetchUser, async (req, res) => {
  console.log("Removed", req.body.itemId);
  let userData = await Users.findOne({ _id: req.user.id });
  if (userData.cartData[req.body.itemId] > 0) {
    userData.cartData[req.body.itemId] -= 1;
  }
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send("Removed");
});

// Creating end point to get cart data directly when we logged in to our credentials
app.post("/getcart", fetchUser, async (req, res) => {
  console.log("GetCart ");
  let userData = await Users.findOne({ _id: req.user.id });
  res.json(userData.cartData);
});

const starServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, (err) => {
      if (!err) {
        console.log("Server started running on port " + PORT);
      } else {
        console.log("Error: " + err);
      }
    });
  } catch (error) {
    console.log(error);
  }
}
starServer()
