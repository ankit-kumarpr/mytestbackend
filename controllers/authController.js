const User = require('../models/User');
const Otp = require('../models/Otp');
const { sendMail, otpEmailTemplate, welcomeForUserTemplate, welcomeForAdminTemplate } = require('../utils/email');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');

// Generate random OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Register regular user (with OTP)
exports.registerUser = async (req, res) => {
  try {
    const { name, email, phone, password, cpassword } = req.body;

    // Validation
    if (!name || !email || !phone || !password || !cpassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (password !== cpassword) {
      return res.status(400).json({
        success: false,
        message: 'Password and confirm password do not match'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    if (!/^\d{10}$/.test(phone.toString())) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be exactly 10 digits'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(process.env.OTP_EXPIRES_MIN || 10));

    // Delete old OTPs for this email
    await Otp.deleteMany({ email });

    // Save OTP
    await Otp.create({
      email,
      otp,
      expiresAt,
      verified: false
    });

    // Create user (not verified yet)
    const user = await User.create({
      name,
      email,
      phone,
      password,
      cpassword,
      role: 'user',
      isVerified: false
    });

    // Send OTP email
    try {
      const html = otpEmailTemplate({ code: otp });
      await sendMail({
        to: email,
        subject: 'Email Verification - Gnet E-commerce',
        html
      });

      res.status(201).json({
        success: true,
        message: 'OTP sent to your email. Please verify to complete registration.',
        userId: user._id
      });
    } catch (emailError) {
      // If email fails, delete the user
      await User.findByIdAndDelete(user._id);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again.'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

// Verify OTP and complete registration
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Find OTP
    const otpRecord = await Otp.findOne({ email, otp });
    
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    if (otpRecord.verified) {
      return res.status(400).json({
        success: false,
        message: 'OTP already used'
      });
    }

    if (new Date() > otpRecord.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired'
      });
    }

    // Verify OTP
    otpRecord.verified = true;
    await otpRecord.save();

    // Update user as verified
    const user = await User.findOneAndUpdate(
      { email },
      { isVerified: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate custom ID (or use user._id)
    const customId = user._id.toString().substring(0, 8).toUpperCase();

    // Send welcome email
    try {
      const html = welcomeForUserTemplate({
        name: user.name,
        email: user.email,
        phone: user.phone,
        password: 'Your chosen password',
        customId
      });
      
      await sendMail({
        to: email,
        subject: 'Welcome to Gnet E-commerce',
        html
      });
    } catch (emailError) {
      console.error('Welcome email failed:', emailError);
      // Continue even if email fails
    }

    // Delete verified OTP
    await Otp.deleteMany({ email });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. Welcome email sent!',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'OTP verification failed',
      error: error.message
    });
  }
};

// Login (common for all users)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Validate password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate tokens
    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Prepare user response data
    const responseData = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        location: user.location || null
      },
      accessToken,
      refreshToken
    };

    // If user is vendor, include their business (KYC) data
    if (user.role === 'vendor') {
      const Kyc = require('../models/Kyc');
      const businesses = await Kyc.find({ userId: user._id })
        .populate('approvedBy', 'name email')
        .populate('rejectedBy', 'name email')
        .sort({ createdAt: -1 });

      responseData.businesses = businesses;
      responseData.totalBusinesses = businesses.length;
    }

    // Send success response
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: responseData
    });

  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};


// Super Admin Register (separate API - no OTP needed)
exports.registerSuperAdmin = async (req, res) => {
  try {
    const { name, email, phone, password, cpassword } = req.body;

    // Validation
    if (!name || !email || !phone || !password || !cpassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (password !== cpassword) {
      return res.status(400).json({
        success: false,
        message: 'Password and confirm password do not match'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: 'superadmin' });
    if (existingSuperAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Super admin already exists'
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create super admin
    const user = await User.create({
      name,
      email,
      phone,
      password,
      cpassword,
      role: 'superadmin',
      isVerified: true // Super admin doesn't need verification
    });

    const customId = user._id.toString().substring(0, 8).toUpperCase();

    // Send welcome email
    try {
      const html = welcomeForAdminTemplate({
        name: user.name,
        email: user.email,
        phone: user.phone,
        password,
        customId
      });
      
      await sendMail({
        to: email,
        subject: 'Welcome Super Admin - Gnet E-commerce',
        html
      });
    } catch (emailError) {
      console.error('Welcome email failed:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Super admin registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Super admin registration failed',
      error: error.message
    });
  }
};

// Admin Register (by Super Admin only)
exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, phone, password, cpassword } = req.body;

    // Validation
    if (!name || !email || !phone || !password || !cpassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (password !== cpassword) {
      return res.status(400).json({
        success: false,
        message: 'Password and confirm password do not match'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create admin
    const user = await User.create({
      name,
      email,
      phone,
      password,
      cpassword,
      role: 'admin',
      isVerified: true
    });

    const customId = user._id.toString().substring(0, 8).toUpperCase();

    // Send welcome email
    try {
      const html = welcomeForAdminTemplate({
        name: user.name,
        email: user.email,
        phone: user.phone,
        password,
        customId
      });
      
      await sendMail({
        to: email,
        subject: 'Welcome Admin - Gnet E-commerce',
        html
      });
    } catch (emailError) {
      console.error('Welcome email failed:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Admin registration failed',
      error: error.message
    });
  }
};

// Sales Person Register (by Admin only)
exports.registerSalesPerson = async (req, res) => {
  try {
    const { name, email, phone, password, cpassword } = req.body;

    // Validation
    if (!name || !email || !phone || !password || !cpassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (password !== cpassword) {
      return res.status(400).json({
        success: false,
        message: 'Password and confirm password do not match'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create sales person
    const user = await User.create({
      name,
      email,
      phone,
      password,
      cpassword,
      role: 'salesperson',
      isVerified: true
    });

    const customId = user._id.toString().substring(0, 8).toUpperCase();

    // Send welcome email
    try {
      const html = welcomeForAdminTemplate({
        name: user.name,
        email: user.email,
        phone: user.phone,
        password,
        customId
      });
      
      await sendMail({
        to: email,
        subject: 'Welcome Sales Person - Gnet E-commerce',
        html
      });
    } catch (emailError) {
      console.error('Welcome email failed:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Sales person registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sales person registration failed',
      error: error.message
    });
  }
};

// Refresh Token - Generate new access token using refresh token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new access token
    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    };

    const newAccessToken = generateAccessToken(payload);

    res.status(200).json({
      success: true,
      message: 'Access token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Token refresh failed',
      error: error.message
    });
  }
};

