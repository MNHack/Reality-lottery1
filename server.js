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
  try {
    const { txid, phone } = req.body;

    // 1. التحقق من التكرار
    const existing = await Payment.findOne({ txid });
    if (existing) {
      console.log("⚠️ Duplicate TXID:", txid);
      return res.status(409).json({ 
        error: "Transaction ID already exists" 
      });
    }

    // 2. التأكد من تعيين الحالة
    const newPayment = new Payment({
      txid,
      phone,
      status: "pending" // تأكد من تعيين هذه القيمة
    });

    await newPayment.save();
    console.log("✅ Saved payment:", newPayment._id);
    
    res.json({ 
      success: true,
      message: "Payment submitted successfully"
    });

  } catch (err) {
    console.error("❌ Save error:", err);
    res.status(500).json({ 
      error: "Internal server error",
      details: err.message 
    });
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

app.get("/api/payment", async (req, res) => {
  try {
    // تأكد من الاستعلام الصحيح
    const payments = await Payment.find({ 
      status: { $in: ["pending", "rejected"] } 
    }).sort({ date: -1 }); // الترتيب من الأحدث للأقدم

    console.log("🔍 Found payments:", payments.length); // تسجيل عدد النتائج
    
    // تحويل البيانات بشكل صحيح
    const formatted = payments.map(p => ({
      _id: p._id.toString(), // تحويل ObjectId إلى string
      txid: p.txid,
      phone: p.phone,
      status: p.status,
      date: p.date.toISOString().split('T')[0] // تاريخ فقط
    }));

    res.json(formatted);
  } catch (err) {
    console.error("❌ Error in pending-payments:", err);
    res.status(500).json({ 
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







