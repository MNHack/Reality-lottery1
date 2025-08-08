const express = require("express");

const mongoose = require("mongoose");

const cors = require("cors");

const bodyParser = require("body-parser");

const path = require("path");



const app = express();



// Middlewares

app.use(cors());

app.use(bodyParser.json());



// Serve static frontend files from public folder

app.use(express.static(path.join(__dirname, "public")));



// متغير البورت من البيئة أو 3000 محليًا

const PORT = process.env.PORT || 3000;



// سكيمات mongoose

const userSchema = new mongoose.Schema({

  username: String,

  password: String,

  email: String,

  country: String,

  isApproved: { type: Boolean, default: false },

  referrer: String,

  refCount: { type: Number, default: 0 }

});

const User = mongoose.model("User", userSchema);



const paymentSchema = new mongoose.Schema({
  txid: String,
  phone: String,
  status: String,
  date: Date
});

const Payment = mongoose.model("Payment", paymentSchema);



// الاتصال بقاعدة البيانات

mongoose.connect(

  process.env.MONGODB_URI || "mongodb+srv://realitylottery:Moataz1234@realitylottery.fzcf67p.mongodb.net/?retryWrites=true&w=majority&appName=realitylottery"

)

.then(() => {

  console.log("✅ Connected to MongoDB");

})

.catch((error) => {

  console.error("❌ MongoDB connection error:", error);

});



// Routes



// صفحة البداية تعرض index.html

app.get("/", (req, res) => {

  res.sendFile(path.join(__dirname, "public", "index.html"));

});



// إرسال الدفع

app.post("/api/payment", async (req, res) => {
  console.log("Received payment request:", req.body); // 1. سجل البيانات المستلمة

  try {
    const { txid, phone } = req.body;
    console.log(`txid: ${txid}, phone: ${phone}`); // 2. تأكد من وصول البيانات

    if (!txid || !phone) {
      console.log("Missing data");
      return res.status(400).json({ error: "txid and phone are required" });
    }

    const newPayment = new Payment({ txid, phone });
    console.log("New payment object created:", newPayment); // 3. تأكد من بناء الكائن

    await newPayment.save();
    console.log("Payment saved to DB:", newPayment._id); // 4. تأكد من الحفظ

    res.json({ message: "Payment saved successfully" });
  } catch (err) {
    console.error("Error saving payment:", err); // 5. سجل أي خطأ
    res.status(500).json({ error: "Internal server error" });
  }
});


// تسجيل الدخول

app.post("/api/login", async (req, res) => {

  const { username, password } = req.body;



  try {

    const user = await User.findOne({ username, password });



    if (!user) {

      return res.status(401).json({ message: "Invalid username or password." });

    }



    if (!user.isApproved) {

      return res.status(403).json({ message: "Your payment is under review." });

    }



    res.json({

      message: "Login successful",

      user: {

        username: user.username,

        email: user.email,

        isApproved: user.isApproved

      },

      token: "mock-token" // رمزي فقط

    });

  } catch (err) {

    console.error("Login error:", err);

    res.status(500).json({ message: "Server error" });

  }

});



// تسجيل مستخدم جديد

app.post("/api/register", async (req, res) => {

  const { username, password, email, country, referrer } = req.body;



  try {

    const existingUser = await User.findOne({ username });

    if (existingUser) {

      return res.status(400).json({ message: "Username already taken" });

    }



    const newUser = new User({

      username,

      password,

      email,

      country,

      referrer: referrer || null

    });



    await newUser.save();



    if (referrer) {

      await User.findOneAndUpdate(

        { username: referrer },

        { $inc: { refCount: 1 } }

      );

    }



    res.status(201).json({ message: "User registered successfully" });

  } catch (err) {

    console.error("Registration error:", err);

    res.status(500).json({ message: "Server error during registration" });

  }

});



// الحصول على الدفعات المعلقة

app.get("/api/pending-payments", async (req, res) => {
  try {
    const payments = await Payment.find({ status: { $in: ["pending", "rejected"] } });
    
    // التعديل المهم: تصفية العناصر غير المعرّفة
    const validPayments = payments.filter(p => p && p._id);
    
    // تحويل كائنات Mongoose إلى كائنات JavaScript عادية
    const formattedPayments = validPayments.map(p => ({
      _id: p._id.toString(),
      txid: p.txid,
      phone: p.phone,
      status: p.status,
      date: p.date.toISOString()
    }));

    res.json(formattedPayments);
  } catch (err) {
    console.error("Error fetching payments:", err);
    res.status(500).json({ 
      success: false,
      error: "Internal server error",
      details: err.message 
    });
  }
});



// الموافقة على الدفع

app.post("/api/approve-payment", async (req, res) => {

  const { paymentId, phone } = req.body;



  await Payment.findByIdAndUpdate(paymentId, { approved: true });

  await User.findByIdAndUpdate(phone, { isApproved: true });



  res.json({ message: "✅ Payment approved and user activated." });

});



// بدء السيرفر

app.listen(PORT, () => {

  console.log(`🚀 Server is running on port ${PORT}`);

});




